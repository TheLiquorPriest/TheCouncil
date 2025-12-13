# Single Task Runner

You are implementing **Task $ARGUMENTS** from The Council development plan.

## Instructions

1. **Read the development plan**: `docs/DEVELOPMENT_PLAN.md`
2. **Find your task** by ID (e.g., "1.1.1", "2.3.1")
3. **Check the Quick Reference table** for:
   - Model assignment (opus/sonnet/haiku)
   - Primary file
   - Estimated hours
4. **Read any context docs** referenced in your task description
5. **Implement the deliverables** exactly as specified
6. **Test your work** against the acceptance criteria
7. **Commit your changes** (do NOT push or merge)

## Model Selection

The Quick Reference table in DEVELOPMENT_PLAN.md specifies which model to use:
- **opus**: Complex architecture, multi-file changes
- **sonnet**: Standard implementation
- **haiku**: Simple fixes, docs, cleanup

If you're running this task, use the model specified in the table.

## Context Budget

- **0-30%**: Read docs, understand scope
- **30-70%**: Implementation
- **70-80%**: Testing, refinement
- **80%+**: STOP coding, write handoff summary

## Handoff Summary Format

When you reach 70% context, create a file `.claude/handoffs/task-$ARGUMENTS.md` with:

```markdown
# Task $ARGUMENTS Handoff

## Status: [COMPLETE | PARTIAL | BLOCKED]

## Model Used
[opus | sonnet | haiku]

## What Was Implemented
- [list of completed items]

## Files Modified
- [file paths]

## What Remains (if partial)
- [remaining items]

## Issues Encountered
- [any blockers or concerns]

## Next Task
Task [X.X.X] - [Name] is ready to start.
```

## On Completion

Commit with message: `Task $ARGUMENTS: [brief description]`

Do NOT push. Do NOT merge. The phase runner handles that.

## Constraints

- Use Kernel pattern: `init(kernel)`, access modules via `kernel.getModule()`
- Emit events via Kernel: `kernel.emit('namespace:event', data)`
- Persist via Kernel storage (when implemented)
- Follow conventions in `CLAUDE.md`

## Begin

Read `docs/DEVELOPMENT_PLAN.md` now and find Task $ARGUMENTS.
