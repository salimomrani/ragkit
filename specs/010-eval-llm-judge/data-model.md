# Data Model: LLM-as-Judge Evaluation Scoring

## No Schema Changes

The `evaluation_results` table schema is unchanged. The `per_question` column stores JSON —
adding new keys is backwards-compatible.

## Extended per_question Entry Shape

Each element in the `per_question` JSON array gains two new fields:

```json
{
  "question": "string",
  "expected_source": "string",
  "source_found": true,
  "answer_length": 42,
  "faithfulness_score": 0.85,
  "relevancy_score": 0.90
}
```

| Field | Type | Description |
|---|---|---|
| `faithfulness_score` | float [0.0–1.0] | LLM judge: is the answer grounded in the context? |
| `relevancy_score` | float [0.0–1.0] | LLM judge: does the answer address the question? |

## New Module: quality/judge.py

```
score_faithfulness(provider, context: str, answer: str) -> float
score_answer_relevancy(provider, question: str, answer: str) -> float
_parse_score(text: str) -> float   # internal helper
```

All functions are stateless and pure (given provider mock).
