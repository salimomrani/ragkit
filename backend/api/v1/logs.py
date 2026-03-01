import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.config import settings
from dependencies import get_engine
from models.db import QueryLog, ResponseFeedback

router = APIRouter(tags=["logs"])


def _parse_json_list(value, default):
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else default
        except json.JSONDecodeError:
            return default
    return default


@router.get("/logs")
def get_logs(limit: int = settings.default_logs_limit, engine=Depends(get_engine)):
    with Session(engine) as session:
        rows = (
            session.query(QueryLog, ResponseFeedback)
            .outerjoin(ResponseFeedback, ResponseFeedback.log_id == QueryLog.id)
            .order_by(QueryLog.timestamp.desc())
            .limit(limit)
            .all()
        )

    result = []
    for log, feedback in rows:
        feedback_data = None
        if feedback is not None:
            feedback_data = {
                "is_positive": feedback.is_positive,
                "comment": feedback.comment,
                "updated_at": feedback.updated_at.isoformat(),
            }
        result.append(
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "question_masked": log.question_masked,
                "retrieved_sources": _parse_json_list(getattr(log, "retrieved_sources", None), []),
                "similarity_scores": _parse_json_list(log.similarity_scores, []),
                "answer": log.answer,
                "faithfulness_score": log.faithfulness_score,
                "latency_ms": log.latency_ms,
                "guardrail_triggered": log.guardrail_triggered,
                "rejected": log.guardrail_triggered is not None,
                "rejection_reason": log.guardrail_triggered,
                "feedback": feedback_data,
            }
        )
    return result
