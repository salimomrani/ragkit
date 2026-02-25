# Research: LLM-as-Judge Evaluation Scoring

## Decision 1: Answer Generation Strategy

**Decision**: Reuse `RAG_PROMPT` from `rag/prompts.py` directly in the runner — call `provider.generate(RAG_PROMPT.format(context=context_str, question=question))`.

**Rationale**: The runner already has both `provider` and `vectorstore`. Calling `RAGPipeline.query()` would add guardrail filtering and source-building overhead not needed for evaluation. Direct prompt use is simpler and mirrors the pipeline's generation step without side effects.

**Alternatives considered**: Instantiating `RAGPipeline` inside the runner — rejected because it adds min_retrieval_score filtering that would skip questions with low similarity, distorting eval results.

---

## Decision 2: Context String Building

**Decision**: Inline context building in the runner using the same pattern as `pipeline._build_context`:
```python
context_str = "\n\n".join(
    f"[Source: {doc.metadata.get('source', 'unknown')}]\n{doc.page_content}"
    for doc, _ in docs_and_scores
)
```

**Rationale**: `_build_context` is a private function in `pipeline.py`. Copying the pattern (4 lines) avoids importing private internals and keeps `quality/` independent from `rag/pipeline.py` internals (Constitution Principle IV).

**Alternatives considered**: Exporting `_build_context` as public — rejected as over-engineering for a 4-line helper.

---

## Decision 3: Judge Prompt Design

**Decision**: Structured prompts requesting `{"score": float}` JSON output.

**Faithfulness prompt** (does the answer stay within the context?):
```
Évalue la fidélité de cette réponse au contexte fourni.
Contexte : {context}
Réponse : {answer}
La réponse contient-elle uniquement des informations présentes dans le contexte ?
Réponds uniquement avec un JSON : {"score": float} où 1.0 = entièrement fidèle, 0.0 = pas fidèle du tout.
```

**Answer Relevancy prompt** (does the answer address the question?):
```
Évalue la pertinence de cette réponse par rapport à la question posée.
Question : {question}
Réponse : {answer}
La réponse répond-elle directement à la question ?
Réponds uniquement avec un JSON : {"score": float} où 1.0 = parfaitement pertinente, 0.0 = hors sujet.
```

**Rationale**: French prompts match the corpus language and the existing RAG prompt conventions. JSON-only output makes parsing reliable. Brief prompts reduce token count and latency.

**Alternatives considered**: RAGAS-style multi-step decomposition — rejected as overly complex for a local Ollama demo context.

---

## Decision 4: Score Parsing Strategy

**Decision**: Two-pass parsing — JSON first, regex fallback, then 0.0.

```python
def _parse_score(text: str) -> float:
    try:
        return max(0.0, min(1.0, float(json.loads(text)["score"])))
    except Exception:
        match = re.search(r'"score"\s*:\s*([0-9]+(?:\.[0-9]+)?)', text)
        if match:
            return max(0.0, min(1.0, float(match.group(1))))
        return 0.0
```

**Rationale**: LLMs occasionally wrap JSON in markdown code fences or add surrounding text. The regex catches `"score": 0.85` anywhere in the response. Clamping enforces [0.0, 1.0] invariant regardless of LLM output.

---

## Decision 5: Error Isolation

**Decision**: Each judge call is wrapped in `try/except Exception → return 0.0`. The runner loop catches per-question failures and continues.

**Rationale**: Constitution Principle III (Fail Transparently). An eval run with 1 failed question should still produce results for the other 14. Logging the exception (not swallowing silently) satisfies "fail transparently".

---

## Decision 6: No New Dependencies

**Decision**: `json` and `re` are stdlib — no new packages needed.

**Rationale**: Constitution Principle V (Demo-Ready). Adding dependencies would require `pip install` steps.
