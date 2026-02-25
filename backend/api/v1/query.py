import json
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.logging import get_logger
from dependencies import get_engine, get_provider, get_vectorstore
from guardrails.input import InputGuardrail
from logging_service.store import LogStore
from rag.pipeline import RAGPipeline

router = APIRouter(tags=["query"])
_guardrail = InputGuardrail()
logger = get_logger(__name__)


class HistoryEntry(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class QueryRequest(BaseModel):
    question: str
    history: list[HistoryEntry] = []


@router.post("/query")
def query(
    request: QueryRequest,
    provider=Depends(get_provider),
    vectorstore=Depends(get_vectorstore),
    engine=Depends(get_engine),
):
    logger.info("Query received: %d chars", len(request.question))
    log_store = LogStore(engine=engine)
    check = _guardrail.check(request.question)
    if not check.passed:
        log_store.save(
            question=request.question,
            retrieved_sources=[],
            similarity_scores=[],
            answer="",
            faithfulness_score=0.0,
            latency_ms=0,
            guardrail_triggered=check.reason,
        )
        raise HTTPException(status_code=400, detail=check.reason)

    result = RAGPipeline(provider=provider, vectorstore=vectorstore).query(request.question, history=request.history)
    log_store.save(
        question=request.question,
        retrieved_sources=[s["source"] for s in result.sources],
        similarity_scores=[s["score"] for s in result.sources],
        answer=result.answer,
        faithfulness_score=result.confidence_score,
        latency_ms=result.latency_ms,
        guardrail_triggered=None,
    )
    logger.info("Query answered: confidence=%.3f latency=%dms", result.confidence_score, result.latency_ms)
    return {
        "answer": result.answer,
        "sources": result.sources,
        "confidence_score": result.confidence_score,
        "low_confidence": result.low_confidence,
        "latency_ms": result.latency_ms,
    }


@router.post("/query/stream")
def query_stream(
    request: QueryRequest,
    provider=Depends(get_provider),
    vectorstore=Depends(get_vectorstore),
    engine=Depends(get_engine),
):
    # Guardrail check before starting the stream to avoid unnecessary processing and resource usage
    check = _guardrail.check(request.question)
    log_store = LogStore(engine=engine)
    if not check.passed:
        log_store.save(
            question=request.question,
            retrieved_sources=[],
            similarity_scores=[],
            answer="",
            faithfulness_score=0.0,
            latency_ms=0,
            guardrail_triggered=check.reason,
        )
        raise HTTPException(status_code=400, detail=check.reason)

    pipeline = RAGPipeline(provider=provider, vectorstore=vectorstore)

    # Generator function to yield SSE events as they are produced by the pipeline
    def generate():
        meta = None
        done = None
        for event in pipeline.stream_query(request.question, history=request.history):
            yield event
            try:
                payload = json.loads(event.removeprefix("data: ").strip())
                if payload.get("type") == "meta":
                    meta = payload
                elif payload.get("type") == "done":
                    done = payload
            except Exception:
                pass
        if meta and done:
            log_store.save(
                question=request.question,
                retrieved_sources=[s["source"] for s in meta.get("sources", [])],
                similarity_scores=[s["score"] for s in meta.get("sources", [])],
                answer=done.get("answer", ""),
                faithfulness_score=meta.get("confidence_score", 0.0),
                latency_ms=done.get("latency_ms", 0),
                guardrail_triggered=None,
            )

    #    Return a streaming response with appropriate headers for SSE
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
