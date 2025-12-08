# The Council - System Architecture

**Version:** 2.0.0  
**Status:** Design Phase

---

## Overview

The Council is a multi-agent orchestration system for SillyTavern that transforms response generation into a full editorial production pipeline. It coordinates multiple specialized AI agents organized into teams to produce high-quality, consistent narrative responses.

### Core Philosophy

- **Separation of Concerns**: Three distinct systems handle different responsibilities
- **User Empowerment**: Users can define their own teams, agents, and workflows
- **Flexibility with Structure**: Curation is structured; editorial pipeline is flexible
- **Agents Fill Positions**: Agents are AI configurations; Positions are roles in the organization

---

## Three Core Systems

```
┌─────────────────────────────────────────────────────────────┐
│                       THE COUNCIL                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   AGENTS        │   CURATION      │   RESPONSE PIPELINE     │
│   SYSTEM        │   SYSTEM        │   SYSTEM                │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Define Teams  │ • Schema Mgmt   │ • Pipeline Definition   │
│ • Define Agents │ • CRUD Pipelines│ • Phase/Action Flow     │
│ • Assign Roles  │ • RAG Pipelines │ • Context Routing       │
│ • Prompts/APIs  │ • Data Viewer   │ • Output Management     │
└─────────────────┴─────────────────┴─────────────────────────┘
```

---

## 1. AGENTS SYSTEM

The Agents System defines the "creative writing company" - the organizational structure, the AI agents, and how they're assigned to roles.

### Key Concepts

#### Agent
An AI configuration that can be assigned to positions.

```javascript
Agent {
  id: string
  name: string
  description: string
  apiConfig: {
    useCurrentConnection: boolean  // Use ST's current API
    endpoint: string              // Custom API endpoint
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
    // ... other API settings
  }
  systemPrompt: {
    source: "builder" | "preset" | "custom"
    presetName: string           // If using saved ST preset
    customText: string           // If custom
    builderTokens: [{            // If using builder
      token: string,
      prefix: string,
      suffix: string
    }]
  }
  reasoning: {
    enabled: boolean
    prefix: string               // e.g., "<thinking>"
    suffix: string               // e.g., "</thinking>"
    hideFromOutput: boolean
  }
}
```

#### Position
A slot in the organization that an Agent fills.

```javascript
Position {
  id: string
  name: string
  teamId: string
  tier: "executive" | "leader" | "member"
  assignedAgentId: string | null
  assignedPoolId: string | null      // For random agent selection
  promptModifiers: {
    prefix: string                   // Injected BEFORE agent's system prompt
    suffix: string                   // Injected AFTER agent's system prompt
    roleDescription: string          // Role context for the agent
  }
  isMandatory: boolean
  isSME: boolean                     // Subject Matter Expert
  smeKeywords: string[]              // Keywords that activate this SME
}
```

#### Team
A group of positions with a leader and members.

```javascript
Team {
  id: string
  name: string
  description: string
  icon: string
  leaderId: string                   // Position ID of team leader
  memberIds: string[]                // Position IDs of members
  settings: {
    outputObjectName: string
    contextObjectName: string
    threadFirstMessage: string       // Template for team threads
    taskThreadFirstMessage: string
  }
  displayOrder: number
}
```

#### Agent Pool
A set of agents for random/weighted selection.

```javascript
AgentPool {
  id: string
  name: string
  agentIds: string[]
  selectionMode: "random" | "round_robin" | "weighted"
  weights: { [agentId]: number }
}
```

### Prompt Stack

When an agent generates, the full prompt is assembled in layers:

```
┌─────────────────────────────────────────┐
│ 4. Action/Phase specific instructions   │ ← From pipeline definition
├─────────────────────────────────────────┤
│ 3. Position prompt suffix               │ ← From position config
├─────────────────────────────────────────┤
│ 2. Agent's system prompt                │ ← From agent definition
├─────────────────────────────────────────┤
│ 1. Position prompt prefix               │ ← From position config
└─────────────────────────────────────────┘
```

### Hierarchy

The complete organizational structure:

```javascript
Hierarchy {
  companyName: string
  executivePositions: Position[]     // Above all teams (e.g., Publisher)
  teams: Team[]
  positions: Position[]              // Flat list for lookup
  agents: Agent[]
  agentPools: AgentPool[]
}
```

### Rules

