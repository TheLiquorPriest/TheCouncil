# Create New Agent Development Plan

Create a new development plan for a version release.

## Arguments

- `$ARGUMENTS` - Version name (e.g., "alpha-4.0.0")

## Instructions

Create a new development plan at `.claude/agent-dev-plans/$ARGUMENTS/` with the standard structure.

### Directory Structure to Create

```
.claude/agent-dev-plans/$ARGUMENTS/
├── index.md
├── plan-overview.md
├── status.md
├── progress-tracker.md
├── task-list.md
├── assignments.md
├── reference.md
├── tasks/
├── handoffs/
├── code-audits/
├── ui-verification/
└── agent-recommendations/
```

### Steps

1. Create the directory structure
2. Create index.md with links to other files
3. Create plan-overview.md (ask user for goals)
4. Create status.md with initial state
5. Create progress-tracker.md template
6. Create task-list.md template
7. Create assignments.md template
8. Create reference.md with context links
9. Create .gitkeep in empty directories

### Templates

Use the alpha-3.0.0 plan as a template. Copy structure but reset:
- All task statuses to PENDING
- Progress to 0%
- Remove specific task content

### After Creation

1. Update `.claude/agent-dev-plans/state.md` with new active plan
2. Inform user the plan is ready for task definition
3. Suggest using dev-opus-plan agent for task breakdown
