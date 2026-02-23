# Skill: Angular Conventions — PALO Project

## Component structure

- Standalone components only (`standalone: true`)
- `ChangeDetectionStrategy.OnPush` on all components
- `inject()` for DI — never constructor injection
- `input()` / `output()` functions (Angular 17+)
- Signals for local state: `signal()`, `computed()`, `effect()`

## Template syntax

- Control flow: `@if`, `@for`, `@switch` (not `*ngIf`, `*ngFor`)
- 2-space indentation

## Subscriptions

- Prefer `toSignal()` to avoid manual subscription management
- If `subscribe()` unavoidable → always use `takeUntilDestroyed()`
- Never subscribe in `ngOnInit` without cleanup

## UI library

- PrimeNG v21 — check API with Context7 before implementing
- `frontend-design` skill for ALL UI work (components, pages, layouts)

## Testing

- Vitest + Angular Testing Library
- `npm test -- --watch=false` for CI
- Test file: `<component>.spec.ts` next to the component

## API calls

- `RagApiService` — centralized, injectable
- SSE/streaming: `Observable` → subscribe with `takeUntilDestroyed()`
- Errors: translate API error codes in component (`_translateError()` pattern)

## Scroll / DOM timing

- DOM reads after render: always use `setTimeout(() => { ... })` — never rely on `ngAfterViewChecked` with OnPush

## Linting

- ESLint with Angular plugin
- Prettier for formatting
- `npm run lint` before every commit
- Never silence ESLint errors to make lint pass (`eslint-disable`, file-level disables, inline suppressions, or config exceptions). Fix the code instead.
