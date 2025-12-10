# TheCouncil - Comprehensive Action Plan

## Executive Summary

The Council is a multi-agent orchestration system for SillyTavern with **four core systems**:

1. **Agents System** - Editorial team agents (Pipeline agents)
2. **Curation System** - Data management agents and persistent stores
3. **Character System** - Story character avatar agents (NEW)
4. **Pipeline System** - Orchestration of phases, actions, and threads

### Current Status Overview

| System | Completion | Status |
|--------|------------|--------|
| Agents System | ~90% | Functional, minor polish needed |
| Curation System | ~70% | Needs agent isolation, quality pass |
| Character System | 0% | **NEW - To be built** |
| Pipeline System | ~80% | Threads UI, Outputs/Variables refinement |

---

## Priority Levels

- **P0** - Critical blocker, cannot proceed without
- **P1** - High priority, core functionality
- **P2** - Medium priority, important features
- **P3** - Nice to have, polish

---

## Active Work: Character System (P1)

### Overview

The Character System is a self-contained system for creating "avatar agents" that represent story characters. It integrates with Curation for data and Pipeline for execution.

### Architecture

```
CHARACTER SYSTEM
================
┌─────────────────────────────────────────────────────────────────┐
│                     CHARACTER SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│  Static Position: Character Director (leader)                  │
│                                                                 │
│  Character Types (from Curation):                               │
│    • Main Cast                                                  │
│    • Recurring Cast                                             │
│    • Supporting Cast                                            │
│    • Background                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Character Agents (dynamic, per-character):                     │
│    • Auto-pulls from Curation characterSheets (read-only)       │
│    • User can add AGENT-LEVEL overrides (not character data)    │
│    • Acts as "avatar" - voicing the character                   │
└─────────────────────────────────────────────────────────────────┘
           ↑                              ↓
    Reads from Curation            Participates in Pipeline
    (characterSheets)              (special participation types)
```

### Key Principles

1. **Self-Contained** - Own agent definitions, positions, teams (NOT borrowing from AgentsSystem)
2. **Read-Only Curation Access** - Pulls character data from Curation's `characterSheets` store
3. **Separation of Concerns**:
   - Change CHARACTER DATA → Go to Curation System
   - Change AGENT BEHAVIOR → Go to Character System
4. **Avatar Agents** - Characters agents embody and voice story characters
5. **Dynamic Spawning** - Character Director can auto-spawn agents for scene characters

### Data Flow

```
CURATION SYSTEM                    CHARACTER SYSTEM
═══════════════                    ════════════════
characterSheets store ──(read)───► Character Agent view
  • name                             • Pulls personality/voice
  • personality                      • User adds AGENT config:
  • appearance                         - voicing guidance
  • background                         - supplementary prompt
  • relationships                      - NOT character data
  • type (Main/Recurring/etc)
```

### Implementation Tasks

#### Phase 1: Core System (Current Focus)

- [ ] **1.1 Create `core/character-system.js`**
  - [ ] CharacterSystem object with VERSION
  - [ ] State management (_characterAgents, _positions, _characterDirector)
  - [ ] Character Types enum (MAIN_CAST, RECURRING_CAST, SUPPORTING_CAST, BACKGROUND)
  - [ ] init() method with Curation integration
  - [ ] Character Director static position (uses standard API config pattern)
  - [ ] Character Agent registry (separate from AgentsSystem)
  - [ ] Position management for character agents
  - [ ] Read-only integration with Curation's characterSheets
  - [ ] User override storage (agent-level, not character data)
  - [ ] Event system (on/off/_emit)
  - [ ] getSummary() method
  - [ ] Export/import functionality

- [ ] **1.2 Character Agent Definition**
  ```javascript
  CharacterAgent {
    id: string                    // e.g., "char_alice"
    characterId: string           // Reference to Curation characterSheets entry
    name: string                  // Character name (from Curation)
    type: CharacterType           // Main/Recurring/Supporting/Background
    apiConfig: {...}              // Same pattern as other agents
    systemPromptOverrides: {
      prefix: string              // Injected before auto-generated prompt
      suffix: string              // Injected after auto-generated prompt
      voicingGuidance: string     // How to voice this character
    }
    enabled: boolean              // Active in system
    metadata: {
      createdAt: number
      updatedAt: number
      lastSyncedFromCuration: number
    }
  }
  ```

