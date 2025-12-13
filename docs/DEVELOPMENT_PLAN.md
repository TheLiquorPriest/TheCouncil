# The Council - Alpha Development Plan

**Version:** 1.0
**Target:** Working Alpha
**Approach:** Sonnet agents write code in focused sessions; user reviews and approves

---

## How This Plan Works

### Session Structure
Each task is designed to fit within a single Sonnet context window (~80-100k usable tokens). Tasks include:
- **Context docs to load** - What the agent needs to read first
- **Deliverables** - Specific files/changes expected
- **Handoff checkpoint** - What to summarize before ending session
- **Success criteria** - How to verify the task is complete

### Workflow
1. User starts a new session with a Sonnet agent
2. User provides the task ID and brief from this plan
3. Agent reads required context docs
4. Agent implements the deliverables
5. Agent summarizes work at ~70% context usage
6. User reviews, requests changes or approves
7. User commits approved work
8. Next session starts fresh with next task

### Context Budget Guidelines
- **0-30%**: Read context docs, understand scope
- **30-70%**: Implementation work
- **70-80%**: Testing, refinement
- **80%+**: Summarize and prepare handoff - DO NOT continue coding

---

## Phase 0: Foundation (Kernel)

The Kernel must exist first as all systems depend on it.

### Task 0.1: Create Kernel Core
**Estimated context:** 60-70%
**Priority:** P0 - Blocker

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md` (Section 6: The Council Kernel)
- `index.js` (current implementation for reference)
- `utils/logger.js` (existing, will be adapted)

**Deliverables:**
1. Create `core/kernel.js` with:
   - Module registry (`_modules` Map)
   - `registerModule(name, module)` / `getModule(name)`
   - EventBus implementation (`on`, `off`, `emit`, `once`)
   - Hooks system (`registerHook`, `runHooks`)
   - Global state manager (`getState`, `setState`, `subscribe`)
   - Bootstrap sequence skeleton
   - `window.TheCouncil` API exposure

2. Refactor `index.js` to be thin bootstrap:
   - Load Kernel
   - Call `Kernel.init()`
   - Remove all logic that moves to Kernel

**Handoff checkpoint:**
- Kernel loads and exposes `window.TheCouncil`
- EventBus works (can emit/listen)
- Logger accessible via `Kernel.getModule('logger')`

**Success criteria:**
```javascript
// In browser console:
window.TheCouncil.getModule('logger').log('test') // works
window.TheCouncil.emit('test:event', {}) // works
window.TheCouncil.getState() // returns state object
```

---

### Task 0.2: Kernel Storage & Presets
**Estimated context:** 50-60%
**Priority:** P0 - Blocker
**Depends on:** Task 0.1

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md` (Section 6, focus on storage/presets)
- `core/kernel.js` (from Task 0.1)
- `core/preset-manager.js` (existing, for reference)

**Deliverables:**
1. Add to `core/kernel.js`:
   - Storage abstraction (`_storage` with `save`, `load`, `clear`)
   - ST extension data integration
   - Chat-scoped storage keys
   - Preset management (`loadPreset`, `applyPreset`, `saveAsPreset`, `discoverPresets`)

2. Migrate preset logic from `core/preset-manager.js` into Kernel
   - Keep file for now but mark deprecated
   - Kernel becomes source of truth for presets

**Handoff checkpoint:**
- Can save/load data via Kernel
- Can discover and load presets from `data/presets/`

**Success criteria:**
```javascript
window.TheCouncil.saveData('test', { foo: 'bar' })
window.TheCouncil.loadData('test') // returns { foo: 'bar' }
window.TheCouncil.discoverPresets() // returns preset list
```

---

