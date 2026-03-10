---
name: warn-no-test-before-commit
enabled: true
event: bash
pattern: git\s+commit
action: warn
---

⚠️ **Commit détecté — tests lancés ?**

Avant de committer, confirme :
- [ ] `pytest tests/ -v` (backend) ou `npm test -- --watch=false` (frontend) → verts
- [ ] Lint propre (`ruff check .` / `npm run lint`)

Iron law : aucun commit sans tests verts.