- [ ] **1.3 Auto-Generated System Prompt**
  ```
  You are {{character.name}}. You embody this character and speak as them.
  
  Personality: {{character.personality}}
  Background: {{character.background}}
  Speech patterns: {{character.speechPatterns}}
  
  [User's voicing guidance injected here]
  
  [User's prefix/suffix overrides]
  ```

- [ ] **1.4 Character Director Configuration**
  - Static position, same API config pattern as other agents
  - Responsible for:
    - Auto-spawning character agents for scenes
    - Coordinating character voice consistency
    - Managing character team dynamics

#### Phase 2: UI Implementation

- [ ] **2.1 Create `ui/character-modal.js`**
  - [ ] Modal structure (similar to agents-modal.js)
  - [ ] Tabs: Characters, Character Director, Settings
  - [ ] Character list view (pulled from Curation)
  - [ ] Character agent configuration panel
  - [ ] Voicing guidance editor
  - [ ] Supplementary prompt editor
  - [ ] Character type display (from Curation)

- [ ] **2.2 Character List View**
  - Display all characters from Curation's characterSheets
  - Show character type (Main/Recurring/Supporting/Background)
  - Show agent status (configured/unconfigured)
  - Filter by type
  - Search by name

- [ ] **2.3 Character Agent Editor**
  - Read-only character data display (from Curation)
  - Link to Curation for data changes
  - Agent-level overrides:
    - Voicing guidance textarea
    - Supplementary prompt textarea
    - API config (inherits default or custom)
  - Preview generated system prompt

#### Phase 3: Pipeline Integration

- [x] **3.1 New Participation Type: `dynamic_characters`**
  - Triggers Character Director to identify scene characters
  - Auto-spawns/activates relevant character agents
  - User provides supplementary prompt for voicing guidance
  - Optional RAG prompts for additional character context
  - Added `participants.characters` config in action normalization
  - Added `_resolveCharacterParticipants()` method
  - Added `_resolveDynamicCharacters()` for Director-based selection
  - Modes: "dynamic", "explicit", "spawned"

- [x] **3.2 Character Workshop Action Type**
  - Dedicated action type for character refinement
  - RAG integration for pulling relevant character data
  - External team collaboration (Editorial ↔ Character)
  - Added `ActionType.CHARACTER_WORKSHOP`
  - Added `_executeCharacterWorkshopAction()` method
  - Workshop modes: "refinement", "consistency", "collaboration"
  - Use cases:
    - Reinforce character voice mid-pipeline
    - Refine character representation
    - Character consistency checks

- [x] **3.3 Character Consultation**
  - Character agents can join standard actions via `participants.characters`
  - Character-specific consultation via CHARACTER_WORKSHOP actions
  - Integration with collaboration workshop for cross-team queries
  - PipelineSystem now receives `characterSystem` dependency

#### Phase 4: Curation Integration

- [x] **4.1 Verify characterSheets Schema**
  - Updated `type` field with comprehensive enumValues: main, main_cast, recurring, recurring_cast, supporting, supporting_cast, minor, background, npc
  - Added new fields: `voicingGuidance`, `mannerisms`, `catchphrases`
  - Updated both `schemas/systems.js` and `core/curation-system.js`
  - Enhanced `_buildCharacterAgent()` to use new fields
  - Enhanced `generateSystemPrompt()` to include mannerisms and catchphrases

- [x] **4.2 Default CRUD Pipeline for Character Typing**
  - Created `character_type_classification` pipeline for auto-categorizing characters
  - Created `character_sheet_create` pipeline for generating character details
  - Created `character_sheet_update` pipeline with consistency validation
  - Pipelines registered in `_registerDefaultCharacterPipelines()`

- [x] **4.3 Character-Specific RAG Pipelines**
  - Created `character_search` pipeline for character lookup
  - Created `character_context` pipeline for full character context (Character Workshop)
  - Created `character_relationships` pipeline for relationship mapping
  - Created `character_voice` pipeline for voice consistency
  - Created `scene_characters` pipeline for dynamic character spawning
  - Added `getCharacterContext()`, `getCharacterVoiceReference()`, `getSceneCharacters()` to CharacterSystem

### File Structure