### Task 0.3: Kernel UI Infrastructure
**Estimated context:** 50-60%
**Priority:** P1
**Depends on:** Task 0.1

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md` (Section 6, UI resources)
- `core/kernel.js`
- `ui/nav-modal.js` (existing)
- `styles/main.css` (existing)

**Deliverables:**
1. Add to `core/kernel.js`:
   - Modal registry (`registerModal`, `showModal`, `hideModal`, `getActiveModal`)
   - Toast/notification system (`toast(message, type, duration)`)
   - Confirmation dialog (`confirm(message, options)`)

2. Create `ui/base-modal.js`:
   - Base class/factory for consistent modal behavior
   - Standard open/close animations
   - Escape key handling
   - Click-outside-to-close option

3. Update `ui/nav-modal.js` to use Kernel's modal system

**Handoff checkpoint:**
- Modals register with Kernel
- Toast notifications work
- NavModal uses new base

**Success criteria:**
```javascript
window.TheCouncil.toast('Hello!', 'success')
window.TheCouncil.showModal('nav')
window.TheCouncil.confirm('Are you sure?').then(result => ...)
```

---

## Phase 1: Curation System Refactor

Curation is closest to complete. Refactor to use Kernel.

### Task 1.1: Curation System Kernel Integration
**Estimated context:** 60-70%
**Priority:** P1
**Depends on:** Task 0.2

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md` (Section 1: Curation System)
- `core/kernel.js`
- `core/curation-system.js` (existing - large file, may need chunked reading)

**Deliverables:**
1. Refactor `core/curation-system.js`:
   - Add `init(kernel)` that receives Kernel reference
   - Use `kernel.getModule('logger')` instead of direct Logger
   - Use `kernel.getModule('eventBus')` for events
   - Use Kernel storage for persistence
   - Register with Kernel on init

2. Emit proper namespaced events:
   - `curation:store:created`, `curation:entry:updated`, etc.
   - `curation:rag:started`, `curation:rag:completed`
   - `curation:crud:started`, `curation:crud:completed`

**Handoff checkpoint:**
- CurationSystem initializes via Kernel
- Events flow through Kernel's EventBus
- Data persists via Kernel storage

**Success criteria:**
```javascript
const curation = window.TheCouncil.getSystem('curation')
curation.getStore('characterSheets') // works
// Events visible in Kernel event log
```

---

### Task 1.2: Curation Agents Isolation
**Estimated context:** 50-60%
**Priority:** P1
**Depends on:** Task 1.1

**Context docs to load:**
- `docs/SYSTEM_DEFINITIONS.md` (Section 1, Curation Team)
- `core/curation-system.js`
- `schemas/systems.js` (agent schemas)

**Deliverables:**
1. Ensure Curation System fully owns its agents:
   - Topologist agent definitions inside CurationSystem
   - `_curationAgents` Map (already exists, verify isolation)
   - No imports from agents-system.js
   - Agent CRUD: `createCurationAgent`, `updateCurationAgent`, `deleteCurationAgent`

2. Default Curation Team setup:
   - Archivist (leader) with default config
   - 5 Topologists with specialized prompts
   - Auto-create on first init if missing

**Handoff checkpoint:**
- Curation agents fully self-contained
- Default team auto-creates
- No dependency on agents-system.js

**Success criteria:**
```javascript
const curation = window.TheCouncil.getSystem('curation')
curation.getCurationTeamSummary() // shows Archivist + 5 Topologists
```

---

## Phase 2: Character System Refactor

Character System is nearly complete. Light refactor for Kernel.

### Task 2.1: Character System Kernel Integration
**Estimated context:** 50-60%
**Priority:** P1
**Depends on:** Task 0.2, Task 1.1

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md` (Section 2: Character System)
- `core/kernel.js`
- `core/character-system.js` (existing)

**Deliverables:**
1. Refactor `core/character-system.js`:
   - Add `init(kernel)` pattern
   - Use Kernel modules (logger, eventBus, storage)
   - Register with Kernel
   - Emit namespaced events (`character:created`, `character:spawned`, etc.)

2. Verify Curation integration:
   - Read from Curation via Kernel's system registry
   - `kernel.getSystem('curation').getStore('characterSheets')`
   - Event-based sync when Curation data changes

**Handoff checkpoint:**
- CharacterSystem initializes via Kernel
- Syncs with Curation properly
- Events flow through Kernel

**Success criteria:**
```javascript
const character = window.TheCouncil.getSystem('character')
character.syncFromCuration() // pulls character data
character.getAllCharacterAgents() // returns agents
```

---

## Phase 3: Prompt Builder System (New)

Create the Prompt Builder System from existing components.

### Task 3.1: Prompt Builder System Core
**Estimated context:** 70-80%
**Priority:** P1
**Depends on:** Task 0.1

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md` (Section 3: Prompt Builder System)
- `core/kernel.js`
- `utils/token-resolver.js` (existing - will be absorbed)
- `ui/components/token-picker.js` (existing)

