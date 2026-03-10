# Alert duplication — analyse et solution

## Diagnostic

Le pattern dupliqué est :

```html
@if (error()) {
  <div class="alert error">{{ error() }}</div>
}
```

**La bonne nouvelle : le composant partagé existe déjà.**

`/Users/salimomrani/code/_Autres/PALO/frontend/src/app/shared/components/alert.ts` définit `AlertComponent` avec :
- `message = input<string | null>(null)` — gère le `@if` en interne
- `type = input<'error' | 'success' | 'info'>('error')`

Deux composants l'utilisent déjà correctement (`eval.html`, `ingest.html`). Un seul (`chat.html`) utilise encore le pattern brut.

---

## Solution

Créer `AlertComponent` (s'il n'existait pas) — voir `alert.component.ts` dans ce répertoire.

La logique clé : le composant encapsule lui-même le `@if`, donc l'appelant passe simplement `null` quand il n'y a rien à afficher.

### Utilisation dans les templates

**Avant (pattern dupliqué) :**
```html
@if (error()) {
  <div class="alert error">{{ error() }}</div>
}
```

**Après :**
```html
<app-alert [message]="error()" type="error" />
```

Pour les autres types :
```html
<app-alert [message]="successMsg()" type="success" />
<app-alert [message]="info()"       type="info" />
```

### Import dans le composant parent

```ts
import { AlertComponent } from '../../shared/components/alert';

@Component({
  imports: [AlertComponent],
  // ...
})
```

### Correction à appliquer dans chat.html

```html
<!-- Remplacer (ligne 110-112) : -->
@if (error()) {
  <div class="error-banner">{{ error() }}</div>
}

<!-- Par : -->
<app-alert [message]="error()" type="error" />
```

---

## Pourquoi ce composant, pas une directive ni un pipe

| Option | Raison d'écarter |
|---|---|
| `@if` inline répété | Duplication — c'est le problème de départ |
| Directive structurelle | Sur-ingénierie pour un simple bloc conditionnel |
| Pipe | Ne produit pas de DOM, inadapté |
| **Composant standalone** | Encapsule DOM + style + condition — minimal et réutilisable |

Le composant est déjà `ChangeDetectionStrategy.OnPush`, standalone, et sans dépendances — zéro overhead.
