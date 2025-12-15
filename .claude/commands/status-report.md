# Generate Status Report

Generate a status report for the current development plan.

## Instructions

Read the current active plan and generate a comprehensive status report.

### Steps

1. Read `.claude/agent-dev-plans/state.md` to find active plan
2. Read the plan's `status.md` and `progress-tracker.md`
3. Read recent handoffs in `handoffs/`
4. Check for any blockers

### Report Format

```markdown
# Status Report: [Date]

## Active Plan: [version]

## Progress Summary
- Total Tasks: X
- Completed: Y (Z%)
- In Progress: A
- Blocked: B

## Group Status

### Group N: [Name]
- Status: [COMPLETE | IN_PROGRESS | PENDING]
- Tasks: X/Y complete
- Current: [task being worked on]

## Recent Completions (Last 7 Days)
| Date | Task | Agent |
|------|------|-------|
| [date] | [task-id] | [agent] |

## Current Work
| Task | Agent | Started |
|------|-------|---------|
| [task-id] | [agent] | [date] |

## Blockers
| Task | Issue | Since |
|------|-------|-------|
| [task-id] | [description] | [date] |

## Quality Gates
| Group | Audit | Verification |
|-------|-------|--------------|
| [N] | [status] | [status] |

## Next Actions
1. [Action item]
2. [Action item]

## Notes
[Any important context]
```

### Output

Write the report to `.claude/reports/STATUS_REPORT.md` and display summary to user.
