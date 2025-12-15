# Agent Workflows

This document defines the agentic development process for The Council project.

## Overview

Development is orchestrated through specialized Claude agents, each with defined roles and capabilities. Work is organized into development plans with a hierarchical task structure.

## Task Hierarchy

```
Development Plan (e.g., alpha-3.0.0)
└── Group (major feature/focus area)
    └── Block (related tasks within a group)
        └── Task (atomic unit of work)
```

### Naming Convention

**Task Files**: `{datetime}-{group}-{block}-{task}.md`
**Example**: `20251215-1-2-1.md` = Group 1, Block 2, Task 1

**Task IDs**: `{group}.{block}.{task}`
**Example**: `1.2.1` = Group 1, Block 2, Task 1

## Agent Registry

### Development Agents

| Agent | Model | Use When |
|-------|-------|----------|
| `dev-opus` | opus | Complex multi-file changes, architectural decisions |
| `dev-sonnet` | sonnet | Standard features with clear specs |
| `dev-haiku` | haiku | Simple fixes, docs, config changes |
| `dev-opus-plan` | opus | Task breakdown, architecture planning |

### Quality Agents

| Agent | Model | Use When |
|-------|-------|----------|
| `code-audit-opus` | opus | Code review after implementation |
| `ui-feature-verification-test-opus` | opus | Comprehensive UI testing |
| `ui-feature-verification-test-sonnet` | sonnet | Standard UI verification |
| `qa-team-opusplan` | opus | QA planning and coordination |

### Expert Advisors

| Agent | Model | Expertise |
|-------|-------|-----------|
| `uiux-expert-opus` | opus | UI/UX design, accessibility |
| `api-expert-opus` | opus | LLM APIs, backend integration |
| `sillytavern-expert-opus` | opus | ST platform, extension API |

### Management

| Agent | Model | Role |
|-------|-------|------|
| `project-manager-opus` | opus | Coordination, planning, status |

## Development Workflow

### 1. Planning Phase

```
User Request
    ↓
project-manager-opus: Create/update development plan
    ↓
dev-opus-plan: Break down into groups/blocks/tasks
    ↓
project-manager-opus: Assign agents to tasks
```

### 2. Implementation Phase

```
For each task:
    ↓
Assigned dev-* agent: Implement task
    ↓
code-audit-opus: Review implementation
    ↓
If UI changes: ui-feature-verification-test-*: Test UI
    ↓
Agent creates handoff document
```

### 3. Verification Phase

```
After block/group completion:
    ↓
qa-team-opusplan: Plan verification
    ↓
ui-feature-verification-test-*: Execute tests
    ↓
code-audit-opus: Final audit
    ↓
qa-team-opusplan: Go/no-go decision
```

## Task Lifecycle

```
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌────────┐    ┌──────────┐
│ PENDING │ →  │ ASSIGNED │ →  │ IN_PROGRESS │ →  │ REVIEW │ →  │ COMPLETE │
└─────────┘    └──────────┘    └─────────────┘    └────────┘    └──────────┘
                                      ↓
                               ┌─────────┐
                               │ BLOCKED │
                               └─────────┘
```

### Status Definitions

- **PENDING**: Not yet assigned
- **ASSIGNED**: Agent assigned, not started
- **IN_PROGRESS**: Agent actively working
- **BLOCKED**: Cannot proceed (dependency/issue)
- **REVIEW**: Implementation complete, awaiting review
- **COMPLETE**: Reviewed and approved

## Directory Structure

```
.claude/agent-dev-plans/{version}/
├── index.md              # Plan entry point
├── plan-overview.md      # Goals and scope
├── task-list.md          # Flat list of all tasks
├── status.md             # Current status summary
├── progress-tracker.md   # Progress metrics
├── assignments.md        # Agent → Task mapping
├── reference.md          # Specs and context
│
├── tasks/                # Task definition files
│   └── {datetime}-{g}-{b}-{t}.md
│
├── handoffs/             # Task completion docs
│   └── task-{g}.{b}.{t}.md
│
├── code-audits/          # Audit reports
│   └── group-{g}-audit.md
│
├── ui-verification/      # UI test reports
│   └── group-{g}-verification.md
│
└── agent-recommendations/ # Agent suggestions
    └── CURRENT_SUGGESTED_TASKS.md
```

## Task File Format

```markdown
# Task {g}.{b}.{t}: {task-id}

## Metadata
- **Group**: {g} - {group-name}
- **Block**: {b} - {block-name}
- **Priority**: P0 | P1 | P2 | P3
- **Complexity**: simple | moderate | complex
- **Agent**: {agent-name}
- **Status**: PENDING | IN_PROGRESS | COMPLETE | BLOCKED

## Description
[What needs to be done]

## Files
- `path/to/file.js` - [what to change]

## Dependencies
- Task {x}.{y}.{z}: [why]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Implementation Notes
[Guidance for the agent]
```

## Handoff Document Format

```markdown
# Task {g}.{b}.{t} Handoff

## Status: COMPLETE | BLOCKED | PARTIAL

## Summary
[Brief description of what was done]

## Files Modified
- `path/to/file.js` - [changes made]

## Testing
- [How it was tested]
- [Results]

## Notes
[Context for future sessions]

## Next Steps
[If BLOCKED or PARTIAL, what's needed]
```

## Spawning Agents

Use the Task tool to spawn agents:

```javascript
// Spawn a development agent
Task({
  subagent_type: "dev-sonnet",
  prompt: `
    Complete task 1.2.1 from .claude/agent-dev-plans/alpha-3.0.0/tasks/

    Read the task file first, then implement the changes.
    Create a handoff document when complete.
  `,
  model: "sonnet"
})

// Spawn an audit agent
Task({
  subagent_type: "code-audit-opus",
  prompt: `
    Audit the implementation for Group 1.

    Review all handoffs in .claude/agent-dev-plans/alpha-3.0.0/handoffs/
    Create audit report at .claude/agent-dev-plans/alpha-3.0.0/code-audits/
  `,
  model: "opus"
})
```

## Parallel Execution

Independent tasks can run in parallel:

```javascript
// Run multiple tasks in parallel (single message with multiple Task calls)
Task({ subagent_type: "dev-haiku", prompt: "Task 1.4.1..." })
Task({ subagent_type: "dev-haiku", prompt: "Task 1.4.2..." })
Task({ subagent_type: "dev-sonnet", prompt: "Task 1.3.1..." })
```

## Quality Gates

### Before Marking Block Complete

1. All tasks in block have handoffs
2. Code audit passes
3. UI verification passes (if applicable)

### Before Marking Group Complete

1. All blocks complete
2. Group-level audit passes
3. Regression testing passes

### Before Merging to Main

1. All groups complete
2. Full QA pass
3. Documentation updated

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/status-report` | Generate current status |
| `/ui-test [modal]` | Run UI tests |
| `/tasks [group]` | List tasks for group |
| `/new-agent-dev-plan` | Create new dev plan |

## Best Practices

### For Agents

1. **Read before writing**: Always read existing code first
2. **Stay focused**: Only do what the task specifies
3. **Document clearly**: Create complete handoffs
4. **Test your changes**: Verify before marking complete

### For Coordination

1. **Assign appropriate agents**: Match complexity to capability
2. **Manage dependencies**: Don't start blocked tasks
3. **Review promptly**: Don't let reviews pile up
4. **Track progress**: Keep status.md current

### For Quality

1. **Audit everything**: No code merges without audit
2. **Test UI changes**: Browser verification required
3. **Catch regressions**: Test related functionality
4. **Document decisions**: Record architectural choices
