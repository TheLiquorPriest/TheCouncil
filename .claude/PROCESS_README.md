# PROCESS_README.md - The Council Agentic Workflow Bible

**THIS IS THE AUTHORITATIVE PROCESS DOCUMENT.**

Every agent, command, and workflow MUST read this document. It defines:
- Directory structure for all artifacts
- File naming conventions
- Dynamic discovery via index files
- Agent usage patterns
- Handoff and task formats

---

## ⛔ CRITICAL: MCP TOOL VERIFICATION GATE (MUST BE FIRST)

### NO WORKAROUNDS - EVER

**The following is COMPLETELY UNACCEPTABLE and constitutes a TASK FAILURE:**

> "Due to browser automation tools being unavailable in this session, verification was conducted through detailed code review of modal implementations..."

**CODE REVIEW IS NOT A SUBSTITUTE FOR BROWSER TESTING.**
**STATIC ANALYSIS IS NOT A SUBSTITUTE FOR RUNTIME VERIFICATION.**

If MCP tools are not available, the task MUST FAIL. No exceptions. No workarounds.

### MANDATORY: Verify Tools BEFORE Any Work

**Every agent MUST perform this verification as their FIRST action:**

```javascript
// STEP 1: VERIFY MCP TOOLS (BEFORE ANYTHING ELSE)

// Test memory-keeper (ALWAYS REQUIRED)
const memoryResult = mcp__memory-keeper__context_session_start({
  name: "TheCouncil-ToolVerify",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
// If this fails → ABORT TASK IMMEDIATELY

// Test browser tools (REQUIRED for any UI/verification task)
// Use playwright for sequential:
const browserResult = mcp__playwright__browser_navigate({ url: "about:blank" })
// OR use concurrent-browser for parallel:
const browserResult = mcp__concurrent-browser__browser_create_instance({ instanceId: "verify" })
// If this fails for UI task → ABORT TASK IMMEDIATELY
```

### MANDATORY Output: Tool Verification Gate

**You MUST output this confirmation BEFORE any other work:**

```markdown
## ⛔ MCP TOOL VERIFICATION GATE

| Tool | Required | Status | Evidence |
|------|----------|--------|----------|
| memory-keeper | YES | ✅/❌ | Session ID or error |
| playwright | [YES/NO] | ✅/❌/N/A | Navigate result or error |
| concurrent-browser | [YES/NO] | ✅/❌/N/A | Instance ID or error |
| ast-grep | [YES/NO] | ✅/❌ | Version or error |

### GATE RESULT: PASS / FAIL

[If FAIL, task stops here]
```

### On Failure: ABORT IMMEDIATELY

**If ANY required tool is unavailable:**

```markdown
## ⛔ TASK ABORTED: MCP TOOLS UNAVAILABLE

### Missing Tools
- [tool]: [error]

### Required For This Task
- [tool list]

### Resolution Required
1. Run `claude mcp list` to check server status
2. Restart Claude Code session if needed
3. Re-run task when tools are available

### WORKAROUNDS NOT ATTEMPTED
This task requires actual tool usage. Code review and static analysis are NOT acceptable substitutes.

**STATUS: FAILED - TOOLS UNAVAILABLE**
```

### For Orchestrators: Include Gate in ALL Subagent Prompts

**When using Task tool, ALWAYS include:**

```
## ⛔ MCP TOOL VERIFICATION (MANDATORY FIRST STEP)

BEFORE ANY OTHER WORK, verify MCP tools:

1. Call mcp__memory-keeper__context_session_start() - MUST SUCCEED
2. For UI tasks: Call browser tool - MUST SUCCEED
3. Output the verification gate confirmation

IF ANY REQUIRED TOOL FAILS:
- STOP IMMEDIATELY
- Output failure report
- DO NOT attempt workarounds
- DO NOT substitute code review for browser testing

Report: "TASK ABORTED: MCP TOOLS UNAVAILABLE"
```

---

## CRITICAL: Index File System

**ALL discovery MUST be dynamic via index files. NEVER hardcode paths.**

### Master Index Files

