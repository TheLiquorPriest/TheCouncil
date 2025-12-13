# CLAUDE.md - The Council

## Project Overview

**The Council** is a SillyTavern browser extension (v2.1.0-alpha) that transforms response generation into a multi-agent editorial production pipeline. The goal is producing responses and prompts that achieve quality and accuracy far beyond single-LLM, single-prompt approaches.

**Status:** Alpha 3 Development - Bug fixes, Curation enhancements, Kernel preset system.

**Current Development Plan:** `docs/ALPHA3_DEVELOPMENT_PLAN.md`

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

**Full definitions:** `docs/SYSTEM_DEFINITIONS.md`

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
│   ├── ALPHA3_DEVELOPMENT_PLAN.md # Active Alpha 3 development plan ⬅️
│   ├── SYSTEM_DEFINITIONS.md   # Comprehensive system definitions
│   ├── DEFAULT_PIPELINE.md     # Pipeline structure documentation
│   ├── VIEWS.md                # Exhaustive UI views map & testing checklist
│   ├── UI_TESTING.md           # Browser automation testing guide
│   ├── UI_BEHAVIOR.md          # Expected UI behavior spec (generated)
│   ├── UI_BEHAVIOR_REPORT.md   # UI test results (generated)
│   ├── archive/                # Archived development plans
│   │   ├── ACTION_PLAN_v2.md   # Alpha 2 implementation roadmap
│   │   └── DEVELOPMENT_PLAN.md # Alpha 2 session-based plan
│   ├── testing/                # Test reports
│   │   └── UI_REPORT-*.md      # Timestamped test reports
│   └── tasks/                  # Development tasks
│       └── alpha3/             # Alpha 3 tasks
│           └── CURRENT_SUGGESTED_TASKS.md
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
    ├── commands/               # Slash commands
    │   ├── task.md             # Single task runner
    │   ├── tasks.md            # Phase task runner
    │   └── ui-test.md          # UI testing pipeline (parallel agents)
    └── handoffs/               # Session handoff documents
        └── archive/            # Completed handoffs from Alpha 2
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

| Document | Purpose |
|----------|---------|
| `docs/ALPHA3_DEVELOPMENT_PLAN.md` | **Active development plan with tasks** |
| `docs/SYSTEM_DEFINITIONS.md` | Comprehensive system definitions |
| `docs/VIEWS.md` | Exhaustive UI views map and testing checklist |
| `docs/UI_TESTING.md` | Browser automation testing guide |
| `docs/UI_BEHAVIOR.md` | Expected UI behavior spec (test reference) |
| `docs/tasks/alpha3/CURRENT_SUGGESTED_TASKS.md` | UI test-generated task suggestions |

## Quick Reference

| What | Where |
|------|-------|
| **Development plan** | `docs/ALPHA3_DEVELOPMENT_PLAN.md` |
| System definitions | `docs/SYSTEM_DEFINITIONS.md` |
| UI views & testing | `docs/VIEWS.md` |
| UI test tasks | `docs/tasks/alpha3/CURRENT_SUGGESTED_TASKS.md` |
| All schemas | `schemas/systems.js` |
| Presets | `data/presets/*.json` |
| Archived plans | `docs/archive/*.md` |
| Archived handoffs | `.claude/handoffs/archive/*.md` |

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
| `docs/VIEWS.md` | Complete UI map with all views, states, buttons, interactions |
| `docs/UI_TESTING.md` | MCP setup, tools reference, troubleshooting |

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

Use `docs/VIEWS.md` as a testing checklist. It documents:
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

**Full MCP documentation:** `docs/UI_TESTING.md`
**Full UI views map:** `docs/VIEWS.md`

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
