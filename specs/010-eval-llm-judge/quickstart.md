# Quickstart: LLM-as-Judge Eval

## Prerequisites

- Backend running: `cd backend && .venv/bin/uvicorn main:app --reload --port 8000`
- Corpus ingested (at least some documents in ChromaDB)
- Ollama running with `qwen2.5:7b`

## Trigger Evaluation

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/evaluation/run | python3 -m json.tool
# {"status": "started"}
```

## Poll Status

```bash
curl -s http://127.0.0.1:8000/api/v1/evaluation/status
# {"running": false}  ← when complete
```

## Read Report

```bash
curl -s http://127.0.0.1:8000/api/v1/evaluation/report | python3 -m json.tool
```

The response will include real `faithfulness` and `answer_relevancy` scores (no longer 1.0):

```json
{
  "faithfulness": 0.78,
  "answer_relevancy": 0.82,
  "context_recall": 0.60,
  "per_question": [
    {
      "question": "...",
      "source_found": true,
      "faithfulness_score": 0.85,
      "relevancy_score": 0.90,
      "answer_length": 142
    }
  ]
}
```

## Read Markdown Report

```bash
cat reports/eval.md
```
