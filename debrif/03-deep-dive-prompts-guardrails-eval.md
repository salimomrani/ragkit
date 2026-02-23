# Deep-dive — Prompts, Garde-fous, Évaluation (10 min)

## 1. Le prompt RAG (3 min)

### Template utilisé (code réel — backend/rag/prompts.py)

```python
# Un prompt = une simple chaîne Python avec des placeholders {context} et {question}.
# str.format(context=..., question=...) remplace les {} au moment de l'appel.
# Pas de framework LangChain pour le prompt ici : plus simple, plus prévisible.

RAG_PROMPT = """Tu es l'assistant de support de PALO Platform. \
Utilise le contexte fourni pour répondre à la question de manière directe et concise.

Règles :
- Réponds en français.
- Base-toi sur le contexte fourni. Si une information est partielle, donne ce que tu sais et précise la limite.
- Si le contexte ne contient vraiment aucune information pertinente, \
dis uniquement : "Je n'ai pas d'information sur ce sujet dans la base de connaissance."
- Ne répète pas la question. Ne commence pas par "Bien sûr" ou des formules creuses.

Contexte :
{context}

Question : {question}

Réponse :"""
```

**Quand l'historique est présent (session memory, feature 007) :**

```python
RAG_PROMPT_WITH_HISTORY = """...(mêmes règles + une règle supplémentaire)...
- Tiens compte de l'historique de la conversation pour contextualiser ta réponse.

Historique :
{history}        ← inséré AVANT le contexte (meilleure résolution des coréférences)

Contexte :
{context}

Question : {question}

Réponse :"""
```

L'historique est formaté en texte labellisé (pas JSON) :
```
Utilisateur : Comment configurer un webhook ?
Assistant : Les webhooks se configurent dans l'onglet Intégrations...
Utilisateur : Et pour les events en temps réel ?
```

### Pourquoi cette formulation ?

- **4 règles explicites** plutôt qu'implicites : le LLM instruction-tuned respecte les interdictions formulées clairement
- **Refus verbatim défini** : on dicte exactement la phrase de refus → cohérence UX garantie, pas de "je ne suis qu'un assistant"
- **Pas de "helpful assistant"** dans le prompt : évite le biais "je dois toujours aider" qui pousse à halluciner
- **Contexte en bloc unique** avec `[Source: fichier.md]` comme préfixe → le modèle peut attribuer ses citations
- **`temperature=0.1`** (pas 0.8 défaut Ollama) : quasi-déterministe, indispensable pour un RAG factuel

### Ce qu'on n'a PAS fait et pourquoi

- **Pas de few-shot examples** → corpus multilingue, les exemples auraient biaisé vers le FR
- **Pas de chain-of-thought** → latence ×2 pour un gain incertain sur du FAQ-style
- **Pas de citation `[Doc #1]`** dans la réponse → sources déjà affichées via l'event SSE `meta`, les dupliquer = risque d'hallucination sur les IDs

---

## 2. Les garde-fous (3 min)

### Pipeline de validation (code réel — backend/guardrails/input.py)

```python
# @dataclass génère __init__ automatiquement (voir 02-walkthrough pour l'explication)
@dataclass
class GuardrailResult:
    passed: bool
    reason: str = ""   # vide si passed=True

class InputGuardrail:
    def check(self, question: str) -> GuardrailResult:
        # Vérifications en cascade, du plus simple (longueur) au plus coûteux (regex)
        # Chaque check retourne immédiatement → pas de vérifications inutiles

        if not question.strip():
            # .strip() = supprime espaces et sauts de ligne en début/fin
            return GuardrailResult(passed=False, reason="guardrail:empty_question")

        if len(question) < 6:
            return GuardrailResult(passed=False, reason="guardrail:too_short")

        if len(question) > 500:  # configurable via MAX_QUESTION_LENGTH dans .env
            return GuardrailResult(passed=False, reason="guardrail:length_exceeded")

        if self._is_injection(question):
            return GuardrailResult(passed=False, reason="guardrail:prompt_injection")

        if self._is_offensive(question):
            return GuardrailResult(passed=False, reason="guardrail:offensive_content")

        return GuardrailResult(passed=True)
```

### Patterns injection détectés (regex)

