# Feature Specification: LLM-as-Judge Evaluation Scoring

**Feature Branch**: `010-eval-llm-judge`
**Created**: 2026-02-25
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Real Faithfulness Score (Priority: P1)

A developer triggers the evaluation run and receives a faithfulness score that reflects
whether generated answers are actually grounded in the retrieved context — not a hardcoded 1.0.

**Why this priority**: Faithfulness is the most critical RAG metric. A hardcoded score gives
false confidence. This is the core value of the feature.

**Independent Test**: Trigger `POST /api/v1/evaluation/run`, wait for completion, call
`GET /api/v1/evaluation/report` and verify `faithfulness` is a float between 0.0 and 1.0
that varies across runs with different corpora.

**Acceptance Scenarios**:

1. **Given** a question with retrieved context, **When** the evaluation runs, **Then** the faithfulness score reflects LLM judgment of whether the answer stays within the context (not always 1.0).
2. **Given** an answer that contradicts the context, **When** the judge evaluates it, **Then** the faithfulness score is below 0.5.
3. **Given** an LLM that returns malformed output, **When** the judge tries to parse the score, **Then** the system falls back to 0.0 without crashing.

---

### User Story 2 — Real Answer Relevancy Score (Priority: P1)

A developer receives an answer_relevancy score that reflects whether the generated answer
actually addresses the question asked.

**Why this priority**: Equally critical to faithfulness — together they constitute meaningful
RAG quality measurement. Same priority level.

**Independent Test**: Trigger evaluation, verify `answer_relevancy` in the report is a float
varying between questions, not a constant 1.0.

**Acceptance Scenarios**:

1. **Given** a question and a relevant answer, **When** the judge evaluates, **Then** the relevancy score is above 0.5.
2. **Given** a question and an off-topic answer, **When** the judge evaluates, **Then** the relevancy score is below 0.5.
3. **Given** the judge LLM fails to return valid JSON, **When** the score is parsed, **Then** the system returns 0.0 and continues evaluating remaining questions.

---

### User Story 3 — Per-Question Scores in Report (Priority: P2)

A developer reading the evaluation report can see faithfulness and relevancy scores
broken down per question, not just aggregated averages.

**Why this priority**: Aggregate scores are useful but per-question breakdown enables
diagnosing which specific questions the RAG pipeline handles poorly.

**Independent Test**: After an eval run, read `reports/eval.md` and verify each row in
the per-question table includes faithfulness and relevancy values.

**Acceptance Scenarios**:

1. **Given** an evaluation has run, **When** the report is read, **Then** each question row shows its faithfulness score and relevancy score.
2. **Given** a judge failure on one question, **When** the report is generated, **Then** that question shows 0.0 for the failed metric without omitting the row.

---

### Edge Cases

- What happens when the LLM returns a score outside [0.0, 1.0]? → Clamp to [0.0, 1.0].
- What happens when the context is empty (no chunks retrieved)? → Skip judge calls, score = 0.0.
- What happens if Ollama is unreachable mid-evaluation? → Question scores 0.0, evaluation continues for remaining questions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The evaluation runner MUST generate an answer for each question using the RAG provider before computing judge scores.
- **FR-002**: The evaluation runner MUST compute a faithfulness score (0.0–1.0) for each question by asking the LLM whether the answer is grounded in the retrieved context.
- **FR-003**: The evaluation runner MUST compute an answer_relevancy score (0.0–1.0) for each question by asking the LLM whether the answer addresses the question.
- **FR-004**: Judge scores MUST be parsed from a structured LLM response (`{"score": float}`); a regex fallback MUST extract the score if JSON parsing fails.
- **FR-005**: On any judge failure (parse error, LLM unavailable), the score MUST default to 0.0 and evaluation MUST continue for remaining questions.
- **FR-006**: Scores MUST be clamped to [0.0, 1.0] regardless of LLM output.
- **FR-007**: The evaluation report MUST include per-question faithfulness and relevancy scores in addition to aggregated averages.
- **FR-008**: The judge logic MUST live in a dedicated module, separate from the runner.

### Key Entities

- **Judge**: Stateless component that takes (provider, inputs) and returns a float score via LLM prompt.
- **EvaluationResult**: Persisted record — the per-question JSON payload is extended with faithfulness and relevancy scores per question.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After an evaluation run on the 15-question dataset, `faithfulness` and `answer_relevancy` values in the report are floats that differ from each other and are not all 1.0.
- **SC-002**: The evaluation loop never crashes due to a judge failure — all 15 questions always produce a result row.
- **SC-003**: Per-question faithfulness and relevancy scores are visible in the generated Markdown report for every question.
- **SC-004**: All existing tests continue to pass after the change (no regression).
- **SC-005**: New judge functions have unit tests covering happy path, malformed JSON fallback, and out-of-range score clamping.

## Assumptions

- The same provider used for RAG generation is used for judging (no separate judge model configured).
- The existing low-temperature setting is sufficient for judge determinism.
- The "no information" fallback answer is treated as a valid answer by the judge.
- Evaluation already runs in a background task — added latency from judge calls is acceptable.
- The per-question JSON field in the database is backwards-compatible with new keys added.
