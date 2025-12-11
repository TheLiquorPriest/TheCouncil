# CLAUDE.md - The Council

## Project Overview

**The Council** is a SillyTavern browser extension (v2.0.0-alpha) that transforms response generation into a multi-agent editorial production pipeline. The goal is producing responses and prompts that achieve quality and accuracy far beyond single-LLM, single-prompt approaches.

**Status:** Active development toward working alpha. Architecture being refined to 6-system design with clear separation of concerns.

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
│ (Topologists)   │      │                     │      │ (Avatars)       │
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

### System Definitions (Summary)

| System | Purpose | Owns Agents |
|--------|---------|-------------|
| **Curation System** | Knowledge base builder with CRUD/RAG pipelines, topological data stores | Topologists |
| **Character System** | Dynamic avatar agents from Curation data | Character Avatars |
| **Prompt Builder System** | Token registry, prompt stacks, template resolution (ST parity+) | - |
| **Response Pipeline Builder** | Multi-step workflow definitions, teams, threads, variable I/O | Editorial Agents |
| **Response Orchestration** | Execute pipelines in 3 modes: Synthesis, Compilation, Injection | - |
| **The Council Kernel** | Hub: shared modules, event bus, hooks, state, presets, UI | - |

**Full definitions:** `docs/SYSTEM_DEFINITIONS.md`

## Key Architecture Principles

1. **Separation of Concerns**: Each system owns its agents, state, and persistence
2. **Kernel as Hub**: Shared modules, event bus, hooks, UI resources via Kernel
3. **Event-Based Communication**: Systems communicate via Kernel's event bus
4. **No Direct State Access**: Systems use public APIs only

## Orchestration Modes

| Mode | Purpose |
|------|---------|
| **Synthesis** | Multi-agent workflow produces final response |
| **Compilation** | Multi-agent workflow produces optimized prompt for ST's LLM |
| **Injection** | Replace ST tokens with Curation RAG outputs (no pipeline required) |

## Current File Structure

```
TheCouncil/
├── index.js                    # Thin entry point → invokes Kernel
├── manifest.json
├── core/
│   ├── agents-system.js        # → consolidate into pipeline-builder-system
│   ├── curation-system.js      # Curation System ✓
│   ├── character-system.js     # Character System ✓
│   ├── pipeline-system.js      # → split: builder vs orchestration
│   ├── preset-manager.js       # → move to Kernel
│   ├── context-manager.js      # → merge into Pipeline Builder
│   ├── output-manager.js       # → move to Orchestration
│   └── thread-manager.js       # → merge into Pipeline Builder
├── ui/
│   ├── nav-modal.js            # Kernel UI container
│   ├── agents-modal.js         # → becomes Pipeline Builder UI
│   ├── curation-modal.js       # Curation System UI
│   ├── character-modal.js      # Character System UI
│   ├── pipeline-modal.js       # Pipeline Builder UI
│   ├── gavel-modal.js          # Orchestration UI
│   └── components/
│       ├── prompt-builder.js   # → elevate to Prompt Builder System
│       ├── token-picker.js     # → move to Prompt Builder System
│       └── ...
├── utils/
│   ├── logger.js               # → Kernel shared module
│   ├── token-resolver.js       # → Prompt Builder System
│   └── api-client.js           # → Kernel shared module
├── schemas/systems.js          # All data schemas
├── styles/main.css             # → Kernel shared resource
└── data/presets/*.json         # Pipeline presets
```

## Key Documentation

| Document | Purpose |
|----------|---------|
| `docs/SYSTEM_DEFINITIONS.md` | **Comprehensive system definitions** |
| `docs/ACTION_PLAN_v2.md` | Implementation roadmap |
| `docs/ARCHITECTURE.md` | Original design (historical) |
| `docs/ISSUES.md` | Bug tracking |

## Development Priorities

### P0 - Stabilize
- [ ] Fix existing broken features
- [ ] Test current systems end-to-end

### P1 - New Systems
- [ ] Create Kernel (`core/kernel.js`)
- [ ] Create Prompt Builder System
- [ ] Create Orchestration System
- [ ] Consolidate agents into Pipeline Builder

### P2 - Integration
- [ ] System API formalization
- [ ] Integration testing
- [ ] Preset format updates

## Code Conventions

### Module Pattern
```javascript
const SystemName = {
  VERSION: "2.0.0",
  _state: null,
  init(kernel) {
    this._kernel = kernel;
    this._logger = kernel.getModule('logger');
    this._eventBus = kernel.getModule('eventBus');
    return this;
  },
  // Public API
  publicMethod() { },
  // Events via Kernel
  _emit(event, data) { this._kernel.emit(`systemName:${event}`, data); }
};
```

### Event Namespacing
- `kernel:*`, `curation:*`, `character:*`, `promptBuilder:*`, `pipeline:*`, `orchestration:*`, `ui:*`

## Quick Reference

| What | Where |
|------|-------|
| System definitions | `docs/SYSTEM_DEFINITIONS.md` |
| Implementation plan | `docs/ACTION_PLAN_v2.md` |
| All schemas | `schemas/systems.js` |
| Presets | `data/presets/*.json` |

## Extension Metadata

- **Author**: The Liquor Priest
- **Version**: 2.0.0-alpha
- **Platform**: SillyTavern browser extension
- **Language**: JavaScript (ES6+), vanilla (no frameworks)
