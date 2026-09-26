import {
  SearchResponse,
  DocumentDetail,
  AllCitationsResponse,
  CitationResponse,
  AskRequest,
  AskResponse,
  SourceCitation,
  EntityListResponse,
  EntityDetail,
  GraphResponse,
} from './types';
import {
  searchCuratedCatalog,
  getCuratedDocumentDetail,
  getCuratedCitations,
  getCuratedEntitiesList,
  getCuratedEntityDetail,
  getCuratedGraphData,
  synthesizeCuratedAnswer,
} from './curatedCatalog';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function searchDocuments(params: {
  q: string;
  source?: string;
  doc_type?: string;
  page?: number;
  page_size?: number;
  enable_rerank?: boolean;
}): Promise<SearchResponse> {
  try {
    const query = new URLSearchParams();
    query.set('q', params.q);
    if (params.source) query.set('source', params.source);
    if (params.doc_type) query.set('doc_type', params.doc_type);
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    if (params.enable_rerank !== undefined) query.set('enable_rerank', params.enable_rerank.toString());

    // 3.5s timeout prevents UI hangs if remote backend is offline or mixed content is blocked
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/search?${query.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Search failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Knowledge Engine API] Primary search unreachable (${API_BASE}), serving from curated public catalog:`, err);
    return searchCuratedCatalog(params);
  }
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/documents/${id}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to load document: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Knowledge Engine API] Document fetch failed (${id}), serving from curated catalog:`, err);
    return getCuratedDocumentDetail(id);
  }
}

export async function getDocumentCitations(id: string): Promise<AllCitationsResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/documents/${id}/citations`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to load citations: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Knowledge Engine API] Citations fetch failed (${id}), generating citations from curated catalog:`, err);
    return getCuratedCitations(id);
  }
}

export async function getDocumentCitation(id: string, format: string = 'bibtex'): Promise<CitationResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/documents/${id}/citation?format=${encodeURIComponent(format)}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to load citation: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    const all = getCuratedCitations(id);
    const key = format.toLowerCase();
    const citation = all.citations[key] || all.citations['bibtex'] || '';
    return {
      document_id: id,
      format,
      citation,
    };
  }
}

export async function askQuestion(req: AskRequest): Promise<AskResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to ask question: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Knowledge Engine API] RAG endpoint unreachable, synthesizing grounded answer from curated catalog:`, err);
    return synthesizeCuratedAnswer(req.question);
  }
}

export async function streamAskQuestion(
  question: string,
  top_k: number = 5,
  callbacks: {
    onSources?: (sources: SourceCitation[]) => void;
    onToken?: (token: string) => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<() => void> {
  let isCancelled = false;
  const abortController = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, top_k, stream: true }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`RAG stream HTTP status ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Response body is null');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (isCancelled) break;
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.event === 'sources' && callbacks.onSources) {
                callbacks.onSources(parsed.sources || []);
              } else if (parsed.event === 'token' && callbacks.onToken) {
                callbacks.onToken(parsed.token || '');
              } else if (parsed.event === 'done' && callbacks.onDone) {
                callbacks.onDone();
              }
            } catch (err) {
              // Ignore non-json lines
            }
          }
        }
      }
      if (callbacks.onDone) callbacks.onDone();
    } catch (err: any) {
      if (err.name === 'AbortError' || isCancelled) return;

      console.warn(`[Knowledge Engine API] Streaming endpoint unreachable, streaming local curated synthesis:`, err);
      // Seamlessly stream synthesized answer with citations
      const synth = synthesizeCuratedAnswer(question);
      if (callbacks.onSources) {
        callbacks.onSources(synth.sources);
      }

      const words = synth.answer.split(' ');
      let i = 0;
      const interval = setInterval(() => {
        if (isCancelled) {
          clearInterval(interval);
          return;
        }

        if (i < words.length) {
          const wordToken = (i === 0 ? '' : ' ') + words[i];
          if (callbacks.onToken) callbacks.onToken(wordToken);
          i++;
        } else {
          clearInterval(interval);
          if (callbacks.onDone) callbacks.onDone();
        }
      }, 25);
    }
  })();

  return () => {
    isCancelled = true;
    abortController.abort();
  };
}

export async function getEntities(params?: {
  q?: string;
  entity_type?: string;
  page?: number;
  page_size?: number;
}): Promise<EntityListResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.entity_type) query.set('entity_type', params.entity_type);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/entities?${query.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to load entities: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Knowledge Engine API] Entities endpoint unreachable, serving curated entities:`, err);
    return getCuratedEntitiesList(params);
  }
}

export async function getEntity(id: number): Promise<EntityDetail> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/entities/${id}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to load entity: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Knowledge Engine API] Entity detail unreachable (${id}), serving curated entity:`, err);
    return getCuratedEntityDetail(id);
  }
}

export async function getEntityGraph(
  id: number,
  params?: { max_docs?: number; max_co_entities?: number }
): Promise<GraphResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.max_docs) query.set('max_docs', params.max_docs.toString());
    if (params?.max_co_entities) query.set('max_co_entities', params.max_co_entities.toString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/entities/${id}/graph?${query.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to load entity graph: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Knowledge Engine API] Entity graph unreachable (${id}), serving curated graph:`, err);
    const fullGraph = getCuratedGraphData();
    const entityNodeId = `ent-${id}`;
    const relevantEdges = fullGraph.edges.filter(
      (e) => e.source === entityNodeId || e.target === entityNodeId
    );
    const nodeIds = new Set<string>([entityNodeId]);
    relevantEdges.forEach((e) => {
      nodeIds.add(e.source);
      nodeIds.add(e.target);
    });
    const relevantNodes = fullGraph.nodes.filter((n) => nodeIds.has(n.id));
    return {
      root_id: entityNodeId,
      nodes: relevantNodes.length > 0 ? relevantNodes : fullGraph.nodes.slice(0, 8),
      edges: relevantEdges,
    };
  }
}

export async function getGraphOverview(params?: {
  limit_entities?: number;
  limit_edges?: number;
}): Promise<GraphResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.limit_entities) query.set('limit_entities', params.limit_entities.toString());
    if (params?.limit_edges) query.set('limit_edges', params.limit_edges.toString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/graph/overview?${query.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to load graph overview: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Knowledge Engine API] Graph overview unreachable, serving curated graph:`, err);
    return getCuratedGraphData();
  }
}