```
TheCouncil/
├── core/
│   ├── character-system.js      # NEW - Core character system
│   └── ... (existing)
├── ui/
│   ├── character-modal.js       # NEW - Character UI
│   └── ... (existing)
└── schemas/
    └── systems.js               # Add character schemas
```

### Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Core system file | 🟢 Complete | `core/character-system.js` created (1400+ lines) |
| 1.2 Character Agent definition | 🟢 Complete | Full agent structure with cached traits, API config |
| 1.3 Auto-generated prompts | 🟢 Complete | `generateSystemPrompt()` with trait injection |
| 1.4 Character Director | 🟢 Complete | Static position with default agent config |
| 1.5 Index.js integration | 🟢 Complete | Added to Systems, module loading, initialization |
| 2.1 Character modal | 🟢 Complete | `ui/character-modal.js` created (2200+ lines) |
| 2.2 Character list view | 🟢 Complete | Filter by type/status, search, Curation integration |
| 2.3 Character agent editor | 🟢 Complete | Voicing guidance, prompt overrides, API config |
| 2.4 NavModal integration | 🟢 Complete | Character button added to navigation |
| 3.1 dynamic_characters participation | 🟢 Complete | `_resolveCharacterParticipants()`, 3 modes |
| 3.2 Character workshop actions | 🟢 Complete | `CHARACTER_WORKSHOP` action type, 3 workshop modes |
| 3.3 Character consultation | 🟢 Complete | Characters join actions via participation config |
| 4.1 Verify schemas | 🟢 Complete | Enhanced type enum, added voicingGuidance/mannerisms/catchphrases |
| 4.2 CRUD pipeline | 🟢 Complete | 3 CRUD pipelines: classification, create, update |
| 4.3 RAG pipelines | 🟢 Complete | 5 RAG pipelines: search, context, relationships, voice, scene |

---

## System 1: Agents System

### Status: ~90% Complete

### Remaining Tasks

- [ ] **1.1 Prompt Builder Polish (P2)**
  - Fix drag-and-drop token insertion
  - Fix token reorder functionality
  - (Deferred: Full overhaul planned for P2)

- [ ] **1.2 Minor UI Polish (P3)**
  - Inline styles → main.css
  - Event listener cleanup

### Completed ✅
- Agent CRUD operations
- Position management
- Team management
- SME subsystem
- API configuration
- Preset import/export
- Mobile support

---

## System 2: Curation System

### Status: ~70% Complete

### Remaining Tasks

- [ ] **2.1 Agent Isolation (P1)**
  - Completely separate curation agents from pipeline agents
  - Own agent registry within CurationSystem
  - Clear integration interface with PipelineSystem

- [ ] **2.2 Quality Pass (P1)**
  - Review all CRUD operations
  - Test RAG pipeline execution
  - Validate store schema handling
  - Error handling improvements

- [ ] **2.3 Optimized Default Schemas (P1)**
  - Review each default store schema
  - Optimize for efficient retrieval
  - Add indexing recommendations

- [ ] **2.4 UI Polish (P2)**
  - Fix small issues throughout Curation UI
  - Improve data viewer UX
  - Better error messaging

### Completed ✅
- Store schema definitions
- CRUD operations
- RAG pipeline basics
- Data persistence
- Default stores
- Curation positions (Archivist, Topologists)

---

## System 3: Pipeline System

### Status: ~80% Complete

### Remaining Tasks

- [ ] **3.1 Threads Subsystem UI (P1)**
  - Add thread configuration to Phase editor
  - Add thread configuration to Action editor
  - User control over firstMessage (instructions)
  - Thread visibility controls

- [ ] **3.2 Outputs/Variables Refinement (P1)**
  - Complete output routing implementation
  - Variable scoping rules
  - Global variable management UI

- [ ] **3.3 Quality Pass (P1)**
  - Review execution flow
  - Test all action types
  - Validate trigger conditions
  - Error handling improvements

- [ ] **3.4 Pipeline Trigger Button (P2)**
  - Add button next to ST send button
  - Runs active pipeline with user input

### Completed ✅
- Phase/Action CRUD
- Execution engine
- Participant resolution
- SME dynamic matching
- Action types (Standard, CRUD, RAG, Deliberative, Gavel, System)
- Thread creation during runs
- Context management
- Preset integration

---

## System 4: Shared Components

### Remaining Tasks

- [ ] **4.1 Token Picker Refinement (P2)**
  - Better category organization
  - Recent tokens
  - Context-aware suggestions