1. **One Agent per Position**: An agent cannot fill multiple positions simultaneously
2. **Positions Must Be Filled**: All positions must have an assigned agent
3. **Agent Pools are Optional**: Positions can use pools for random selection
4. **Mandatory Positions**: Publisher is always required

---

## 2. CURATION SYSTEM

The Curation System manages persistent story data through structured CRUD operations and RAG pipelines.

### Key Concepts

#### Store Schema
Defines the structure of a data store.

```javascript
StoreSchema {
  id: string
  name: string
  description: string
  icon: string
  fields: { [fieldName]: FieldDefinition }
  requiredFields: string[]
  primaryKey: string | null          // null = single object, not collection
  indexFields: string[]
  promptInstructions: {
    create: string
    read: string
    update: string
    delete: string
  }
  validationRules: object
}

FieldDefinition {
  name: string
  type: "string" | "number" | "boolean" | "array" | "object" | "enum" | "date"
  required: boolean
  default: any
  enumValues: string[]               // If type = "enum"
  itemSchema: FieldDefinition        // If type = "array"
  objectSchema: object               // If type = "object"
  description: string
}
```

#### CRUD Pipeline
Defines how CRUD operations are executed.

```javascript
CRUDPipeline {
  id: string
  storeId: string
  operation: "create" | "read" | "update" | "delete"
  name: string
  description: string
  actions: CurationAction[]
  inputSchema: object
  outputSchema: object
}

CurationAction {
  id: string
  name: string
  description: string
  positionId: string                 // Which curation agent executes this
  promptTemplate: string
  inputMapping: object
  outputMapping: object
  validation: object
}
```

#### RAG Pipeline
Defines retrieval operations for injecting context.

```javascript
RAGPipeline {
  id: string
  name: string
  description: string
  targetStores: string[]
  actions: CurationAction[]
  inputSchema: object
  outputSchema: object
  canTriggerFromPipeline: boolean
  canTriggerManually: boolean
}
```

### Fixed Team Structure

The Curation System has a fixed team (not user-configurable):

| Position | Role |
|----------|------|
| **Archivist** (Leader) | Oversees all data curation |
| Story Topologist | Manages story/plot structure |
| Lore Topologist | Manages world-building data |
| Character Topologist | Manages character data |
| Scene Topologist | Manages scene data |
| Location Topologist | Manages location data |

### Default Data Stores

| Store | Type | Description |
|-------|------|-------------|
| `storyDraft` | Single | Current working draft |
| `storyOutline` | Single | Current outline |
| `storySynopsis` | Single | 5W+H synopsis of overall story |
| `plotLines` | Collection | Plot threads with status tracking |
| `scenes` | Collection | Scene details and timeline |
| `dialogueHistory` | Collection | Complete in-character dialogue |
| `characterSheets` | Collection | Character details |
| `characterDevelopment` | Collection | Character arc tracking |
| `characterInventory` | Collection | Character possessions |
| `characterPositions` | Collection | Character locations |
| `factionSheets` | Collection | Faction/organization data |
| `locationSheets` | Collection | Location details |
| `currentSituation` | Single | 5W+H synopsis of current moment |
| `agentCommentary` | Collection | Archived agent commentary |

---

## 3. RESPONSE PIPELINE SYSTEM

The Response Pipeline System defines the editorial workflow that transforms user input into a final response.

### Structure

```
Pipeline
├── Phases (synchronous, linear order)
│   ├── Phase 1
│   │   ├── Action A (sync)
│   │   ├── Action B (async, await: A-complete)
│   │   └── Action C (async, await: A-complete)
│   ├── Phase 2
│   │   └── ...
│   └── ...
└── Final Output
```

### Phase

A stage in the pipeline containing actions.

```javascript
Phase {
  id: string
  name: string
  description: string
  icon: string
  teams: string[]                    // Which teams are active (Option A)
  
  threads: {
    phaseThread: ThreadConfig        // Leaders+ only
    teamThreads: { [teamId]: ThreadConfig }
  }
  
  context: {
    static: string[]                 // Static context keys
    global: string[]                 // Global context keys
    phase: string[]                  // Previous phase outputs
    team: string[]                   // Team context keys
    stores: string[]                 // Store keys to include
  }
  
  actions: Action[]
  
  output: {
    phaseOutput: OutputConfig        // Max one per phase
    teamOutputs: { [teamId]: OutputConfig }
    consolidation: "last_action" | "synthesize" | "user_gavel" | "merge" | "designated"
    consolidationActionId: string    // For "designated"
  }
  
  gavel: {
    enabled: boolean
    prompt: string
    editableFields: string[]
    canSkip: boolean
  }
  
  constants: object
  variables: object
  displayOrder: number
}

ThreadConfig {
  enabled: boolean
  firstMessage: string               // Template with token support
  maxMessages: number
}
```

