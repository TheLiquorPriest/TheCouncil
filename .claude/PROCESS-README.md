# The Council - Agentic Development Process

This document describes the complete agentic development process for The Council project.

---

## Overview

The Council uses a structured, multi-agent development process with:

- **12 specialized agents** for different task types
- **Memory persistence** via memory-keeper MCP
- **Structural code search** via ast-grep
- **Parallel browser testing** via concurrent-browser MCP
- **Version-scoped development plans** with Groups > Blocks > Tasks hierarchy

---

## Directory Structure

```
.claude/
├── PROCESS-README.md           # This file
├── settings.local.json         # All permissions (agents inherit these)
│
├── agents/                     # Agent definitions
│   ├── dev-opus.md             # Complex implementation
│   ├── dev-sonnet.md           # Standard implementation
│   ├── dev-haiku.md            # Simple tasks
│   ├── dev-opus-plan.md        # Architecture/planning
│   ├── code-audit-opus.md      # Code review
│   ├── ui-feature-verification-test-opus.md
│   ├── ui-feature-verification-test-sonnet.md
│   ├── project-manager-opus.md
│   ├── qa-team-opusplan.md
│   ├── uiux-expert-opus.md
│   ├── api-expert-opus.md
│   └── sillytavern-expert-opus.md
│
├── definitions/                # Project definitions (single source of truth)
│   ├── index.md                # ALWAYS READ FIRST - lists all definitions
│   ├── SYSTEM_DEFINITIONS.md   # Six-system architecture
│   ├── VIEWS.md                # UI element inventory
│   ├── DEFAULT_PIPELINE.md     # Pipeline structure reference
│   └── UI_BEHAVIOR.md          # Expected UI behavior
│
├── commands/                   # Slash commands
│   ├── tasks.md                # Run tasks
│   ├── ui-test.md              # UI testing pipeline
│   ├── add-to-dev-plan.md      # Add tasks to plan
│   ├── new-agent-dev-plan.md   # Create new plan
│   ├── status-report.md        # Generate status
│   └── task.md                 # Single task runner
│
├── checklists/                 # Process checklists
│   ├── session-start.md        # Every session must complete
│   ├── task-completion.md      # Before marking complete
│   └── agent-spawn.md          # When spawning agents
│
├── agent-dev-plans/            # Development plans
│   ├── general-instructions.md # Shared agent instructions
│   ├── state.md                # Global state
│   └── {version}/              # Version-scoped plans
│       ├── index.md            # Plan entry point
│       ├── plan-overview.md    # Goals and scope
│       ├── task-list.md        # All tasks (Groups > Blocks > Tasks)
│       ├── status.md           # Current status
│       ├── progress-tracker.md # Progress metrics
│       ├── assignments.md      # Agent → Task mapping
│       ├── reference.md        # Context and specs
│       └── tasks/              # Individual task files
│           └── task-X.X.X.md
│
├── agent-workflows/            # Workflow documentation
│   └── index.md                # Complete workflow reference
│
└── handoffs/                   # Task completion documents
    ├── task-X.X.X.md           # Task handoffs
    └── archive/                # Completed handoffs
```

---

## Mandatory Requirements

### 1. Memory-Keeper (ALWAYS)

Every agent and session MUST initialize memory-keeper:

```javascript
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-[Role]",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
```

Save context automatically for:
- Architectural decisions → `category: "decision"`, `priority: "high"`
- Bugs identified → `category: "error"`, `priority: "high"`
- Task completion → `category: "progress"`, `priority: "normal"`
- Important findings → `category: "note"`, `priority: "normal"`

### 2. Definition Loading (ALWAYS)

Before any work, read `.claude/definitions/index.md` and load ALL listed definitions.

**Never hardcode definition paths** - always reference the index.

### 3. ast-grep (PRIMARY for code)

Use ast-grep FIRST for any code exploration:

```bash
# Find patterns
ast-grep run --pattern 'this._kernel.emit($EVENT, $DATA)' --lang javascript .

# Find methods
ast-grep run --pattern 'show() { $$$BODY }' --lang javascript ui/
```

Fall back to Grep only for simple text searches.

### 4. Browser Automation

| Scenario | Tool |
|----------|------|
| Parallel testing | concurrent-browser (REQUIRED) |
| Sequential testing | playwright (acceptable) |
| Single modal test | playwright (acceptable) |

---

## Task Hierarchy

Development plans use Groups > Blocks > Tasks:

```
Group 1: Bug Fixes & Polish
├── Block 1.1: Critical (P0)
│   └── Task 1.1.1: injection-edit-functionality
├── Block 1.2: High Priority (P1)
│   └── Task 1.2.1: nav-modal-auto-reappear
└── Block 1.3: Medium Priority (P2)
    └── Task 1.3.1: prompt-builder-mode-switch-error

Group 2: Feature Enhancements
├── Block 2.1: Pipeline Triggering
│   └── Task 2.1.1: curation-pipeline-run-button
...
```

**Task ID Format**: `{Group}.{Block}.{Task}` (e.g., `2.3.1`)

---

## Agent Selection Guide

| Task Type | Agent | Model |
|-----------|-------|-------|
| Architecture decisions | dev-opus-plan | opus |
| Complex multi-file implementation | dev-opus | opus |
| Standard feature implementation | dev-sonnet | sonnet |
| Simple fixes, docs, config | dev-haiku | haiku |
| Code review/audit | code-audit-opus | opus |
| Comprehensive UI testing | ui-feature-verification-test-opus | opus |
| Standard UI testing | ui-feature-verification-test-sonnet | sonnet |
| Project coordination | project-manager-opus | opus |
| QA planning | qa-team-opusplan | opus |
| UI/UX guidance | uiux-expert-opus | opus |
| API/backend guidance | api-expert-opus | opus |
| SillyTavern integration | sillytavern-expert-opus | opus |

---

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/tasks [id]` | Run task(s) - supports Group, Block, or Task ID |
| `/ui-test [modal]` | Run UI testing pipeline |
| `/add-to-dev-plan [version]` | Add tasks to a plan |
| `/new-agent-dev-plan` | Create new development plan |
| `/status-report` | Generate current status |

---

## Workflow: Starting a Session

1. **Initialize memory-keeper** (see checklist)
2. **Retrieve previous context** from memory
3. **Read definitions index** and load definitions
4. **Check development plan status**
5. **Begin work** with ast-grep for code exploration

See: `.claude/checklists/session-start.md`

---

## Workflow: Running a Task

1. **Use `/tasks` command** with task ID
2. **Agent spawned** with proper instructions
3. **Implementation** with memory saves
4. **Handoff created** documenting work
5. **Browser verification** if UI changes
6. **Group audit** if completing a group

See: `.claude/commands/tasks.md`

---

## Workflow: Adding Tasks

1. **Use `/add-to-dev-plan` command**
2. **Provide task details** (name, description, priority)
3. **Task ID assigned** based on hierarchy
4. **Task file created** in `tasks/`
5. **Plan files updated** automatically

See: `.claude/commands/add-to-dev-plan.md`

---

## Workflow: Spawning Agents

1. **Select appropriate agent** based on task
2. **Include all mandatory sections** in prompt
3. **Verify checklist complete** before spawn
4. **Monitor agent progress**
5. **Review handoff** when complete

See: `.claude/checklists/agent-spawn.md`

---

## Quality Gates

Every group goes through:

1. **Task Completion** - All tasks in group complete
2. **Handoffs Submitted** - All handoff docs created
3. **Code Audit** - code-audit-opus reviews changes
4. **UI Verification** - Browser tests pass (if applicable)
5. **Ready for Merge** - All gates passed

---

## Checklists

| Checklist | Use When |
|-----------|----------|
| `session-start.md` | Starting any session |
| `task-completion.md` | Finishing a task |
| `agent-spawn.md` | Spawning any agent |

---

## Key Principles

1. **Memory is persistent** - Save decisions, progress, errors
2. **Index files are truth** - Don't hardcode paths
3. **ast-grep first** - Structural search over text search
4. **concurrent-browser for parallel** - Avoid conflicts
5. **Checklists ensure consistency** - Follow them always
6. **Handoffs document work** - Future sessions need context

---

## Troubleshooting

### Memory-keeper not available
```bash
claude mcp list
# Verify memory-keeper shows as connected
```

### ast-grep not finding patterns
- Check pattern syntax (metavariables: `$NAME`, `$$$ARGS`)
- Verify language flag (`--lang javascript`)
- Try simpler pattern first

### Browser conflicts
- Use concurrent-browser for parallel tests
- Each agent needs unique instance ID
- Close instances when done

### Context running out
- Save important context to memory-keeper
- Use 70% context budget warning
- Write handoff before context exhausted

---

## Version History

| Date | Change |
|------|--------|
| 2025-12-15 | Initial process documentation |
