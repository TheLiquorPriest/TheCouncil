# The Council - Architecture Action Plan v2

## Executive Summary

This document outlines the architectural vision for The Council and maps a detailed action plan to achieve a working alpha. The architecture consists of **six self-contained systems** that integrate via well-defined APIs.

---

## Target Architecture: Six Systems

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE COUNCIL KERNEL                                  │
│         (Preset System, Global Settings, UI Container, Bootstrap)           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   CURATION      │  │   CHARACTER     │  │     PROMPT BUILDER          │  │
│  │   SYSTEM        │  │   SYSTEM        │  │     SYSTEM                  │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────────────────┤  │
│  │ • Store Schemas │  │ • Avatar Agents │  │ • Token Management          │  │
│  │ • CRUD Pipelines│  │ • Character Dir │  │ • Prompt Stack Builder      │  │
│  │ • RAG Pipelines │  │ • Voice/Traits  │  │ • Template Resolution       │  │
│  │ • Data Viewer   │  │ • Scene Spawning│  │ • Macro System              │  │
│  │ • Curation Team │  │ • Curation Link │  │ • Preset Prompts            │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                  │
│           └────────────────────┼─────────────────────────┘                  │
│                                │                                            │
│  ┌─────────────────────────────┴─────────────────────────────────────────┐  │
│  │                    RESPONSE PIPELINE SYSTEM                            │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ • Pipeline Definitions   • Phase Management    • Action Execution     │  │
│  │ • Editorial Teams        • Thread Management   • Context Routing      │  │
│  │ • Agent Assignments      • Output Management   • Gavel Points         │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                          │
│  ┌───────────────────────────────┴───────────────────────────────────────┐  │
│  │                  RESPONSE ORCHESTRATION SYSTEM                         │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ • Run Coordination       • Progress Tracking   • Final Output         │  │
│  │ • API Call Management    • Error Recovery      • ST Integration       │  │
│  │ • Multi-Pipeline         • Event Broadcasting  • User Feedback        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## System Definitions

### 1. Curation System
**Purpose:** Manage persistent story data through structured schemas and intelligent retrieval.

**Responsibilities:**
- Define and manage store schemas (field types, validation, indexing)
- Execute CRUD operations via specialized curation agents
- Execute RAG pipelines for context retrieval
- Maintain the fixed Curation Team (Archivist + Topologists)
- Provide data to other systems via read-only APIs

**Current Status:** ~95% complete
- ✅ Store schema management
- ✅ CRUD pipeline execution
- ✅ RAG pipeline execution
- ✅ Curation agent isolation (own registry)
- ✅ Default stores defined
- ⚠️ UI needs polish
- ⚠️ Validation system needs testing

**Public API:**
```javascript
CurationSystem.getStore(storeId)
CurationSystem.queryStore(storeId, query)
CurationSystem.executeRAG(pipelineId, input)
CurationSystem.executeCRUD(pipelineId, operation, data)
CurationSystem.getStoreSchema(storeId)
CurationSystem.on(event, callback)
```

---

### 2. Character System
**Purpose:** Manage character avatar agents that embody and voice story characters.

**Responsibilities:**
- Maintain character agent registry (separate from pipeline agents)
- Auto-generate system prompts from curation character data
- Manage Character Director for scene-based spawning
- Provide character participation to pipeline actions
- Handle voicing guidance and character consistency

**Current Status:** ~98% complete
- ✅ Character agent registry
- ✅ Curation integration (read-only)
- ✅ System prompt generation
- ✅ Character Director
- ✅ Pipeline participation modes (dynamic, explicit, spawned)
- ✅ Character Workshop action type
- ✅ UI modal

**Public API:**
```javascript
CharacterSystem.getCharacterAgent(characterId)
CharacterSystem.getAllCharacterAgents()
CharacterSystem.getParticipants(mode, options)
CharacterSystem.spawnForScene(sceneContent)
CharacterSystem.generateSystemPrompt(characterId)
CharacterSystem.syncFromCuration()
CharacterSystem.on(event, callback)
```

---

### 3. Prompt Builder System (NEW - Needs Elevation)
**Purpose:** Unified prompt construction, token management, and template resolution.