| Index | Location | Purpose |
|-------|----------|---------|
| **Definitions** | `.claude/definitions/index.md` | Definition file discovery |
| **Agents** | `.claude/agents/index.md` | Agent discovery |
| **Workflows** | `.claude/agent-workflows/index.md` | Workflow discovery |
| **Dev Plan** | `.claude/agent-dev-plans/{version}/index.md` | Plan structure |

### Reading Order

Every session/task MUST:

1. Read `.claude/PROCESS_README.md` (this file)
2. Read `.claude/definitions/index.md`
3. Read `.claude/agents/index.md`
4. Read active dev plan from `.claude/agent-dev-plans/state.md`
5. Read plan's `index.md`, `assignments.md`, `task-list.md`

---

## Directory Structure

```
.claude/
├── PROCESS_README.md          # ⭐ THIS FILE - The Bible
├── settings.local.json        # Local settings
│
├── definitions/               # Project definitions
│   ├── index.md               # ⭐ Read first - lists all definitions
│   ├── SYSTEM_DEFINITIONS.md
│   ├── VIEWS.md
│   ├── UI_BEHAVIOR.md
│   └── DEFAULT_PIPELINE.md
│
├── agents/                    # Custom agent definitions
│   ├── index.md               # ⭐ Read first - lists all agents
│   ├── project-manager-opus.md
│   ├── dev-opus.md
│   ├── dev-sonnet.md
│   ├── dev-haiku.md
│   ├── code-audit-opus.md
│   └── [other agents].md
│
├── agent-workflows/           # Workflow documentation
│   ├── index.md               # ⭐ Read first - workflow reference
│   └── UI_TESTING.md
│
├── commands/                  # Slash commands
│   ├── tasks.md
│   ├── ui-test.md
│   └── add-to-dev-plan.md
│
└── agent-dev-plans/           # Development plans
    ├── state.md               # ⭐ Points to active plan
    └── {version}/             # e.g., alpha-3.0.0/
        ├── index.md           # Plan overview
        ├── plan-overview.md   # Goals and scope
        ├── task-list.md       # All tasks
        ├── status.md          # Current status
        ├── progress-tracker.md
        ├── assignments.md     # ⭐ Task → Agent mapping
        ├── reference.md       # Specs/context
        │
        ├── tasks/             # Task definitions
        │   └── task-{g}.{b}.{t}.md
        │
        ├── handoffs/          # ⭐ Task completion docs
        │   ├── task-{g}.{b}.{t}.md
        │   └── task-{g}.{b}.{t}-verification.md
        │
        ├── code-audits/       # Audit reports
        │   └── group-{g}-audit.md
        │
        └── ui-verification/   # UI test reports
            └── group-{g}-verification.md
```

---

## Path Conventions

### Task Files

**Location:** `.claude/agent-dev-plans/{version}/tasks/`
**Format:** `task-{group}.{block}.{task}.md`
**Example:** `task-4.5.1.md`

### Handoff Files

**Location:** `.claude/agent-dev-plans/{version}/handoffs/`
**Format:** `task-{group}.{block}.{task}.md`
**Example:** `task-4.5.1.md`

### Verification Reports

**Location:** `.claude/agent-dev-plans/{version}/handoffs/`
**Format:** `task-{group}.{block}.{task}-verification.md`
**Example:** `task-4.5.1-verification.md`

### Code Audits

**Location:** `.claude/agent-dev-plans/{version}/code-audits/`
**Format:** `group-{group}-audit.md`
**Example:** `group-4-audit.md`

### UI Test Reports

**Location:** `.claude/agent-dev-plans/{version}/ui-verification/`
**Format:** `group-{group}-verification.md`
**Example:** `group-4-verification.md`

---

## Task Lifecycle

```
PENDING → ASSIGNED → IN_PROGRESS → REVIEW → COMPLETE
                           ↓
                       BLOCKED
```

### Task File Location

When working on task `4.5.1`:

