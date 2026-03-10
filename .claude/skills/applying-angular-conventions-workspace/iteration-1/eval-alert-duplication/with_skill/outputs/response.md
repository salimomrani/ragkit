# Response: Alert duplication

## Convention applied

> "Extract reusable components — if a template pattern appears 2+ times across files, extract it into a standalone component"

The pattern appears in 3 components, so extraction is mandatory.

## Solution: `AlertComponent`

See `alert.component.ts` in this directory.

Key decisions per conventions:
- `standalone: true` — no NgModule
- `ChangeDetectionStrategy.OnPush` — always
- `input()` signal API — no `@Input()` decorator
- `type` input with default `'error'` — covers the original use case while making the component reusable for `success`/`info` variants
- The `@if` guard stays inside the component — callers pass the raw signal value and don't need to wrap it themselves

## Usage in consumer components

Before (repeated in 3 places):
```html
@if (error()) {
  <div class="alert error">{{ error() }}</div>
}
```

After:
```typescript
// component.ts
imports: [AlertComponent],
```

```html
<!-- component.html -->
<app-alert [message]="error()" />
```

The `@if` guard is now encapsulated inside `AlertComponent` — passing `null` or `undefined` renders nothing.

## What was NOT done

- No custom pipe — the transformation is structural (conditional render), not a value transform.
- No directive — the behavior is presentational markup, not DOM behavior.
- No new service — no shared state involved.