- [ ] **4.2 Execution Monitor Polish (P2)**
  - Real-time updates
  - Better error display
  - Action-level detail view

- [ ] **4.3 Import/Export UI (P3)**
  - Full pipeline export
  - Agent config export
  - Preset creation wizard

### Completed ✅
- TokenPicker component
- ExecutionMonitor component
- ParticipantSelector component
- ContextConfig component
- PromptBuilder (basic)
- CurationPipelineBuilder

---

## Implementation Phases

### Completed Phase: Pipeline Integration ✅

**Completed**:
1. ✅ `core/character-system.js` - Fully functional (1400+ lines)
2. ✅ Integration hooks in `index.js`
3. ✅ `ui/character-modal.js` - Full UI (2200+ lines)
4. ✅ NavModal integration - Character button added
5. ✅ Character list view with filters
6. ✅ Character agent editor with voicing guidance
7. ✅ `dynamic_characters` participation type in PipelineSystem
8. ✅ CHARACTER_WORKSHOP action type with 3 modes
9. ✅ Character consultation via participation config
10. ✅ PipelineSystem receives characterSystem dependency

**Deliverables** (All Complete):
1. ✅ `participants.characters` config - modes: dynamic/explicit/spawned
2. ✅ `_resolveCharacterParticipants()` - character participant resolution
3. ✅ `_resolveDynamicCharacters()` - Director-based character selection
4. ✅ `_executeCharacterWorkshopAction()` - workshop orchestration
5. ✅ Workshop modes: refinement, consistency, collaboration

### Completed Phase: Curation Integration ✅

**Completed**:
1. ✅ Enhanced characterSheets schema with expanded type enum
2. ✅ Added new character fields: voicingGuidance, mannerisms, catchphrases
3. ✅ Created 3 CRUD pipelines for character management
4. ✅ Created 5 RAG pipelines for character data retrieval
5. ✅ Added CharacterSystem methods for RAG integration
6. ✅ Updated prompt generation to include new fields

### Current Phase: Testing & Polish

**Focus**: End-to-end testing and UI polish.

**Estimated Effort**: 1-2 sessions

**Tasks**:
1. Test character system end-to-end (Curation → CharacterSystem → Pipeline)
2. Test Character Workshop action with all 3 modes
3. Test dynamic character spawning via Director
4. UI polish for Character Modal
5. Documentation updates

---

## Testing Priorities

1. Character System
   - Character agent creation from Curation data
   - System prompt generation
   - Pipeline participation

2. Curation Integration
   - characterSheets read access
   - Type assignment
   - RAG queries

3. Pipeline Integration
   - dynamic_characters participation
   - Character workshop actions
   - Editorial ↔ Character collaboration

---

## Notes

### Curation Philosophy (Important Context)

The Curation system is designed to:
- Ingest EVERYTHING (potentially millions of tokens)
- Process through specialized agents in multiple passes
- Build organized, indexed persistent stores
- Handle only DIFFS after initial ingestion
- Enable smart, collaborative retrieval vs "shotgun" approach

### Character System Integration Points

1. **Curation → Character**: Read-only access to characterSheets
2. **Character → Pipeline**: Participation in actions
3. **Character ↔ Editorial**: Collaboration via workshop actions
4. **Character Director**: Coordinates character spawning and voicing

---

## Recently Completed

| Date | Task | Notes |
|------|------|-------|
| 2024 | ParticipantSelector fix | Use getAllPositions() directly |
| 2024 | Preset import fix | Proper dependency ordering |
| 2024 | Curation persistence | savePipelines()/loadPipelines() |
| 2024 | SME matching | Dynamic SME resolution |
| 2024 | TokenPicker | Full component |
| 2024 | ExecutionMonitor | Full component |
| 2024 | Mobile support | Comprehensive styles |
| 2024 | Quick/Standard presets | New preset templates |

---

## Change Log

### 2024-XX-XX - Character System Phase 4 Complete (Curation Integration)
- Updated `schemas/systems.js`:
  - Enhanced characterSheets type enum with all variants
  - Added `voicingGuidance` field for dialogue guidance
  - Added `mannerisms` array field for character behaviors
  - Added `catchphrases` array field for signature expressions
