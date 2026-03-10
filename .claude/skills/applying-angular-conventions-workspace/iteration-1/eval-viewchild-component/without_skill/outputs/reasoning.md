# UserCard — Reasoning

## Choix techniques

### Standalone component
Pas de NgModule. `standalone: true` avec `imports: [DecimalPipe]` suffit — approche moderne Angular 15+.

### @ViewChild
`@ViewChild('cardContainer')` cible le `<div>` racine via une template reference variable `#cardContainer`. Typage explicite `ElementRef<HTMLDivElement>` pour éviter les casts.

### DecimalPipe
Importé directement dans `imports[]` du composant (standalone). Utilisé sur `userId` via `| number` dans le template pour démontrer son usage concret.

### setTimeout + scrollIntoView
`ngAfterViewInit` garantit que le DOM est prêt. Le `setTimeout(..., 0)` repousse l'exécution après le cycle de rendu courant (macrotask), évitant un scroll avant que le layout soit stabilisé — pattern standard pour ce cas.

### EventEmitter delete
`@Output() delete` permet au parent de réagir à la suppression sans coupler la logique au composant. Le composant ne se supprime pas lui-même.

### Template inline vs fichier séparé
Template inline choisi car le composant est simple (< 10 lignes HTML). Un fichier séparé aurait été justifié au-delà de ~20 lignes ou si le template nécessitait une coloration syntaxique dédiée en revue.
