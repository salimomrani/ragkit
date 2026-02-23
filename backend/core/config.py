from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ai_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "qwen2.5:7b"
    embed_model: str = "mxbai-embed-large"
    chroma_path: str = "./chroma_data"
    db_url: str = "postgresql://palo:palo@localhost:5444/palo_rag"

    # LLM tuning
    llm_temperature: float = 0.1

    # RAG tuning
    top_k: int = 4
    min_retrieval_score: float = 0.3
    low_confidence_threshold: float = 0.5
    no_info_message: str = "Je n'ai pas d'information sur ce sujet dans la base de connaissance."

    # Ingestion tuning
    chunk_size: int = 500
    chunk_overlap: int = 50

    # Guardrails
    guardrail_min_length: int = 6
    guardrail_max_length: int = 500

    # Auth / JWT
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 8
    demo_username: str = "admin"
    demo_password_hash: str = ""

    # API tuning
    default_logs_limit: int = 100
    cors_allow_origins: str = "http://localhost:4200"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]


settings = Settings()
