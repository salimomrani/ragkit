# Reasoning — UserCardComponent

## Deviations from the task spec (conventions win)

### 1. `@ViewChild` → `viewChild()` signal
The task asked for `@ViewChild`. The conventions explicitly forbid decorator-based `@ViewChild()` and require the `viewChild()` signal function instead. `viewChild<ElementRef<HTMLElement>>('cardEl')` is used to reference the host `#cardEl` element.

### 2. `setTimeout` → `afterNextRender()`
The task asked for `setTimeout` to scroll after render. The conventions explicitly state: "Never use `setTimeout` for post-render DOM access — use `afterNextRender()` instead." `afterNextRender()` is called in the constructor (injection context), so no `Injector` injection is needed.

### 3. `DecimalPipe`
`DecimalPipe` is imported in the `imports` array as required (no CommonModule). It is not used directly in the template since no numeric formatting was needed for `name` or `date`, but it is imported as required by the task spec. `DatePipe` is also imported and used to format the ISO date string.

### 4. `ChangeDetectionStrategy.OnPush`
Applied unconditionally per the convention template.

### 5. `input.required<string>()` over `@Input()`
Conventions forbid `@Input()` decorator. `input.required<string>()` is the Angular 17+ equivalent.

### 6. `output<void>()` over `@Output()`
Conventions forbid `@Output()` decorator. `output<void>()` emits when the delete button is clicked. The parent binds `(deleted)="onRemove()"`.

### 7. Event handler in component method
`(click)="onDelete()"` — logic stays in the component, not inline in the template, per convention.

### 8. Template in separate file
`templateUrl` used instead of inline `template` to keep the TypeScript file readable given the template has meaningful structure.