```python
# re.compile() = compile le pattern une seule fois → réutilisé pour chaque question
# re.IGNORECASE → "IGNORE" et "ignore" matchent tous les deux

INJECTION_PATTERNS = re.compile(
    r"ignore (all |previous |above |your )?(instructions|rules|prompt|directives)"
    r"|you are now|act as|pretend (to be|you are)|roleplay as"
    r"|system prompt|repeat after me|\bDAN\b"
    r"|jailbreak|forget (all |your |previous )?instructions",
    re.IGNORECASE,
)
```

**Pourquoi du regex et pas un LLM pour détecter les injections ?**
- ~0ms vs ~1-2s pour un appel LLM supplémentaire
- Déterministe et testable unitairement
- Offline, pas de round-trip réseau

### Seuils de confiance (retrieval)

Deux seuils distincts configurables via `.env` :

```
MIN_RETRIEVAL_SCORE=0.3   → sous ce seuil : pas de génération du tout (refus pur)
LOW_CONFIDENCE_THRESHOLD=0.5 → avertissement : "réponse peu sûre" affiché en orange
```

Ces seuils s'appliquent au score de similarité **normalisé [0,1]** retourné par
`similarity_search_with_relevance_scores` — pas la distance L2 brute (non interprétable).

```python
# pipeline.py — normalisation et cap [0,1]
scores = [max(0.0, min(1.0, s)) for _, s in results]
#          ^ min/max = borne les scores même si ChromaDB retourne >1 ou <0
avg_score = round(sum(scores) / len(scores), 3)
```

### Limite honnête

> Ces patterns sont bypassables par paraphrase ou encodage Base64.
> En prod, on ajouterait un LLM de classification léger (Llama-Guard, ShieldLM)
> ou un modèle Hugging Face fine-tuné sur des datasets d'injections.
> L'architecture supporte ça : c'est un appel supplémentaire dans `InputGuardrail.check()`.

---

## 3. L'évaluation de qualité (4 min)

### Dataset de référence (backend/evaluation/dataset.py)

```python
# Liste Python de dictionnaires — chaque entrée = 1 paire (question, source attendue)
REFERENCE_DATASET = [
    {
        "question": "Comment configurer un webhook pour recevoir des événements ?",
        "expected_source": "spec-webhooks.md",
        # La source attendue est celle qui DOIT apparaître dans les top-4 retournés
    },
    {
        "question": "Quelles données personnelles sont collectées ?",
        "expected_source": "rgpd-privacy-policy.md",
    },
    # ... 13 autres questions couvrant les user stories US1–US5
]
```

### Métriques calculées

| Métrique | Ce qu'on mesure | Score actuel |
|----------|----------------|-------------|
| **Faithfulness** | La réponse n'est pas "je ne sais pas" ET une source a été trouvée | **1.00** |
| **Answer Relevancy** | La réponse n'est pas vide | **1.00** |
| **Context Recall** | La source attendue est dans le top-4 retourné | **1.00** ← corrigé (était 0.47) |
| **Moyenne** | — | **1.00** |

**Comment le Context Recall est passé de 0.47 à 1.00 :**
- Fix 1 : aligner `k=4` dans le runner (était `k=3`, différent du pipeline)
- Fix 2 : préfixer chaque chunk avec `[source.md]` à l'ingestion (ancrage sémantique)
- Fix 3 : ajouter des alias dans les docs (ex: "Référence interne: ticket-001") pour les questions de type ID

### Calcul concret d'une métrique

```python
def _context_recall(result: dict, expected_source: str) -> float:
    # result["sources"] = liste de {"source": "fichier.md", "score": 0.87}
    returned_sources = [s["source"] for s in result.get("sources", [])]
    # list comprehension = crée une liste en une ligne
    # [expression for element in iterable] → ici extrait le champ "source" de chaque dict

    return 1.0 if expected_source in returned_sources else 0.0
    # in = opérateur Python pour vérifier l'appartenance à une liste
    # Expression ternaire Python : valeur_si_vrai if condition else valeur_si_faux
```

### Ce que cette eval ne mesure pas (honnêteté)

- **Hallucination fine** : on vérifie que la source est trouvée, pas que la réponse est factuellement correcte mot pour mot
- **Cohérence conversationnelle** : la session memory est testée unitairement mais pas dans le dataset d'eval
- **Qualité humaine** : pas de notation humaine (RLHF, LLM-as-judge)

En prod, on utiliserait **RAGAS** (framework open-source) ou **Braintrust** pour des métriques plus rigoureuses (faithfulness token-level, answer semantic similarity calculée par embedding).