**Deliverables:**
1. Create `core/prompt-builder-system.js`:
   - Token registry (absorb from token-resolver.js)
   - `registerToken(token)`, `getToken(id)`, `getAllTokens(category)`
   - `resolveToken(tokenId, context)`
   - `resolveTemplate(template, context)` - handle `{{token}}` syntax
   - `buildPrompt(config, context)` - stack-based prompt assembly
   - `buildAgentPrompt(agent, position, actionContext)`

2. Migrate token-resolver.js logic:
   - Keep file temporarily, mark deprecated
   - PromptBuilderSystem becomes source of truth

**Handoff checkpoint:**
- PromptBuilderSystem initializes via Kernel
- Token registry populated with ST + custom tokens
- Template resolution works

**Success criteria:**
```javascript
const pb = window.TheCouncil.getSystem('promptBuilder')
pb.resolveTemplate('Hello {{user}}', context) // resolves
pb.getAllTokens('pipeline') // returns pipeline tokens
```

---

### Task 3.2: Prompt Builder UI Integration
**Estimated context:** 60-70%
**Priority:** P2
**Depends on:** Task 3.1

**Context docs to load:**
- `docs/SYSTEM_DEFINITIONS.md` (Section 3)
- `core/prompt-builder-system.js`
- `ui/components/prompt-builder.js` (existing)
- `ui/components/token-picker.js` (existing)

**Deliverables:**
1. Refactor `ui/components/prompt-builder.js`:
   - Use PromptBuilderSystem for token operations
   - Fix drag-and-drop (known broken)
   - Add preview functionality using `resolveTemplate`

2. Refactor `ui/components/token-picker.js`:
   - Get tokens from PromptBuilderSystem
   - Categories from system's token registry

**Handoff checkpoint:**
- Prompt builder UI works with new system
- Drag-and-drop functional
- Preview shows resolved prompt

**Success criteria:**
- User can build a prompt stack in UI
- Dragging tokens works
- Preview button shows resolved result

---

## Phase 4: Response Pipeline Builder System

Consolidate agents-system + pipeline definitions.

### Task 4.1: Pipeline Builder - Agent Consolidation
**Estimated context:** 70-80%
**Priority:** P1
**Depends on:** Task 0.2

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md` (Section 4: Response Pipeline Builder)
- `core/kernel.js`
- `core/agents-system.js` (existing - will be absorbed)
- `core/pipeline-system.js` (existing - definitions portion)

**Deliverables:**
1. Create `core/pipeline-builder-system.js`:
   - Absorb Agent/Position/Team management from agents-system.js
   - Agent CRUD: `createAgent`, `getAgent`, `updateAgent`, `deleteAgent`
   - Position CRUD: `createPosition`, `getPosition`, `assignAgentToPosition`
   - Team CRUD: `createTeam`, `getTeam`, `addPositionToTeam`
   - Hierarchy management

2. Pipeline definition management:
   - `createPipeline`, `getPipeline`, `updatePipeline`, `deletePipeline`
   - `createPhase`, `getPhase`, `updatePhase`
   - `createAction`, `getAction`, `updateAction`
   - Validation: `validatePipeline(id)`

**Handoff checkpoint:**
- PipelineBuilderSystem has all agent/team/pipeline CRUD
- Agents-system.js can be deprecated
- Pipeline definitions validate

**Success criteria:**
```javascript
const pb = window.TheCouncil.getSystem('pipelineBuilder')
pb.getAllAgents() // returns editorial agents
pb.getAllPipelines() // returns pipeline definitions
pb.validatePipeline('default') // returns validation result
```

---

### Task 4.2: Pipeline Builder - Thread & Context Config
**Estimated context:** 60-70%
**Priority:** P1
**Depends on:** Task 4.1

**Context docs to load:**
- `docs/SYSTEM_DEFINITIONS.md` (Section 4, threads/context)
- `core/pipeline-builder-system.js`
- `core/context-manager.js` (existing - will be absorbed)
- `core/thread-manager.js` (existing - will be absorbed)

**Deliverables:**
1. Add to `core/pipeline-builder-system.js`:
   - Thread configuration schemas
   - Context block definitions
   - Variable I/O schemas
   - Absorb relevant logic from context-manager.js and thread-manager.js

2. Mark deprecated:
   - `core/context-manager.js`
   - `core/thread-manager.js`

**Handoff checkpoint:**
- Thread/context config is part of PipelineBuilderSystem
- Old files marked deprecated

**Success criteria:**
```javascript
const pb = window.TheCouncil.getSystem('pipelineBuilder')
pb.getPhase('phase1').threads // thread config exists
pb.getAction('action1').contextOverrides // context config exists
```

---

### Task 4.3: Pipeline Builder UI Updates
**Estimated context:** 60-70%
**Priority:** P2
**Depends on:** Task 4.1, Task 4.2

**Context docs to load:**
- `core/pipeline-builder-system.js`
- `ui/agents-modal.js` (existing)
- `ui/pipeline-modal.js` (existing)

**Deliverables:**
1. Update `ui/agents-modal.js`:
   - Rename to `ui/pipeline-builder-modal.js` (or keep name, update internals)
   - Use PipelineBuilderSystem for all operations
   - Combined view: Agents + Teams + Pipelines in one modal

2. Update `ui/pipeline-modal.js`:
   - Use PipelineBuilderSystem
   - Remove duplicate agent management

**Handoff checkpoint:**
- UI uses new PipelineBuilderSystem
- Agent/pipeline management unified

**Success criteria:**
- Can create agents, teams, pipelines from UI
- All changes persist via Kernel storage

---

## Phase 5: Response Orchestration System (New)

Extract execution logic into dedicated system.

### Task 5.1: Orchestration System Core
**Estimated context:** 70-80%
**Priority:** P1
**Depends on:** Task 4.1

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md` (Section 5: Response Orchestration)
- `core/kernel.js`
- `core/pipeline-system.js` (existing - execution logic to extract)
- `utils/api-client.js` (existing)

