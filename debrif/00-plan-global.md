# Débrief — Plan global (45 min)

## Timing

| Segment | Durée | Fichier |
|---------|-------|---------|
| Démo live | 10 min | `01-demo-10min.md` |
| Walkthrough technique | 15 min | `02-walkthrough-technique-15min.md` |
| Deep-dive prompts / garde-fous / eval | 10 min | `03-deep-dive-prompts-guardrails-eval.md` |
| Q&A + industrialisation | 10 min | `04-qa-industrialisation-10min.md` |

---

## Fil conducteur

> "Un RAG d'entreprise, ce n'est pas un chatbot. C'est un système d'information qui refuse de mentir."

Trois fils à tenir tout au long du débrief :

1. **Fiabilité avant performance** — refus explicite > réponse hallucinée
2. **Traçabilité by design** — chaque query laisse une trace auditée, PII masqué
3. **Swappabilité** — Ollama aujourd'hui, Gen-e2 demain, même interface

---

## Posture

- Démo d'abord, code ensuite — ne pas ouvrir VS Code avant la fin de la démo
- Répondre "je ne sais pas encore" plutôt qu'improviser une architecture
- Transformer chaque limite connue en "next step" concret
