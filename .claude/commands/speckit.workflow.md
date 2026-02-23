---
description: Route feature requests to the full spec-to-PR workflow (speckit + superpowers). Auto-use for non-trivial feature/component/module development requests; skip for small fixes.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Use this command as the default orchestration workflow when the user asks to implement a feature, develop a component, build a module, start a non-trivial task, or requests an end-to-end development workflow.

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

## Phase 3 - COMPLETION

```text
superpowers:requesting-code-review         -> review against plan before PR
superpowers:finishing-a-development-branch -> cleanup and final checks
commit-commands:commit-push-pr             -> commit, push, open PR
```

Rule:

- Never push directly to `master`; always open a PR.

## Parallel Execution

- Use `superpowers:dispatching-parallel-agents` when frontend/backend tasks are independent.

## Quick Routing Reference

| Situation | Action |
|---|---|
| New feature | `/speckit.specify` then full pipeline |
| Spec exists, ready to code | `superpowers:subagent-driven-development` |
| Blocked on a bug | `superpowers:systematic-debugging` |
| Before PR | `superpowers:requesting-code-review` |
| PR ready | `commit-commands:commit-push-pr` |
| Small fix | Direct edit, no spec workflow |

## Context

$ARGUMENTS