### Action

A single unit of work within a phase.

```javascript
Action {
  id: string
  name: string
  description: string
  
  execution: {
    mode: "sync" | "async"
    trigger: {
      type: "sequential" | "await" | "on" | "immediate"
      targetActionId: string
      targetState: "called" | "start" | "in_progress" | "complete" | "respond"
    }
    timeout: number
    retryCount: number
  }
  
  participants: {
    positionIds: string[]
    teamIds: string[]
    orchestration: "sequential" | "parallel" | "round_robin" | "consensus"
    maxRounds: number
  }
  
  threads: {
    actionThread: ThreadConfig       // All participants
    teamTaskThreads: { [teamId]: ThreadConfig }
  }
  
  input: {
    source: "phaseInput" | "previousAction" | "global" | "store" | "custom"
    sourceKey: string
    transform: string
  }
  
  output: {
    target: "phaseOutput" | "teamOutput" | "global" | "store" | "nextAction"
    targetKey: string
    append: boolean
  }
  
  contextOverrides: {
    include: string[]
    exclude: string[]
    priority: string[]
  }
  
  rag: {
    enabled: boolean
    ragPipelineId: string
    queryTemplate: string
    resultTarget: "actionRagThread" | "context"
  }
  
  promptTemplate: string
  displayOrder: number
}
```

### Lifecycles

#### Phase Lifecycle
```
start → before_actions → in_progress → after_actions → end → respond
                              ↑
                         (actions run here)
```

#### Action Lifecycle
```
called → start → in_progress → complete → respond
```

### Execution Flow

```
PHASE "outline_creation"
│
├─ [start]
│   └─ Initialize phase context
│
├─ [before_actions]
│   └─ Create phase thread, team threads
│   └─ Build initial context
│
├─ [in_progress]
│   │
│   ├─ ACTION 1 (sync): "plot_architect_outline"
│   │   ├─ [called] → Action queued
│   │   ├─ [start] → Build action context
│   │   ├─ [in_progress] → Agent generates
│   │   ├─ [complete] → Output ready
│   │   └─ [respond] → Route output
│   │
│   ├─ ACTION 2 (async, await: action_1-complete): "continuity_check"
│   │   └─ Runs after action 1 completes
│   │
│   └─ ACTION 3 (async, await: action_1-complete): "world_check"
│       └─ Runs in parallel with action 2
│
├─ [after_actions]
│   └─ Consolidate outputs
│   └─ Update global variables
│
├─ [end]
│   └─ Cleanup phase context
│
└─ [respond]
    └─ If gavel enabled → show modal → wait for user
    └─ Proceed to next phase
```

### Thread Types

| Thread Type | Scope | Access |
|-------------|-------|--------|
| **Phase Thread** | Phase | Leaders and executives only |
| **Team Thread** | Phase + Team | All team members |
| **Action Thread** | Action | All action participants |
| **Team Task Thread** | Action + Team | Team members in action |

**Rule**: Only leader-tier and above can participate in non-team threads.

### Context Block Types

| Type | Scope | Updates | Description |
|------|-------|---------|-------------|
| **Static** | Pipeline | Never | Character card, world info, persona |
| **Global** | Pipeline | End of phases | Shared across all phases |
| **Phase** | Phase | Per phase | Previous phase outputs |
| **Team** | Phase + Team | Per phase | Team-specific context |
| **Store** | Pipeline | As modified | Direct store object inclusion |

### Default Pipeline Globals

```javascript
PipelineGlobals {
  instructions: string      // Interpreted user intent
  outlineDraft: string      // Working outline
  finalOutline: string      // Finalized outline
  firstDraft: string        // First draft
  secondDraft: string       // Second draft
  finalDraft: string        // Final response
  commentary: string        // Agent commentary
  custom: object            // User-defined
}
```

---

## Token System

Tokens can be used in prompts, first messages, and templates. They are resolved at runtime.

### ST Native Macros
- `{{char}}`, `{{user}}`, `{{persona}}`, `{{scenario}}`
- `{{personality}}`, `{{system}}`, `{{jailbreak}}`
- `{{mesExamples}}`, `{{description}}`

