# Python pour non-Pythonistes — Concepts utilisés dans ce projet

Référence rapide pour les constructions Python spécifiques à ce codebase.
À lire avant le walkthrough technique si besoin.

---

## 1. Décorateurs `@`

```python
@dataclass
class QueryResult:
    answer: str

# Équivalent à :
QueryResult = dataclass(QueryResult)
```

Un décorateur **transforme** la classe ou la fonction qui suit.
Dans ce projet :
- `@dataclass` → génère `__init__`, `__repr__`, `__eq__` automatiquement
- `@router.post("/query")` → enregistre la fonction comme handler HTTP POST
- `@pytest.fixture` → déclare une fonction comme fixture de test réutilisable

---

## 2. `@dataclass` vs `class` ordinaire

```python
# Sans dataclass → verbeux
class QueryResult:
    def __init__(self, answer: str, confidence_score: float = 0.0):
        self.answer = answer
        self.confidence_score = confidence_score

# Avec @dataclass → identique, 2 lignes
@dataclass
class QueryResult:
    answer: str
    confidence_score: float = 0.0
```

`field(default_factory=list)` est nécessaire pour les listes/dicts :
```python
# FAUX (partagé entre toutes les instances = bug)
sources: list = []

# CORRECT
sources: list = field(default_factory=list)
```

---

## 3. Pydantic `BaseModel` (validation HTTP)

```python
from pydantic import BaseModel

class QueryRequest(BaseModel):
    question: str
    history: list[HistoryEntry] = []   # optionnel
```

FastAPI utilise Pydantic pour :
- **Valider** automatiquement le JSON entrant (erreur 422 si type incorrect)
- **Sérialiser** la réponse en JSON
- **Documenter** le schema dans Swagger (`/docs`)

Différence avec `@dataclass` : Pydantic valide les types à l'exécution, dataclass non.

---

## 4. `Protocol` — interfaces en Python

```python
from typing import Protocol

class AIProvider(Protocol):
    def generate(self, prompt: str) -> str: ...    # ... = "corps non défini ici"
    def embed(self, text: str) -> list[float]: ...
```

`Protocol` = **interface structurelle**. Pas besoin d'hériter :
```python
class OllamaProvider:          # pas de "implements AIProvider"
    def generate(self, prompt: str) -> str:
        return self._llm.invoke(prompt).content
    # ↑ Python vérifie la compatibilité au moment du type-check (mypy/pyright)
    # C'est le "duck typing" formalisé
```

Équivalent TypeScript :
```typescript
interface AIProvider {
  generate(prompt: string): string;
}
```

---

## 5. `yield` et générateurs (streaming)

```python
def stream_generate(self, prompt: str) -> Generator[str, None, None]:
    for chunk in self._llm.stream(prompt):
        yield chunk.content   # ← "pause, envoie ce token, reprends quand on redemande"
```

Sans `yield` :
```python
# Bloquant : attend TOUT avant de retourner
def generate(self, prompt: str) -> str:
    return self._llm.invoke(prompt).content   # attente ~2s
```

Avec `yield` :
```python
# Non-bloquant : chaque token est envoyé dès qu'il arrive
for token in provider.stream_generate(prompt):
    print(token, end="", flush=True)   # affiche token par token
```

FastAPI + `StreamingResponse` consomme ce générateur et pousse chaque token via SSE.

---

## 6. `Depends()` — injection de dépendances FastAPI

```python
@router.post("/query")
def query(
    request: QueryRequest,
    provider=Depends(get_provider),      # FastAPI appelle get_provider() et injecte le résultat
    vectorstore=Depends(get_vectorstore),
    engine=Depends(get_engine),
):
    ...
```

Équivalent Angular :
```typescript
constructor(private api: RagApiService) {}   // Angular injecte RagApiService
```

`get_provider()` est défini dans `dependencies.py` :
```python
def get_provider():
    return OllamaProvider()   # instancié à chaque requête
```

Avantage pour les tests : on remplace par un mock sans changer le code de l'endpoint.
```python
app.dependency_overrides[get_provider] = lambda: mock_provider
```

---

## 7. List comprehension

```python
# Syntaxe : [expression for element in iterable if condition]

# Extraire les noms de sources
sources = [s["source"] for s in result["sources"]]
# Equivalent for-loop :
sources = []
for s in result["sources"]:
    sources.append(s["source"])

# Avec condition
high_conf = [s for s in result["sources"] if s["score"] > 0.7]

# Borner des scores entre 0 et 1
scores = [max(0.0, min(1.0, s)) for _, s in results]
# "_, s" = déstructuration : on ignore le premier élément (doc), on prend le score
```

---

## 8. Type hints et `|` (union de types)

```python
# Python 3.10+ — équivalent Optional[list]
def query(self, history: list | None = None) -> QueryResult:
    #                    ^^^^^^^^^^^^
    # history peut être une liste OU None

history = (history or [])[-10:]
# history or [] → si history est None ou [], utilise []
# [-10:]        → slice : garde les 10 derniers éléments
```

```python
from typing import Literal

role: Literal["user", "assistant"]
# Literal = type qui n'accepte que ces valeurs exactes
# Pydantic valide à l'entrée HTTP → 422 si role = "admin"
```

---

## 9. f-strings et format strings

```python
# f-string (Python 3.6+) : évalué immédiatement
name = "PALO"
msg = f"Bienvenue sur {name} Platform"   # → "Bienvenue sur PALO Platform"

# .format() : placeholders remplis plus tard (utilisé pour les prompts)
template = "Contexte :\n{context}\n\nQuestion : {question}"
prompt = template.format(context="...", question="Comment configurer ?")
```

Les prompts RAG utilisent `.format()` car le template est défini une fois
et rempli à chaque requête avec un contexte différent.

---

## 10. Closures et fonctions imbriquées

```python
@router.post("/query/stream")
def query_stream(request: QueryRequest, ...):

    pipeline = RAGPipeline(...)

    def generate():
        # generate() est une closure : elle "capture" pipeline et request
        # du scope parent, même après que query_stream() soit terminé
        for event in pipeline.stream_query(request.question, ...):
            yield event

    return StreamingResponse(generate(), ...)
    # On passe le générateur (pas son résultat) — StreamingResponse l'itère
```

Équivalent conceptuel en JavaScript :
```javascript
function queryStream(request) {
  const pipeline = new RAGPipeline();

  async function* generate() {   // générateur async JS
    for await (const event of pipeline.streamQuery(request.question)) {
      yield event;
    }
  }

  return new Response(generate());
}
```
