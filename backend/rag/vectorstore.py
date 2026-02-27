from core.exceptions import VectorStoreException


def delete_by_source(vectorstore, source: str) -> None:
    """Delete vectors matching a source metadata value.

    Tries public APIs first (`delete(where=...)`, then `delete(filter=...)`).
    Falls back to the underlying collection only if necessary.
    """
    delete_fn = getattr(vectorstore, "delete", None)
    if callable(delete_fn):
        for kwargs in ({"where": {"source": source}}, {"filter": {"source": source}}):
            try:
                delete_fn(**kwargs)
                return
            except (TypeError, ValueError):
                continue
            except Exception as exc:
                raise VectorStoreException(
                    f"Failed to delete vectors for source '{source}' via public API."
                ) from exc

    collection = getattr(vectorstore, "_collection", None)
    if collection is not None and hasattr(collection, "delete"):
        try:
            collection.delete(where={"source": source})
            return
        except Exception as exc:
            raise VectorStoreException(
                f"Failed to delete vectors for source '{source}' via collection API."
            ) from exc

    raise VectorStoreException("Vector store delete API unavailable.")
