# Analyse — UserListComponent

## Verdict : NON conforme aux conventions Angular

---

## Problemes identifies

### 1. `takeUntilDestroyed` sur un HTTP call (violation principale)

```typescript
this.http.get<User[]>('/api/users')
  .pipe(takeUntilDestroyed(this.destroyRef))  // FAUX
```

**Regle enfreinte :** `takeUntilDestroyed()` est reserve aux observables infinis (streams, Subject, paramMap, interval...). `HttpClient.get()` est un observable fini — il complete automatiquement apres la reponse. Ajouter `takeUntilDestroyed` est du bruit inutile et revele une incomprehension du cycle de vie des observables HTTP.

### 2. HttpClient injecte directement dans le composant

```typescript
// manquant dans le code montre, mais implique par l'usage de this.http
private http = inject(HttpClient); // INTERDIT dans un composant
```

**Regle enfreinte :** "Never call HttpClient in components." Le HTTP doit transiter par un service injectable.

### 3. `ngOnInit` + `subscribe()` manuel pour du data fetching

**Regle enfreinte :** Pour des donnees exposees a la vue (ici `users` signal), la convention impose `resource()` (Angular 19+) ou `toSignal()`. `subscribe()` dans `ngOnInit` est reserve aux effets de bord imperatifs (navigation, toast), pas au chargement de donnees.

### 4. Pas de `ChangeDetectionStrategy.OnPush`

**Regle enfreinte :** Tout composant doit declarer `changeDetection: ChangeDetectionStrategy.OnPush`.

### 5. Pas de `standalone: true`

**Regle enfreinte :** Convention Angular 17+ — plus de NgModules, tout composant doit etre standalone.

---

## Version corrigee

Voir `corrected.ts` dans le meme repertoire.

La correction applique :
- Extraction du HTTP dans `UserService`
- Usage de `resource()` pour le data fetching (Angular 19+)
- Suppression du `takeUntilDestroyed` inutile
- Ajout de `standalone: true` et `ChangeDetectionStrategy.OnPush`
- Suppression du `ngOnInit` devenu inutile