- Updated `core/curation-system.js`:
  - Synchronized characterSheets schema with systems.js
  - Added `_registerDefaultCharacterPipelines()` method
  - Created CRUD pipelines:
    - `character_type_classification`: Auto-categorize characters
    - `character_sheet_create`: Generate character details
    - `character_sheet_update`: Update with consistency checking
  - Created RAG pipelines:
    - `character_search`: Search characters by traits
    - `character_context`: Full character context for workshops
    - `character_relationships`: Map character dynamics
    - `character_voice`: Voice reference for consistency
    - `scene_characters`: Identify characters for scenes
- Updated `core/character-system.js`:
  - Enhanced `_buildCharacterAgent()` with new fields
  - Enhanced `generateSystemPrompt()` with mannerisms/catchphrases
  - Added `getCharacterContext()` for RAG integration
  - Added `getCharacterVoiceReference()` for voice consistency
  - Added `getSceneCharacters()` for dynamic spawning

### 2024-XX-XX - Character System Phase 3 Complete (Pipeline Integration)
- Updated `core/pipeline-system.js`:
  - Added `ActionType.CHARACTER_WORKSHOP` for dedicated character refinement actions
  - Added `_characterSystem` dependency and initialization
  - Extended `_normalizeAction()` with `participants.characters` configuration:
    - Modes: "dynamic" (Director picks), "explicit" (specific IDs), "spawned" (current)
    - Character type filtering
    - Director inclusion option
    - Voicing guidance support
    - RAG context configuration
  - Added `characterWorkshopConfig` normalization for CHARACTER_WORKSHOP actions:
    - Workshop modes: "refinement", "consistency", "collaboration"
    - Editorial position integration
    - RAG configuration for character data
    - Customizable prompts
  - Added `_resolveCharacterParticipants()` method:
    - Resolves character agents based on mode
    - Includes Character Director when requested
    - Applies voicing guidance to system prompts
    - Generates enhanced participant objects
  - Added `_resolveDynamicCharacters()` method:
    - Uses Character Director to analyze scene content
    - Identifies relevant characters via LLM
    - Falls back to spawned or main cast characters
  - Added `_executeCharacterWorkshopAction()` method:
    - Orchestrates character workshop sessions
    - Supports three workshop modes
  - Added workshop execution methods:
    - `_executeRefinementWorkshop()`: Refine character voices
    - `_executeConsistencyWorkshop()`: Check character consistency
    - `_executeCollaborationWorkshop()`: Editorial ↔ Character collaboration
- Updated `index.js`:
  - Pass `characterSystem` to PipelineSystem initialization

### 2024-XX-XX - Character System Phase 2 Complete (UI)
- Created `ui/character-modal.js` (2200+ lines)
- Implemented CharacterModal with:
  - Three tabs: Characters, Director, Settings
  - Character list view from Curation data
  - Type/status filters and search
  - Character agent configuration panel
  - Voicing guidance editor
  - Prompt prefix/suffix overrides
  - Auto-generate toggle
  - API configuration
  - System prompt preview dialog
  - Character Director configuration
  - Import/export functionality
  - Sync with Curation
  - Comprehensive styling
- Integrated into `index.js`:
  - Added CharacterModal to Systems object
  - Added to module loading
  - Added initialization with CharacterSystem + CurationSystem
- Updated NavModal:
  - Added Character System button (🎭)
  - Added modal reference and handler

### 2024-XX-XX - Character System Phase 1 Complete
- Created `core/character-system.js` (1400+ lines)
- Implemented CharacterSystem object with:
  - Character Types enum (Main/Recurring/Supporting/Background)
  - Agent Status enum (Active/Inactive/Spawned/Unassigned)
  - Character Director (static leader position)
  - Character Agent registry and management
  - Position system for character agents
  - User overrides storage (agent-level, not character data)
  - Curation integration (read-only from characterSheets)
  - Dynamic spawning for scenes (`spawnForScene()`)
  - System prompt auto-generation with trait injection
  - Pipeline integration helpers (`getParticipants()`, `resolvePositionAgent()`)
  - localStorage persistence
  - Event system
  - Export/import functionality
- Integrated into `index.js`:
  - Added to Systems object
  - Added to module loading
  - Added initialization with Curation dependency

### 2024-XX-XX - Character System Planning
- Added full Character System specification
- Defined architecture and data flow
- Created implementation task list
- Updated priority backlog