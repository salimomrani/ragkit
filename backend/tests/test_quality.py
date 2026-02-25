from itertools import cycle
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from models.db import Base


@pytest.fixture
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def mock_provider():
    provider = MagicMock()
    # Repeating pattern per question: RAG answer → faithfulness judge → relevancy judge
    provider.generate.side_effect = cycle([
        "Réponse de test pour l'évaluation.",
        '{"score": 0.8}',
        '{"score": 0.7}',
    ])
    return provider


@pytest.fixture
def mock_vectorstore():
    doc = MagicMock()
    doc.page_content = "Contenu de référence pour évaluation."
    doc.metadata = {"source": "test.md", "chunk_index": 0}
    vs = MagicMock()
    vs.similarity_search_with_score.return_value = [(doc, 0.9)]
    return vs


def test_runner_evaluates_full_dataset_by_default(mock_provider, mock_vectorstore, engine):
    from quality.dataset import REFERENCE_DATASET
    from quality.runner import run_quality_check
    scores = run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine)
    assert len(scores["per_question"]) == len(REFERENCE_DATASET)


def test_runner_uses_top_k_for_retrieval(mock_provider, mock_vectorstore, engine):
    from core.config import settings
    from quality.runner import run_quality_check
    run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine)
    call_args = mock_vectorstore.similarity_search_with_score.call_args
    k_used = call_args[1].get("k") or call_args[0][1]
    assert k_used == settings.top_k


def test_dataset_has_15_questions():
    from quality.dataset import REFERENCE_DATASET
    assert len(REFERENCE_DATASET) == 15
    for item in REFERENCE_DATASET:
        assert "question" in item
        assert "expected_source" in item


def test_dataset_questions_are_strings():
    from quality.dataset import REFERENCE_DATASET
    for item in REFERENCE_DATASET:
        assert isinstance(item["question"], str)
        assert len(item["question"]) > 0


def test_runner_returns_scores(mock_provider, mock_vectorstore, engine):
    from quality.runner import run_quality_check
    scores = run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine)
    assert "faithfulness" in scores
    assert "answer_relevancy" in scores
    assert "context_recall" in scores
    assert 0.0 <= scores["faithfulness"] <= 1.0
    assert 0.0 <= scores["answer_relevancy"] <= 1.0
    assert 0.0 <= scores["context_recall"] <= 1.0


def test_runner_persists_evaluation_result(mock_provider, mock_vectorstore, engine):
    from sqlalchemy.orm import Session

    from models.db import EvaluationResult
    from quality.runner import run_quality_check
    run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine)
    with Session(engine) as session:
        result = session.query(EvaluationResult).first()
        assert result is not None
        assert result.faithfulness is not None


def test_runner_calls_generate_per_question(mock_provider, mock_vectorstore, engine):
    from quality.runner import run_quality_check
    run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine, limit=2)
    # 3 generate calls per question: 1 RAG answer + 1 faithfulness judge + 1 relevancy judge
    assert mock_provider.generate.call_count == 6


def test_runner_answer_length_is_nonzero(mock_provider, mock_vectorstore, engine):
    from quality.runner import run_quality_check
    scores = run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine, limit=1)
    assert scores["per_question"][0]["answer_length"] > 0


def test_runner_per_question_has_judge_scores(mock_provider, mock_vectorstore, engine):
    from quality.runner import run_quality_check
    scores = run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine, limit=1)
    entry = scores["per_question"][0]
    assert "faithfulness_score" in entry
    assert "relevancy_score" in entry
    assert entry["faithfulness_score"] == pytest.approx(0.8)
    assert entry["relevancy_score"] == pytest.approx(0.7)


def test_report_generates_markdown(mock_provider, mock_vectorstore, engine, tmp_path):
    from quality.report import generate_quality_report_md
    from quality.runner import run_quality_check
    scores = run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine)
    report_path = tmp_path / "eval.md"
    generate_quality_report_md(scores=scores, output_path=str(report_path))
    assert report_path.exists()
    content = report_path.read_text()
    assert "faithfulness" in content.lower()
    assert "answer relevancy" in content.lower()


def test_report_includes_per_question_judge_columns(mock_provider, mock_vectorstore, engine, tmp_path):
    from quality.report import generate_quality_report_md
    from quality.runner import run_quality_check
    scores = run_quality_check(provider=mock_provider, vectorstore=mock_vectorstore, engine=engine, limit=2)
    report_path = tmp_path / "eval.md"
    generate_quality_report_md(scores=scores, output_path=str(report_path))
    content = report_path.read_text()
    # The per-question table header must have both columns on the same line
    header_line = next(
        (line for line in content.splitlines() if "Source Found" in line), ""
    )
    assert "Faithfulness" in header_line
    assert "Relevancy" in header_line