| Artifact | Path |
|----------|------|
| Task Definition | `.claude/agent-dev-plans/{version}/tasks/task-4.5.1.md` |
| Handoff | `.claude/agent-dev-plans/{version}/handoffs/task-4.5.1.md` |
| Verification | `.claude/agent-dev-plans/{version}/handoffs/task-4.5.1-verification.md` |
| Agent Assignment | `.claude/agent-dev-plans/{version}/assignments.md` |

---

## Agent Usage

### Default Session Agent

`project-manager-opus` - Use for all user sessions unless a specific task requires otherwise.

### Finding the Right Agent

1. Read `.claude/agents/index.md`
2. For tasks: Check `assignments.md` in the active dev plan
3. Read agent definition from `.claude/agents/{agent-name}.md`

### Spawning Agents via Task Tool

**The Task tool only accepts built-in subagent_types.** To use custom agents:

```javascript
Task({
  description: "Task X.X.X: [name]",
  subagent_type: "general-purpose",  // Required: built-in type
  model: "[MODEL]",                   // From agent frontmatter
  prompt: `
## Agent Instructions
[PASTE FULL .claude/agents/{agent-name}.md HERE]

---

## Task Context
[Task-specific details]
`
})
```

### Spawn Confirmation (MANDATORY)

After EVERY spawn, output:

```markdown
## Spawn Confirmation
| Field | Value |
|-------|-------|
| Task | [X.X.X] |
| Agent | [name] |
| Model | [opus/sonnet/haiku] |
| Definition | `.claude/agents/{name}.md` |
| Instructions | [line count] lines |
```

---

## Handoff Document Format

**Location:** `.claude/agent-dev-plans/{version}/handoffs/task-{g}.{b}.{t}.md`

```markdown
# Task {g}.{b}.{t} Handoff

## Status: COMPLETE | PARTIAL | BLOCKED
## Agent Used: [agent-name]
## Model Used: [opus/sonnet/haiku]
## Date: [YYYY-MM-DD]

## Summary
[Brief description of what was done]

## Files Modified
- `path/to/file.js` - [changes made]

## Acceptance Criteria Results
- [x] Criterion 1 - PASS
- [ ] Criterion 2 - FAIL (reason)

## Memory Keys Saved
- key-1: [description]
- key-2: [description]

## Console Errors
[None | List errors]

## Issues Found
[None | List issues]

## Next Steps
[If BLOCKED or PARTIAL, what's needed]
```

---

## Verification Report Format

**Location:** `.claude/agent-dev-plans/{version}/handoffs/task-{g}.{b}.{t}-verification.md`

```markdown
# Task {g}.{b}.{t} Verification Report

## Status: PASS | FAIL | PARTIAL
## Agent Used: [verification agent]
## Model Used: [opus/sonnet]
## Date: [YYYY-MM-DD]

## Verification Summary

| ID | Feature | Expected | Actual | Status |
|----|---------|----------|--------|--------|
| 1 | [feature] | [expected] | [actual] | PASS/FAIL |

## Console Errors
[None | List errors]

## Issues Found
[None | List issues with severity]

## Recommendations
[Optional improvement suggestions]
```

---

## Observability Requirements

Every command/workflow MUST output confirmation at each stage:

### Session Initialization
```markdown
## Initialization Confirmed
- [ ] Memory-keeper started: [session ID]
- [ ] PROCESS_README.md read: YES
- [ ] definitions/index.md read: YES
- [ ] agents/index.md read: YES
```

### Dynamic Discovery
```markdown
## Dynamic Discovery Confirmed
- [ ] Definitions index: [files listed]
- [ ] Agents index: [agents listed]
- [ ] Active plan: [version]
- [ ] Assignments: [agent → task mappings]
```

### Agent Resolution
```markdown
## Agent Resolution for Task [X.X.X]
- [ ] Assignment lookup: [agent name]
- [ ] Agent index: Found
- [ ] Definition read: `.claude/agents/[name].md`
- [ ] Model: [opus/sonnet/haiku]
- [ ] Instructions: [line count] lines
```