**Responsibilities:**
- Define and manage token registry (ST natives + custom pipeline tokens)
- Build prompt stacks from token configurations
- Resolve templates with macro substitution
- Manage preset prompts (system prompts, role prompts)
- Provide prompt building UI component

**Current Status:** ~40% complete (exists as component, needs elevation to system)
- ✅ Basic prompt builder component
- ✅ Token picker component
- ✅ Token resolver utility
- ⚠️ Drag-and-drop broken
- ❌ Not a standalone system
- ❌ No unified prompt stack management
- ❌ No preset prompt library

**Target Public API:**
```javascript
PromptBuilderSystem.buildPrompt(config)
PromptBuilderSystem.resolveTemplate(template, context)
PromptBuilderSystem.getToken(tokenId)
PromptBuilderSystem.getAllTokens(category?)
PromptBuilderSystem.registerToken(token)
PromptBuilderSystem.getPresetPrompt(presetId)
PromptBuilderSystem.buildAgentPrompt(agent, position, context)
PromptBuilderSystem.on(event, callback)
```

---

### 4. Response Pipeline System
**Purpose:** Define and manage editorial workflows (pipelines, phases, actions, teams).

**Responsibilities:**
- Define pipeline structures (phases, actions, flow)
- Manage editorial teams and positions
- Assign agents to positions
- Configure action execution parameters
- Manage thread configurations
- Handle context and output routing definitions

**Current Status:** ~90% complete (but mixed with orchestration concerns)
- ✅ Pipeline/Phase/Action definitions
- ✅ Team/Position/Agent management
- ✅ Thread configuration
- ✅ Context routing definitions
- ✅ Output consolidation definitions
- ⚠️ Currently includes execution logic (should be in Orchestration)
- ⚠️ Agent management should potentially be separate

**Public API:**
```javascript
PipelineSystem.getPipeline(pipelineId)
PipelineSystem.getAllPipelines()
PipelineSystem.getPhase(phaseId)
PipelineSystem.getAction(actionId)
PipelineSystem.getTeam(teamId)
PipelineSystem.getPosition(positionId)
PipelineSystem.getAgent(agentId)
PipelineSystem.assignAgentToPosition(agentId, positionId)
PipelineSystem.validatePipeline(pipelineId)
PipelineSystem.on(event, callback)
```

---

### 5. Response Orchestration System (NEW - Needs Creation)
**Purpose:** Execute pipelines and coordinate all systems during a run.

**Responsibilities:**
- Start/stop/pause pipeline runs
- Coordinate API calls across systems
- Track run progress and state
- Handle error recovery and retries
- Broadcast events to UI and other systems
- Manage final output delivery to SillyTavern
- Handle gavel (user intervention) points

**Current Status:** ~60% complete (logic exists in PipelineSystem, needs extraction)
- ✅ Basic execution logic (in PipelineSystem)
- ✅ API client wrapper
- ✅ Progress tracking
- ✅ Gavel modal
- ❌ Not a standalone system
- ❌ No pause/resume capability
- ❌ No multi-pipeline coordination

**Target Public API:**
```javascript
OrchestrationSystem.startRun(pipelineId, options)
OrchestrationSystem.pauseRun()
OrchestrationSystem.resumeRun()
OrchestrationSystem.abortRun()
OrchestrationSystem.getRunState()
OrchestrationSystem.getProgress()
OrchestrationSystem.getOutput()
OrchestrationSystem.on(event, callback)
```

---

### 6. The Council Kernel
**Purpose:** Bootstrap, global settings, preset management, and UI container.

**Responsibilities:**
- Bootstrap all systems in correct order
- Manage global extension settings
- Manage preset discovery, loading, and application
- Provide UI container (NavModal) and modal management
- Handle SillyTavern integration
- Expose public API (`window.TheCouncil`)

**Current Status:** ~70% complete (scattered across index.js and preset-manager)
- ✅ Bootstrap sequence (in index.js)
- ✅ Preset Manager (as separate module)
- ✅ NavModal UI container
- ✅ ST integration hooks
- ⚠️ Settings management basic
- ⚠️ Preset system needs enhancement
- ❌ Not consolidated into coherent "Kernel" concept

