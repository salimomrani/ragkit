---
description: Route feature requests to the full spec-to-PR workflow (speckit + superpowers). Auto-use for non-trivial feature/component/module development requests; skip for small fixes.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

If user input is empty, interpret it as:

- "Resume the latest Speckit workflow from where it stopped" (continue the last spec instead of starting a new one).

## Goal

Use this command as the default orchestration workflow when the user asks to implement a feature, develop a component, build a module, start a non-trivial task, or requests an end-to-end development workflow.

## Superpowers Integration (Codex)

- If `superpowers` skills are installed and available in this Codex session, explicitly invoke them by name during the relevant phases (especially `subagent-driven-development`, `test-driven-development`, `systematic-debugging`, `requesting-code-review`, `finishing-a-development-branch`).
- If `superpowers` is not available in the current session (for example before restart after install), follow the same workflow manually and state that you are applying the superpowers process by hand.
- Prefer explicit mentions like `use superpowers:subagent-driven-development` so skill activation is unambiguous.

## Trigger Hints (EN)

- new feature
- implement
- develop
- build
- add feature
- create feature
- start a task
- full workflow
- spec and implement

## Trigger Hints (FR)

- nouvelle feature
- implémenter
- développer
- construire
- ajouter une feature
- créer un composant
- nouvelle tâche
- workflow complet
- from spec to PR

## Do Not Use For

- typo fixes
- label/text changes
- 1-2 line edits
- documentation-only changes
- any request explicitly described as a "small fix"

## Decision Rule

- If request is a feature or non-trivial change: follow the full workflow below.
- If request is a small fix: do a direct edit and skip spec workflow.
- If no argument is provided: resume the latest spec and continue from the current phase based on existing artifacts.

## No-Argument Resume Behavior (Default)

When `/speckit.workflow` is invoked with no arguments, do **not** ask for a new feature request by default.

Instead:

1. Locate the latest spec directory in `specs/` (highest numeric prefix: `specs/<NNN>-<name>/`).
2. Inspect workflow artifacts in that directory.
3. Resume exactly where the workflow stopped.

Definition of "latest spec":

- The spec folder with the highest numeric prefix (`NNN`) in `specs/<NNN>-*`.

Resume routing rules:

- `spec.md` missing -> stop and report invalid/incomplete spec folder.
- `spec.md` exists, `plan.md` missing -> resume at `/speckit.plan`.
- `plan.md` exists, `tasks.md` missing -> resume at `/speckit.tasks`.
- `tasks.md` exists and has unchecked tasks (`[ ]`) -> resume implementation with `superpowers:subagent-driven-development` and continue remaining tasks.
- `tasks.md` exists and all tasks are checked (`[x]`) -> continue Phase 3 (`superpowers:requesting-code-review` -> `superpowers:finishing-a-development-branch` -> PR flow).

Notes:

- Do not create a new spec on empty input.
- Announce the selected spec directory and the phase being resumed.
- If multiple specs are active, default to the latest one unless the user explicitly names another spec.

## Phase 1 - SPEC (speckit)

Run these in order (clarify/analyze optional as noted):

```text
/speckit.specify    -> create spec in specs/<NNN>-<name>/spec.md
/speckit.clarify    -> optional, resolve ambiguities if spec contains [NEEDS CLARIFICATION]
/speckit.plan       -> generate plan.md (architecture, tech decisions)
/speckit.tasks      -> generate tasks.md (ordered, parallelizable tasks)
/speckit.analyze    -> optional but recommended consistency check across artifacts
```

Notes:

- Specs live in `specs/<NNN>-<short-name>/` and are created by `/speckit.specify`.
- Do not use `superpowers:writing-plans` or `superpowers:executing-plans` for this workflow; speckit replaces them.

## Phase 2 - IMPLEMENTATION (superpowers)

Use superpowers to execute the generated plan/tasks:

```text
superpowers:subagent-driven-development   -> orchestrates implementation from plan.md + tasks.md
  - superpowers:test-driven-development   -> mandatory per task (RED -> GREEN -> REFACTOR)
  - superpowers:systematic-debugging      -> when blocked (no brute-force)
```

Mandatory task tracking:

- Update `specs/<feature>/tasks.md` after each completed task: `[ ]` -> `[x]`.
- When superpowers is available, announce which `superpowers:*` skill is being invoked for each step/task batch.

## Phase 3 - COMPLETION

```text
superpowers:requesting-code-review         -> review against plan before PR
superpowers:finishing-a-development-branch -> cleanup and final checks
commit-commands:commit-push-pr             -> commit, push, open PR
```

Rule:

- Never push directly to `master`; always open a PR.
- If superpowers is available, prefer explicit invocation of `superpowers:requesting-code-review` before any commit/push/PR command.

## Parallel Execution

- Use `superpowers:dispatching-parallel-agents` when frontend/backend tasks are independent.

## Quick Routing Reference

| Situation | Action |
|---|---|
| New feature | `/speckit.specify` then full pipeline |
| `/speckit.workflow` with no args | Resume latest `specs/<NNN>-*` at current phase |
| Spec exists, ready to code | `superpowers:subagent-driven-development` |
| Blocked on a bug | `superpowers:systematic-debugging` |
| Before PR | `superpowers:requesting-code-review` |
| PR ready | `commit-commands:commit-push-pr` |
| Small fix | Direct edit, no spec workflow |

## Context

$ARGUMENTS
