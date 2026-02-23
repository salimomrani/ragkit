# Walkthrough technique — 15 min

## Architecture générale (2 min)

```
[Angular 21 UI]
     |
     | HTTP / SSE (fetch + ReadableStream)
     v
[FastAPI]
  ├── InputGuardrail        ← vérifie la question AVANT le LLM (0ms)
  ├── RAGPipeline
  │    ├── Embed (mxbai-embed-large via Ollama)   ← question → vecteur flottants
  │    ├── ChromaDB (top-4 retrieval)             ← vecteur → 4 chunks les + proches
  │    └── qwen2.5:7b (génération / streaming)   ← chunks + question → réponse
  ├── LogStore              ← trace chaque query, PII masqué avant écriture
  └── QualityRunner         ← dataset 15Q → métriques reproductibles
       |
  PostgreSQL 16 (documents, query_logs, evaluation_results)
  ChromaDB embedded (vecteurs, persisted ./chroma_data/ sur disque)
```

Points clés à souligner :
- **Deux stores séparés** : Chroma pour les vecteurs, PostgreSQL pour le métier → responsabilités claires
- **AIProvider protocol** : interface qui isole le LLM — swap Gen-e2 = 1 nouvelle classe, 0 autre changement

---

## Choix 1 — PostgreSQL + ChromaDB (3 min)

**Question attendue** : "Pourquoi pas tout dans Chroma ?"

- ChromaDB = store vectoriel, **pas transactionnel** : pas de JOIN, pas de contraintes FK, pas d'ACID
- PostgreSQL gère les métadonnées business (document IDs, audit log, résultats eval)
- Le vrai choix industriel : Chroma pour la démo, remplaçable par Weaviate/Qdrant/PGVector en prod

**Trade-off assumé** :
> Chroma embedded = zéro infra, parfait pour la démo. En prod on le sort du process (serveur dédié ou PGVector pour tout regrouper).

---

## Choix 2 — Ollama local (2 min)

**Modèles** : `qwen2.5:7b` + `mxbai-embed-large`

| Critère | qwen2.5:7b | llama3.2:3b |
|---------|-----------|-------------|
| Contexte | 128K tokens | 128K tokens |
| Multilingue | 29 langues dont FR | anglais dominant |
| Paramètres | 7B | 3B |

| Critère | mxbai-embed-large | nomic-embed-text |
|---------|------------------|-----------------|
| MTEB score | **54.39** | 49.01 |
| Context max | 512 tokens | 8192 tokens |

**Trade-off** :
> mxbai a une fenêtre courte (512 tokens) → chunk_size ≤ 400. Nomic est plus safe si les docs sont longs.

**Interface swappable (code réel) :**

```python
# backend/rag/provider.py

from typing import Generator, Protocol

class AIProvider(Protocol):
    # Protocol = "duck typing" formalisé en Python.
    # Pas besoin d'hériter : n'importe quelle classe qui implémente
    # ces 4 méthodes est automatiquement compatible.
    # Équivalent d'une interface en Java/TypeScript.

    def embed(self, text: str) -> list[float]: ...
    # text → liste de ~1024 nombres (vecteur de similarité)

    def generate(self, prompt: str) -> str: ...
    # prompt complet → réponse en un bloc (bloquant)

    def stream_generate(self, prompt: str) -> Generator[str, None, None]: ...
    # Generator = type Python pour un itérateur lazy.
    # Generator[str, None, None] = "génère des str, ne reçoit rien, ne retourne rien".
    # En pratique : on itère avec `for token in stream_generate(prompt)`.

    def get_embeddings(self): ...
    # retourne l'objet embeddings (utilisé par ChromaDB)
```

```python
class OllamaProvider:
    # Implémente AIProvider sans en hériter explicitement.
    # Python vérifie la compatibilité structurellement (duck typing).

    def __init__(self):
        # __init__ = constructeur. Appelé à chaque OllamaProvider().
        self._embeddings = OllamaEmbeddings(model="mxbai-embed-large")
        self._llm = ChatOllama(
            model="qwen2.5:7b",
            temperature=0.1,   # quasi-déterministe (0 = exact, 1 = créatif)
            keep_alive=-1,     # garde le modèle chargé en GPU indéfiniment
        )

    def generate(self, prompt: str) -> str:
        return self._llm.invoke(prompt).content
        # .invoke() = appel bloquant, attend la réponse complète

    def stream_generate(self, prompt: str) -> Generator[str, None, None]:
        for chunk in self._llm.stream(prompt):
            yield chunk.content
            # yield = "pause et envoie ce token au caller, puis reprends"
            # Sans yield, on attendrait la réponse complète (pas de streaming)
```

Gen-e2 = créer `GenE2Provider` avec ces 4 méthodes, brancher dans `dependencies.py`. Zéro autre changement.

---

## Choix 3 — Streaming SSE (2 min)

**Problème** : Angular HttpClient ne supporte pas le streaming POST nativement.

**Solution** : `fetch()` natif + `ReadableStream` dans le service Angular.

```typescript
// frontend/src/app/services/rag-api.service.ts
streamQuery(question: string, history: HistoryEntry[] = []): Observable<StreamEvent> {
  return new Observable((observer) => {
    fetch(`${this.apiUrl}/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }),  // ← history inclus depuis 007
    })
    .then(res => {
      const reader = res.body!.getReader();  // ReadableStream chunk par chunk
      // ... parse SSE → observer.next(event) à chaque token
    });
  });
}
```

**Backend — générateur Python (code réel) :**

```python
# backend/api/v1/query.py