**Deliverables:**
1. Create `core/orchestration-system.js`:
   - Run state management (`_runState`)
   - `startRun(pipelineId, options)` - begin execution
   - `pauseRun()`, `resumeRun()`, `abortRun()`
   - `getRunState()`, `getProgress()`, `getOutput()`
   - Phase execution loop
   - Action execution with retry/timeout

2. Extract from pipeline-system.js:
   - All `_execute*` methods
   - Run state tracking
   - Progress events

**Handoff checkpoint:**
- OrchestrationSystem can execute a simple pipeline
- Run state tracks properly
- Events emitted for progress

**Success criteria:**
```javascript
const orch = window.TheCouncil.getSystem('orchestration')
await orch.startRun('quick-pipeline', { userInput: 'test' })
orch.getProgress() // shows completion %
orch.getOutput() // shows result
```

---

### Task 5.2: Orchestration Modes
**Estimated context:** 60-70%
**Priority:** P1
**Depends on:** Task 5.1

**Context docs to load:**
- `docs/SYSTEM_DEFINITIONS.md` (Section 5, Operating Modes)
- `core/orchestration-system.js`
- `core/kernel.js` (for mode state)

**Deliverables:**
1. Add mode support to OrchestrationSystem:
   - `setMode(mode)` - 'synthesis' | 'compilation' | 'injection'
   - `getMode()`
   - Mode-specific execution paths

2. Implement Mode 1 (Synthesis):
   - Execute pipeline, collect outputs
   - Synthesize final response
   - Deliver to ST chat

3. Implement Mode 2 (Compilation):
   - Execute pipeline, build prompt
   - Replace ST's prompt
   - Let ST's LLM generate

**Handoff checkpoint:**
- Mode 1 and Mode 2 functional
- Can switch modes between runs

**Success criteria:**
- Mode 1: Pipeline produces chat response
- Mode 2: Pipeline produces prompt, ST generates

---

### Task 5.3: Orchestration Mode 3 (Injection)
**Estimated context:** 60-70%
**Priority:** P1
**Depends on:** Task 5.2, Task 1.1

**Context docs to load:**
- `docs/SYSTEM_DEFINITIONS.md` (Section 5, Mode 3)
- `core/orchestration-system.js`
- `core/curation-system.js`
- ST extension docs (generate_interceptor)

**Deliverables:**
1. Implement Mode 3 (Injection):
   - Token mapping configuration (`mapToken(stToken, ragPipelineId)`)
   - ST `generate_interceptor` integration
   - Intercept prompt, replace tokens with RAG results

2. Update `manifest.json`:
   - Add `generate_interceptor` field

