from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session as DBSession

from dependencies import get_engine
from models.db import QueryLog, ResponseFeedback

router = APIRouter(tags=["feedback"])


class FeedbackRequest(BaseModel):
    log_id: str
    is_positive: bool
    comment: str | None = None

    @field_validator('comment')
    @classmethod
    def comment_max_length(cls, v):
        if v is not None and len(v) > 500:
            raise ValueError('Comment must not exceed 500 characters')
        return v


@router.post("/feedback")
def post_feedback(body: FeedbackRequest, engine=Depends(get_engine)):
    with DBSession(engine) as session:
        log = session.query(QueryLog).filter(QueryLog.id == body.log_id).first()
        if log is None:
            raise HTTPException(status_code=404, detail="Query log not found")

        existing = session.query(ResponseFeedback).filter(ResponseFeedback.log_id == body.log_id).first()
        if existing:
            existing.is_positive = body.is_positive
            existing.comment = body.comment
            existing.updated_at = datetime.now(UTC)
            session.commit()
            session.refresh(existing)
            record = existing
        else:
            record = ResponseFeedback(
                log_id=body.log_id,
                is_positive=body.is_positive,
                comment=body.comment,
            )
            session.add(record)
            session.commit()
            session.refresh(record)

        return {
            "id": record.id,
            "log_id": record.log_id,
            "is_positive": record.is_positive,
            "comment": record.comment,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
        }
