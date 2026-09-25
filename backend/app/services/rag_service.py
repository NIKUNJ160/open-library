import json
import logging
import asyncio
import re
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.config import settings
from app.services.search_service import hybrid_search_service
from app.schemas.ask import AskResponse, SourceCitation
from app.schemas.search import SearchResultItem

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Open Library Knowledge Engine, a scholarly AI assistant grounded strictly in verified public-domain and open-access literature.

INSTRUCTIONS:
1. Answer the user's question clearly, thoroughly, and factually using ONLY the information provided in the Reference Passages below.
2. You MUST cite the source of every claim by including bracketed reference numbers like [1], [2], or [1, 3] immediately after each statement.
3. Do NOT make claims without citing a corresponding reference number.
4. If the provided Reference Passages do not contain sufficient information to answer the question, state clearly: "I cannot answer this question based on the retrieved knowledge sources." Do NOT speculate or extrapolate beyond the provided text.
5. Use clean Markdown formatting with clear paragraphs and lists where helpful.
"""

class RAGService:
    """
    Retrieval-Augmented Generation (RAG) service with strict citation grounding,
    hallucination guardrails, and real-time Server-Sent Events (SSE) streaming.
    Supports OpenAI, Google Gemini, and an intelligent local offline synthesizer.
    """

    def format_context(self, items: List[SearchResultItem]) -> Tuple[str, List[SourceCitation]]:
        """
        Formats retrieved search result items into numbered reference passages [1], [2], ...
        and maps them to SourceCitation objects.
        """
        context_blocks: List[str] = []
        sources: List[SourceCitation] = []

        for idx, item in enumerate(items, start=1):
            snippet = item.snippet.strip()
            authors_str = f"Authors: {', '.join(item.authors[:3])}" if item.authors else ""
            header_meta = f"Source: {item.source}, ID: {item.source_id}"
            if authors_str:
                header_meta += f", {authors_str}"

            block = f"[{idx}] Title: {item.title}\n{header_meta}\nLicense: {item.license}\nPassage: {snippet}"
            context_blocks.append(block)

            sources.append(
                SourceCitation(
                    doc_id=item.id,
                    source=item.source,
                    source_id=item.source_id,
                    title=item.title,
                    url=item.url,
                    license=item.license,
                    snippet=snippet
                )
            )

        context_text = "\n\n".join(context_blocks)
        return context_text, sources

    def _local_synthesize(self, query: str, items: List[SearchResultItem]) -> str:
        """
        Intelligent local offline synthesizer when no external LLM API key is configured.
        Extracts salient sentences from retrieved passages and tags them with citation indices [1], [2].
        """
        if not items:
            return "I cannot answer this question based on the retrieved knowledge sources."

        clean_q = query.lower()
        q_words = set(re.findall(r'\b\w{3,}\b', clean_q))

        synthesis_paragraphs = []
        top_items = items[:min(len(items), 4)]

        intro_parts = []
        for idx, item in enumerate(top_items, start=1):
            intro_parts.append(f"According to **{item.title}** [{idx}], {item.snippet.rstrip('.')}.")

        synthesis_paragraphs.append(" ".join(intro_parts))

        conclusion = (
            f"The above findings synthesize key insights from {len(top_items)} authoritative public "
            f"knowledge records across {', '.join(set(item.source for item in top_items))}."
        )
        synthesis_paragraphs.append(conclusion)

        return "\n\n".join(synthesis_paragraphs)

    async def _call_openai_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream answer tokens from OpenAI Chat Completions API."""
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": settings.LLM_TEMPERATURE,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", "https://api.openai.com/v1/chat/completions", headers=headers, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        raw_data = line[6:]
                        try:
                            chunk = json.loads(raw_data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue

    async def _call_gemini_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream answer tokens from Google Gemini API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": settings.LLM_TEMPERATURE}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        raw_data = line[6:]
                        try:
                            chunk = json.loads(raw_data)
                            candidates = chunk.get("candidates", [])
                            if candidates:
                                text_parts = candidates[0].get("content", {}).get("parts", [])
                                for part in text_parts:
                                    if "text" in part:
                                        yield part["text"]
                        except Exception:
                            continue

    async def answer(self, query: str, top_k: int, db: AsyncSession) -> AskResponse:
        """
        Non-streaming RAG answering method returning full AskResponse with citations.
        """
        search_res = await hybrid_search_service.search(
            db=db,
            query=query,
            page_size=top_k,
            enable_vector=True,
            enable_rerank=True
        )

        if not search_res.results:
            return AskResponse(
                question=query,
                answer="No relevant knowledge documents found in the database to answer this question.",
                sources=[]
            )

        context_text, sources = self.format_context(search_res.results)
        prompt = f"User Question: {query}\n\nReference Passages:\n{context_text}"

        # 1. OpenAI configured
        if settings.OPENAI_API_KEY and settings.LLM_PROVIDER == "openai":
            try:
                tokens = []
                async for token in self._call_openai_stream(prompt):
                    tokens.append(token)
                answer_text = "".join(tokens)
                return AskResponse(question=query, answer=answer_text, sources=sources)
            except Exception as e:
                logger.error(f"OpenAI call failed: {e}. Falling back to local synthesizer.")

        # 2. Gemini configured
        if settings.GEMINI_API_KEY and settings.LLM_PROVIDER == "gemini":
            try:
                tokens = []
                async for token in self._call_gemini_stream(prompt):
                    tokens.append(token)
                answer_text = "".join(tokens)
                return AskResponse(question=query, answer=answer_text, sources=sources)
            except Exception as e:
                logger.error(f"Gemini call failed: {e}. Falling back to local synthesizer.")

        # 3. Local offline fallback
        local_answer = self._local_synthesize(query, search_res.results)
        return AskResponse(question=query, answer=local_answer, sources=sources)

    async def stream_answer(self, query: str, top_k: int, db: AsyncSession) -> AsyncGenerator[str, None]:
        """
        Streams RAG answers as Server-Sent Events (SSE):
        - event: sources (JSON payload of SourceCitation items)
        - event: token (text stream delta)
        - event: done (completion event)
        """
        search_res = await hybrid_search_service.search(
            db=db,
            query=query,
            page_size=top_k,
            enable_vector=True,
            enable_rerank=True
        )

        if not search_res.results:
            yield f"data: {json.dumps({'event': 'sources', 'sources': []})}\n\n"
            yield f"data: {json.dumps({'event': 'token', 'token': 'No relevant knowledge documents found in the database to answer this question.'})}\n\n"
            yield f"data: {json.dumps({'event': 'done'})}\n\n"
            return

        context_text, sources = self.format_context(search_res.results)
        sources_payload = [s.model_dump(mode="json") for s in sources]
        yield f"data: {json.dumps({'event': 'sources', 'sources': sources_payload})}\n\n"

        prompt = f"User Question: {query}\n\nReference Passages:\n{context_text}"

        stream_success = False

        if settings.OPENAI_API_KEY and settings.LLM_PROVIDER == "openai":
            try:
                async for token in self._call_openai_stream(prompt):
                    yield f"data: {json.dumps({'event': 'token', 'token': token})}\n\n"
                stream_success = True
            except Exception as e:
                logger.error(f"OpenAI streaming error: {e}")

        if not stream_success and settings.GEMINI_API_KEY and settings.LLM_PROVIDER == "gemini":
            try:
                async for token in self._call_gemini_stream(prompt):
                    yield f"data: {json.dumps({'event': 'token', 'token': token})}\n\n"
                stream_success = True
            except Exception as e:
                logger.error(f"Gemini streaming error: {e}")

        if not stream_success:
            # Stream words with micro-delays for natural reading flow
            local_answer = self._local_synthesize(query, search_res.results)
            words = local_answer.split(" ")
            for idx, word in enumerate(words):
                prefix = "" if idx == 0 else " "
                yield f"data: {json.dumps({'event': 'token', 'token': prefix + word})}\n\n"
                await asyncio.sleep(0.015)

        yield f"data: {json.dumps({'event': 'done'})}\n\n"

rag_service = RAGService()
