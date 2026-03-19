# Cost Report — RagKit Knowledge Assistant

---

## AI Inference Costs (product runtime)

| Component | Unit cost | Estimated volume (demo) | Total |
|-----------|-----------|-------------------------|-------|
| Ollama — LLM (`qwen2.5:7b`) | €0 (local) | ~30 demo requests | **€0** |
| Ollama — Embeddings (`mxbai-embed-large`) | €0 (local) | ~200 embeddings (ingestion + queries) | **€0** |
| Custom LLM (if enabled in prod) | TBD | — | — |

**Total AI inference: €0** (100% local stack)

---

## Development Costs (Claude Code)

| Item | Cost |
|------|------|
| Claude Code Pro subscription | €15/month (flat rate, unlimited usage) |
| Sessions used for this project | ~1 month (6 specs implemented: 001–006) |
| **Total development** | **~€15** |

> Token-level tracking not applicable — Pro subscription is flat rate.
>
> Scope: RAG core (001), Angular ESLint rules (002), bulk delete (003), chat markdown rendering (004), frontend unit tests (005), GitHub Actions CI pipeline (006).

---

## Infrastructure Costs (local demo)

| Component | Cost |
|-----------|------|
| Server | €0 (local MacBook) |
| PostgreSQL / ChromaDB | €0 (embedded, local) |
| Ollama | €0 (open source) |
| Angular CLI | €0 (open source) |
| GitHub Actions CI | €0 (free tier — public repo, < 2,000 min/month) |
| **Total infrastructure** | **€0** |

---

## Total Project Cost (MVP demo)

| Category | Cost |
|----------|------|
| AI runtime (Ollama, local) | €0 |
| Development (Claude Code Pro) | ~€15 |
| Infrastructure (local + GitHub Actions) | €0 |
| **TOTAL** | **~€15** |

---

## Projection: production cost (custom LLM / cloud)

> Estimates for 100 users, 500 requests/day = ~15,000 requests/month

| Component | Unit price (verified Feb 2026) | Volume/month | Est. cost/month |
|-----------|-------------------------------|--------------|-----------------|
| Embeddings (`text-embedding-3-small`) | $0.02 / 1M tokens | ~7.5M tokens (500 tok × 15K req) | ~$0.15 |
| LLM input (`gpt-4o-mini`) | $0.15 / 1M tokens | ~30M tokens (2K tok × 15K req) | ~$4.50 |
| LLM output (`gpt-4o-mini`) | $0.60 / 1M tokens | ~4.5M tokens (300 tok × 15K req) | ~$2.70 |
| Vector DB (Weaviate Cloud Flex) | $45/month minimum | — | ~$45 |
| Backend hosting (Cloud Run) | ~$0.000024/vCPU-s | light workload | ~$10–15 |
| Frontend hosting (Vercel Pro) | $20/month | — | ~$20 |
| **Total production (100 users)** | | | **~$82–87/month** |

> **Note**: A custom internal LLM would reduce LLM costs to €0 if infrastructure is shared.
> Sources: [OpenAI pricing](https://openai.com/api/pricing/) · [Weaviate pricing](https://weaviate.io/pricing) · [Cloud Run pricing](https://cloud.google.com/run/pricing)

---

## Cost/Value Analysis

**Demo (local PoC):**
- Runtime cost: **€0** — everything runs locally with Ollama
- Dev cost: **~€15** — Claude Code Pro flat subscription

**Production:**
- < €50/month for 100 users = near-immediate ROI vs manual document search
- A custom internal LLM could reduce LLM costs to €0 if infrastructure is shared
