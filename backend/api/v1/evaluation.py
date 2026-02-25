import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies import get_engine, get_provider, get_vectorstore
from models.db import EvaluationResult

router = APIRouter(tags=["evaluation"])
_running = False


def _parse_per_question(value):
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


@router.get("/evaluation/status")
def evaluation_status():
    return {"running": _running}


@router.post("/evaluation/run")
def run_quality_check(
    background_tasks: BackgroundTasks,
    provider=Depends(get_provider),
    vectorstore=Depends(get_vectorstore),
    engine=Depends(get_engine),
):
    import os

    from quality.report import generate_quality_report_md
    from quality.runner import run_quality_check as _run

    global _running
    if _running:
        raise HTTPException(status_code=409, detail="in_progress")

    def _run_and_report():
        global _running
        _running = True
        try:
            scores = _run(provider=provider, vectorstore=vectorstore, engine=engine, limit=None)
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            reports_dir = os.path.join(root_dir, "reports")
            os.makedirs(reports_dir, exist_ok=True)
            report_path = os.path.join(reports_dir, "eval.md")
            generate_quality_report_md(scores=scores, output_path=report_path)
        finally:
            _running = False

    background_tasks.add_task(_run_and_report)
    return {"status": "started"}


@router.get("/evaluation/report")
def get_quality_report(engine=Depends(get_engine)):
    with Session(engine) as session:
        result = (
            session.query(EvaluationResult)
            .order_by(EvaluationResult.run_at.desc())
            .first()
        )
        if not result:
            return {"message": "No evaluation run yet. Call POST /api/evaluation/run first."}
        return {
            "run_at": result.run_at.isoformat(),
            "faithfulness": result.faithfulness,
            "answer_relevancy": result.answer_relevancy,
            "context_recall": result.context_recall,
            "per_question": _parse_per_question(result.per_question),
        }
