import json
import logging
import re

_logger = logging.getLogger(__name__)


_FAITHFULNESS_PROMPT = """Évalue la fidélité de cette réponse au contexte fourni.

Contexte :
{context}

Réponse :
{answer}

La réponse contient-elle uniquement des informations présentes dans le contexte ?
Réponds uniquement avec un JSON : {{"score": float}} où 1.0 = entièrement fidèle, 0.0 = pas fidèle du tout."""

_RELEVANCY_PROMPT = """Évalue la pertinence de cette réponse par rapport à la question posée.

Question : {question}

Réponse :
{answer}

La réponse répond-elle directement à la question ?
Réponds uniquement avec un JSON : {{"score": float}} où 1.0 = parfaitement pertinente, 0.0 = hors sujet."""

_SCORE_RE = re.compile(r'"score"\s*:\s*([0-9]+(?:\.[0-9]+)?)')


def _parse_score(text: str) -> float:
    try:
        return max(0.0, min(1.0, float(json.loads(text)["score"])))
    except Exception:
        match = _SCORE_RE.search(text)
        if match:
            return max(0.0, min(1.0, float(match.group(1))))
        _logger.warning("Judge score parse failed — raw response: %.200s", text)
        return 0.0


def score_faithfulness(provider, context: str, answer: str) -> float:
    if not context or not answer:
        return 0.0
    try:
        prompt = _FAITHFULNESS_PROMPT.format(context=context, answer=answer)
        return _parse_score(provider.generate(prompt))
    except Exception:
        _logger.warning("Faithfulness judge LLM call failed", exc_info=True)
        return 0.0


def score_answer_relevancy(provider, question: str, answer: str) -> float:
    if not question or not answer:
        return 0.0
    try:
        prompt = _RELEVANCY_PROMPT.format(question=question, answer=answer)
        return _parse_score(provider.generate(prompt))
    except Exception:
        _logger.warning("Answer relevancy judge LLM call failed", exc_info=True)
        return 0.0
