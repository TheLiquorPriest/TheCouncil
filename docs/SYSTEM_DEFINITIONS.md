# The Council - System Definitions

**Version:** Draft 1.1
**Status:** Collaborative Definition Phase

This document provides comprehensive, explicit definitions for each system in The Council architecture. The goal is to leave no room for assumptions or misinterpretations.

---

## Architecture Principles

### Separation of Concerns (SoC)
Each system is **self-contained** and responsible for its own:
- State management
- Agent definitions (where applicable)
- Persistence
- Internal modules

### Shared Resources via Kernel
The Council Kernel serves as the **hub** that provides:
- Shared modules (utilities available to all systems)
- Shared UI resources (uniform styles, components)
- Event management (cross-system communication bus)
- Hooks system (lifecycle and integration hooks)
- Global state management

### System Independence
- Systems communicate via **events** and **public APIs only**
- No system directly accesses another system's internal state
- Each system can be tested in isolation

---

## Table of Contents

1. [Curation System](#1-curation-system)
2. [Character System](#2-character-system)
3. [Prompt Builder System](#3-prompt-builder-system)
4. [Response Pipeline Builder System](#4-response-pipeline-builder-system)
5. [Response Orchestration System](#5-response-orchestration-system)
6. [The Council Kernel](#6-the-council-kernel)

---

## 1. Curation System

### Definition

A SillyTavern and Creative Writing specific **knowledge base builder and maintainer** that addresses context window limitations through intelligent data extraction, categorization, and retrieval.

### Core Purpose

Transform raw ST context (chat history, character cards, world info, etc.) into optimized, categorized data stores using agentic CRUD and RAG pipelines. The system uses specialized "Topologist" agents who apply **recursive deliberation** to ensure both storage and retrieval accuracy.

### Key Concepts

#### Data Stores
- **Interpolated Categorized Stores**: Data is not stored as raw text but parsed, categorized, and structured into optimized topological formats
- **Store Types**: Collections (multiple entries with primary keys) and Singles (one object per store)
- **Indexing**: Fields can be indexed for O(1) lookups
- **Validation**: Schema-enforced field types and required fields

#### Agentic CRUD Pipelines
- User-definable pipelines that orchestrate Create, Read, Update, Delete operations
- Each pipeline consists of multiple actions executed by specialized agents
- Agents apply deliberation to ensure data accuracy before committing changes
- Example: A "character extraction" CRUD pipeline might:
  1. Parse chat history for character mentions
  2. Extract traits via analysis agent
  3. Verify extraction via validation agent
  4. Store in characterSheets with schema enforcement

#### Agentic RAG Pipelines
- User-definable retrieval pipelines that go beyond simple keyword search
- Multiple specialized agents collaborate to:
  1. Interpret the retrieval query
  2. Determine optimal stores to search
  3. Execute targeted searches
  4. Verify retrieved data relevance
  5. Synthesize final context package
- **Recursive Deliberation**: Agents can iterate multiple rounds to refine results

#### Curation Team (Fixed Structure)
| Position | Role | Specialization |
|----------|------|----------------|
| **Archivist** | Team Leader | Oversees all curation, final verification |
| Story Topologist | Member | Story structure, plot, narrative flow |
| Character Topologist | Member | Character data, relationships, development |
| Lore Topologist | Member | World-building, rules, history |
| Location Topologist | Member | Places, geography, settings |
| Scene Topologist | Member | Scene details, timeline, events |

#### Topological Formats
Data is stored in formats optimized for:
- Minimal token usage during retrieval
- Maximum information density
- Clear relationships between data points
- Fast lookup and filtering

### What This System Does NOT Do
- Does not execute response generation
- Does not manage editorial agents (those are in Response Pipeline)
- Does not directly interact with ST's chat interface
- Does not build prompts (that's Prompt Builder System)

### Public API (Draft)

```javascript
CurationSystem.init(dependencies)

// Store Management
CurationSystem.getStore(storeId)
CurationSystem.getStoreSchema(storeId)
CurationSystem.getAllStores()
CurationSystem.createStore(schema)
CurationSystem.deleteStore(storeId)

// Data Operations
CurationSystem.create(storeId, entry)
CurationSystem.read(storeId, query)
CurationSystem.update(storeId, entryId, updates)
CurationSystem.delete(storeId, entryId)
CurationSystem.queryByIndex(storeId, field, value)

// Pipeline Execution
CurationSystem.executeCRUD(pipelineId, operation, data)
CurationSystem.executeRAG(pipelineId, query, options)

// Pipeline Management
CurationSystem.registerCRUDPipeline(pipeline)
CurationSystem.registerRAGPipeline(pipeline)
CurationSystem.getCRUDPipeline(pipelineId)
CurationSystem.getRAGPipeline(pipelineId)

// Curation Team
CurationSystem.getCurationAgent(agentId)
CurationSystem.getAgentForPosition(positionId)
CurationSystem.assignAgentToPosition(agentId, positionId)

// Events
CurationSystem.on(event, callback)
CurationSystem.off(event, callback)
```

### Events Emitted
- `store:created`, `store:updated`, `store:deleted`
- `entry:created`, `entry:updated`, `entry:deleted`
- `crud:started`, `crud:completed`, `crud:error`
- `rag:started`, `rag:completed`, `rag:error`
- `deliberation:round`, `deliberation:complete`

---

## 2. Character System

### Definition

A **dynamic agent instantiation and customization system** that creates "avatar agents" representing story characters, using optimized data provided by the Curation System.

### Core Purpose

Transform static character data (from Curation's characterSheets) into live, configurable agents that can participate in pipeline actions, voice dialogue, and maintain character consistency.

### Key Concepts

#### Character Agents
- **Dynamic Instantiation**: Agents are created/updated based on Curation data
- **Avatar Behavior**: Agents embody characters, speaking AS them not ABOUT them
- **Customization Layer**: Users can add agent-level overrides without modifying character data:
  - Voicing guidance (how to speak as this character)
  - Prompt prefix/suffix
  - API configuration overrides
  - Reasoning mode settings

#### Data Flow
```
CURATION SYSTEM                    CHARACTER SYSTEM
═══════════════                    ════════════════
characterSheets store ──(read)───► Character Agent
  • name                             • Pulls all traits
  • personality                      • Generates system prompt
  • appearance                       • Applies user overrides
  • background                       • Configures API settings
  • relationships                    • Ready for pipeline
  • mannerisms
  • catchphrases
  • voicingGuidance
```

#### Character Director
- Static leadership position (always exists)
- Responsibilities:
  - Analyze scene content to identify relevant characters
  - Spawn/activate character agents dynamically
  - Coordinate character voice consistency
  - Manage multi-character interactions

#### Character Types
| Type | Description |
|------|-------------|
| Main Cast | Primary characters, always available |
| Recurring Cast | Regular appearances, spawned as needed |
| Supporting Cast | Occasional appearances |
| Background | Minor/ambient characters |

#### Auto-Generated System Prompts
Character agents receive system prompts built from:
1. Core identity (name, role)
2. Personality traits
3. Background/history
4. Speech patterns, mannerisms, catchphrases
5. User's voicing guidance
6. User's prompt overrides

### What This System Does NOT Do
- Does not store character data (that's Curation)
- Does not execute pipeline phases (that's Orchestration)
- Does not define editorial workflow (that's Response Pipeline)
- Does not manage non-character agents

### Public API (Draft)

```javascript
CharacterSystem.init(dependencies)

// Character Agent Management
CharacterSystem.getCharacterAgent(characterId)
CharacterSystem.getAllCharacterAgents()
CharacterSystem.getCharactersByType(type)
CharacterSystem.createCharacterAgent(characterId)
CharacterSystem.updateCharacterAgent(characterId, overrides)
CharacterSystem.deleteCharacterAgent(characterId)

// System Prompt Generation
CharacterSystem.generateSystemPrompt(characterId)
CharacterSystem.getPromptPreview(characterId)

// Pipeline Integration
CharacterSystem.getParticipants(mode, options)
CharacterSystem.resolveCharacterParticipants(config)
CharacterSystem.spawnForScene(sceneContent)

// Character Director
CharacterSystem.getDirector()
CharacterSystem.configureDirector(config)

// Curation Sync
CharacterSystem.syncFromCuration()
CharacterSystem.syncCharacter(characterId)

// Events
CharacterSystem.on(event, callback)
```

### Events Emitted
- `character:created`, `character:updated`, `character:deleted`
- `character:spawned`, `character:despawned`
- `director:analyzed`, `director:selected`
- `sync:started`, `sync:completed`

---

## 3. Prompt Builder System

### Definition

A **robust prompt construction system** with UI and feature parity (plus enhancements) over the built-in ST prompt builder, designed for superior performance and user experience.

### Core Purpose

Provide a unified interface for building, managing, and resolving prompts across all Council systems. Replace ST's prompt building with a more powerful, flexible, and performant alternative.

### Key Concepts

#### Token Registry
- Centralized registry of all available tokens
- Categories: ST Native, Pipeline, Phase, Action, Team, Store, Agent, Custom
- Token metadata: name, description, category, resolver function
- User can register custom tokens

#### Prompt Stack Builder
Visual and programmatic interface for building prompts from:
- Token insertions
- Static text blocks
- Conditional sections
- Nested templates

#### Template Resolution
- Resolve `{{token}}` placeholders with actual values
- Support for nested tokens: `{{store.{{currentStore}}}}`
- Conditional resolution: `{{#if condition}}...{{/if}}`
- Transform pipelines: `{{token | uppercase | truncate:100}}`

#### Macro System
- Define reusable prompt fragments
- Parameterized macros: `{{macro:greeting name="User"}}`
- Macro inheritance and overrides

#### Preset Prompts
- Save/load prompt configurations
- System prompt presets
- Role prompt presets
- Action instruction presets

#### UI Features (Parity + Enhancements)
| Feature | ST Built-in | Prompt Builder System |
|---------|-------------|----------------------|
| Drag-and-drop reorder | ✓ | ✓ Enhanced |
| Token insertion | ✓ | ✓ + Search + Categories |
| Preview | Limited | Full resolution preview |
| Conditional blocks | ✗ | ✓ |
| Macros | ✗ | ✓ |
| Import/Export | ✗ | ✓ |
| Version history | ✗ | ✓ |
| Token validation | ✗ | ✓ |

### What This System Does NOT Do
- Does not execute LLM calls (that's Orchestration)
- Does not manage agents (that's Pipeline/Character)
- Does not store data (that's Curation)
- Does not define workflow (that's Response Pipeline)

### Public API (Draft)

```javascript
PromptBuilderSystem.init(dependencies)

// Token Registry
PromptBuilderSystem.registerToken(token)
PromptBuilderSystem.getToken(tokenId)
PromptBuilderSystem.getAllTokens(category?)
PromptBuilderSystem.resolveToken(tokenId, context)

// Prompt Building
PromptBuilderSystem.buildPrompt(config, context)
PromptBuilderSystem.buildAgentPrompt(agent, position, actionContext)
PromptBuilderSystem.buildFromStack(stack, context)

// Template Resolution
PromptBuilderSystem.resolveTemplate(template, context)
PromptBuilderSystem.validateTemplate(template)
PromptBuilderSystem.getTemplateTokens(template)

// Macros
PromptBuilderSystem.registerMacro(macro)
PromptBuilderSystem.getMacro(macroId)
PromptBuilderSystem.expandMacro(macroId, params)

// Presets
PromptBuilderSystem.savePreset(preset)
PromptBuilderSystem.loadPreset(presetId)
PromptBuilderSystem.getAllPresets(category?)

// UI Component
PromptBuilderSystem.createBuilder(container, options)
PromptBuilderSystem.createPicker(container, options)

// Events
PromptBuilderSystem.on(event, callback)
```

### Events Emitted
- `token:registered`, `token:resolved`
- `prompt:built`, `prompt:validated`
- `macro:registered`, `macro:expanded`
- `preset:saved`, `preset:loaded`

---

## 4. Response Pipeline Builder System

### Definition

An **elaborate multi-step orchestration workflow builder** that enables users to design highly specific LLM agent tasks. The goal is producing final responses or prompts that achieve quality and accuracy far beyond single-LLM, single-prompt approaches.

### Core Purpose

Define the STRUCTURE of agent workflows—pipelines, phases, actions, teams, threads, and variable I/O—without executing them (execution is Orchestration System's job).

### Agent Ownership

This system **owns and manages its own agents**:
- Editorial agents (writers, architects, reviewers, etc.)
- Team hierarchies and positions
- Agent configurations and assignments

The current `agents-system.js` functionality is **consolidated into this system** because:
1. The hierarchical team structure is specific to pipeline workflows
2. Keeps agent definitions scoped to where they're used
3. Simplifies preset definitions (pipeline presets include their agents)
4. Enforces SoC - other systems manage their own agents (Curation has Topologists, Character has Avatars)

### Key Concepts

#### Pipelines
- Container for an ordered sequence of phases
- Defines the overall workflow structure
- Can be saved, loaded, and shared as presets

#### Phases
- A stage in the pipeline containing one or more actions
- Sequential execution (phases run in order)
- Each phase has:
  - Participating teams
  - Thread configuration
  - Context requirements
  - Output consolidation rules
  - Optional gavel (user intervention) points

#### Actions
- Atomic units of work within a phase
- Action types:
  - **Standard**: Agent executes with prompt and context
  - **CRUD Pipeline**: Triggers Curation CRUD operation
  - **RAG Pipeline**: Triggers Curation RAG retrieval
  - **Deliberative RAG**: RAG with team discussion
  - **Character Workshop**: Character system integration
  - **User Gavel**: Pause for user review/edit
  - **System**: Non-LLM operations

#### Editorial Teams
Organizational structure for pipeline agents:
```
HIERARCHY
├── Executive Positions (above all teams)
│   └── Publisher (final approval)
├── Prose Team
│   ├── Prose Director (leader)
│   └── Writers (members)
├── Plot Team
│   ├── Plot Architect (leader)
│   └── Story Analysts (members)
├── World Team
│   ├── Lore Master (leader)
│   └── World Builders (members)
├── Character Team
│   ├── Character Director (leader)
│   └── Character Avatars (from Character System)
└── ... (user-definable teams)
```

#### Agent Teams and Threads
- **Team Threads**: Persistent conversations within a team
- **Phase Threads**: Cross-team conversations for phase
- **Action Threads**: Temporary threads for action execution
- Threads enable:
  - Multi-round deliberation
  - Consensus building
  - Iterative refinement

#### Directed and Scoped Variable I/O
- **Input Sources**: Previous action, previous phase, global variable, store, custom
- **Output Targets**: Next action, phase output, global variable, store
- **Scope Rules**:
  - Action-scoped: Only within action
  - Phase-scoped: Available to all actions in phase
  - Pipeline-scoped (global): Available throughout run

### What This System Does NOT Do
- Does not execute pipelines (that's Orchestration)
- Does not make LLM API calls (that's Orchestration)
- Does not store persistent data (that's Curation)
- Does not manage character avatars (that's Character System)

### Public API (Draft)

```javascript
ResponsePipelineSystem.init(dependencies)

// Pipeline Management
ResponsePipelineSystem.createPipeline(config)
ResponsePipelineSystem.getPipeline(pipelineId)
ResponsePipelineSystem.getAllPipelines()
ResponsePipelineSystem.updatePipeline(pipelineId, updates)
ResponsePipelineSystem.deletePipeline(pipelineId)
ResponsePipelineSystem.validatePipeline(pipelineId)
ResponsePipelineSystem.clonePipeline(pipelineId)

// Phase Management
ResponsePipelineSystem.createPhase(pipelineId, config)
ResponsePipelineSystem.getPhase(phaseId)
ResponsePipelineSystem.updatePhase(phaseId, updates)
ResponsePipelineSystem.deletePhase(phaseId)
ResponsePipelineSystem.reorderPhases(pipelineId, phaseIds)

// Action Management
ResponsePipelineSystem.createAction(phaseId, config)
ResponsePipelineSystem.getAction(actionId)
ResponsePipelineSystem.updateAction(actionId, updates)
ResponsePipelineSystem.deleteAction(actionId)
ResponsePipelineSystem.reorderActions(phaseId, actionIds)

// Team Management
ResponsePipelineSystem.createTeam(config)
ResponsePipelineSystem.getTeam(teamId)
ResponsePipelineSystem.getAllTeams()
ResponsePipelineSystem.updateTeam(teamId, updates)
ResponsePipelineSystem.deleteTeam(teamId)

// Position Management
ResponsePipelineSystem.createPosition(teamId, config)
ResponsePipelineSystem.getPosition(positionId)
ResponsePipelineSystem.getAllPositions()
ResponsePipelineSystem.assignAgentToPosition(agentId, positionId)

// Agent Management (Editorial Agents)
ResponsePipelineSystem.createAgent(config)
ResponsePipelineSystem.getAgent(agentId)
ResponsePipelineSystem.getAllAgents()
ResponsePipelineSystem.updateAgent(agentId, updates)
ResponsePipelineSystem.deleteAgent(agentId)

// Thread Configuration
ResponsePipelineSystem.getThreadConfig(phaseId | actionId)
ResponsePipelineSystem.updateThreadConfig(id, config)

// Variable Schema
ResponsePipelineSystem.getGlobalVariables()
ResponsePipelineSystem.setGlobalVariable(name, value)

// Events
ResponsePipelineSystem.on(event, callback)
```

### Events Emitted
- `pipeline:created`, `pipeline:updated`, `pipeline:deleted`
- `phase:created`, `phase:updated`, `phase:deleted`
- `action:created`, `action:updated`, `action:deleted`
- `team:created`, `team:updated`, `team:deleted`
- `agent:assigned`, `agent:unassigned`

---

## 5. Response Orchestration System

### Definition

The **execution engine** that determines how Response Pipeline definitions are orchestrated. Provides three distinct operating modes to support different use cases.

### Core Purpose

Execute pipelines, coordinate API calls, manage run state, and deliver final output to SillyTavern. This is the "runtime" that brings pipeline definitions to life.

### Operating Modes

#### Mode 1: Multi-LLM Response Synthesis
**Purpose:** Execute a many-step agent workflow that synthesizes a final chat response.

**How it works:**
1. User triggers pipeline with input
2. Orchestration executes phases in sequence
3. Multiple agents contribute, deliberate, refine
4. Final response is synthesized from all contributions
5. Response is delivered to ST chat

**Use Case:** High-quality creative writing where multiple perspectives improve the output.

#### Mode 2: Multi-LLM Single Prompt Compilation
**Purpose:** Execute a workflow that builds a final prompt to be sent to ST's configured LLM.

**How it works:**
1. User triggers pipeline with input
2. Orchestration executes phases that analyze, plan, structure
3. Agents determine optimal context, instructions, examples
4. Final phase compiles everything into one optimized prompt
5. **Replaces ST's prompt** with the compiled result
6. ST's LLM generates with the optimized prompt

**Use Case:** Replace bloated CoT presets with intelligently assembled prompts that include exactly what's needed.

**Key Benefit:** The ST LLM only ever uses exactly what is needed, as determined by the pipeline's deliberation.

#### Mode 3: Context Replacer/Injector (Streamlined)
**Purpose:** Replace ST's token injections with Curation System outputs without requiring a full pipeline.

**How it works:**
1. No pipeline definition required
2. User maps ST tokens to Curation RAG outputs:
   - `{{chat}}` → RAG pipeline "relevant_history"
   - `{{persona}}` → RAG pipeline "character_context"
   - `{{scenario}}` → RAG pipeline "current_situation"
3. When ST builds its prompt, mapped tokens are replaced with RAG results
4. RAG results benefit from:
   - Highly efficient structured data stores
   - Multi-agent retrieval with deliberation
   - Recursive verification of relevance

**Use Case:** Intelligent context injection without designing complex pipelines. Get Curation benefits immediately.

**Key Benefit:** Multiple rounds of deliberation among specialized Curation agents ensure retrieved data accuracy.

### Key Concepts

#### Run State
```javascript
RunState {
  id: string
  pipelineId: string
  mode: "synthesis" | "compilation" | "injection"
  status: "idle" | "running" | "paused" | "completed" | "error" | "aborted"
  currentPhaseId: string | null
  currentActionId: string | null
  progress: { phase: number, action: number, total: number }
  startTime: number
  endTime: number | null
  input: any
  output: any
  errors: Error[]
  history: RunEvent[]
}
```

#### API Call Coordination
- Queue management for parallel/sequential calls
- Rate limiting and throttling
- Retry logic with exponential backoff
- Timeout handling
- Per-agent API configuration

#### Progress Tracking
- Real-time progress updates
- Phase/action completion tracking
- Estimated time remaining
- Live output streaming

#### Error Recovery
- Graceful error handling
- Retry failed actions
- Rollback capability
- User notification

#### Gavel Points (User Intervention)
- Pause execution at defined points
- Present current output for review
- Allow user edits
- Resume with modifications

### What This System Does NOT Do
- Does not define pipelines (that's Response Pipeline System)
- Does not store data (that's Curation)
- Does not manage agents (that's Pipeline/Character)
- Does not build prompts (that's Prompt Builder)

### Public API (Draft)

```javascript
OrchestrationSystem.init(dependencies)

// Run Management
OrchestrationSystem.startRun(pipelineId, options)
OrchestrationSystem.pauseRun()
OrchestrationSystem.resumeRun()
OrchestrationSystem.abortRun()
OrchestrationSystem.retryAction(actionId)

// State
OrchestrationSystem.getRunState()
OrchestrationSystem.getProgress()
OrchestrationSystem.getOutput()
OrchestrationSystem.getHistory()
OrchestrationSystem.isRunning()

// Mode Configuration
OrchestrationSystem.setMode(mode)
OrchestrationSystem.getMode()
OrchestrationSystem.configureInjectionMappings(mappings)

// Gavel
OrchestrationSystem.approveGavel(gavelId, modifications?)
OrchestrationSystem.rejectGavel(gavelId)
OrchestrationSystem.getActiveGavel()

// ST Integration
OrchestrationSystem.deliverToST(output, options)
OrchestrationSystem.replaceSTPrompt(prompt)
OrchestrationSystem.injectSTContext(mappings)

// Events
OrchestrationSystem.on(event, callback)
```

### Events Emitted
- `run:started`, `run:paused`, `run:resumed`, `run:completed`, `run:error`, `run:aborted`
- `phase:started`, `phase:completed`
- `action:started`, `action:completed`, `action:error`, `action:retry`
- `gavel:requested`, `gavel:approved`, `gavel:rejected`
- `output:partial`, `output:final`
- `progress:updated`

---

## 6. The Council Kernel

### Definition

The **central hub** for all Council systems. Provides shared infrastructure, coordinates system lifecycle, and exposes the unified public API.

### Core Purpose

Serve as the foundation that all systems build upon:
- Provide shared modules and utilities
- Manage cross-system event bus
- Handle global state and settings
- Coordinate system bootstrap and lifecycle
- Manage presets
- Provide unified UI infrastructure
- Expose public API (`window.TheCouncil`)

**Note:** `index.js` remains a thin entry point whose sole concern is invoking the Kernel. The Kernel itself lives in `core/kernel.js`.

### Key Concepts

#### Shared Modules (Provided by Kernel)

The Kernel provides utility modules that any system can use:

| Module | Purpose | Used By |
|--------|---------|---------|
| **Logger** | Centralized logging with levels, history | All systems |
| **EventBus** | Cross-system event pub/sub | All systems |
| **StateManager** | Global state with persistence | All systems |
| **ApiClient** | LLM API wrapper with queue/retry | Orchestration, Curation, Character |
| **SchemaValidator** | JSON schema validation | All systems |

```javascript
// Systems access shared modules via Kernel
const logger = Kernel.getModule('logger');
const eventBus = Kernel.getModule('eventBus');
```

#### Shared UI Resources (Provided by Kernel)

| Resource | Purpose |
|----------|---------|
| **Styles** | Uniform CSS variables, component styles |
| **Modal Base** | Base modal class with common behavior |
| **Form Components** | Inputs, selects, buttons with consistent styling |
| **Toast/Notification** | User feedback system |
| **Confirmation Dialogs** | Standardized confirm/cancel patterns |

#### Event Bus (Cross-System Communication)

Systems communicate via the Kernel's event bus:

```javascript
// System A emits
Kernel.emit('curation:rag:completed', { pipelineId, results });

// System B listens
Kernel.on('curation:rag:completed', (data) => {
  // React to event
});
```

**Event Namespacing Convention:**
- `kernel:*` - Kernel lifecycle events
- `curation:*` - Curation System events
- `character:*` - Character System events
- `promptBuilder:*` - Prompt Builder events
- `pipeline:*` - Pipeline Builder events
- `orchestration:*` - Orchestration events
- `ui:*` - UI events

#### Hooks System

Lifecycle hooks that systems or external code can tap into:

```javascript
// Register a hook
Kernel.registerHook('beforePipelineRun', async (context) => {
  // Modify context, perform setup, etc.
  return context; // Return modified context
});

// Hook points
- beforeSystemInit / afterSystemInit
- beforePipelineRun / afterPipelineRun
- beforeActionExecute / afterActionExecute
- beforeSTIntegration / afterSTIntegration
- beforePresetApply / afterPresetApply
```

#### Global State Management

Kernel manages state that spans systems:

```javascript
GlobalState {
  // Active session
  session: {
    activePresetId: string | null
    activePipelineId: string | null
    orchestrationMode: 'synthesis' | 'compilation' | 'injection'
  }

  // ST integration state
  stContext: {
    characterId: string | null
    chatId: string | null
    isConnected: boolean
  }

  // UI state
  ui: {
    activeModal: string | null
    navPosition: { x, y }
    theme: string
  }

  // User preferences (persisted)
  preferences: {
    debug: boolean
    autoShowNav: boolean
    // ...
  }
}
```

#### Bootstrap Sequence
```
1. Load configuration
2. Initialize shared utilities (Logger)
3. Initialize independent systems:
   - Curation System
   - Character System
   - Prompt Builder System
4. Initialize dependent systems:
   - Response Pipeline System (depends on PromptBuilder)
   - Response Orchestration System (depends on all above)
5. Initialize UI
6. Register ST integration
7. Load user preferences
8. Apply active preset (if any)
9. Ready
```

#### Global Settings
```javascript
Settings {
  version: string
  debug: boolean

  // Default configurations
  defaults: {
    apiConfig: ApiConfig
    timeout: number
    retryCount: number
  }

  // UI preferences
  ui: {
    navPosition: { x, y }
    theme: string
    autoShowNav: boolean
  }

  // Per-system settings
  curation: CurationSettings
  character: CharacterSettings
  promptBuilder: PromptBuilderSettings
  pipeline: PipelineSettings
  orchestration: OrchestrationSettings
}
```

#### Preset Management
- Discover presets from `data/presets/`
- Load preset files (JSON format)
- Validate preset structure
- Apply preset to all relevant systems
- Save current configuration as preset
- Import/export presets

#### UI Container Management
- NavModal: Main navigation hub
- Modal coordination (only one major modal at a time)
- Keyboard shortcuts
- ST UI integration (buttons, triggers)

#### System Registry
- Register systems during bootstrap
- Provide system lookup by name
- Coordinate cross-system communication
- Handle system lifecycle events

### What This System Does NOT Do
- Does not execute pipelines (that's Orchestration)
- Does not store story data (that's Curation)
- Does not build prompts (that's Prompt Builder)
- Does not define workflows (that's Response Pipeline)

### Public API (Draft)

```javascript
// This becomes window.TheCouncil
TheCouncilKernel.init()

// System Access
TheCouncilKernel.getSystem(systemName)
TheCouncilKernel.getAllSystems()
TheCouncilKernel.isSystemReady(systemName)

// Settings
TheCouncilKernel.getSettings()
TheCouncilKernel.getSetting(path)
TheCouncilKernel.updateSettings(updates)
TheCouncilKernel.resetSettings()

// Presets
TheCouncilKernel.discoverPresets()
TheCouncilKernel.loadPreset(presetId)
TheCouncilKernel.applyPreset(preset)
TheCouncilKernel.saveAsPreset(name, options)
TheCouncilKernel.exportPreset(presetId)
TheCouncilKernel.importPreset(data)
TheCouncilKernel.getCurrentPreset()

// UI
TheCouncilKernel.showUI(modalName)
TheCouncilKernel.hideUI(modalName)
TheCouncilKernel.toggleUI(modalName)
TheCouncilKernel.getActiveModal()

// Convenience methods (delegate to systems)
TheCouncilKernel.runPipeline(pipelineId, options)
TheCouncilKernel.abortRun()
TheCouncilKernel.getRunState()
TheCouncilKernel.getSummary()

// ST Integration
TheCouncilKernel.getSTContext()
TheCouncilKernel.registerSTHandlers()

// Events
TheCouncilKernel.on(event, callback)
```

### Events Emitted
- `kernel:initializing`, `kernel:ready`, `kernel:error`
- `system:registered`, `system:ready`, `system:error`
- `preset:loading`, `preset:applied`, `preset:error`
- `settings:changed`
- `ui:modal:opened`, `ui:modal:closed`

---

## System Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE COUNCIL KERNEL                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SHARED RESOURCES                                                     │    │
│  │ • Logger, EventBus, StateManager, ApiClient, SchemaValidator        │    │
│  │ • Styles, Modal Base, Form Components, Toast/Notifications          │    │
│  │ • Hooks System, Global State, Preset Management                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Bootstrap → Coordinate → Expose API (window.TheCouncil)                    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│ CURATION SYSTEM │      │ PROMPT BUILDER SYS  │      │ CHARACTER SYSTEM│
│                 │      │                     │      │                 │
│ • Data stores   │      │ • Token registry    │      │ • Avatar agents │
│ • CRUD/RAG      │      │ • Prompt building   │      │ • Voice/traits  │
│ • Topologist    │      │ • Template resolve  │      │ • Scene spawn   │
│   agents        │      │ • Macros/Presets    │      │ • Director      │
└────────┬────────┘      └──────────┬──────────┘      └────────┬────────┘
         │                          │                          │
         │   ┌──────────────────────┴──────────────────────┐   │
         │   │                                             │   │
         ▼   ▼                                             ▼   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RESPONSE PIPELINE BUILDER SYSTEM                          │
│  • Pipeline/Phase/Action definitions                                        │
│  • Editorial agents, teams, positions (owns agent hierarchy)                │
│  • Thread configurations                                                    │
│  • Variable I/O schemas                                                     │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RESPONSE ORCHESTRATION SYSTEM                           │
│  • Execute pipeline runs                                                    │
│  • Coordinate API calls (via Kernel's ApiClient)                            │
│  • Manage run state                                                         │
│  • Three operating modes (Synthesis, Compilation, Injection)                │
│  • Deliver output to ST                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                           ┌─────────────────┐
                           │   SILLYTAVERN   │
                           └─────────────────┘
```

---

## Data Flow Examples

### Example 1: Multi-LLM Response Synthesis

```
User Input: "The hero enters the dark cave"
     │
     ▼
[ORCHESTRATION] Mode: Synthesis, Start Run
     │
     ▼
[PIPELINE] Phase 1: Analysis
     │
     ├─► [CURATION] RAG: Get relevant cave lore
     ├─► [CURATION] RAG: Get hero's current state
     └─► [CHARACTER] Spawn hero agent
     │
     ▼
[PIPELINE] Phase 2: Planning
     │
     ├─► Plot Team deliberates on story direction
     └─► World Team verifies cave details
     │
     ▼
[PIPELINE] Phase 3: Drafting
     │
     ├─► [PROMPT BUILDER] Build prose writer prompt
     └─► Prose Team writes initial draft
     │
     ▼
[PIPELINE] Phase 4: Character Voice
     │
     └─► [CHARACTER] Hero agent reviews/adjusts
     │
     ▼
[PIPELINE] Phase 5: Final Review
     │
     ├─► Gavel: User reviews
     └─► Publisher approves
     │
     ▼
[ORCHESTRATION] Deliver to ST Chat
```

### Example 2: Context Injection Mode

```
ST Prompt Building (intercepted)
     │
     ├─ {{chat}} token
     │       │
     │       ▼
     │  [ORCHESTRATION] Injection mapping active
     │       │
     │       ▼
     │  [CURATION] Execute RAG: "relevant_chat_history"
     │       │
     │       ├─► Curation agents analyze current context
     │       ├─► Select relevant past exchanges
     │       ├─► Verify relevance (deliberation)
     │       └─► Return optimized chat excerpt
     │       │
     │       ▼
     │  Inject result in place of {{chat}}
     │
     ├─ {{persona}} token → [CURATION] RAG → Inject
     │
     └─ Final prompt with optimized context → ST LLM
```

---

## Resolved Decisions

1. ✅ **Kernel as Hub**: The Kernel serves as the central hub providing shared modules, event bus, hooks, state management, and UI resources.

2. ✅ **index.js Role**: `index.js` is a thin entry point whose sole concern is invoking the Kernel. Kernel logic lives in `core/kernel.js`.

3. ✅ **System Naming**: "Response Pipeline Builder System" (emphasizes building/defining, not executing).

4. ✅ **Agent Ownership**: Each system owns its own agents:
   - Curation System → Topologist agents
   - Character System → Avatar agents
   - Response Pipeline Builder → Editorial agents (current agents-system.js consolidated here)

5. ✅ **Cross-System Communication**: Via Kernel's event bus and public APIs only. No direct internal state access.

6. ✅ **Mode 3 Implementation**: Use ST's `generate_interceptor` API (official prompt interception mechanism). ST supports Prompt Interceptors via manifest.json that run sequentially before API calls, can modify chat data, add injections, or abort generation. See [ST Extension Docs](https://docs.sillytavern.app/for-contributors/writing-extensions/).

7. ✅ **Mode Switching**: Allowed between runs, but locked during execution. Kernel tracks `orchestrationMode` in global state; Orchestration validates mode is not changed mid-run.

8. ✅ **Hybrid Modes**: One mode at a time. Mode 3 mappings could optionally feed INTO Mode 1/2 pipelines as a pre-processing step, but not run simultaneously.

9. ✅ **Preset Scope**: Presets include schemas/structure and agent configurations, but NOT Curation store data. Curation System has its own import/export for data.

10. ✅ **Error Boundaries**: High isolation with high visibility. Systems should fail gracefully without crashing others. Comprehensive error state tracking for development sanity.

11. ✅ **Persistence Strategy**: Unified storage via Kernel using ST extension data, scoped per chat. Foundation laid to expand storage targets and scopes in future.

12. ✅ **Hot Reload**: Nice to have but not essential for alpha.

---

## Technology Decision

✅ **DECIDED: Path A - Vanilla JS for Alpha**

### Rationale
- Focus on proving the architecture works
- Reuse existing code where possible
- No new tooling complexity during alpha
- Faster path to working alpha (2-3 weeks vs 4-6)

### Migration Path
1. **Alpha**: Vanilla JS with JSDoc type annotations for documentation
2. **Beta**: Introduce TypeScript gradually (strict mode, type definitions)
3. **Production**: Consider Preact + TypeScript for UI components

---

*Document Status: Draft - Awaiting collaborative refinement*
*Last Updated: Initial creation*