### Pipeline Scope
- `{{pipeline.userInput}}` - Original user input
- `{{pipeline.ragThread}}` - Pipeline-level RAG thread
- `{{pipeline.ragInput}}` - Pipeline-level RAG input

### Phase Scope
- `{{phase.id}}`, `{{phase.name}}`
- `{{phase.input}}`, `{{phase.output}}`
- `{{phase.thread}}` - Phase thread content
- `{{phase.ragThread}}`, `{{phase.ragInput}}`

### Action Scope
- `{{action.id}}`, `{{action.name}}`
- `{{action.input}}`, `{{action.output}}`
- `{{action.thread}}` - Action thread content
- `{{action.ragThread}}`, `{{action.ragInput}}`

### Global Variables
- `{{global.instructions}}`
- `{{global.outlineDraft}}`, `{{global.finalOutline}}`
- `{{global.firstDraft}}`, `{{global.secondDraft}}`, `{{global.finalDraft}}`
- `{{global.commentary}}`

### Team Scope
- `{{team.id}}`, `{{team.name}}`
- `{{team.thread}}`, `{{team.taskThread}}`
- `{{team.input}}`, `{{team.output}}`

### Store Access
- `{{store.characterSheets}}`
- `{{store.plotLines}}`
- `{{store.<storeName>}}`

### Agent/Position
- `{{agent.name}}`
- `{{position.name}}`, `{{position.role}}`

---

## UI Structure

### Navigation Modal (Floating)
```
┌────────────────────┐
│  [Agents]          │ → Opens Agents System Modal
│  [Curation]        │ → Opens Curation System Modal
│  [Pipeline]        │ → Opens Response Pipeline Modal
│  ─────────────     │
│  [▶ Run Pipeline]  │ → Execute current pipeline
│  [⏹ Stop]          │ → Abort running pipeline
└────────────────────┘
```

### Agents System Modal
```
┌─────────────────────────────────────────┐
│ AGENTS SYSTEM                      [X]  │
├─────────────────────────────────────────┤
│ [Hierarchy] [Agents] [Team: Prose] ...  │
├─────────────────────────────────────────┤
│                                         │
│  (Tab content)                          │
│                                         │
└─────────────────────────────────────────┘
```

- **Hierarchy Tab**: Visual org chart, create teams/positions
- **Agents Tab**: Define AI configurations
- **Team Tabs** (dynamic): Assign agents, configure team settings

### Curation System Modal
```
┌─────────────────────────────────────────┐
│ CURATION SYSTEM                    [X]  │
├─────────────────────────────────────────┤
│ [Agents] [Team] [Format] [Pipelines]    │
│ [RAG] [Viewer]                          │
├─────────────────────────────────────────┤
│                                         │
│  (Tab content)                          │
│                                         │
└─────────────────────────────────────────┘
```

- **Agents Tab**: Curation-specific agents
- **Team Tab**: The fixed curation team
- **Format Tab**: Store schemas and prompt instructions
- **Pipelines Tab**: CRUD pipeline definitions
- **RAG Tab**: RAG pipeline definitions
- **Viewer Tab**: Browse/edit stored data

### Response Pipeline Modal
```
┌─────────────────────────────────────────┐
│ RESPONSE PIPELINE                  [X]  │
├─────────────────────────────────────────┤
│ [Pipeline] [Phase] [Action] [Threads]   │
│ [Outputs]                               │
├─────────────────────────────────────────┤
│                                         │
│  (Tab content)                          │
│                                         │
└─────────────────────────────────────────┘
```

- **Pipeline Tab**: Phase list, visual flow
- **Phase Tab**: Selected phase details
- **Action Tab**: Selected action details
- **Threads Tab**: Live thread view during execution
- **Outputs Tab**: View all outputs

---

## File Structure (New)