class HistoryEntry(BaseModel):
    # BaseModel = classe Pydantic. Avantages vs dict Python ordinaire :
    # - validation automatique des types à l'entrée HTTP
    # - erreur 422 claire si role n'est pas "user" ou "assistant"
    # - sérialisation/désérialisation JSON intégrée
    role: Literal["user", "assistant"]  # Literal = enum inline : valeurs autorisées uniquement
    content: str

class QueryRequest(BaseModel):
    question: str
    history: list[HistoryEntry] = []    # = [] → champ optionnel (backward compatible)

@router.post("/query/stream")
def query_stream(
    request: QueryRequest,
    provider=Depends(get_provider),      # Depends = injection de dépendances FastAPI
    vectorstore=Depends(get_vectorstore),# FastAPI appelle get_provider() et injecte le résultat
    engine=Depends(get_engine),          # Équivalent d'un @Inject en Angular ou Spring
):
    pipeline = RAGPipeline(provider=provider, vectorstore=vectorstore)

    def generate():
        # Fonction imbriquée = closure. Elle capture `pipeline` et `request` du scope parent.
        for event in pipeline.stream_query(request.question, history=request.history):
            yield event   # yield dans une fonction ordinaire → générateur Python
            # FastAPI consomme ce générateur et pousse chaque chunk au client via SSE

    return StreamingResponse(
        generate(),               # on passe le générateur, pas son résultat
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
```

**Format SSE envoyé au navigateur :**
```
data: {"type":"meta","sources":[{"source":"webhooks.md","score":0.87}],"confidence_score":0.87}

data: {"type":"token","content":"Les webhooks"}

data: {"type":"token","content":" sont configurés"}

data: {"type":"done","latency_ms":1823}
```

---

## Choix 4 — Pipeline RAG (2 min)

**Code réel, annoté :**

```python
# backend/rag/pipeline.py

@dataclass
class QueryResult:
    # @dataclass = décorateur Python qui génère automatiquement __init__, __repr__, __eq__
    # Équivalent d'un record Java ou d'une interface TypeScript avec propriétés.
    # Sans @dataclass, il faudrait écrire __init__ manuellement pour chaque champ.
    answer: str
    sources: list[dict] = field(default_factory=list)
    # field(default_factory=list) = "valeur par défaut = liste vide"
    # On ne peut pas écrire `sources: list = []` directement dans un dataclass
    # (sinon toutes les instances partageraient la même liste → bug classique Python)
    confidence_score: float = 0.0
    low_confidence: bool = False
    latency_ms: int = 0


def query(self, question: str, history: list | None = None) -> QueryResult:
    # list | None = type union Python 3.10+ : accepte une liste OU None
    # → si history n'est pas fourni, default = None, puis on le normalise

    history = (history or [])[-10:]
    # history or []  → si None ou liste vide, utilise []
    # [-10:]          → garde les 10 derniers éléments (slice Python)
    # Idéal pour un cap : quelle que soit la taille de l'historique, max 10 entrées

    results, avg_score = _retrieve(self._vectorstore, question)
    # déstructuration de tuple : _retrieve retourne (liste, float)
    # Python permet d'assigner directement : a, b = fonction()

    if not results or avg_score < settings.min_retrieval_score:
        # Refus sans appel LLM : économise latence + évite réponse hallucinée
        return QueryResult(answer=settings.no_info_message, ...)

    answer = self._provider.generate(
        _build_prompt(_build_context(results), question, history)
    )
    # _build_prompt choisit le bon template selon que history est vide ou non
    return QueryResult(answer=answer, ...)
```

---

## Choix 5 — TDD strict (2 min)

**40 tests** couvrant :
- Modèles SQLAlchemy (contraintes, relations)
- AIProvider + OllamaProvider (génération, streaming, embeddings)
- Pipeline RAG bout-en-bout (retrieve → generate → QueryResult)
- Guardrails input (injection, longueur, contenu offensant)
- Tous les endpoints API (query, query/stream, ingest, logs, documents)
- PII masking (emails, téléphones, numéro sécu FR)
- Quality runner (métriques sur dataset de référence)
- **Session memory** (historique injecté dans prompt, cap 10 entrées, clear)

**Workflow cycle :**
```
RED    → écrire le test → pytest montre FAILED (le code n'existe pas encore)
GREEN  → écrire le code minimal qui fait passer → pytest montre PASSED
REFACTOR → nettoyer sans casser
```

Jamais de code de prod sans test rouge d'abord. Chaque PR démontre ce cycle via les commits.

---

## Limites connues (2 min)

| Limite | Impact | Next step |
|--------|--------|-----------|
| Pas de chunking overlap | Contexte perdu aux frontières de chunk | `chunk_overlap=100` dans splitter |
| Pas de reranker | Top-4 par similarité ≠ top-4 sémantique | cross-encoder `ms-marco-MiniLM` |
| Session memory sans persistance | Historique perdu au rechargement | Sessions nommées en PostgreSQL |
| Pas d'auth | Ingest/delete ouverts | API key middleware ou OAuth2 |
| Guardrail regex | Bypassable par paraphrase | LLM-based content moderation |
| Corpus synthétique | 15 docs créés pour la démo | Remplacer par vrais docs internes |

---

## Phrase de transition

> "Maintenant je voudrais aller plus loin sur trois points précis :
> comment j'ai construit le prompt, comment fonctionnent vraiment les garde-fous,
> et comment on mesure la qualité de façon reproductible."
