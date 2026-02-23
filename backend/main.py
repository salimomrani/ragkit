from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import api_router
from core.config import settings
from core.exceptions import (
    GuardrailException,
    ProviderUnavailableException,
    VectorStoreException,
    guardrail_exception_handler,
    provider_unavailable_handler,
    vectorstore_exception_handler,
)
from core.logging import get_logger

logger = get_logger(__name__)

app = FastAPI(title="PALO RAG API", version="1.0.0", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

app.add_exception_handler(GuardrailException, guardrail_exception_handler)
app.add_exception_handler(ProviderUnavailableException, provider_unavailable_handler)
app.add_exception_handler(VectorStoreException, vectorstore_exception_handler)

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}


logger.info("PALO RAG API started")
