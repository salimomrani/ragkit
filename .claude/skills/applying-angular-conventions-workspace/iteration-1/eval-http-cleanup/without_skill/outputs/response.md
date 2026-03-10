# Code Review — UserListComponent

## Verdict: incorrect (bug bloquant)

---

## Problèmes identifiés

### 1. `HttpClient` non injecté (bug bloquant)
`this.http` est utilisé dans `ngOnInit` mais n'est jamais déclaré ni injecté dans la classe.
Au runtime : `TypeError: Cannot read properties of undefined (reading 'get')`.

**Fix** : injecter `HttpClient` via `inject()` pour rester cohérent avec `DestroyRef`.

### 2. `takeUntilDestroyed` dans `ngOnInit` — valide
Passer `destroyRef` explicitement en argument permet d'utiliser `takeUntilDestroyed` en dehors du contexte d'injection (constructeur / champ de classe). Ce n'est **pas** un bug.

L'emplacement idiomatic est néanmoins dans le champ de classe (inline), ce qui évite d'écrire `ngOnInit` pour un simple GET.

---

## Version corrigée

Voir `corrected.ts` dans le même répertoire.

Changements :
- `http` injecté via `inject(HttpClient)`
- HTTP call déplacé dans un champ de classe avec `toSignal` (Angular 16+) — élimine `ngOnInit` et le `subscribe` manuel
- `takeUntilDestroyed` devient implicite via `toSignal` (gère le teardown automatiquement)
