# Add to Development Plan

Add new tasks to an existing development plan with proper structure and tracking.

## Usage

```
/add-to-dev-plan                    # Interactive - asks for details
/add-to-dev-plan alpha-3.0.0        # Add to specific plan version
```

## Instructions

You are adding tasks to an existing development plan.

---

## MANDATORY: Session Initialization

**ALWAYS start with memory-keeper:**

```javascript
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-AddTask",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
```

**Retrieve existing task context:**

```javascript
mcp__memory-keeper__context_search({ query: "task" })
mcp__memory-keeper__context_get({ category: "progress" })
```

---

## MANDATORY: Definition Loading

**Read the definitions index first:**

```javascript
// Read .claude/definitions/index.md to discover required definitions
// Load ALL definitions listed for context
```

---

## Step 1: Identify Target Plan

If `$ARGUMENTS` is provided, use that as the plan version.

Otherwise, check for active plans in `.claude/agent-dev-plans/`:

1. List directories in `.claude/agent-dev-plans/`
2. Read each `index.md` to find the active/current plan
3. If multiple plans exist, ask user which one to add to

```
PLAN_VERSION = $ARGUMENTS or user selection
PLAN_DIR = .claude/agent-dev-plans/{PLAN_VERSION}/
```

---

## Step 2: Read Current Plan State

Read the following files to understand the current plan:

1. `{PLAN_DIR}/index.md` - Plan overview
2. `{PLAN_DIR}/task-list.md` - All existing tasks
3. `{PLAN_DIR}/status.md` - Current progress
4. `{PLAN_DIR}/assignments.md` - Agent assignments

**Determine:**
- Existing groups and blocks
- Highest task ID in each group/block
- Which groups/blocks are complete vs in-progress

---

## Step 3: Gather Task Information

Ask the user for the following (use AskUserQuestion tool):

### Required Information

1. **Task Name**: Short descriptive name (e.g., "add-loading-spinner")
2. **Task Description**: What needs to be done
3. **Priority**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
4. **Group**: Which group does this belong to? (existing or new)
5. **Block**: Which block? (existing or new)

### Optional Information

6. **Files**: Which files are likely affected?
7. **Dependencies**: Does this depend on other tasks?
8. **Browser Test**: Does this require browser testing? (default: yes)
9. **Agent Recommendation**: Suggested agent (opus/sonnet/haiku)

---

## Step 4: Determine Task ID

Based on the group and block:

1. If adding to existing block, find the next task number:
   - Block 2.1 has tasks 2.1.1, 2.1.2 → new task is 2.1.3

2. If creating new block in existing group:
   - Group 2 has blocks 2.1, 2.2 → new block is 2.3
   - First task is X.Y.1

3. If creating new group:
   - Groups 1, 2, 3 exist → new group is 4
   - First block is X.1
   - First task is X.1.1

```
NEW_TASK_ID = {GROUP}.{BLOCK}.{TASK_NUMBER}
```

---

## Step 5: Determine Agent Assignment

Based on task complexity:

| Complexity | Agent | When to Assign |
|------------|-------|----------------|
| Simple | dev-haiku | Docs, config, small fixes |
| Moderate | dev-sonnet | Standard features, clear scope |
| Complex | dev-opus | Architecture, multi-file, decisions |

If user didn't specify, recommend based on:
- P0/P1 with multiple files → dev-opus
- P2 standard feature → dev-sonnet
- P3 docs/config → dev-haiku

---

## Step 6: Create Task File

Create `.claude/agent-dev-plans/{version}/tasks/task-{ID}.md`:

```markdown
# Task {ID}: {task-name}

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | {ID} |
| Name | {task-name} |
| Priority | {P0/P1/P2/P3} |
| Agent | {agent} |
| Browser Test | {Yes/No} |
| Dependencies | {list or None} |

## Description
{user-provided description}

## Files
{list of likely files to modify}

## Acceptance Criteria
- [ ] {criterion 1}
- [ ] {criterion 2}

## Notes
Created: {timestamp}
Source: /add-to-dev-plan command
```

---

## Step 7: Update Plan Files

### Update task-list.md

Add the new task to the appropriate group/block table:

```markdown
| {ID} | {task-name} | {priority} | {agent} | ⏳ PENDING |
```

Update the Summary table if needed.

### Update status.md

- Increment "Total Tasks" and "Pending" counts
- Update "Progress" percentage
- Add to "Recent Activity"
- Update the relevant Group/Block status

### Update progress-tracker.md

- Update metrics
- Add task to the relevant group table
- Update progress bars

### Update assignments.md (if agent assigned)

Add the new assignment to the agent's task list.

---

## Step 8: Save to Memory

```javascript
mcp__memory-keeper__context_save({
  key: "task-added-{ID}",
  value: "Added task {ID}: {name}\\nPriority: {priority}\\nAgent: {agent}",
  category: "progress",
  priority: "normal"
})
```

---

## Step 9: Report to User

```markdown
## Task Added Successfully

### New Task
| Field | Value |
|-------|-------|
| ID | {ID} |
| Name | {task-name} |
| Priority | {priority} |
| Agent | {agent} |
| Group | {group name} |
| Block | {block name} |

### Files Updated
- `{PLAN_DIR}/tasks/task-{ID}.md` (created)
- `{PLAN_DIR}/task-list.md` (updated)
- `{PLAN_DIR}/status.md` (updated)
- `{PLAN_DIR}/progress-tracker.md` (updated)
- `{PLAN_DIR}/assignments.md` (updated)

### Next Steps
- Run `/tasks {ID}` to start this task
- Or run `/tasks {GROUP}` to run all tasks in the group

### Memory Context
- Key saved: task-added-{ID}
```

---

## Adding Multiple Tasks

If user wants to add multiple tasks at once:

1. Gather information for all tasks first
2. Determine IDs for all tasks (respecting order/dependencies)
3. Create all task files
4. Update plan files once with all changes
5. Report all additions

---

## Validation Checklist

Before completing, verify:

- [ ] Task ID is unique (not already used)
- [ ] Task file created in correct location
- [ ] task-list.md updated with new row
- [ ] status.md metrics updated
- [ ] progress-tracker.md updated
- [ ] If agent assigned, assignments.md updated
- [ ] Memory context saved

---

## Error Handling

### Plan Not Found
```
Error: Development plan '{version}' not found.
Available plans: {list from .claude/agent-dev-plans/}
```

### Duplicate Task ID
```
Error: Task ID {ID} already exists.
Next available ID in this block: {next-id}
```

### Invalid Priority
```
Error: Priority must be P0, P1, P2, or P3.
```

**Always save errors to memory:**
```javascript
mcp__memory-keeper__context_save({
  key: "error-add-task",
  value: "[error description]",
  category: "error",
  priority: "high"
})
```
