# Q&A + Industrialisation avec IA (10 min)

## Questions probables et réponses préparées

---

### "Comment vous passeriez ce projet en production ?"

**Axe infra** :
- Chroma embedded → **Qdrant** (serveur dédié, backup, réplication) ou **PGVector** (tout dans Postgres)
- Ollama local → **vLLM** sur GPU (×10 throughput) ou API managée Gen-e2
- FastAPI mono-process → **Gunicorn + workers**, derrière un reverse proxy (Nginx/Caddy)
- PostgreSQL sans migration → **Alembic** pour les schema evolutions

**Axe MLOps** :
- Versioning du corpus : git-lfs ou S3, avec hash de chaque document ingéré
- CI/CD du modèle : pipeline de re-eval automatique à chaque nouveau batch de documents
- Monitoring : latence P95, guardrail hit rate, context recall sur window glissante

**Axe sécurité** :
- Auth : API key pour les endpoints sensibles (ingest, delete, logs) → OAuth2/OIDC en enterprise
- Secrets : Vault ou AWS Secrets Manager, zéro secret dans le code
- Audit log : rétention configurable, export SIEM (Splunk, Elastic)

---

### "La scalabilité — comment vous gérez le volume ?"

**Goulot actuel** : Ollama single-thread, ChromaDB in-process

**Chemins de scale** :
```
Requêtes parallèles → FastAPI async + uvicorn workers (déjà async)
LLM throughput      → vLLM (batching automatique), GPU A100 = ~1000 tokens/s
Embeddings          → batch embedding à l'ingestion, cache LRU sur les questions fréquentes
Retrieval           → Qdrant scale horizontal, HNSW index → sub-10ms sur 10M vecteurs
```

**Chiffre concret** :
> Avec vLLM sur un A100 et Qdrant, ce système peut servir ~100 req/s concurrentes.
> Avec Ollama sur CPU, c'est ~2 req/min. C'est le delta "démo → prod".

---

### "Les coûts — comment vous les maîtrisez ?"

**Leviers principaux** :

| Levier | Impact | Implémentation |
|--------|--------|---------------|
| Modèle plus petit | ÷3 coût, -10% qualité | qwen2.5:3b, Mistral 7B |
| Cache sémantique | -60% appels LLM | Redis + seuil similarité >0.95 |
| Guardrail avant LLM | -N% si corpus mal ciblé | déjà implémenté |
| Batch async | meilleur GPU utilization | file de tâches (Celery/ARQ) |
| Quantisation | ÷2-4 mémoire GPU | GGUF Q4, AWQ |

**Monitoring coûts** :
- Token comptage par query (déjà dans les logs avec `latency_ms`)
- Alerte sur budget mensuel (CloudWatch, Datadog)
- Rapport hebdo coût / question répondue

---

### "Privacy — RGPD, données internes ?"

**Ce qu'on a fait** :
- PII masking dans les logs (email, téléphone, numéro FR)
- Tout local (Ollama) : zéro donnée envoyée à OpenAI ou autre
- CORS restreint à l'origin frontend

**Ce qu'il faudrait en prod** :
- **Classification des données** : tous les docs ne sont pas au même niveau (public vs confidentiel vs secret)
- **Access control** : RAG par tenant, isolation des corpus par équipe/rôle
- **Retention policy** : suppression automatique des logs après N jours
- **Audit trail** : qui a ingéré quoi, qui a posé quelle question (pseudonyme)
- **Data residency** : modèle on-prem ou VPC privé pour données sensibles

**Point fort de l'architecture** :
> Le fait d'être local-first résout 80% des problèmes RGPD. Aucune donnée ne sort de l'infra.
> Gen-e2 (modèle interne Palo IT) s'inscrit exactement dans cette logique.

---

### "Qu'est-ce que vous feriez différemment ?"

Réponse honnête en 3 points :

1. **Chunking overlap dès le départ** : `chunk_overlap=100` aurait amélioré le context recall de 0.47 à ~0.65 estimé. C'est un one-liner, je l'ai sacrifié pour avancer.

2. **RAGAS plutôt qu'une eval custom** : j'aurais gagné des métriques plus standard (faithfulness token-level, answer semantic similarity). L'eval custom est lisible mais moins rigoureuse.

3. **Corpus réel** : 15 docs synthétiques donnent des scores flatteurs. Avec de vrais docs internes (formatage variable, jargon métier, tableaux), les chiffres seraient plus représentatifs — et plus intéressants à déboguer.

---

### "Comment l'IA a-t-elle accéléré votre développement ?"

**Ce que Claude Code a fait** :
- Génération des tests TDD (red phase) et stubs de code
- Suggestions d'architecture (AIProvider pattern, SSE format)
- Rédaction de la documentation (README, DECISIONS.md)

**Ce que j'ai gardé en main** :
- Toutes les décisions de trade-off (ChromaDB vs Postgres, seuils, modèles)
- Validation de chaque test avant d'accepter le code généré
- Revue de tous les choix de sécurité (guardrails, PII patterns)

**Point de vue** :
> L'IA fait gagner du temps sur le "comment coder", pas sur le "quoi construire et pourquoi".
> Le risque : accepter du code plausible sans le comprendre. La discipline TDD contre-balance exactement ça.

---

## Questions inattendues — filets de sécurité

**"Pourquoi pas LangGraph / agents ?"**
→ Overkill pour un RAG simple. LangGraph brille pour les workflows multi-étapes (recherche → synthèse → vérification). Ici, le pipeline est linéaire et prédictible. Ajouter des agents = ajouter de la latence et de l'imprévisibilité.

**"Pourquoi pas RAG-Fusion ou HyDE ?"**
→ Connus, pas implémentés faute de temps. RAG-Fusion (multi-query + reranking) améliorerait le context recall. HyDE (hypothetical document embeddings) aide sur les questions abstraites. Next steps documentés.

**"Vous connaissez Gen-e2 ?"**
→ Je connais son existence comme LLM interne Palo IT. Le `AIProvider` protocol est prévu pour ça : il suffit d'implémenter `generate()`, `stream_generate()`, `embed()`. Les credentials me manquent pour l'intégrer ici.