**Target Public API:**
```javascript
TheCouncilKernel.init()
TheCouncilKernel.getSystem(systemName)
TheCouncilKernel.getSettings()
TheCouncilKernel.updateSettings(updates)
TheCouncilKernel.loadPreset(presetId)
TheCouncilKernel.getCurrentPreset()
TheCouncilKernel.showUI(modalName)
TheCouncilKernel.hideUI(modalName)
TheCouncilKernel.on(event, callback)
```

---

## Current File → System Mapping

| Current File | Target System | Action |
|--------------|---------------|--------|
| `core/curation-system.js` | Curation System | Keep, polish |
| `core/character-system.js` | Character System | Keep, polish |
| `core/agents-system.js` | Response Pipeline System | Rename/refactor |
| `core/pipeline-system.js` | Response Pipeline + Orchestration | **Split** |
| `core/context-manager.js` | Response Pipeline System | Merge into Pipeline |
| `core/output-manager.js` | Response Orchestration System | Move to Orchestration |
| `core/thread-manager.js` | Response Pipeline System | Merge into Pipeline |
| `core/preset-manager.js` | The Council Kernel | Merge into Kernel |
| `utils/token-resolver.js` | Prompt Builder System | Move to PromptBuilder |
| `utils/api-client.js` | Response Orchestration System | Move to Orchestration |
| `utils/logger.js` | The Council Kernel | Keep as shared utility |
| `ui/components/prompt-builder.js` | Prompt Builder System | Elevate to system |
| `ui/components/token-picker.js` | Prompt Builder System | Move to PromptBuilder |
| `index.js` | The Council Kernel | Refactor into Kernel |

---

## Action Plan Phases

### Phase 1: Stabilize Current Systems (P0)
**Goal:** Fix critical issues in existing code before restructuring.

**Tasks:**
1. [ ] Fix Prompt Builder drag-and-drop
2. [ ] Complete threads subsystem implementation
3. [ ] Complete outputs/variables subsystem
4. [ ] Add pipeline validation
5. [ ] Test curation CRUD/RAG end-to-end
6. [ ] Test character system end-to-end

**Deliverables:**
- All existing features working
- No critical bugs

---

### Phase 2: Create Prompt Builder System (P1)
**Goal:** Elevate prompt building from component to full system.

**Tasks:**
1. [ ] Create `core/prompt-builder-system.js`
   - Move token registry from token-resolver
   - Add prompt stack building logic
   - Add preset prompt management
   - Add template resolution with full context
2. [ ] Move `ui/components/token-picker.js` into system
3. [ ] Refactor `ui/components/prompt-builder.js` as system UI
4. [ ] Define public API
5. [ ] Update all consumers to use new system

**New Files:**
- `core/prompt-builder-system.js`
- `ui/prompt-builder-modal.js` (optional, or keep as component)

---

### Phase 3: Create Response Orchestration System (P1)
**Goal:** Extract execution logic into dedicated orchestration system.

**Tasks:**
1. [ ] Create `core/orchestration-system.js`
   - Extract run execution from pipeline-system
   - Extract API call coordination
   - Add run state management
   - Add pause/resume capability
   - Add progress broadcasting
2. [ ] Move `utils/api-client.js` into system (or keep as dependency)
3. [ ] Move output delivery logic from output-manager
4. [ ] Update PipelineSystem to be definition-only
5. [ ] Update GavelModal to integrate with Orchestration
6. [ ] Define public API

**New Files:**
- `core/orchestration-system.js`

---

### Phase 4: Create The Council Kernel (P1)
**Goal:** Consolidate bootstrap, settings, presets, and UI management.

**Tasks:**
1. [ ] Create `core/kernel.js`
   - Move bootstrap logic from index.js
   - Integrate preset-manager functionality
   - Add global settings management
   - Add UI container management
   - Define system registration pattern
2. [ ] Refactor `index.js` to be thin bootstrap that calls Kernel
3. [ ] Update NavModal to be managed by Kernel
4. [ ] Define public API (`window.TheCouncil` becomes Kernel)

**New Files:**
- `core/kernel.js`

---

### Phase 5: Refactor Response Pipeline System (P2)
**Goal:** Clean separation of pipeline definitions from execution.

**Tasks:**
1. [ ] Rename `core/agents-system.js` or merge into pipeline-system
2. [ ] Merge `core/context-manager.js` into pipeline-system
3. [ ] Merge `core/thread-manager.js` into pipeline-system
4. [ ] Remove execution logic (now in Orchestration)
5. [ ] Clean up API to be definition-focused
6. [ ] Update UI modal

