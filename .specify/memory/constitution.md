<!-- Sync Impact Report
Version change: 1.0.0 → 1.1.0
Changes: SQLite → PostgreSQL (Principle II), Streaming moved Out of Scope → In Scope
Rationale: PostgreSQL adopted from day 1 (DECISIONS.md #1); SSE streaming implemented (DECISIONS.md #4, FR-019/020)
Templates requiring updates: ✅ all templates consistent with principles
Deferred TODOs: none
-->

# PALO RAG Constitution

## Core Principles

### I. Local-First & Privacy by Design

All AI inference MUST run locally via Ollama. No user data, queries, or documents MUST ever leave the machine. PII (email addresses, phone numbers) MUST be masked before being written to any log or database. This is a hard architectural constraint that supersedes performance or convenience considerations.

### II. Traceability Over Opacity

Every query MUST produce a traceable log entry containing: question (PII-masked), retrieved context IDs, generated answer, quality/confidence score, latency, and guardrail status. The system MUST be fully auditable end-to-end with no hidden state. Log entries MUST be queryable via the API. Logs are persisted in PostgreSQL.

### III. Fail Transparently, Never Silently

When the system cannot answer confidently (low similarity score, guardrail triggered, no chunks retrieved), it MUST respond with a clear, explicit message rather than generating a hallucinated response. A guardrail refusal is a success outcome. The system MUST NEVER pretend to know something it does not.

### IV. Separation of Concerns

The RAG pipeline (ingestion, retrieval, generation), guardrails, and evaluation MUST be independent modules with clear interfaces. The AI provider MUST be abstracted behind an `AIProvider` interface to allow swapping Ollama for Gen-e2 via a single environment variable. Frontend changes MUST NOT require backend RAG changes and vice versa.

### V. Demo-Ready Reproducibility

Any reviewer MUST be able to run the complete stack in under 5 minutes from a clean checkout using only three commands (backend setup, corpus ingestion, frontend serve). No cloud dependencies, external API keys, or infrastructure setup MUST be required for the demo environment.

## Scope

### In Scope
- Document ingestion (Markdown, plain text)
- Semantic search and RAG-based Q&A with source attribution
- Input/output guardrails (injection, length, off-topic, low-confidence)
- Query traceability with structured PostgreSQL logging
- Automated quality evaluation with RAGAS-style metrics
- Angular 21 UI: Chat, Ingest, Logs views
- Gen-e2 mock via abstraction layer
- SSE streaming responses (ChatGPT-style UX via native fetch + ReadableStream)

### Out of Scope
- Authentication and user management
- Multi-tenancy
- Cloud/production deployment
- Reranking (next-step)

## Governance

The specification (`spec.md`) is the source of truth for WHAT to build. The plan (`plan.md`) defines HOW. Any deviation from `spec.md` must be documented in `DECISIONS.md` with explicit rationale. All PRs must verify compliance with the five Core Principles. Constitution amendments require a version bump with documented rationale.

**Version**: 1.1.0 | **Ratified**: 2026-02-19 | **Last Amended**: 2026-03-10
