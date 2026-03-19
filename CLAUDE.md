# RagKit — Core Rules & Context

<purpose>
Ce fichier sert de guide de référence principal pour Claude Code lors des sessions de développement sur le projet RagKit. Il définit les protocoles de workflow, les standards techniques et les limites architecturales.
</purpose>

## 📂 Project Context & Files

- **Primary Source of Truth**: Codebase > `specs/` > `DECISIONS.md`.
- **Architecture**: `.specify/memory/constitution.md` (À lire impérativement avant toute décision structurante).
- **Tech Stack**: Angular (Frontend), Python/FastAPI (Backend), PostgreSQL 16 (DB), Ollama (LLM Local).

## 🛠 Workflow Routing (Mandatory)

- **Feature / Non-trivial change**: Utiliser systématiquement `/speckit.workflow`.
- **Small fix**: (Typo, wording, < 5 lignes) -> Edition directe autorisée sans spec.
- **Frontend**: Appliquer le skill `applying-angular-conventions`.
- **Backend**: Appliquer le skill `applying-python-conventions`.

## 🧪 Test-Driven Development (Iron Law)

**Pas de code de production sans un test qui échoue d'abord (RED -> GREEN -> REFACTOR).**

- Utiliser `superpowers:test-driven-development`.
- Exécuter les tests et le linting avant chaque commit.
- **Commandes de tests** :
  - Backend : `cd backend && .venv/bin/pytest tests/ -v`
  - Frontend : `cd frontend && npm test -- --watch=false`

## 🏗 Architectural Constraints (Zero-Knowledge)

1. **Local-first** : Uniquement Ollama. Aucune donnée ne doit transiter par des API externes.
2. **Traceability** : Chaque query doit être logguée (avec masquage PII).
3. **Transparent failure** : Préférer "Je ne sais pas" à l'hallucination.
4. **Separation of concerns** : Isolation stricte entre RAG, Guardrails et Modules d'évaluation.

## 💻 Environment & Commands

- **Setup** : Si `backend/.env` est absent, copier `backend/.env.example`.
- **Docker** : `docker-compose up -d` (PostgreSQL sur port 5444).
- **Run Dev** :
  - Backend : `cd backend && .venv/bin/uvicorn main:app --reload --port 8000`
  - Frontend : `cd frontend && npm start`
- **Linting** :
  - Backend : `ruff check .`
  - Frontend : `npm run lint`

## ⚠️ Error Handling & Stuck Protocol

- Si un test échoue de manière répétée après 3 tentatives de correction : **Arrête-toi**, analyse les logs de manière exhaustive, et propose un diagnostic avant de retenter.
- Si une bibliothèque manque, vérifie `pyproject.toml` ou `package.json` avant d'installer quoi que ce soit.
- Documente toute déviation majeure par rapport aux specs dans `DECISIONS.md`.