3. Injection UI:
   - Simple mapping interface (ST token → RAG pipeline)

**Handoff checkpoint:**
- Mode 3 intercepts ST prompt generation
- Tokens replaced with RAG results

**Success criteria:**
- Configure `{{chat}}` → RAG pipeline
- ST generation uses RAG-enriched context

---

### Task 5.4: Orchestration Gavel Integration
**Estimated context:** 50-60%
**Priority:** P2
**Depends on:** Task 5.1

**Context docs to load:**
- `core/orchestration-system.js`
- `ui/gavel-modal.js` (existing)

**Deliverables:**
1. Add gavel support to OrchestrationSystem:
   - `requestGavel(gavelConfig)` - pause for user review
   - `approveGavel(modifications)`, `rejectGavel()`
   - Resume execution after approval

2. Update `ui/gavel-modal.js`:
   - Use OrchestrationSystem
   - Display current output for review
   - Allow edits

**Handoff checkpoint:**
- Gavel points pause execution
- User can review and approve/edit

**Success criteria:**
- Pipeline pauses at gavel point
- User edits, pipeline continues with edits

---

## Phase 6: Integration & Testing

### Task 6.1: System Integration Test
**Estimated context:** 50-60%
**Priority:** P1
**Depends on:** All Phase 0-5 tasks

**Context docs to load:**
- `CLAUDE.md`
- `docs/SYSTEM_DEFINITIONS.md`
- All `core/*.js` files (headers/APIs only)

**Deliverables:**
1. Create `tests/integration-test.js`:
   - Manual test script that exercises all systems
   - Bootstrap → Create agents → Create pipeline → Execute → Verify output

2. Test scenarios:
   - Mode 1: Full synthesis pipeline
   - Mode 2: Prompt compilation
   - Mode 3: Context injection
   - Character participation
   - Curation RAG retrieval

**Handoff checkpoint:**
- All three modes execute successfully
- Cross-system communication works

