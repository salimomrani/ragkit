# Tasks: LLM-as-Judge Evaluation Scoring

**Input**: Design documents from `/specs/010-eval-llm-judge/`
**Branch**: `010-eval-llm-judge`
**Tests**: TDD required — write failing tests before every implementation task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Foundational — Score Parsing Core

**Purpose**: Implement `_parse_score` — the utility all judge functions depend on. Must complete before US1/US2.

**⚠️ CRITICAL**: US1 and US2 both depend on this phase.

- [x] T001 Write failing tests for `_parse_score` in `backend/tests/test_quality_judge.py`: happy path valid JSON, float in text, malformed text → 0.0, score > 1.0 → clamped to 1.0, score < 0.0 → clamped to 0.0
- [x] T002 Create `backend/quality/judge.py` with `_parse_score(text: str) -> float`: json.loads first, regex fallback `r'"score"\s*:\s*([0-9]+(?:\.[0-9]+)?)'`, clamp to [0.0, 1.0], final fallback 0.0 — makes T001 pass

**Checkpoint**: `pytest backend/tests/test_quality_judge.py` — all `_parse_score` tests green.

---

## Phase 2: User Stories 1 & 2 — Faithfulness + Relevancy Judge Functions (Priority: P1) 🎯 MVP

**Goal**: Real LLM-scored faithfulness and answer_relevancy replace hardcoded 1.0 in the eval runner.

**Independent Test**: `POST /api/v1/evaluation/run`, wait, `GET /api/v1/evaluation/report` — verify `faithfulness` and `answer_relevancy` are floats not equal to 1.0 across all questions.

### Tests for US1 & US2 (TDD — write first, must FAIL before T005/T006)

- [x] T003 [P] [US1] Write failing tests for `score_faithfulness` in `backend/tests/test_quality_judge.py`: mock `provider.generate` returns `'{"score": 0.8}'` → 0.8; provider raises `Exception` → 0.0; empty context → 0.0 without LLM call
- [x] T004 [P] [US2] Write failing tests for `score_answer_relevancy` in `backend/tests/test_quality_judge.py`: mock `provider.generate` returns `'{"score": 0.75}'` → 0.75; provider raises `Exception` → 0.0; empty question → 0.0 without LLM call

### Implementation for US1 & US2

- [x] T005 [P] [US1] Implement `score_faithfulness(provider, context: str, answer: str) -> float` in `backend/quality/judge.py`: French faithfulness prompt, call `provider.generate`, parse with `_parse_score`, wrap in `try/except Exception → 0.0`, short-circuit if `context` or `answer` empty
- [x] T006 [P] [US2] Implement `score_answer_relevancy(provider, question: str, answer: str) -> float` in `backend/quality/judge.py`: French relevancy prompt, call `provider.generate`, parse with `_parse_score`, wrap in `try/except Exception → 0.0`, short-circuit if `question` or `answer` empty

### Update Runner (depends on T005 + T006)

- [x] T007 Update failing tests in `backend/tests/test_quality.py`: replace `test_runner_does_not_call_generate` (invert — assert `generate` IS called), replace `test_runner_answer_length_is_zero` (assert `answer_length > 0`); add tests asserting `per_question[0]` has `faithfulness_score` and `relevancy_score` keys as floats; assert runner calls judge functions
- [x] T008 Update `backend/quality/runner.py`: import `RAG_PROMPT` from `rag.prompts` and judge functions from `quality.judge`; per-question loop: build `context_str` from retrieved docs, call `provider.generate(RAG_PROMPT.format(...))` for answer, call `score_faithfulness` and `score_answer_relevancy`, add `faithfulness_score`/`relevancy_score`/`answer_length` to per_question entry, use real scores in aggregate lists — makes T007 pass

**Checkpoint**: `pytest backend/tests/test_quality.py backend/tests/test_quality_judge.py` — all green. `mock_provider.generate.call_count == len(REFERENCE_DATASET) * 3` (1 generate + 2 judge calls per question).

---

## Phase 3: User Story 3 — Per-Question Scores in Report (Priority: P2)

**Goal**: The Markdown report includes faithfulness and relevancy per question row.

**Independent Test**: `cat reports/eval.md` shows a table with Faithfulness and Relevancy columns, one value per question.

### Tests for US3 (TDD — write first, must FAIL before T010)

- [x] T009 [US3] Update `test_report_generates_markdown` in `backend/tests/test_quality.py`: assert report content contains "Faithfulness" and "Relevancy" column headers; assert each per-question row includes a float score

### Implementation for US3

- [x] T010 [US3] Update `backend/quality/report.py`: add `Faithfulness` and `Relevancy` columns to per-question table header and rows; format scores to 2 decimal places; handle missing keys gracefully with `item.get("faithfulness_score", 0.0)` — makes T009 pass

**Checkpoint**: `pytest backend/tests/test_quality.py` — all green. `cat reports/eval.md` shows new columns.

---

## Phase 4: Polish

- [x] T011 [P] Run full test suite `cd backend && .venv/bin/pytest tests/ -q` — verify all tests pass, no regressions
- [x] T012 Trigger a real evaluation run and verify `reports/eval.md` contains non-1.0 faithfulness and relevancy scores: `curl -X POST http://127.0.0.1:8000/api/v1/evaluation/run && sleep 120 && cat reports/eval.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately
- **Phase 2 (US1+US2)**: Depends on Phase 1 (`_parse_score` must exist)
- **Phase 3 (US3)**: Can start after T008 (runner produces new per_question shape) or in parallel if report is mocked
- **Phase 4 (Polish)**: Depends on all previous phases

### Within Phase 2

- T003 and T004 can run in parallel (same file but different test functions — write sequentially in one pass)
- T005 and T006 can run in parallel (same file, different functions — write in one pass)
- T007 must precede T008 (write failing tests before implementation)
- T008 depends on T005 + T006

### Parallel Opportunities

```bash
# Phase 2 tests can be written together:
Task T003: failing tests for score_faithfulness
Task T004: failing tests for score_answer_relevancy

# Phase 2 implementations can be written together:
Task T005: score_faithfulness implementation
Task T006: score_answer_relevancy implementation
```

---

## Implementation Strategy

### MVP (US1 + US2 — real scores in report)

1. Phase 1: `_parse_score` (T001–T002)
2. Phase 2: Judge functions + runner update (T003–T008)
3. **STOP and VALIDATE**: real faithfulness + relevancy in eval report

### Full Delivery

4. Phase 3: Report columns (T009–T010)
5. Phase 4: Polish (T011–T012)

---

## Notes

- `test_runner_does_not_call_generate` and `test_runner_answer_length_is_zero` are **existing tests that must be inverted** (T007) — they currently assert the old mocked behavior.
- T008 touches `runner.py` which also calls `mock_provider.generate` — the mock in `test_quality.py` already has `generate.return_value` set, so existing fixtures work without change.
- The `per_question` JSON field in PostgreSQL is additive — no migration needed.
