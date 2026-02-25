from sqlalchemy.orm import Session

from core.config import settings
from models.db import EvaluationResult
from quality.dataset import REFERENCE_DATASET
from quality.judge import score_answer_relevancy, score_faithfulness
from rag.prompts import RAG_PROMPT


def run_quality_check(provider, vectorstore, engine, limit: int = 0):
    """Run the reference evaluation dataset and persist results to PostgreSQL.

    For each question in REFERENCE_DATASET:
      - Retrieves top-3 chunks from ChromaDB.
      - Checks whether the expected source appears in retrieved docs (context recall).
      - Generates a full answer via the provider (used for answer length only).

    Args:
        limit: Number of questions to evaluate (default 3 for tests, 0 = full dataset).

    Returns:
        dict with keys: faithfulness, answer_relevancy, context_recall (floats), per_question (list).

    Example:
        >>> scores = run_quality_check(provider, vectorstore, engine, limit=15)
        >>> scores["context_recall"]   # fraction of questions where expected source was found
        0.47
    """
    dataset_to_use = REFERENCE_DATASET[:limit] if limit else REFERENCE_DATASET
    total_questions = len(dataset_to_use)
    faithfulness_scores = []
    answer_relevancy_scores = []
    context_recall_scores = []
    per_question = []

    for item in dataset_to_use:
        question = item["question"]
        expected_source = item["expected_source"]

        # 1. Retrieve context
        docs_and_scores = vectorstore.similarity_search_with_score(question, k=settings.top_k)

        # 2. Extract sources
        retrieved_sources = [doc.metadata.get("source", "") for doc, _ in docs_and_scores]

        # 3. Context recall
        source_found = any(expected_source in s for s in retrieved_sources)
        context_recall_scores.append(1.0 if source_found else 0.0)

        # 4. Build context string and generate answer
        context_str = "\n\n".join(
            f"[Source: {doc.metadata.get('source', 'unknown')}]\n{doc.page_content}"
            for doc, _ in docs_and_scores
        )
        answer = provider.generate(RAG_PROMPT.format(context=context_str, question=question))

        # 5. LLM-as-judge scores
        faithfulness = score_faithfulness(provider, context_str, answer)
        relevancy = score_answer_relevancy(provider, question, answer)
        faithfulness_scores.append(faithfulness)
        answer_relevancy_scores.append(relevancy)

        per_question.append({
            "question": question,
            "expected_source": expected_source,
            "source_found": source_found,
            "answer_length": len(answer),
            "faithfulness_score": faithfulness,
            "relevancy_score": relevancy,
        })

    avg_faithfulness = sum(faithfulness_scores) / total_questions if total_questions > 0 else 0.0
    avg_relevancy = sum(answer_relevancy_scores) / total_questions if total_questions > 0 else 0.0
    avg_recall = sum(context_recall_scores) / total_questions if total_questions > 0 else 0.0

    scores = {
        "faithfulness": avg_faithfulness,
        "answer_relevancy": avg_relevancy,
        "context_recall": avg_recall,
        "per_question": per_question
    }

    # Persist to DB
    with Session(engine) as session:
        result = EvaluationResult(
            faithfulness=avg_faithfulness,
            answer_relevancy=avg_relevancy,
            context_recall=avg_recall,
            per_question=per_question,
        )
        session.add(result)
        session.commit()

    return scores
