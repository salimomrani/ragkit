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
- **Never use `$any()` in templates**. For event targets, prefer template reference variables (e.g. `<input #myInput (input)="doSomething(myInput.value)">`) instead of `$any($event.target).value`.

## RxJS & Signals

- Prefer `toSignal()` for view-facing state (best default) to avoid manual subscription management
- In templates, prefer `async` pipe over manual `subscribe()` when a signal conversion is not needed
- With Observables, push transformation logic into `pipe(...)` (`map`, `filter`, `switchMap`, `catchError`, etc.) and keep `subscribe()` callbacks as thin as possible
- Avoid business/data transformation logic inside `subscribe()`; use `subscribe()` mainly for side effects (navigation, imperative UI bridge, logging)
- If `subscribe()` is unavoidable in a component → always use `takeUntilDestroyed()`
- Never subscribe in `ngOnInit` without cleanup

### Quick decision guide (what to use when)

- **Local UI state** (toggle, loading flag, selected tab) → `signal()`
- **Derived UI state** from signals → `computed()`
- **Observable data displayed in component/template** → prefer `toSignal()`
- **Template-only Observable binding** (simple stream, no TS reuse needed) → `async` pipe
- **Imperative side effect** (navigate, trigger toast, bridge to non-reactive API) → `subscribe()` with minimal callback logic
- **Complex async flow** (cancel previous request, chaining, retries, error mapping) → RxJS `pipe(...)` operators, then convert to signal or bind with `async`

## UI library

- `frontend-design` skill for ALL UI work (components, pages, layouts)

## Testing

- Vitest + Angular TestBed (Angular Testing Library optional)
- `npm test -- --watch=false` for CI
- Test file: `<component>.spec.ts` next to the component

## API calls

- `RagApiService` — centralized, injectable
- SSE/streaming: `Observable` → subscribe with `takeUntilDestroyed()` only when signal/`async` pipe is not practical
- Errors: translate API error codes in component (`_translateError()` pattern)

## Scroll / DOM timing

- DOM reads after render: default to `setTimeout(() => { ... })` in this project; avoid relying on `ngAfterViewChecked` with OnPush

## Linting

- ESLint with Angular plugin
- Prettier for formatting
- `npm run lint` before every commit
- Never silence ESLint errors to make lint pass (`eslint-disable`, file-level disables, inline suppressions, or config exceptions). Fix the code instead.