**Result:**
- `core/pipeline-system.js` - Pure definitions
- `core/orchestration-system.js` - Pure execution

---

### Phase 6: System Integration & Testing (P2)
**Goal:** Ensure all systems integrate correctly via APIs.

**Tasks:**
1. [ ] Define formal system interfaces
2. [ ] Add integration tests
3. [ ] Test full pipeline run through all systems
4. [ ] Test preset loading and application
5. [ ] Test ST integration
6. [ ] Performance testing

---

### Phase 7: Documentation & Polish (P3)
**Goal:** Complete documentation and UI polish.

**Tasks:**
1. [ ] Update ARCHITECTURE.md for 6-system design
2. [ ] Update ACTION_PLAN.md (this file)
3. [ ] Create API documentation for each system
4. [ ] UI polish across all modals
5. [ ] User guide / onboarding

---

## Target File Structure

```
TheCouncil/
├── index.js                       # Thin bootstrap → calls Kernel
├── manifest.json
│
├── core/
│   ├── kernel.js                  # The Council Kernel (NEW)
│   ├── curation-system.js         # Curation System
│   ├── character-system.js        # Character System
│   ├── prompt-builder-system.js   # Prompt Builder System (NEW)
│   ├── pipeline-system.js         # Response Pipeline System (refactored)
│   └── orchestration-system.js    # Response Orchestration System (NEW)
│
├── ui/
│   ├── nav-modal.js               # Kernel UI container
│   ├── curation-modal.js          # Curation System UI
│   ├── character-modal.js         # Character System UI
│   ├── prompt-builder-modal.js    # Prompt Builder System UI (optional)
│   ├── pipeline-modal.js          # Pipeline System UI
│   ├── gavel-modal.js             # Orchestration gavel UI
│   └── components/                # Shared UI components
│       ├── participant-selector.js
│       ├── context-config.js
│       ├── curation-pipeline-builder.js
│       └── execution-monitor.js
│
├── utils/
│   └── logger.js                  # Shared logging utility
│
├── schemas/
│   └── systems.js                 # All schema definitions
│
├── styles/
│   └── main.css
│
├── data/
│   └── presets/
│       ├── default-pipeline.json
│       ├── standard-pipeline.json
│       ├── quick-pipeline.json
│       └── README.md
│
└── docs/
    ├── ARCHITECTURE.md
    ├── ACTION_PLAN_v2.md          # This file
    ├── DEFAULT_PIPELINE.md
    └── ISSUES.md
```

---

## Priority Summary

| Priority | Phase | Description | Effort |
|----------|-------|-------------|--------|
| P0 | 1 | Stabilize current systems | 1-2 sessions |
| P1 | 2 | Create Prompt Builder System | 2-3 sessions |
| P1 | 3 | Create Orchestration System | 2-3 sessions |
| P1 | 4 | Create Kernel | 1-2 sessions |
| P2 | 5 | Refactor Pipeline System | 2-3 sessions |
| P2 | 6 | Integration & Testing | 2-3 sessions |
| P3 | 7 | Documentation & Polish | 1-2 sessions |

**Total estimated effort:** 11-18 sessions

---

## Success Criteria for Alpha

1. All six systems exist as self-contained modules
2. Systems communicate only via defined public APIs
3. A preset can be loaded and fully configures all systems
4. A pipeline can be executed end-to-end
5. Character system participates in pipeline actions
6. Curation system provides RAG context to pipeline
7. User can intervene at gavel points
8. Final output is delivered to SillyTavern
9. No critical bugs in core functionality

---

## Notes

### Shared Modules
Some utilities remain shared across systems:
- `utils/logger.js` - All systems use centralized logging
- `schemas/systems.js` - Schema definitions used by multiple systems

### System Independence
Each system should:
- Have its own state management
- Expose a clean public API
- Handle its own persistence
- Emit events for cross-system communication
- Be testable in isolation

### Backward Compatibility
During refactoring:
- Maintain existing API signatures where possible
- Deprecate old methods before removing
- Update presets if schema changes

---

*Created: 2024*
*Last Updated: Initial creation*
*Version: 2.0.0-alpha*
