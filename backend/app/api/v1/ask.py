from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.ask import AskRequest, AskResponse
from app.services.rag_service import rag_service

router = APIRouter()

@router.post("/ask", response_model=None, tags=["rag"])
async def ask_question(
    req: AskRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ask a question against the Open Library Knowledge Engine.
    Returns a grounded answer with strict bracketed citations [1], [2] to reference literature.
    Supports either JSON response or real-time Server-Sent Events (SSE) streaming.
    """
    if req.stream:
        return StreamingResponse(
            rag_service.stream_answer(query=req.question, top_k=req.top_k, db=db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    return await rag_service.answer(query=req.question, top_k=req.top_k, db=db)

@router.get("/ask", tags=["rag"])
async def ask_question_stream(
    q: str = Query(..., min_length=2, description="Question to answer"),
    top_k: int = Query(5, ge=1, le=20, description="Number of passages to retrieve"),
    db: AsyncSession = Depends(get_db)
):
    """
    Browser-friendly GET endpoint for direct EventSource / SSE connection.
    Streams answer tokens in real-time.
    """
    return StreamingResponse(
        rag_service.stream_answer(query=q, top_k=top_k, db=db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
