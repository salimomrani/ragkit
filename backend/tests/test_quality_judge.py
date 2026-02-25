from unittest.mock import MagicMock

import pytest


# ---------------------------------------------------------------------------
# _parse_score
# ---------------------------------------------------------------------------

def test_parse_score_valid_json():
    from quality.judge import _parse_score
    assert _parse_score('{"score": 0.85}') == pytest.approx(0.85)


def test_parse_score_float_in_surrounding_text():
    from quality.judge import _parse_score
    assert _parse_score('Sure! {"score": 0.9} done.') == pytest.approx(0.9)


def test_parse_score_malformed_returns_zero():
    from quality.judge import _parse_score
    assert _parse_score("no json here at all") == 0.0


def test_parse_score_clamp_above_one():
    from quality.judge import _parse_score
    assert _parse_score('{"score": 1.5}') == pytest.approx(1.0)


def test_parse_score_clamp_below_zero():
    from quality.judge import _parse_score
    assert _parse_score('{"score": -0.3}') == pytest.approx(0.0)


def test_parse_score_integer_value():
    from quality.judge import _parse_score
    assert _parse_score('{"score": 1}') == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# score_faithfulness
# ---------------------------------------------------------------------------

def test_score_faithfulness_happy_path():
    from quality.judge import score_faithfulness
    provider = MagicMock()
    provider.generate.return_value = '{"score": 0.8}'
    result = score_faithfulness(provider, context="some context", answer="some answer")
    assert result == pytest.approx(0.8)
    provider.generate.assert_called_once()


def test_score_faithfulness_empty_context_returns_zero_no_llm_call():
    from quality.judge import score_faithfulness
    provider = MagicMock()
    result = score_faithfulness(provider, context="", answer="some answer")
    assert result == 0.0
    provider.generate.assert_not_called()


def test_score_faithfulness_empty_answer_returns_zero_no_llm_call():
    from quality.judge import score_faithfulness
    provider = MagicMock()
    result = score_faithfulness(provider, context="some context", answer="")
    assert result == 0.0
    provider.generate.assert_not_called()


def test_score_faithfulness_provider_exception_returns_zero():
    from quality.judge import score_faithfulness
    provider = MagicMock()
    provider.generate.side_effect = Exception("LLM unavailable")
    result = score_faithfulness(provider, context="ctx", answer="ans")
    assert result == 0.0


# ---------------------------------------------------------------------------
# score_answer_relevancy
# ---------------------------------------------------------------------------

def test_score_answer_relevancy_happy_path():
    from quality.judge import score_answer_relevancy
    provider = MagicMock()
    provider.generate.return_value = '{"score": 0.75}'
    result = score_answer_relevancy(provider, question="What is X?", answer="X is Y.")
    assert result == pytest.approx(0.75)
    provider.generate.assert_called_once()


def test_score_answer_relevancy_empty_question_returns_zero_no_llm_call():
    from quality.judge import score_answer_relevancy
    provider = MagicMock()
    result = score_answer_relevancy(provider, question="", answer="some answer")
    assert result == 0.0
    provider.generate.assert_not_called()


def test_score_answer_relevancy_empty_answer_returns_zero_no_llm_call():
    from quality.judge import score_answer_relevancy
    provider = MagicMock()
    result = score_answer_relevancy(provider, question="What is X?", answer="")
    assert result == 0.0
    provider.generate.assert_not_called()


def test_score_answer_relevancy_provider_exception_returns_zero():
    from quality.judge import score_answer_relevancy
    provider = MagicMock()
    provider.generate.side_effect = RuntimeError("timeout")
    result = score_answer_relevancy(provider, question="Q?", answer="A.")
    assert result == 0.0
