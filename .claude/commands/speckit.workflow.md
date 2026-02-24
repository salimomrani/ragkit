---
description: Route non-trivial requests to the full spec-to-PR workflow (speckit + superpowers). Skip for small fixes. With no arguments, resume the latest spec from its current phase.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

If user input is empty, interpret it as:

- "Resume the latest Speckit workflow from where it stopped" (continue the last spec instead of starting a new one).

## Outline

Use this command as the default orchestrator for feature work, non-trivial components/modules, and end-to-end implementation requests.

### 1. Route the request

- **Small fix** (typo, wording, label, 1-2 line edit, docs-only, or explicitly described as a "small fix"): skip spec workflow and edit directly.
- **New feature / non-trivial request with user input**: start full workflow (Phase 1 -> 3 below).
- **No arguments**: resume the latest spec from the detected phase (see Resume Mode).

### 2. Apply superpowers integration (Codex)

- If `superpowers` skills are available, invoke them explicitly by name during each phase.
- Prefer explicit calls such as `superpowers:brainstorming` or `superpowers:subagent-driven-development`.
- If `superpowers` is unavailable, follow the same workflow manually and state that you are applying the process by hand.

### 3. New feature flow (Phase 1 -> Phase 3)

#### Phase 1 — SPEC (speckit)

Run in order (clarify/analyze are optional):

```text
superpowers:brainstorming  -> required before /speckit.specify for new feature requests
/speckit.specify           -> create spec in specs/<NNN>-<name>/spec.md
/speckit.clarify           -> optional, resolve [NEEDS CLARIFICATION]
/speckit.plan              -> generate plan.md (architecture, tech decisions)
/speckit.tasks             -> generate tasks.md (ordered, parallelizable tasks)
/speckit.analyze           -> optional consistency check across artifacts
```

Notes:

- Specs live in `specs/<NNN>-<short-name>/`.
- Do **not** use `superpowers:writing-plans` or `superpowers:executing-plans` in this workflow (Speckit replaces them).

#### Phase 2 — IMPLEMENTATION (superpowers)

```text
superpowers:subagent-driven-development   -> implement from plan.md + tasks.md
  - superpowers:test-driven-development   -> mandatory per task (RED -> GREEN -> REFACTOR)
  - superpowers:systematic-debugging      -> when blocked
```

Mandatory tracking:

- Update `specs/<feature>/tasks.md` after each completed task: `[ ]` -> `[x]`.
- Announce which `superpowers:*` skill is being used for each task/task batch (when available).

Parallelization:

- Use `superpowers:dispatching-parallel-agents` when frontend/backend tasks are truly independent.

#### Phase 3 — COMPLETION

```text
superpowers:requesting-code-review         -> review against plan/spec before PR
superpowers:finishing-a-development-branch -> final checks + integration options
commit-commands:commit-push-pr             -> commit, push, open PR
```

Rules:

- Never push directly to `master`; always open a PR.
- Prefer `superpowers:requesting-code-review` before any commit/push/PR command.

## Resume Mode (No Arguments)

When `/speckit.workflow` is invoked with no arguments, do **not** ask for a new feature by default.

### Resume selection

1. Locate the latest spec directory in `specs/` (highest numeric prefix: `specs/<NNN>-<name>/`).
2. Inspect the workflow artifacts in that directory.
3. Resume exactly where the workflow stopped.

Definition of "latest spec":

- The folder with the highest numeric prefix (`NNN`) matching `specs/<NNN>-*`.

### Resume routing rules

- `spec.md` missing -> stop and report invalid/incomplete spec folder.
- `spec.md` exists, `plan.md` missing -> resume at `/speckit.plan`.
- `plan.md` exists, `tasks.md` missing -> resume at `/speckit.tasks`.
- `tasks.md` exists with unchecked tasks (`[ ]`) -> resume implementation with `superpowers:subagent-driven-development`.
- `tasks.md` exists and all tasks are checked (`[x]`) -> continue Phase 3 (review -> finishing branch -> PR flow).

### Resume-specific rules

- Do **not** invoke `superpowers:brainstorming` by default in resume mode.
- Announce the selected spec directory and the phase being resumed.
- If multiple specs are active, default to the latest unless the user explicitly names another one.

## Trigger Hints (EN / FR)

- new feature / add feature / create feature / build / implement / full workflow / spec and implement
- nouvelle feature / implémenter / développer / construire / créer un composant / workflow complet / from spec to PR

## Quick Routing Reference

| Situation | Action |
|---|---|
| New feature | `superpowers:brainstorming` -> `/speckit.specify` -> full pipeline |
| `/speckit.workflow` with no args | Resume latest `specs/<NNN>-*` at current phase |
| Spec exists, ready to code (plan/tasks ready) | `superpowers:subagent-driven-development` |
| Blocked on bug | `superpowers:systematic-debugging` |
| Before PR | `superpowers:requesting-code-review` |
| PR ready | `commit-commands:commit-push-pr` |
| Small fix | Direct edit, no spec workflow |

## Context

$ARGUMENTS