### Final Report
```markdown
## Task Complete: [X.X.X]
- [ ] Handoff written: `.claude/agent-dev-plans/{version}/handoffs/task-X.X.X.md`
- [ ] Verification: [PASS/FAIL/PENDING]
- [ ] Memory keys saved: [list]
- [ ] Agent used: [name] (confirmed)
```

---

## Common Mistakes to Avoid

### WRONG Paths
```
.claude/handoffs/task-X.X.X.md                    # WRONG
.claude/tasks/task-X.X.X.md                       # WRONG
docs/handoffs/task-X.X.X.md                       # WRONG
```

### CORRECT Paths
```
.claude/agent-dev-plans/{version}/handoffs/task-X.X.X.md     # CORRECT
.claude/agent-dev-plans/{version}/tasks/task-X.X.X.md        # CORRECT
```

### WRONG Agent Spawning
```javascript
Task({ subagent_type: "dev-sonnet", ... })        # WRONG - custom type
Task({ subagent_type: "code-audit-opus", ... })   # WRONG - custom type
```

### CORRECT Agent Spawning
```javascript
Task({
  subagent_type: "general-purpose",               # CORRECT - built-in type
  model: "sonnet",                                 # From agent frontmatter
  prompt: "[FULL agent instructions]..."          # Include agent definition
})
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

## Quality Gates

Every group goes through:

1. **Task Completion** - All tasks in group complete
2. **Handoffs Submitted** - All handoff docs created in `{version}/handoffs/`
3. **Code Audit** - code-audit-opus reviews changes
4. **UI Verification** - Browser tests pass (if applicable)
5. **Ready for Merge** - All gates passed

---

## Key Principles

1. **Memory is persistent** - Save decisions, progress, errors
2. **Index files are truth** - Don't hardcode paths
3. **ast-grep first** - Structural search over text search
4. **concurrent-browser for parallel** - Avoid conflicts
5. **Observability is mandatory** - Output confirmations at each stage
6. **Handoffs document work** - Future sessions need context
7. **PROCESS_README.md is THE BIBLE** - Read it first, follow it exactly

---

## Troubleshooting

### ⛔ MCP Tools Not Available (CRITICAL)

**THIS IS A HARD FAILURE. DO NOT PROCEED.**

```bash
# Check MCP server status
claude mcp list

# Expected: All required servers show ✓ Connected
# - memory-keeper: ✓ Connected
# - playwright: ✓ Connected
# - concurrent-browser: ✓ Connected
```

**If tools are unavailable:**
1. **ABORT the current task immediately**
2. **DO NOT attempt workarounds** (no code review, no static analysis)
3. Report: "TASK ABORTED: MCP TOOLS UNAVAILABLE"
4. User must restart Claude Code session
5. Re-run task only after tools are confirmed available

**NEVER substitute code review for browser testing. This is a FAILURE, not a workaround.**

### Memory-keeper not available
**This is a BLOCKING failure for ALL tasks.**
```bash
claude mcp list
# Verify memory-keeper shows as connected
# If not connected: ABORT TASK, restart session
```

### Browser tools not available
**This is a BLOCKING failure for UI/verification tasks.**
```bash
claude mcp list
# Verify playwright or concurrent-browser shows as connected
# If not connected: ABORT TASK, restart session
# DO NOT substitute with code review
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

### File path errors on Windows
- Use BACKSLASHES (`\`) for Edit/MultiEdit tools
- Forward slashes work for Read but not Edit
- See CLAUDE.md for details

---

## Quick Reference

| What | Where |
|------|-------|
| This Bible | `.claude/PROCESS_README.md` |
| Definition index | `.claude/definitions/index.md` |
| Agent index | `.claude/agents/index.md` |
| Active plan pointer | `.claude/agent-dev-plans/state.md` |
| Task definitions | `.claude/agent-dev-plans/{version}/tasks/` |
| Handoffs | `.claude/agent-dev-plans/{version}/handoffs/` |
| Agent assignments | `.claude/agent-dev-plans/{version}/assignments.md` |

---

## Version History

| Date | Change |
|------|--------|
| 2025-12-15 | Initial creation as authoritative process document |
| 2025-12-15 | Merged content from PROCESS-README.md |
