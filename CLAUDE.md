# CLAUDE.md - The Council

## CRITICAL: File Editing on Windows

### ⚠️ MANDATORY: Always Use Backslashes on Windows for File Paths

**When using Edit or MultiEdit tools on Windows, you MUST use backslashes (`\`) in file paths, NOT forward slashes (`/`).**

#### ❌ WRONG - Will cause errors:
```
Edit(file_path: "D:/repos/project/file.tsx", ...)
MultiEdit(file_path: "D:/repos/project/file.tsx", ...)
```

#### ✅ CORRECT - Always works:
```
Edit(file_path: "D:\repos\project\file.tsx", ...)
MultiEdit(file_path: "D:\repos\project\file.tsx", ...)
```


## THE BIBLE: `.claude/PROCESS_README.md`

**READ `.claude/PROCESS_README.md` FIRST IN EVERY SESSION.**

This is the authoritative process document that defines:
- ALL directory structures and paths
- File naming conventions
- Dynamic discovery via index files
- Agent usage patterns
- Handoff and task formats

**NEVER guess paths. ALWAYS follow PROCESS_README.md.**

---

## ⛔ CRITICAL: MCP TOOL VERIFICATION GATE (MANDATORY)

### NO WORKAROUNDS POLICY

**CODE REVIEW IS NOT A SUBSTITUTE FOR BROWSER TESTING.**

Reports like this are **COMPLETELY UNACCEPTABLE**:
> "Due to browser automation tools being unavailable in this session, verification was conducted through detailed code review..."

**THIS IS A HARD FAILURE.** If MCP tools are unavailable, the task MUST FAIL immediately. Do NOT attempt workarounds.

### MANDATORY Tool Verification (BEFORE ANY WORK)

**EVERY agent and subagent MUST verify MCP tools FIRST, before any other work:**

```javascript
// STEP 1: VERIFY MCP TOOLS ARE AVAILABLE
// Attempt to use each required MCP tool. If ANY fails, STOP IMMEDIATELY.

// Test 1: Memory-keeper (ALWAYS REQUIRED)
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-ToolVerify",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})

// Test 2: Browser automation (REQUIRED for UI tasks)
// Choose based on task type:
// - For parallel testing: mcp__concurrent-browser__browser_create_instance
// - For sequential testing: mcp__playwright__browser_navigate
```

### Tool Verification Confirmation (MANDATORY OUTPUT)

**You MUST output this BEFORE proceeding with ANY task:**

```markdown
## ⛔ MCP TOOL VERIFICATION GATE

### Required Tools Status

| Tool | Status | Verification Method |
|------|--------|---------------------|
| memory-keeper | ✅ PASS / ❌ FAIL | context_session_start succeeded |
| playwright | ✅ PASS / ❌ FAIL / N/A | browser_navigate callable |
| concurrent-browser | ✅ PASS / ❌ FAIL / N/A | browser_create_instance callable |
| ast-grep | ✅ PASS / ❌ FAIL | Bash ast-grep --version succeeded |

### Gate Result: PASS / FAIL

If FAIL: **STOP IMMEDIATELY. Do not proceed. Report failure and exit.**
```

### HARD FAILURE Conditions

**If ANY of these occur, IMMEDIATELY STOP and report:**

1. **memory-keeper unavailable** → FAIL (ALL tasks require this)
2. **Browser tools unavailable for UI tasks** → FAIL (no code review substitution)
3. **ast-grep unavailable for code exploration** → FAIL (no grep substitution for structural searches)

### Failure Report Format

**If tools are unavailable, output this and STOP:**

```markdown
## ⛔ TASK ABORTED: MCP TOOLS UNAVAILABLE

### Missing Tools
- [tool name]: [error message]

### Task Cannot Proceed
This task REQUIRES the following MCP tools:
- [list required tools]

### Action Required
1. Verify MCP servers are connected: `claude mcp list`
2. Restart Claude Code session if needed
3. Re-run the task after tools are available

### NO WORKAROUNDS ATTEMPTED
Code review, static analysis, or other substitutes are NOT acceptable for browser testing tasks.

**TASK STATUS: FAILED - TOOLS UNAVAILABLE**
```

### What This Means for Subagents

**When spawning subagents via Task tool:**

1. **Include MCP verification gate** in EVERY agent prompt
2. **Explicitly state** that workarounds are forbidden
3. **Require** the verification output before any work
4. **Check** the subagent's output for the verification gate

**Add this to EVERY Task tool prompt:**

```
## ⛔ MCP TOOL VERIFICATION (MANDATORY FIRST STEP)

Before doing ANYTHING else, verify MCP tools are available:

1. Call mcp__memory-keeper__context_session_start()
2. If this is a UI task, call mcp__playwright__browser_navigate() or mcp__concurrent-browser__browser_create_instance()
3. Output the Tool Verification Gate confirmation

IF ANY TOOL IS UNAVAILABLE:
- DO NOT proceed with the task
- DO NOT attempt workarounds like "code review"
- Output the failure report
- State: "TASK ABORTED: MCP TOOLS UNAVAILABLE"

Code review is NOT a substitute for browser testing. Static analysis is NOT a substitute for runtime verification.
```

---

## CRITICAL: Dynamic Discovery via Index Files

**DO NOT HARDCODE PATHS. Always use index files for dynamic discovery.**

### Master Index Files

| Index File | Purpose | MUST Read |
|------------|---------|-----------|
| `.claude/PROCESS_README.md` | **THE BIBLE** - Authoritative process | ALWAYS FIRST |
| `.claude/definitions/index.md` | Definition discovery | Always |
| `.claude/agents/index.md` | Agent discovery | When spawning agents |
| `.claude/agent-workflows/index.md` | Workflow/process discovery | For tasks/commands |

### Session Start Checklist

**EVERY session MUST begin with:**

```markdown
## Session Initialization Confirmed

- [ ] `.claude/PROCESS_README.md` read (THE BIBLE)
- [ ] Memory-keeper session started
- [ ] `.claude/definitions/index.md` read
- [ ] `.claude/agents/index.md` read
- [ ] Required definitions loaded (from definitions index)
- [ ] Operating as: [agent name]
```

---

## Default Agent: project-manager-opus

**For all user sessions**, operate as the `project-manager-opus` agent by default.

**At session start:**
1. Read `.claude/agents/index.md` to find the agent
2. Read `.claude/agents/project-manager-opus.md` for your role and instructions
3. Follow ALL MANDATORY sections in that agent definition
4. Report to user: "Operating as project-manager-opus"

**When spawning subagents via Task tool:**
1. Read `.claude/agents/index.md` to find available agents
2. Check `assignments.md` for the correct agent for each task
3. Read the agent definition from `.claude/agents/{agent-name}.md`
4. **Include the FULL agent instructions** in the Task tool prompt
5. Use the model specified in the agent's frontmatter (opus, sonnet, haiku)
6. **Output spawn confirmation** showing agent name, model, and definition file

---

## Custom Agents (via `.claude/agents/index.md`)

**ALWAYS read `.claude/agents/index.md`** to discover available agents. Do not hardcode.

The index contains:
- Development agents (dev-opus, dev-sonnet, dev-haiku)
- Quality agents (code-audit-opus, ui-feature-verification-test-*)
- Expert advisors (uiux-expert-opus, api-expert-opus, sillytavern-expert-opus)
- Management (project-manager-opus)

**CRITICAL: When using Task tool, ALWAYS:**
1. Read `.claude/agents/index.md` to find the agent
2. Read the agent definition file
3. Include the agent's full instructions in the prompt
4. Use the correct model from the agent's frontmatter
5. Output confirmation of agent used


## Session Context (memory-keeper)

**Start every session** by initializing memory-keeper context:

```
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-Dev",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
```

### Automatic Context Saving

**Save context automatically when:**

| Event | Category | Priority | Example |
|-------|----------|----------|---------|
| Architectural decision made | `decision` | `high` | "Using event bus pattern for X" |
| Bug identified | `error` | `high` | "Issue: modal not closing properly" |
| Task completed | `progress` | `normal` | "Completed: injection edit functionality" |
| Important finding during exploration | `note` | `normal` | "Found: 15 event emissions in curation-system" |
| Potential issue spotted | `warning` | `normal` | "Warning: no error handling in async function" |

```javascript
// After making a decision
mcp__memory-keeper__context_save({
  key: "decision-event-pattern",
  value: "Using Kernel event bus for modal communication instead of direct calls",
  category: "decision",
  priority: "high"
})

// After completing a task
mcp__memory-keeper__context_save({
  key: "task-injection-edit",
  value: "Implemented edit functionality for token mappings in injection-modal.js",
  category: "progress",
  priority: "normal"
})

// When finding a bug
mcp__memory-keeper__context_save({
  key: "bug-nav-modal-reappear",
  value: "Nav modal doesn't auto-show after closing other modals. Need to add modal:hidden listener.",
  category: "error",
  priority: "high"
})
```

### Checkpoints (Before Risky Operations)

**Create checkpoints before:**
- Major refactoring
- Multi-file changes
- Deleting code
- Changing system APIs

```javascript
mcp__memory-keeper__context_checkpoint({
  name: "before-event-refactor",
  description: "Before refactoring event emission pattern across all systems"
})
```

### Retrieving Context

**At session start or when context is needed:**

```javascript
// Get recent decisions
mcp__memory-keeper__context_get({ category: "decision" })

// Get all high-priority items
mcp__memory-keeper__context_get({ priorities: ["high"] })

// Search for specific topic
mcp__memory-keeper__context_search({ query: "injection modal" })

// Get session summary
mcp__memory-keeper__context_summarize()
```

### For Agentic Tasks

**Include in agent prompts:**
```
prompt: |
  Before starting, retrieve relevant context:
  mcp__memory-keeper__context_search({ query: "relevant topic" })

  Save important findings:
  mcp__memory-keeper__context_save({ key: "finding-X", value: "...", category: "note" })
```

---

## Project Overview

**The Council** is a SillyTavern browser extension (v2.1.0-alpha) that transforms response generation into a multi-agent editorial production pipeline. The goal is producing responses and prompts that achieve quality and accuracy far beyond single-LLM, single-prompt approaches.

**Status:** Alpha 3 Development - Bug fixes, Curation enhancements, Kernel preset system.

**Current Development Plan:** `.claude/agent-dev-plans/alpha-3.0.0/`

## Architecture: Six Systems

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE COUNCIL KERNEL                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SHARED RESOURCES: Logger, EventBus, StateManager, ApiClient,        │    │
│  │ SchemaValidator, Styles, UI Components, Hooks, Presets              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│ CURATION SYSTEM │      │ PROMPT BUILDER SYS  │      │ CHARACTER SYSTEM│
│ (Topologists)   │      │ (Macros/Tokens)     │      │ (Avatars)       │
└────────┬────────┘      └──────────┬──────────┘      └────────┬────────┘
         └───────────────────────────┼─────────────────────────┘
┌────────────────────────────────────┴────────────────────────────────────────┐
│              RESPONSE PIPELINE BUILDER SYSTEM (Editorial Agents)            │
└────────────────────────────────────┬────────────────────────────────────────┘
┌────────────────────────────────────┴────────────────────────────────────────┐
│                      RESPONSE ORCHESTRATION SYSTEM                           │
│              (Synthesis | Compilation | Injection modes)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### System Status

| System | Version | Status | Core File |
|--------|---------|--------|-----------|
| **The Council Kernel** | 2.0.0 | ✅ Complete | `core/kernel.js` |
| **Curation System** | 2.0.0 | ✅ Complete | `core/curation-system.js` |
| **Character System** | 2.0.0 | ✅ Complete | `core/character-system.js` |
| **Prompt Builder System** | 2.1.0 | ✅ Complete | `core/prompt-builder-system.js` |
| **Pipeline Builder System** | 2.0.0 | ✅ Complete | `core/pipeline-builder-system.js` |
| **Orchestration System** | 2.0.0 | ✅ Complete | `core/orchestration-system.js` |

### System Definitions (Summary)

| System | Purpose | Owns Agents |
|--------|---------|-------------|
| **Curation System** | Knowledge base builder with CRUD/RAG pipelines, topological data stores | Topologists |
| **Character System** | Dynamic avatar agents from Curation data | Character Avatars |
| **Prompt Builder System** | Token registry, macros, conditionals, transforms, prompt stacks | - |
| **Response Pipeline Builder** | Multi-step workflow definitions, teams, threads, variable I/O | Editorial Agents |
| **Response Orchestration** | Execute pipelines in 3 modes: Synthesis, Compilation, Injection | - |
| **The Council Kernel** | Hub: shared modules, event bus, hooks, state, presets, UI | - |

**Full definitions:** `.claude/definitions/SYSTEM_DEFINITIONS.md`

## Current File Structure

```
TheCouncil/
├── index.js                    # Thin entry point → invokes Kernel
├── manifest.json               # Extension manifest
├── CLAUDE.md                   # This file
├── README.md                   # User documentation
│
├── core/                       # System implementations
│   ├── kernel.js               # The Council Kernel ✅
│   ├── curation-system.js      # Curation System ✅
│   ├── character-system.js     # Character System ✅
│   ├── prompt-builder-system.js # Prompt Builder System ✅
│   ├── pipeline-builder-system.js # Pipeline Builder System ✅
│   └── orchestration-system.js # Orchestration System ✅
│
├── ui/                         # User interface
│   ├── nav-modal.js            # Navigation modal (Kernel UI)
│   ├── base-modal.js           # Base modal class
│   ├── curation-modal.js       # Curation System UI
│   ├── character-modal.js      # Character System UI
│   ├── pipeline-modal.js       # Pipeline Builder UI
│   ├── gavel-modal.js          # Gavel intervention UI
│   ├── injection-modal.js      # Injection mode UI
│   ├── agents-modal.js         # [DEPRECATED - to be removed]
│   └── components/
│       ├── prompt-builder.js   # Embeddable Prompt Builder component
│       ├── token-picker.js     # Token picker component
│       ├── participant-selector.js # Participant selection component
│       ├── context-config.js   # Context configuration component
│       ├── curation-pipeline-builder.js # Curation pipeline builder
│       └── execution-monitor.js # Execution monitoring component
│
├── utils/                      # Shared utilities
│   ├── logger.js               # Logging utility
│   └── api-client.js           # API client for LLM calls
│
├── schemas/
│   └── systems.js              # All data schemas
│
├── styles/
│   └── main.css                # Global styles
│
├── data/presets/               # Pipeline presets
│   ├── default-pipeline.json   # Default (empty) pipeline
│   ├── quick-pipeline.json     # Quick single-phase pipeline
│   └── standard-pipeline.json  # Standard multi-phase pipeline
│
├── docs/                       # Documentation
│   └── archive/                # Archived documentation
│
├── tests/                      # Test files
│   ├── integration-test.js     # Integration tests
│   ├── preset-validation-test.js # Preset validation tests
│   └── convert-presets.js      # Preset conversion utility
│
├── examples/
│   └── orchestration-modes-test.js # Orchestration mode examples
│
└── .claude/                    # Claude Code configuration
    ├── settings.local.json     # Local settings
    ├── definitions/            # Project definitions (source of truth)
    │   ├── index.md            # ⭐ DEFINITION INDEX (read first!)
    │   ├── SYSTEM_DEFINITIONS.md # Six-system architecture
    │   ├── VIEWS.md            # UI views map & testing checklist
    │   ├── UI_BEHAVIOR.md      # Expected UI behavior spec
    │   └── DEFAULT_PIPELINE.md # Pipeline structure docs
    ├── agents/                 # Custom agent definitions
    │   ├── index.md            # ⭐ AGENT INDEX (read first!)
    │   ├── project-manager-opus.md  # Default session agent
    │   ├── dev-opus.md         # Complex development
    │   ├── dev-sonnet.md       # Standard development
    │   ├── dev-haiku.md        # Simple tasks
    │   ├── code-audit-opus.md  # Code auditing
    │   ├── ui-feature-verification-test-*.md  # UI testing
    │   └── [other agents]      # See index for full list
    ├── agent-dev-plans/        # Development plans
    │   ├── state.md            # Global dev state
    │   └── alpha-3.0.0/        # Active plan ⬅️
    │       ├── index.md        # Plan index
    │       ├── plan-overview.md
    │       ├── task-list.md
    │       ├── status.md
    │       ├── progress-tracker.md
    │       ├── assignments.md  # ⭐ Task-to-agent mapping
    │       ├── reference.md
    │       └── tasks/          # Individual task files
    ├── agent-workflows/        # Workflow documentation
    │   ├── index.md            # ⭐ WORKFLOW INDEX (read first!)
    │   └── UI_TESTING.md       # Browser automation guide
    └── commands/               # Slash commands
        ├── tasks.md            # Task runner (with observability)
        ├── ui-test.md          # UI testing pipeline (with observability)
        └── add-to-dev-plan.md  # Add tasks to plan
```

## Orchestration Modes

| Mode | Purpose | When to Use |
|------|---------|-------------|
| **Synthesis** | Multi-agent workflow produces final response | Complex creative tasks |
| **Compilation** | Multi-agent workflow produces optimized prompt for ST's LLM | Prompt optimization |
| **Injection** | Replace ST tokens with Curation RAG outputs | Fast context injection |

## Key Features

### Prompt Builder System (v2.1.0)
- **Council Macros**: Parameterized reusable prompt fragments (`{{macro:id param="value"}}`)
- **Conditional Blocks**: `{{#if condition}}...{{else}}...{{/if}}`, `{{#unless}}`
- **Transform Pipelines**: `{{token | uppercase | truncate:100}}`
- **Token Registry**: Centralized token management with 8 categories
- **Preset Prompts**: Save/load prompt configurations
- **Live Validation**: Real-time feedback on token resolution

### Pipeline Builder System
- **Agents**: LLM-backed workers with configurable system prompts
- **Positions**: Roles within teams with prompt modifiers
- **Teams**: Groups of positions with orchestration modes
- **Phases**: Multi-step workflow stages
- **Actions**: Individual steps within phases
- **Threads**: Context management for conversations

### Curation System
- **Topological Data Stores**: Structured knowledge bases
- **CRUD Pipelines**: Create/Read/Update/Delete operations
- **RAG Pipelines**: Retrieval-Augmented Generation
- **Topologist Agents**: AI-powered data management

### Character System
- **Character Avatars**: Dynamic agents from character data
- **Character Director**: Coordinates character responses
- **Voicing Guidance**: Maintains character consistency

## Code Conventions

### Module Pattern
```javascript
const SystemName = {
  VERSION: "2.0.0",
  _initialized: false,
  _kernel: null,

  init(kernel) {
    this._kernel = kernel;
    this._logger = kernel.getModule('logger');
    this._eventBus = kernel.getModule('eventBus');
    this._initialized = true;
    return this;
  },

  // Public API
  publicMethod() { },

  // Events via Kernel
  _emit(event, data) {
    this._kernel.emit(`systemName:${event}`, data);
  }
};
```

### Event Namespacing
- `kernel:*` - Kernel events
- `curation:*` - Curation System events
- `character:*` - Character System events
- `promptBuilder:*` - Prompt Builder events
- `pipeline:*` - Pipeline Builder events
- `orchestration:*` - Orchestration events
- `ui:*` - UI events

## Key Documentation

### Index Files (READ THESE FIRST)

| Index File | Purpose | Contains |
|------------|---------|----------|
| `.claude/definitions/index.md` | **Definition discovery** | Lists all definition files to load |
| `.claude/agents/index.md` | **Agent discovery** | Lists all custom agents with models |
| `.claude/agent-workflows/index.md` | **Workflow discovery** | Agent registry, task lifecycle |

### Definition Files (via definitions index)

| Document | Purpose |
|----------|---------|
| `SYSTEM_DEFINITIONS.md` | Six-system architecture |
| `VIEWS.md` | UI views map and testing checklist |
| `UI_BEHAVIOR.md` | Expected UI behavior spec |
| `DEFAULT_PIPELINE.md` | Pipeline structure docs |

### Development Plan

| Document | Purpose |
|----------|---------|
| `.claude/agent-dev-plans/alpha-3.0.0/` | **Active development plan** |
| `assignments.md` | Task-to-agent mapping |
| `task-list.md` | All tasks |
| `status.md` | Current progress |

## Quick Reference

| What | Where |
|------|-------|
| **Index files** | `.claude/definitions/index.md`, `.claude/agents/index.md` |
| **Development plan** | `.claude/agent-dev-plans/alpha-3.0.0/` |
| System definitions | `.claude/definitions/` (via index) |
| Custom agents | `.claude/agents/` (via index) |
| All schemas | `schemas/systems.js` |
| Presets | `data/presets/*.json` |

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/ui-test` | Run full UI testing pipeline (spawns 6 parallel agents) |
| `/ui-test [modal]` | Test single modal (nav, curation, character, pipeline, injection, gavel) |
| `/task [id]` | Run a single development task |
| `/tasks [phase]` | Run all tasks for a phase |

## Browser Automation (MCP)

This project is configured with browser automation for UI testing via MCP (Model Context Protocol).

### Documentation

| Document | Purpose |
|----------|---------|
| `.claude/definitions/VIEWS.md` | Complete UI map with all views, states, buttons, interactions |
| `.claude/agent-workflows/UI_TESTING.md` | MCP setup, tools reference, troubleshooting |

### Quick Start

```bash
# Verify MCP servers are connected
claude mcp list

# Expected output:
# playwright: ✓ Connected
# browsermcp: ✓ Connected
```

### Available Tools

| Tool | Purpose |
|------|---------|
| `mcp__playwright__browser_navigate` | Navigate to URL |
| `mcp__playwright__browser_snapshot` | Get accessibility tree (preferred) |
| `mcp__playwright__browser_click` | Click elements by ref |
| `mcp__playwright__browser_type` | Type into fields |
| `mcp__playwright__browser_console_messages` | Get console logs |
| `mcp__playwright__browser_take_screenshot` | Capture screenshot |
| `mcp__playwright__browser_evaluate` | Run JavaScript |

### Common Workflow

```
1. Navigate: mcp__playwright__browser_navigate(url: "http://127.0.0.1:8000/")
2. Snapshot: mcp__playwright__browser_snapshot() → get element refs
3. Click: mcp__playwright__browser_click(element: "description", ref: "eXXX")
4. Verify: Take new snapshot or check console
```

### UI Testing Checklist

Use `.claude/definitions/VIEWS.md` as a testing checklist. It documents:
- **6 modals**: Navigation, Curation, Character, Pipeline, Injection, Gavel
- **26+ sub-views** across all tabs
- **150+ UI elements** with expected behavior
- **Shared components**: Prompt Builder, Token Picker, etc.

### Run Integration Tests

```javascript
// Via browser_evaluate:
window.TheCouncil.runIntegrationTests()
```

### Setup (if not configured)

```bash
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest
claude mcp add browsermcp -s user -- npx -y @browsermcp/mcp@latest
# Restart Claude Code session
```

**Full MCP documentation:** `.claude/agent-workflows/UI_TESTING.md`
**Full UI views map:** `.claude/definitions/VIEWS.md`

## Structural Code Search (ast-grep)

This project has the **ast-grep skill** and CLI installed. **Proactively use ast-grep** for structural code searches—don't wait for explicit requests.

### Decision Tree: Which Tool to Use

```
Is the search about CODE STRUCTURE (functions, methods, patterns)?
├── YES → Use ast-grep
│   Examples:
│   - "Find all event handlers" → ast-grep
│   - "Find methods that call X" → ast-grep
│   - "Find async functions" → ast-grep
│   - "Find where modal.show() is called" → ast-grep
│
└── NO → Is it a simple TEXT search?
    ├── YES → Use grep
    │   Examples:
    │   - "Find _initialized" → grep
    │   - "Find TODO comments" → grep
    │   - "Find a specific string" → grep
    │
    └── NO → Use glob (file paths)
        Examples:
        - "Find all modal files" → glob **/*modal*.js
```

### Automatic ast-grep Triggers

**Use ast-grep automatically when the task involves:**

| Task Type | Trigger Phrases | ast-grep Pattern |
|-----------|-----------------|------------------|
| Finding method calls | "find where X is called", "find all calls to" | `$OBJ.$METHOD($$$)` |
| Finding event handlers | "find event listeners", "find handlers" | `this._kernel.on($EVENT, $$$)` |
| Finding patterns | "find all functions that", "find methods with" | YAML rule with `has`/`inside` |
| Refactoring prep | "before I change X", "impact of changing" | Pattern for affected code |
| Bug investigation | "find all places that", "where does X happen" | Structural pattern |
| Code review | "find potential issues", "find missing error handling" | YAML rule with `not` |

### For Agentic Tasks (Task Tool / Subagents)

When spawning agents for code exploration or refactoring tasks, **instruct them to use ast-grep**:

```
prompt: |
  Investigate where event emissions happen in the codebase.

  Use ast-grep for structural searches:
  ast-grep run --pattern 'this._kernel.emit($EVENT, $DATA)' --lang javascript .

  Use grep only for simple text searches.
```

**Include ast-grep in agent prompts when:**
- Agent needs to find all usages of a pattern
- Agent is investigating code flow
- Agent is preparing for refactoring
- Agent needs to understand system interactions

### Common Patterns for This Codebase

```bash
# Find all event emissions
ast-grep run --pattern 'this._kernel.emit($EVENT, $DATA)' --lang javascript .

# Find all Kernel.on() event subscriptions
ast-grep run --pattern 'this._kernel.on($EVENT, $HANDLER)' --lang javascript .

# Find console.log statements
ast-grep run --pattern 'console.log($$$ARGS)' --lang javascript .

# Find method calls on _kernel
ast-grep run --pattern 'this._kernel.$METHOD($$$)' --lang javascript .

# Find getModule calls
ast-grep run --pattern 'kernel.getModule($NAME)' --lang javascript .

# Find all show() method definitions
ast-grep run --pattern 'show() { $$$BODY }' --lang javascript ui/

# Find all _handle* methods
ast-grep run --pattern '_handle$NAME($$$ARGS) { $$$BODY }' --lang javascript .
```

### Complex Searches (YAML Rules)

For searches with logical conditions (AND, OR, NOT), use YAML rules:

```yaml
# Find async functions without try-catch
id: async-no-error-handling
language: javascript
rule:
  all:
    - kind: function_declaration
    - has:
        pattern: await $EXPR
        stopBy: end
    - not:
        has:
          kind: try_statement
          stopBy: end
```

```bash
# Run a YAML rule
ast-grep scan --inline-rules "id: test
language: javascript
rule:
  pattern: console.log(\$\$\$)" .
```

### Key AST Node Kinds (JavaScript)

| Code | Kind |
|------|------|
| `function foo() {}` | `function_declaration` |
| `const foo = () => {}` | `arrow_function` |
| `class Foo {}` | `class_declaration` |
| `foo.bar()` | `call_expression` |
| `{ key: value }` | `object` |
| `method() {}` | `method_definition` |

### Metavariable Reference

| Metavar | Matches |
|---------|---------|
| `$NAME` | Single AST node (identifier, expression) |
| `$$$ARGS` | Zero or more nodes (variadic) |
| `$_` | Wildcard (matches anything, unnamed) |

**Skill docs:** `~/.claude/plugins/marketplaces/ast-grep-marketplace/`

---

## Extension Metadata

- **Author**: The Liquor Priest
- **Version**: 2.1.0-alpha
- **Platform**: SillyTavern browser extension
- **Language**: JavaScript (ES6+), vanilla (no frameworks)
