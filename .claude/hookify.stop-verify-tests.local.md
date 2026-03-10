---
name: stop-verify-tests
enabled: true
event: stop
pattern: .*
action: warn
---

⚠️ **Avant de terminer — TDD check**

As-tu :
- [ ] Lancé les tests (`pytest` / `ng test`) et vérifié qu'ils passent ?
- [ ] Lancé le lint (`ruff check` / `ng lint`) ?

Iron law : aucun commit sans tests verts.