```
TheCouncil/
├── index.js                    # Entry point, ST integration
├── manifest.json
├── schemas/
│   └── systems.js              # All data model schemas
├── core/
│   ├── agents-system.js        # Agent/Position/Team management
│   ├── curation-system.js      # Data store management
│   ├── pipeline-system.js      # Pipeline execution
│   ├── context-manager.js      # Context building and routing
│   ├── output-manager.js       # Output routing
│   └── thread-manager.js       # Thread management
├── ui/
│   ├── nav-modal.js            # Floating navigation
│   ├── agents-modal.js         # Agents system UI
│   ├── curation-modal.js       # Curation system UI
│   ├── pipeline-modal.js       # Pipeline system UI
│   ├── gavel-modal.js          # User review modal
│   └── components/             # Shared UI components
├── utils/
│   ├── token-resolver.js       # Token/macro resolution
│   ├── schema-validator.js     # Schema validation
│   ├── api-client.js           # LLM API calls
│   └── logger.js               # Centralized logging
├── styles/
│   └── main.css
├── data/
│   └── stories/                # Per-story persistent data
└── docs/
    └── ARCHITECTURE.md         # This file
```

---

## Migration from Legacy

The legacy modules will be removed:

**Remove:**
- `modules/config.js` → Replaced by `schemas/systems.js` + user-defined configs
- `modules/state.js` → Replaced by `core/pipeline-system.js` state management
- `modules/stores.js` → Replaced by `core/curation-system.js`
- `modules/context.js` → Replaced by `core/context-manager.js`
- `modules/topology.js` → Simplified into curation system
- `modules/generation.js` → Replaced by `utils/api-client.js`
- `modules/agents.js` → Replaced by `core/agents-system.js`
- `modules/pipeline.js` → Replaced by `core/pipeline-system.js`
- `modules/ui.js` → Replaced by new modal-based UI

**Remove subdirectories:**
- `modules/core/` → Consolidated into new `core/`
- `modules/context/` → Consolidated
- `modules/pipeline/` → Consolidated
- `modules/threads/` → Consolidated
- `modules/ui/` → Replaced by new `ui/`

---

## Implementation Priority

### Phase 1: Foundation ✅ COMPLETE
1. Schema definitions ✅ `schemas/systems.js`
2. Core logging utility ✅ `utils/logger.js`
3. Token resolver ✅ `utils/token-resolver.js`
4. API client wrapper ✅ `utils/api-client.js`

### Phase 2: Agents System ✅ COMPLETE
1. Agent management ✅ `core/agents-system.js`
2. Position management ✅ `core/agents-system.js`
3. Team management ✅ `core/agents-system.js`
4. Agents modal UI ✅ `ui/agents-modal.js`

### Phase 3: Curation System ✅ COMPLETE
1. Store management (CRUD) ✅ `core/curation-system.js`
2. Schema validation ✅ `core/curation-system.js`
3. RAG pipeline execution ✅ `core/curation-system.js`
4. Curation modal UI ✅ `ui/curation-modal.js`

### Phase 4: Pipeline System ✅ COMPLETE
1. Phase/Action execution ✅ `core/pipeline-system.js`
2. Context management ✅ `core/context-manager.js`
3. Output routing ✅ `core/output-manager.js`
4. Thread management ✅ `core/thread-manager.js`
5. Gavel integration ✅ `ui/gavel-modal.js`
6. Pipeline modal UI ✅ `ui/pipeline-modal.js`

### Phase 5: Integration ✅ COMPLETE
1. Navigation modal ✅ `ui/nav-modal.js`
2. ST integration ✅ Rewritten `index.js`
3. Testing → Manual testing recommended
4. Documentation ✅ ARCHITECTURE.md updated

---

## Current Implementation Status

### ✅ Completed Files

| File | Lines | Description |
|------|-------|-------------|
| `schemas/systems.js` | ~1,400 | Complete data models for all three systems |
| `utils/logger.js` | ~480 | Centralized logging with levels, history, debug utilities |
| `utils/token-resolver.js` | ~615 | Token/macro resolution with scope support |
| `utils/api-client.js` | ~675 | LLM API wrapper with ST integration, queuing, retry |
| `core/agents-system.js` | ~1,360 | Full agents management (Agent, Pool, Position, Team, Hierarchy) |
| `ui/agents-modal.js` | ~2,990 | Complete Agents System UI (hierarchy, agents, pools, positions, teams) |
| `core/curation-system.js` | ~1,750 | Store management, CRUD, RAG pipelines, validation |
| `ui/curation-modal.js` | ~1,980 | Complete Curation System UI (stores, search, pipelines) |
| `core/pipeline-system.js` | ~1,710 | Pipeline/Phase/Action execution, lifecycle management |
| `core/context-manager.js` | ~660 | Context building, static/global/phase/team/store context |
| `core/output-manager.js` | ~740 | Output routing, consolidation, transformation |
| `core/thread-manager.js` | ~835 | Thread/conversation management for phases/teams/actions |
| `ui/pipeline-modal.js` | ~2,450 | Complete Pipeline System UI (pipelines, phases, actions, execution, threads, outputs) |
| `ui/gavel-modal.js` | ~1,250 | User review/intervention modal with editing and history |
| `ui/nav-modal.js` | ~930 | Floating navigation for quick system access |
| `index.js` | ~870 | New architecture entry point with three-system initialization |
| `docs/ARCHITECTURE.md` | ~900 | This document |
| `docs/DEFAULT_PIPELINE.md` | ~750 | Default pipeline reference |

