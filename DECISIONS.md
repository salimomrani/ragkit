# DECISIONS.md — Trade-offs, Deviations, Limits, Next Steps

## Architectural Decisions

### 1. PostgreSQL 16 via Docker

**Decision**: PostgreSQL 16 via `docker-compose`
**Rationale**: Production-grade persistence with proper connection pooling for concurrent FastAPI workers.

---

### 2. ChromaDB embedded (not a separate vector DB server)

**Spec option**: Any vector store
**Decision**: ChromaDB in embedded mode (in-process, persisted to `./chroma_data/`)
**Rationale**: Zero-infrastructure overhead for local demo. Swappable via the `vectorstore` dependency in `backend/dependencies.py`.

---

### 3. Ollama local models (qwen2.5:7b + mxbai-embed-large)

**Spec option**: Ollama or Gen-e2 (Palo IT's internal LLM)
**Decision**: Ollama with `qwen2.5:7b` for generation, `mxbai-embed-large` for embeddings
**Rationale**: 100% local, zero cost, no API keys. `qwen2.5:7b` offers strong multilingual support (29 languages including French) and 128K context window vs `llama3.2` 3B. `mxbai-embed-large` scores +5pts retrieval on MTEB (54.39 vs 49.01) vs `nomic-embed-text`. The `AIProvider` protocol (`backend/rag/provider.py`) isolates the LLM behind an interface — swapping to Gen-e2 requires only a new class implementing `generate()`, `stream_generate()`, and `embed()`.

---

### 4. Streaming via native fetch + ReadableStream (not Angular HttpClient)

**Spec**: SSE streaming for ChatGPT-style UX
**Decision**: Angular service uses `fetch()` with `ReadableStream` for the SSE stream endpoint
**Rationale**: Angular's `HttpClient` does not natively support streaming POST responses as an Observable of chunks. Native fetch gives full control over SSE parsing without additional libraries.

---

### 5. `similarity_search_with_relevance_scores` for confidence scoring

**Initial implementation**: `similarity_search_with_score` (L2 distance, unbounded)
**Final implementation**: `similarity_search_with_relevance_scores` (normalized to [0,1])
**Rationale**: L2 distances are not human-interpretable percentages. The relevance score API provides [0,1] values directly comparable to the confidence threshold (`LOW_CONFIDENCE_THRESHOLD = 0.5`). Results are further clamped: `max(0.0, min(1.0, score))`.

---

### 6. Evaluation metrics: mocked faithfulness and answer_relevancy (MVP constraint)

**Decision**: `faithfulness` and `answer_relevancy` scores are hardcoded to `1.0` in `quality/runner.py`; only `context_recall` is computed meaningfully (source presence check).
**Rationale**: Local Ollama setup on a single machine cannot sustain 3 concurrent LLM calls per question (1 RAG answer + 1 faithfulness judge + 1 relevancy judge) × 15 questions = 45 sequential LLM calls without OOM/timeout risk.
**Limit**: `faithfulness=1.0` and `answer_relevancy=1.0` are not real measurements — they are placeholders. The eval report scores are only meaningful for `context_recall`.
**Next step**: Implement `quality/judge.py` with `score_faithfulness(provider, context, answer)` and `score_answer_relevancy(provider, question, answer)`, each calling the local LLM with a structured prompt returning `{"score": float}`. Activate once hardware or a hosted Ollama instance can handle the load without impacting concurrent user queries.

---

### 7. Input guardrails: regex, not LLM-as-judge

**Alternative considered**: Send the question to a local LLM to validate whether it is relevant/appropriate (LLM-as-judge pattern) — eliminates the need for a pattern dictionary, better semantic coverage (indirect injection, paraphrased jailbreaks, off-topic questions phrased politely).
**Decision**: Regex + wordlist for injection detection and offensive content filtering
**Rationale**: Zero added latency (~0ms vs ~1–2s for an extra LLM call), 100% offline, deterministic and unit-testable. For a demo, test reliability takes priority over semantic robustness.
**Limit**: Bypassable via paraphrase; does not detect off-scope questions phrased politely.
**Next step**: Add a pre-pipeline LLM call (`is_relevant(question) → bool`) via the same `OllamaProvider` — no external dependency, just +1s latency on rejected requests.

---

### 8. PII masking (regex-based, not ML)

**Decision**: Regex patterns for emails, phone numbers, French SSN, credit cards
**Rationale**: Sufficient for a demo corpus. No external dependencies, fully offline.
**Limit**: False negatives on less common PII formats; a production system would use a dedicated NER model (spaCy, presidio).

---

### 9. RAG prompt design (context-first, no CoT, no few-shot)

**Decision**: Single-turn prompt — system persona + 4 strict rules + context block + question (`backend/rag/prompts.py`)
**Alternatives considered**:

- **Chain-of-Thought (CoT)**: Would increase answer quality on complex reasoning but adds tokens and latency; overkill for FAQ-style retrieval.
- **Few-shot examples**: Improves output format consistency but hard-codes domain assumptions and inflates context window.
- **Citation format** (e.g., `[Doc #1]`): Sources are already surfaced separately in the SSE `meta` event — embedding them in the LLM answer would create redundancy and hallucination risk on IDs.
  **Rationale**: The 4-rule instruction set (respond in French, stay grounded, refuse gracefully, no filler phrases) is the minimal effective prompt for a support RAG assistant. Rules are explicit rather than implied, making them auditable and easy to tune.

---

### 10. LLM temperature = 0.1

**Default**: Ollama default ~0.8 (creative)
**Decision**: `llm_temperature=0.1` (configurable via `LLM_TEMPERATURE` env var)
**Rationale**: RAG requires deterministic, factual answers. High temperature increases hallucination risk. 0.1 gives quasi-deterministic output while preserving minimal paraphrasing variety. Configurable to allow A/B testing without code changes.

---

### 11. `keep_alive=-1` on ChatOllama (LLM stays in GPU)

**Default**: Ollama evicts models after ~5 min of inactivity
**Decision**: `keep_alive=-1` on `ChatOllama` only (model stays loaded indefinitely while the backend runs)
**Rationale**: Without this, the LLM is unloaded from GPU between requests → 20–45s cold-start latency per query, unacceptable for a demo. `OllamaEmbeddings` does not support `keep_alive` in the installed LangChain version; the embed model (762 MB) reloads quickly enough to be acceptable.

---

### 12. Audit log data retention (no TTL, no anonymisation beyond PII masking)

**Decision**: Query logs stored indefinitely in PostgreSQL; questions PII-masked at write time; no TTL, no user identity stored
**Rationale**: For a local demo there is no regulatory constraint. PII masking at ingestion (emails, phone numbers) satisfies the minimal privacy requirement without a full GDPR retention policy.
**Limit**: A production deployment would require a defined retention period (e.g., 90 days), a right-to-erasure endpoint, and a data processing agreement if questions contain personal data beyond what the regex catches.

---

### 13. Chunk filename prefix for retrieval grounding

**Problem**: Context Recall was 0.47 — 8/15 questions failed to retrieve the expected source.
**Root causes**: (1) quality runner used k=3 vs pipeline k=4; (2) queries like "ticket 001" had no semantic anchor (actual IDs: TKT-00142, etc.); (3) embedding distances placed wrong docs higher.
**Fix**: Prepend `[source.md]` to every chunk at ingestion; align runner k to `settings.top_k`; add `Référence interne: ticket-001` alias to ticket-001.md.
**Result**: Context Recall 0.47 → **1.00** (15/15).

---

### 14. Chat session memory — 6-turn default cap (spec says 10)

**Spec**: history cap at 10 exchanges (20 messages)
**Decision**: Frontend sends last 6 turns (12 messages); backend silently truncates to 10 entries
**Rationale**: Qwen 2.5 7B has an ~8k token context window. With top-4 retrieval chunks (~2,000 tokens), template overhead (~300 tokens), and the current question (~200 tokens), the remaining budget is ~5,500 tokens. 6 turns (~1,200 tokens average) fits comfortably within this budget while preserving quality. Research shows 7B models degrade with "lost in the middle" effect beyond 6k tokens. The spec cap of 10 is the accepted maximum; 6 is the practical default.
**Limit**: Long assistant answers can exhaust the budget faster; this could be mitigated by truncating individual history entries to a character limit.

---

### 15. GitHub Actions CI — path filtering, no deployment

**Decision**: Single `ci.yml` with 5 jobs: `changes` (path detection) + `backend-lint`, `backend-test`, `frontend-lint`, `frontend-test`
**Path filtering**: `dorny/paths-filter@v3` — backend jobs fire only on `backend/**` changes, frontend jobs only on `frontend/**`
**Lint gating**: `backend-test` and `frontend-test` both declare `needs: [changes, <lint-job>]` — tests are skipped when lint fails
**No deployment**: CI validates quality only; no staging or production push
**Rationale**: Path filtering avoids running the full pipeline on unrelated changes (e.g., a doc edit does not trigger pytest). `ruff --output-format=github` produces inline PR annotations. The single-file approach keeps the workflow self-contained without matrix complexity.

---

## Known Limitations

| Limitation                      | Impact                                                                                               | Mitigation                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No document chunking overlap    | Adjacent context can be lost at chunk boundaries                                                     | Add `chunk_overlap=100` in `RecursiveCharacterTextSplitter`                                                                                                 |
| No reranker                     | Top-4 retrieved chunks may not be the most relevant                                                  | Add a cross-encoder reranker (e.g., `cross-encoder/ms-marco-MiniLM-L-6-v2`)                                                                                 |
| ~~Session memory (no persistence)~~ | ✅ **Résolu en spec 010** — historique persistant par session avec panel slide-in | — |
| No authentication               | Any client can ingest/delete documents                                                               | Add API key middleware or OAuth2 for production                                                                                                             |
| Corpus is synthetic             | 15 Markdown docs created for the demo                                                                | Replace with real internal docs                                                                                                                             |
| mxbai-embed-large context limit | 512-token context window (vs 8192 nomic)                                                             | Ensure chunk_size ≤ 400 tokens in ingestion                                                                                                                 |
| Regex guardrails                | Injection/offensive detection via patterns, bypassable                                               | Add a secondary LLM-based content moderation layer                                                                                                          |
| No semantic cache               | Every query hits the LLM regardless of prior identical/similar questions; wasted latency and compute | Add embedding-based cache: embed the question, find nearest cached entry (cosine similarity > threshold), return cached answer; invalidate on corpus update |
| No data retention policy        | Logs accumulate indefinitely; no TTL, no erasure API                                                 | Define retention period, add scheduled purge job, expose DELETE /logs/{id}                                                                                  |
| Mocked eval metrics             | `faithfulness` and `answer_relevancy` are hardcoded to `1.0`; only `context_recall` is real          | Implement `quality/judge.py` LLM-as-judge calls when hardware allows (see Decision #6)                                                                      |

---

## What Was Built vs. Spec

| Feature                     | Status     | Notes                                                        |
| --------------------------- | ---------- | ------------------------------------------------------------ |
| RAG query endpoint          | ✅ done    | + streaming variant                                          |
| Document ingestion          | ✅ done    | + duplicate guard (409)                                      |
| Input guardrails            | ✅ done    | + offensive content (FR/EN)                                  |
| Audit logging + PII masking | ✅ done    | PostgreSQL-backed                                            |
| Quality evaluation          | ✅ done    | 15-Q reference dataset                                       |
| Angular UI                  | ✅ done    | Chat + Ingest + Logs + Eval views                            |
| Document delete             | ✅ added   | FR-017                                                       |
| SSE streaming               | ✅ added   | FR-019/020                                                   |
| Duplicate ingestion guard   | ✅ added   | FR-018                                                       |
| BDD scenarios               | ✅ done    | pytest unit tests cover all user stories (no Gherkin format) |
| Gen-e2 integration          | 🔜 stretch | AIProvider ready, needs credentials                          |
| Angular ESLint rules        | ✅ added   | Best-practice ruleset (002)                                  |
| Bulk document delete        | ✅ added   | Multi-select delete with confirmation (003)                  |
| Chat markdown rendering     | ✅ added   | Markdown + code highlighting in chat answers (004)           |
| Frontend unit tests         | ✅ added   | Vitest-based test suite for Angular components (005)         |
| CI/CD pipeline              | ✅ added   | GitHub Actions: path-filtered lint + test jobs (006)         |
| Chat session memory         | ✅ added   | Session-scoped history (last 6 turns) passed per query (007) |

---

## Next Steps (production roadmap)

1. **Reranker**: Add cross-encoder reranking after retrieval for better precision
2. **Named persistent sessions**: Multi-turn chat with user-scoped, named sessions (e.g., "congé", "paye") — each session stores its turn history in PostgreSQL, users can resume any past session; inject the last N turns into the RAG prompt for contextual continuity; session list and history exposed via API + UI
3. **Gen-e2 provider**: Implement `GenE2Provider(AIProvider)` once API credentials are available
4. **Best practices corpus**: Replace synthetic docs with real Palo IT knowledge base
5. **Authentication**: API key or OAuth2 for document management endpoints
6. **Evaluation automation**: Schedule daily quality runs, alert on score regression
7. **Chunk overlap**: Enable `chunk_overlap=100` to reduce boundary-split context loss
8. **Observability**: OpenTelemetry traces for latency breakdown (embed / retrieve / generate)
9. **LLM-as-judge guardrail**: Replace regex with an `is_relevant(question)` call to the local LLM for semantic detection of off-scope questions and paraphrased injections
10. **Semantic cache**: Embed the incoming question, look up nearest cached entry (cosine similarity above threshold), return cached answer if hit — eliminates LLM call for repeated or paraphrased questions; invalidate cache on document ingest/delete
11. **MLOps pipeline**: Model versioning (track embed/LLM model per log entry), prompt version registry, A/B testing harness for prompt variants, automated drift detection on quality scores
12. **Multi-tenancy**: Isolate documents, logs, and RAG context per organisation — single instance serving multiple clients with strict data separation
13. **Cloud/production deployment**: Containerise backend + frontend (Docker Compose → Kubernetes), add secrets management (Vault or cloud KMS), extend CI with deployment jobs (staging → prod), health checks, and horizontal scaling
