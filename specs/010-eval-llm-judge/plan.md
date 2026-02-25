# Implementation Plan: LLM-as-Judge Evaluation Scoring

**Branch**: `010-eval-llm-judge` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)

## Summary

Replace hardcoded `1.0` faithfulness and answer_relevancy scores in `quality/runner.py`
with real LLM-as-judge calls. A new `quality/judge.py` module exposes two pure functions
(`score_faithfulness`, `score_answer_relevancy`) that prompt the local Ollama LLM and parse
a float score from the response. The runner generates an answer per question (using the
existing RAG prompt), then calls both judges. The Markdown report gains per-question columns.

## Technical Context

**Language/Version**: Python 3.12
**Primary Dependencies**: FastAPI, LangChain-Chroma, Ollama (all existing) — no new packages
**Storage**: PostgreSQL 16 (per-question JSON field extended — no schema migration)
**Testing**: pytest
**Target Platform**: Local dev server (Darwin / Linux)
**Project Type**: Backend-only change
**Performance Goals**: Eval run completes within ~10 minutes for 15 questions (3 LLM calls each)
**Constraints**: All inference local (Ollama) — no network calls outside machine
**Scale/Scope**: 15 reference questions, background task

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First | ✅ Pass | All judge calls via local Ollama (`provider.generate`) |
| II. Traceability | ✅ Pass | Per-question scores persisted to DB and report |
| III. Fail Transparently | ✅ Pass | Judge failures → 0.0, logged, never crash loop |
| IV. Separation of Concerns | ✅ Pass | `judge.py` independent from runner and pipeline |
| V. Demo-Ready | ✅ Pass | No new deps; same three-command setup |

## Project Structure

### Documentation (this feature)

```text
specs/010-eval-llm-judge/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code Changes

```text
backend/
├── quality/
│   ├── judge.py          ← NEW: score_faithfulness, score_answer_relevancy, _parse_score
│   └── runner.py         ← MODIFIED: add generate + judge calls, new per_question fields
│   └── report.py         ← MODIFIED: add faithfulness/relevancy columns to per-question table
└── tests/
    ├── test_quality_judge.py    ← NEW: unit tests for judge module
    └── test_quality_runner.py   ← MODIFIED: assert judge calls and new per_question fields
```

## Implementation Details

### quality/judge.py

Two judge prompts (French, matching corpus language):

**Faithfulness prompt** — given context + answer, returns `{"score": float}`:
```
Évalue la fidélité de cette réponse au contexte fourni.
Contexte : {context}
Réponse : {answer}
La réponse contient-elle uniquement des informations présentes dans le contexte ?
Réponds uniquement avec un JSON : {"score": float} où 1.0 = entièrement fidèle, 0.0 = pas fidèle.
```

**Answer relevancy prompt** — given question + answer, returns `{"score": float}`:
```
Évalue la pertinence de cette réponse par rapport à la question posée.
Question : {question}
Réponse : {answer}
La réponse répond-elle directement à la question ?
Réponds uniquement avec un JSON : {"score": float} où 1.0 = parfaitement pertinente, 0.0 = hors sujet.
```

**Score parsing** (`_parse_score`):
1. Try `json.loads(text)["score"]` — clamped to [0.0, 1.0]
2. Fallback: regex `r'"score"\s*:\s*([0-9]+(?:\.[0-9]+)?)'`
3. Final fallback: `0.0`

Both public functions wrap the LLM call in `try/except Exception → return 0.0`.

### quality/runner.py changes

Per-question loop additions (after existing similarity search):

```python
# Build context string (mirrors pipeline._build_context)
context_str = "\n\n".join(
    f"[Source: {doc.metadata.get('source', 'unknown')}]\n{doc.page_content}"
    for doc, _ in docs_and_scores
)

# Generate answer
answer = provider.generate(RAG_PROMPT.format(context=context_str, question=question))
answer_length = len(answer)

# LLM-as-judge scores
faithfulness = score_faithfulness(provider, context_str, answer)
relevancy = score_answer_relevancy(provider, question, answer)
```

`per_question` entry gains `faithfulness_score` and `relevancy_score`.
Aggregate `faithfulness_scores` and `answer_relevancy_scores` lists use real values.

### quality/report.py changes

Per-question table header:
```
| # | Question | Source Found | Faithfulness | Relevancy | Answer Length |
```

Each row includes `faithfulness_score` and `relevancy_score` formatted to 2 decimal places.

## Test Plan

### test_quality_judge.py (new)

| Test | Setup | Assert |
|------|-------|--------|
| `test_parse_score_valid_json` | response = `'{"score": 0.85}'` | returns `0.85` |
| `test_parse_score_json_in_text` | response = `'... {"score": 0.9} ...'` | returns `0.9` |
| `test_parse_score_malformed` | response = `'no json here'` | returns `0.0` |
| `test_parse_score_clamp_high` | response = `'{"score": 1.5}'` | returns `1.0` |
| `test_parse_score_clamp_low` | response = `'{"score": -0.3}'` | returns `0.0` |
| `test_score_faithfulness_happy` | mock `provider.generate` → `'{"score": 0.8}'` | returns `0.8` |
| `test_score_faithfulness_empty_context` | context = `""` | returns `0.0`, no LLM call |
| `test_score_faithfulness_provider_error` | mock raises `Exception` | returns `0.0` |
| `test_score_relevancy_happy` | mock `provider.generate` → `'{"score": 0.75}'` | returns `0.75` |
| `test_score_relevancy_provider_error` | mock raises `Exception` | returns `0.0` |

### test_quality_runner.py updates

- Assert `per_question[0]` has keys `faithfulness_score` and `relevancy_score`
- Assert `scores["faithfulness"]` and `scores["answer_relevancy"]` are floats (not hardcoded 1.0)
- Mock judge functions to avoid live LLM calls in unit tests
