from fastapi import APIRouter

from api.v1 import evaluation, feedback, history, ingest, logs, query

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(query.router)
api_router.include_router(ingest.router)
api_router.include_router(logs.router)
api_router.include_router(evaluation.router)
api_router.include_router(history.router)
api_router.include_router(feedback.router)
