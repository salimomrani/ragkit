from unittest.mock import MagicMock

import pytest

from core.exceptions import VectorStoreException
from rag.vectorstore import delete_by_source


def test_delete_by_source_uses_public_delete_where():
    vectorstore = MagicMock()
    delete_by_source(vectorstore, "doc.md")
    vectorstore.delete.assert_called_once_with(where={"source": "doc.md"})


def test_delete_by_source_falls_back_to_filter_signature():
    vectorstore = MagicMock()
    vectorstore.delete.side_effect = [TypeError("unexpected kwarg"), None]
    delete_by_source(vectorstore, "doc.md")
    assert vectorstore.delete.call_count == 2
    vectorstore.delete.assert_called_with(filter={"source": "doc.md"})


def test_delete_by_source_falls_back_to_collection():
    vectorstore = MagicMock(delete=None)
    collection = MagicMock()
    vectorstore._collection = collection
    delete_by_source(vectorstore, "doc.md")
    collection.delete.assert_called_once_with(where={"source": "doc.md"})


def test_delete_by_source_falls_back_to_collection_on_value_error():
    """Chroma.delete raises ValueError (not TypeError) — must still reach collection fallback."""
    vectorstore = MagicMock()
    vectorstore.delete.side_effect = ValueError("wrong kwargs")
    collection = MagicMock()
    vectorstore._collection = collection
    delete_by_source(vectorstore, "doc.md")
    collection.delete.assert_called_once_with(where={"source": "doc.md"})


def test_delete_by_source_raises_when_no_delete_api():
    vectorstore = MagicMock(delete=None)
    vectorstore._collection = None
    with pytest.raises(VectorStoreException):
        delete_by_source(vectorstore, "doc.md")
