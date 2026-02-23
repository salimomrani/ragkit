from fastapi import APIRouter, Depends

from api.v1 import evaluation, ingest, logs, query
from auth.dependencies import get_current_user
from auth.router import router as auth_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(query.router, dependencies=[Depends(get_current_user)])
api_router.include_router(ingest.router, dependencies=[Depends(get_current_user)])
api_router.include_router(logs.router, dependencies=[Depends(get_current_user)])
api_router.include_router(evaluation.router, dependencies=[Depends(get_current_user)])
