# RagKit — Core Rules & Context

## Project Context & Files

- **Primary Source of Truth**: Codebase > `specs/` > `DECISIONS.md`.
- **Architecture**: `.specify/memory/constitution.md` (À lire impérativement avant toute décision structurante).
- **Tech Stack**: Angular (Frontend), Python/FastAPI (Backend), PostgreSQL 16 (DB), Ollama (LLM Local).
- **Stack-specific rules**: See `.claude/rules/backend.md` and `.claude/rules/frontend.md` (loaded automatically by path).

## Workflow Routing (Mandatory)

- **Feature / Non-trivial change**: Utiliser systématiquement `/speckit.workflow`.
- **Small fix**: (Typo, wording, < 5 lignes) -> Edition directe autorisée sans spec.

## Architectural Constraints

1. **Local-first** : Uniquement Ollama. Aucune donnée ne doit transiter par des API externes.
2. **Traceability** : Chaque query doit être logguée (avec masquage PII).
3. **Transparent failure** : Préférer "Je ne sais pas" à l'hallucination.
4. **Separation of concerns** : Isolation stricte entre RAG, Guardrails et Modules d'évaluation.

## Environment

- **Docker** : `docker-compose up -d` (PostgreSQL sur port 5444).
- **Ports** : Backend 8000 | Frontend 4200 | PostgreSQL 5444.

## Error Handling & Stuck Protocol

- Si un test échoue de manière répétée après 3 tentatives de correction : **Arrête-toi**, analyse les logs de manière exhaustive, et propose un diagnostic avant de retenter.
- Si une bibliothèque manque, vérifie `pyproject.toml` ou `package.json` avant d'installer quoi que ce soit.
- Documente toute déviation majeure par rapport aux specs dans `DECISIONS.md`.