**Success criteria:**
- Can run through each mode without errors
- Output is reasonable (doesn't need to be perfect)

---

### Task 6.2: Cleanup & Deprecation Removal
**Estimated context:** 40-50%
**Priority:** P2
**Depends on:** Task 6.1

**Context docs to load:**
- All `core/*.js` files
- `index.js`

**Deliverables:**
1. Remove deprecated files:
   - `core/agents-system.js` (if fully absorbed)
   - `core/preset-manager.js` (if fully absorbed)
   - `utils/token-resolver.js` (if fully absorbed)
   - `core/context-manager.js` (if fully absorbed)
   - `core/thread-manager.js` (if fully absorbed)

2. Update imports everywhere

3. Clean up index.js

**Handoff checkpoint:**
- No deprecated files remain
- Clean file structure

**Success criteria:**
- Extension loads without errors
- No console warnings about missing modules

---

### Task 6.3: Default Preset Validation
**Estimated context:** 50-60%
**Priority:** P2
**Depends on:** Task 6.1

**Context docs to load:**
- `data/presets/*.json`
- `core/pipeline-builder-system.js`
- `core/kernel.js`

**Deliverables:**
1. Validate/update preset files:
   - `default-pipeline.json` works with new system
   - `standard-pipeline.json` works
   - `quick-pipeline.json` works

2. Preset loading test:
   - Load each preset
   - Verify all agents/teams/phases created
   - Run pipeline successfully

**Handoff checkpoint:**
- All presets load without errors
- Pipelines execute

**Success criteria:**
- Each preset can be loaded and executed

---

## Phase 7: Documentation & Polish

### Task 7.1: Update Documentation
**Estimated context:** 40-50%
**Priority:** P3
**Depends on:** Task 6.1

**Context docs to load:**
- All `docs/*.md` files
- Current file structure

**Deliverables:**
1. Update `CLAUDE.md`:
   - Reflect final file structure
   - Update system status to "Alpha Complete"

2. Create `docs/STATUS_REPORT.md`:
- Contrast what was actually done against: the tasks, the SYSTEM_DEFINITIONS, and the ACTION_PLAN_v2
- Highlight any discrepancies or areas for improvement
- Audit each section for completeness and accuracy
- Seek out contradictions and areas for improvement

3. Update `README.md`:
   - User-facing documentation
   - Quick start guide

**Handoff checkpoint:**
- Docs match implementation

**Success criteria:**
- New developer can understand system from docs

---

## Task Dependency Graph

```
Phase 0 (Foundation)
  0.1 Kernel Core ─────────┬─────────────────────────────────────────┐
                           │                                         │
  0.2 Kernel Storage ──────┼──────────┬──────────────────────────────┤
       (depends: 0.1)      │          │                              │
                           │          │                              │
  0.3 Kernel UI ───────────┘          │                              │
       (depends: 0.1)                 │                              │
                                      │                              │
Phase 1 (Curation)                    │                              │
  1.1 Curation Kernel ────────────────┤                              │
       (depends: 0.2)                 │                              │
                                      │                              │
  1.2 Curation Agents ────────────────┘                              │
       (depends: 1.1)                                                │
                                                                     │
Phase 2 (Character)                                                  │
  2.1 Character Kernel ──────────────────────────────────────────────┤
       (depends: 0.2, 1.1)                                           │
                                                                     │
Phase 3 (Prompt Builder)                                             │
  3.1 PromptBuilder Core ────────────────────────────────────────────┤
       (depends: 0.1)                                                │
                                                                     │
  3.2 PromptBuilder UI                                               │
       (depends: 3.1)                                                │
                                                                     │
Phase 4 (Pipeline Builder)                                           │
  4.1 Pipeline Builder Core ─────────────────────────────────────────┤
       (depends: 0.2)                                                │
                                                                     │
  4.2 Pipeline Threads/Context                                       │
       (depends: 4.1)                                                │
                                                                     │
  4.3 Pipeline Builder UI                                            │
       (depends: 4.1, 4.2)                                           │
                                                                     │
Phase 5 (Orchestration)                                              │
  5.1 Orchestration Core ────────────────────────────────────────────┤
       (depends: 4.1)                                                │
                                                                     │
  5.2 Orchestration Modes 1&2                                        │
       (depends: 5.1)                                                │
                                                                     │
  5.3 Orchestration Mode 3                                           │
       (depends: 5.2, 1.1)                                           │
                                                                     │
  5.4 Orchestration Gavel                                            │
       (depends: 5.1)                                                │
                                                                     │
Phase 6 (Integration)                                                │
  6.1 Integration Test ──────────────────────────────────────────────┘
       (depends: ALL above)

  6.2 Cleanup
       (depends: 6.1)

  6.3 Preset Validation
       (depends: 6.1)

Phase 7 (Docs)
  7.1 Documentation
       (depends: 6.1)
```

---

## Estimated Timeline

| Phase | Tasks | Sessions | Notes |
|-------|-------|----------|-------|
| Phase 0 | 3 | 3 | Foundation, must complete first |
| Phase 1 | 2 | 2 | Curation refactor |
| Phase 2 | 1 | 1 | Character refactor |
| Phase 3 | 2 | 2 | New system |
| Phase 4 | 3 | 3 | Largest refactor |
| Phase 5 | 4 | 4 | New system, critical |
| Phase 6 | 3 | 2-3 | Can parallelize some |
| Phase 7 | 1 | 1 | Documentation |

**Total: ~18-19 sessions**

At ~1-2 sessions per day (side project pace), estimate **2-3 weeks** to alpha.

---

## Session Prompt Template

When starting a new session, provide this to the Sonnet agent:

```
docs/DEVELOPMENT_PLAN.md

## Task: [Task ID] - [Task Name]

### Context
Read these files first:
- [list from task]

### Objective
[Copy deliverables from task]

### Constraints
- Use Kernel pattern: `init(kernel)`, access modules via `kernel.getModule()`
- Emit events via Kernel: `kernel.emit('namespace:event', data)`
- Persist via Kernel: `kernel.saveData()`, `kernel.loadData()`
- Follow existing code conventions (see CLAUDE.md)

### Handoff
At ~70% context usage, stop and provide:
1. Summary of what was implemented
2. What remains (if anything)
3. Any issues encountered
4. Files modified

### Success Criteria
[Copy from task]
```

---

## Review Checklist (For User)

After each session, verify:

- [ ] Code follows conventions in CLAUDE.md
- [ ] No console errors on load
- [ ] Success criteria met (test in browser)
- [ ] No regressions (existing features still work)
- [ ] Changes committed with clear message

---

*Plan Version: 1.0*
*Created: Session with Opus*
*Last Updated: Initial creation*