**Total new code: ~21,445 lines**

### ✅ All Phases Complete!

The three-system architecture is now fully implemented:
- **AGENTS SYSTEM**: Define and staff creative writing teams
- **CURATION SYSTEM**: Data management with structured schemas
- **RESPONSE PIPELINE SYSTEM**: Editorial workflow producing final content

### 🔜 Next Steps (Optional Enhancements)

1. **Testing**: Create unit tests for core modules
2. **Presets**: Add preset pipeline and agent configurations
3. **Documentation**: Expand user guide and API documentation
4. **Legacy Cleanup**: Remove `modules/` directory after validation

### 📁 Directory Status

```
TheCouncil/
├── schemas/
│   └── systems.js           ✅ Complete
├── docs/
│   ├── ARCHITECTURE.md      ✅ Complete
│   └── DEFAULT_PIPELINE.md  ✅ Complete
├── utils/
│   ├── logger.js            ✅ Complete
│   ├── token-resolver.js    ✅ Complete
│   └── api-client.js        ✅ Complete
├── core/
│   ├── agents-system.js     ✅ Complete (~1,360 lines)
│   ├── curation-system.js   ✅ Complete (~1,750 lines)
│   ├── pipeline-system.js   ✅ Complete (~1,710 lines)
│   ├── context-manager.js   ✅ Complete (~660 lines)
│   ├── output-manager.js    ✅ Complete (~740 lines)
│   └── thread-manager.js    ✅ Complete (~835 lines)
├── ui/
│   ├── agents-modal.js      ✅ Complete (~2,990 lines)
│   ├── curation-modal.js    ✅ Complete (~1,980 lines)
│   ├── pipeline-modal.js    ✅ Complete (~2,450 lines)
│   ├── gavel-modal.js       ✅ Complete (~1,250 lines)
│   ├── nav-modal.js         ✅ Complete (~930 lines)
│   └── components/          📁 Reserved for future shared components
├── modules/                 🗑️ Legacy (to be removed after validation)
├── data/
│   └── stories/             📁 Exists (empty)
├── styles/                  📁 Exists (legacy CSS)
├── index.js                 ✅ Complete (~870 lines) - New architecture entry point
├── manifest.json            ✅ Exists
└── README.md                ✅ Exists
```

### 🗑️ Legacy Files to Remove

The `modules/` directory contains legacy code that will be replaced:

- `modules/config.js` → `schemas/systems.js`
- `modules/state.js` → `core/pipeline-system.js`
- `modules/stores.js` → `core/curation-system.js`
- `modules/context.js` → `core/context-manager.js`
- `modules/topology.js` → `core/curation-system.js`
- `modules/generation.js` → `utils/api-client.js`
- `modules/agents.js` → `core/agents-system.js`
- `modules/pipeline.js` → `core/pipeline-system.js`
- `modules/ui.js` → `ui/*.js`
- `modules/core/` → `core/`
- `modules/context/` → `core/context-manager.js`
- `modules/pipeline/` → `core/pipeline-system.js`
- `modules/threads/` → `core/thread-manager.js`
- `modules/ui/` → `ui/`

**Do not delete until new architecture is fully functional and tested.**

---

## Open Questions

1. **Store Persistence**: Continue using localStorage + ST extension data, or introduce a better solution?

2. **RAG Implementation**: Use simple keyword search, or integrate with ST's vector database if available?

3. **Default Pipeline**: What should the default "out of the box" pipeline look like? Minimal (3-4 phases) or comprehensive (10+ phases)?

4. **Import/Export**: Should users be able to share pipeline definitions, agent configurations, etc.?

5. **Presets**: Should we ship with preset "company" configurations (e.g., "Minimal", "Standard", "Comprehensive")?

---

*Last Updated: All Phases Complete (1-5). Three-system architecture fully implemented.*