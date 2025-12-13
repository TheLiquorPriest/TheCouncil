# CLAUDE.md - The Council

## Project Overview

**The Council** is a SillyTavern browser extension (v2.1.0-alpha) that transforms response generation into a multi-agent editorial production pipeline. The goal is producing responses and prompts that achieve quality and accuracy far beyond single-LLM, single-prompt approaches.

**Status:** Alpha Complete - All 6 systems implemented and integrated. Ready for user testing.

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
│   ├── SYSTEM_DEFINITIONS.md   # Comprehensive system definitions
│   ├── ACTION_PLAN_v2.md       # Implementation roadmap
│   ├── DEVELOPMENT_PLAN.md     # Session-based development plan
│   └── DEFAULT_PIPELINE.md     # Pipeline structure documentation
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
    └── handoffs/               # Session handoff documents
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
| `docs/SYSTEM_DEFINITIONS.md` | Comprehensive system definitions |
| `docs/ACTION_PLAN_v2.md` | Implementation roadmap |
| `docs/DEVELOPMENT_PLAN.md` | Session-based development plan |
| `docs/STATUS_REPORT.md` | Implementation status report |

## Quick Reference

| What | Where |
|------|-------|
| System definitions | `docs/SYSTEM_DEFINITIONS.md` |
| Implementation plan | `docs/ACTION_PLAN_v2.md` |
| All schemas | `schemas/systems.js` |
| Presets | `data/presets/*.json` |
| Handoff docs | `.claude/handoffs/*.md` |

## Extension Metadata

- **Author**: The Liquor Priest
- **Version**: 2.1.0-alpha
- **Platform**: SillyTavern browser extension
- **Language**: JavaScript (ES6+), vanilla (no frameworks)
