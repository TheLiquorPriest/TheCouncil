# TheCouncil - Comprehensive Action Plan

## Executive Summary

**Bottom Line**: We have a working UI skeleton but lack the functional depth to actually use the system. The architecture is sound, but every system needs substantial UI work to configure the features that the core modules support.

### Critical Blockers (Cannot Test Without These)

| Priority | Component | System | Status |
|----------|-----------|--------|--------|
| P0 | Curation Pipeline Builder | Curation | ✅ **DONE** - `curation-pipeline-builder.js` |
| P0 | Action Participant Config | Pipeline | ✅ **DONE** - `participant-selector.js` |
| P0 | Action Context/IO Config | Pipeline | ✅ **DONE** - `context-config.js` |
| P0 | Agent Prompt Builder | Agents | ✅ **DONE** - `prompt-builder.js` |

### What Works Now
- ✅ Navigation modal and system switching
- ✅ Basic CRUD for agents, positions, teams, stores
- ✅ Pipeline/phase/action creation (structure only)
- ✅ Core execution engine (untestable without config UI)
- ✅ **NEW**: Prompt Builder component with ST macros, presets, drag-drop tokens
- ✅ **NEW**: Participant Selector component with multiple modes, orchestration
- ✅ **NEW**: Context Config component with sources, targets, I/O configuration
- ✅ **NEW**: Curation Pipeline Builder with CRUD/RAG pipeline creation, testing
- ✅ **NEW**: Legacy code cleanup complete (modules/ directory removed)

### What's Broken/Missing
- ✅ ~~Cannot build curation pipelines~~ → CurationPipelineBuilder component created
- ✅ ~~Cannot configure who participates in actions~~ → ParticipantSelector component created
- ✅ ~~Cannot configure what context actions receive~~ → ContextConfig component created
- ✅ ~~Cannot configure where action outputs go~~ → ContextConfig component created
- ✅ ~~Cannot build proper agent prompts with ST macros~~ → PromptBuilder component created
- ✅ ~~Cannot use ST Chat Completion presets for agents~~ → PromptBuilder supports presets

### Recommended Next Steps
1. ✅ ~~**Immediate**: Fix remaining bugs in existing UI~~ → Legacy cleanup done
2. ✅ ~~A: Build Curation Pipeline Builder~~ → DONE (`curation-pipeline-builder.js`)
3. ✅ ~~B: Build Action Context/IO Configuration UI~~ → DONE
4. ✅ ~~C: Build Agent Prompt Builder with ST integration~~ → DONE
5. ✅ ~~D: Build Action Participant Configuration~~ → DONE
6. ✅ ~~E: Integrate components into modals~~ → DONE (agents-modal, pipeline-modal, curation-modal)
7. F: Polish execution monitoring and testing
8. G: End-to-end testing and integration verification

### Estimated Total Effort
- **New Components**: All P0 critical components completed (4/4)
- **Updates**: Polish and testing phase ready

### Completed Components
- ✅ `ui/components/prompt-builder.js` - Full prompt builder with 3 modes
- ✅ `ui/components/participant-selector.js` - Multi-mode participant selection
- ✅ `ui/components/context-config.js` - Context sources, output targets, I/O config
- ✅ `ui/components/curation-pipeline-builder.js` - CRUD/RAG pipeline builder with templates, testing

### Completed Integrations
- ✅ `ui/agents-modal.js` - PromptBuilder integrated into agent create/edit dialog
- ✅ `ui/pipeline-modal.js` - ParticipantSelector and ContextConfig integrated into action editor
- ✅ `ui/curation-modal.js` - CurationPipelineBuilder integrated into Pipelines tab


---

## Current State Assessment

**Status**: Architecture in place, but lacking functional depth

We have successfully built the three-system architecture skeleton:
- ✅ Data schemas defined
- ✅ Core system modules created
- ✅ UI modals created
- ✅ Navigation and integration working
- ❌ **Functional implementations incomplete**

This document outlines everything that needs to be built to make TheCouncil fully functional.

---

## Priority Levels

- **P0**: Critical - System unusable without this
- **P1**: High - Core functionality, needed for basic operation
- **P2**: Medium - Important features for good UX
- **P3**: Low - Nice to have, polish

---

## System 1: AGENTS SYSTEM

### 1.1 Agent Configuration (P0)

#### Current State:
- Basic agent CRUD exists
- Simple form fields for name, description
- Basic API config fields

#### Missing - Prompt Builder:

```
┌─────────────────────────────────────────────────────────────┐
│ System Prompt Configuration                                  │
├─────────────────────────────────────────────────────────────┤
│ Source: ( ) Custom Prompt                                   │
│         ( ) ST Chat Completion Preset                       │
│         ( ) Build from Tokens                               │
├─────────────────────────────────────────────────────────────┤
│ [If ST Preset selected]                                     │
│ Preset: [Dropdown of saved ST presets_________▼]            │
├─────────────────────────────────────────────────────────────┤
│ [If Custom selected]                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Textarea with full text editing]                       │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [If Build from Tokens selected]                             │
│ Available Tokens:          Current Prompt Stack:            │
│ ┌───────────────────┐      ┌───────────────────────────┐   │
│ │ {{char}}          │  →   │ 1. [System] ✕             │   │
│ │ {{user}}          │      │ 2. [Description] ✕        │   │
│ │ {{persona}}       │      │ 3. [Personality] ✕        │   │
│ │ {{scenario}}      │      │ 4. [Custom: "You are..."] │   │
│ │ {{personality}}   │      │                           │   │
│ │ {{description}}   │      │    [+ Add Custom Block]   │   │
│ │ {{system}}        │      └───────────────────────────┘   │
│ │ {{jailbreak}}     │                                      │
│ │ {{mesExamples}}   │      ↑↓ Drag to reorder              │
│ │ [Custom...]       │                                      │
│ └───────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

#### Required Implementation:

**File**: `ui/components/prompt-builder.js` (NEW)
```javascript
const PromptBuilder = {
  // Modes
  Mode: { CUSTOM: 'custom', PRESET: 'preset', TOKENS: 'tokens' },
  
  // ST Macros to support
  ST_MACROS: [
    '{{char}}', '{{user}}', '{{persona}}', '{{scenario}}',
    '{{personality}}', '{{description}}', '{{system}}',
    '{{jailbreak}}', '{{mesExamples}}', '{{char_version}}',
    '{{model}}', '{{lastMessage}}', '{{lastMessageId}}',
    // ... all ST macros
  ],
  
  // Methods needed:
  init(options),
  render(container, config),
  getValue(),
  setValue(config),
  
  // ST Integration:
  _loadSTPresets(),           // Fetch saved presets from ST
  _applySTPreset(presetName), // Load preset content
  
  // Drag & Drop:
  _initDragDrop(),
  _handleDragStart(e),
  _handleDragOver(e),
  _handleDrop(e),
  
  // Token Management:
  _addToken(token),
  _removeToken(index),
  _reorderTokens(fromIndex, toIndex),
  _renderTokenStack(),
  
  // Preview:
  _generatePreview(),
  _resolveTokensForPreview(),
};
```

**File**: `ui/agents-modal.js` - Updates needed:
- Replace simple textarea with PromptBuilder component
- Add preset dropdown population from ST
- Add token drag-drop functionality
- Add live preview panel

#### Tasks:
- [x] Create `ui/components/prompt-builder.js` ✅ DONE
- [x] Implement ST preset fetching from SillyTavern API ✅ DONE
- [x] Implement drag-and-drop token ordering ✅ DONE
- [x] Implement custom text block insertion ✅ DONE
- [x] Add prefix/suffix per token support ✅ DONE
- [x] Add live preview with token resolution ✅ DONE
- [x] Update agents-modal.js to use PromptBuilder ✅ DONE
- [ ] Add import/export for prompt configurations

---

### 1.2 API Configuration (P1)

#### Current State:
- Basic fields exist
- No validation
- No connection testing

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ API Configuration                                            │
├─────────────────────────────────────────────────────────────┤
│ Connection Type:                                            │
│ (•) Use SillyTavern's Current Connection                    │
│ ( ) Custom API Endpoint                                     │
├─────────────────────────────────────────────────────────────┤
│ [If Custom API]                                             │
│ API Type: [OpenAI Compatible ▼] [Claude ▼] [Custom ▼]       │
│ Endpoint: [_________________________________]               │
│ API Key:  [_________________________________] [Test]        │
│ Model:    [________________________________▼]               │
│           [Fetch Models] (auto-populate from API)           │
├─────────────────────────────────────────────────────────────┤
│ Generation Parameters:                                      │
│ Temperature:  [====●=====] 0.7                              │
│ Max Tokens:   [1000_____]                                   │
│ Top P:        [====●=====] 1.0                              │
│ Freq Penalty: [●=========] 0.0                              │
│ Pres Penalty: [●=========] 0.0                              │
│                                                             │
│ [Advanced ▼]                                                │
│   Stop Sequences: [________________]                        │
│   Logit Bias: [________________]                            │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Add API type selector (OpenAI, Claude, Custom)
- [ ] Add "Fetch Models" button to auto-populate model list
- [ ] Add "Test Connection" button with status indicator
- [ ] Add slider controls for temperature, top_p, etc.
- [ ] Add advanced options collapsible section
- [ ] Validate API configuration before save
- [ ] Show estimated cost per 1K tokens (if known)

---

### 1.3 Position Configuration (P1)

#### Current State:
- Basic position CRUD
- Simple agent assignment

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Position: Lead Writer                                        │
├─────────────────────────────────────────────────────────────┤
│ Basic Info:                                                 │
│ Name: [Lead Writer______________]                           │
│ Team: [Prose Team ▼]                                        │
│ Tier: (•) Leader ( ) Member ( ) Executive                   │
│ Mandatory: [✓]  SME: [ ]                                    │
├─────────────────────────────────────────────────────────────┤
│ Assignment:                                                 │
│ ( ) Assign Specific Agent: [Agent Dropdown ▼]               │
│ ( ) Assign Agent Pool:     [Pool Dropdown ▼]                │
│ ( ) Leave Unassigned                                        │
├─────────────────────────────────────────────────────────────┤
│ Prompt Modifiers:                                           │
│ Prefix (added before agent's system prompt):                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ You are the lead writer for this team...                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Suffix (added after agent's system prompt):                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Focus on prose quality and narrative flow.              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Role Description (injected as {{position.role}}):           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Responsible for drafting and refining story prose...    │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ SME Configuration (if SME checked):                         │
│ Keywords: [prose] [writing] [narrative] [+Add]              │
│ Priority: [High ▼]                                          │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Add full prompt modifier editor (prefix, suffix, role)
- [ ] Add SME keyword management with tag input
- [ ] Add SME priority configuration
- [ ] Show preview of final prompt with modifiers applied
- [ ] Add position cloning functionality

---

### 1.4 Team Configuration (P1)

#### Current State:
- Basic team CRUD
- Member list display

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Team: Prose Team                                             │
├─────────────────────────────────────────────────────────────┤
│ Basic Info:                                                 │
│ Name: [Prose Team_______________]                           │
│ Description: [Handles all prose writing tasks___]           │
│ Icon: [✍️ ▼]                                                │
├─────────────────────────────────────────────────────────────┤
│ Team Structure:                                             │
│                                                             │
│ Leader: [Lead Writer ▼] - Currently: GPT-4 Agent            │
│                                                             │
│ Members:                                                    │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ □ Prose Writer      - Claude Agent      [↑] [↓] [✕]   │   │
│ │ □ Style Editor      - GPT-4 Agent       [↑] [↓] [✕]   │   │
│ │ □ Dialogue Writer   - [Unassigned]      [↑] [↓] [✕]   │   │
│ └───────────────────────────────────────────────────────┘   │
│ [+ Add Position to Team]                                    │
├─────────────────────────────────────────────────────────────┤
│ Team Settings:                                              │
│                                                             │
│ Output Object Name:  [proseTeamOutput____]                  │
│ Context Object Name: [proseTeamContext___]                  │
│                                                             │
│ Default Thread First Message:                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ The Prose Team is now working on this task...           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Add drag-and-drop member reordering
- [ ] Add position quick-create from team view
- [ ] Add team settings configuration
- [ ] Add team output/context naming
- [ ] Add default thread message configuration
- [ ] Show team fill status (X/Y positions filled)

---

### 1.5 Hierarchy Visualization (P2)

#### Current State:
- Basic list view

#### Missing:
- Visual org chart
- Drag-and-drop reorganization
- Export as image

#### Tasks:
- [ ] Create interactive org chart component
- [ ] Add drag-drop to move positions between teams
- [ ] Add zoom/pan controls
- [ ] Add export to PNG/SVG
- [ ] Add mini-map for large hierarchies

---

## System 2: CURATION SYSTEM

### 2.1 Curation Pipeline Builder (P0)

#### Current State:
- **DOES NOT EXIST** - Critical missing feature
- Store schemas defined but no way to build pipelines

#### Required:

```
┌─────────────────────────────────────────────────────────────┐
│ CRUD Pipeline Builder                                        │
├─────────────────────────────────────────────────────────────┤
│ Pipeline: Create Character Sheet                             │
│ Store: [characterSheets ▼]  Operation: [CREATE ▼]           │
├─────────────────────────────────────────────────────────────┤
│ Pipeline Steps:                                              │
│                                                              │
│ ┌─ Step 1: Extract Information ─────────────────────────┐   │
│ │ Agent: [Data Extractor ▼]                             │   │
│ │ Input: Pipeline Input (user request)                  │   │
│ │ Prompt:                                               │   │
│ │ ┌───────────────────────────────────────────────────┐ │   │
│ │ │ Extract character information from: {{input}}     │ │   │
│ │ │ Return JSON with fields: name, description...     │ │   │
│ │ └───────────────────────────────────────────────────┘ │   │
│ │ Output → Step 2 Input                                 │   │
│ └───────────────────────────────────────────────────────┘   │
│                              ↓                               │
│ ┌─ Step 2: Validate & Format ───────────────────────────┐   │
│ │ Agent: [Data Validator ▼]                             │   │
│ │ Input: Step 1 Output                                  │   │
│ │ Prompt:                                               │   │
│ │ ┌───────────────────────────────────────────────────┐ │   │
│ │ │ Validate this character data: {{input}}           │ │   │
│ │ │ Ensure all required fields are present...         │ │   │
│ │ └───────────────────────────────────────────────────┘ │   │
│ │ Output → Store (characterSheets)                      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ [+ Add Step]                                                 │
├─────────────────────────────────────────────────────────────┤
│ Input Schema:              Output Schema:                    │
│ ┌─────────────────────┐   ┌─────────────────────────────┐   │
│ │ userRequest: string │   │ (matches characterSheets    │   │
│ │ context?: string    │   │  store schema)              │   │
│ └─────────────────────┘   └─────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ [Save Pipeline]  [Test Pipeline]  [Delete]                   │
└─────────────────────────────────────────────────────────────┘
```

**File**: `ui/components/curation-pipeline-builder.js` ✅ **COMPLETED**

#### Tasks:
- [x] Create pipeline builder component
- [x] Add step creation/editing
- [x] Add step ordering (drag-drop)
- [x] Add input/output mapping between steps
- [x] Add prompt template editor per step
- [x] Add agent/position selector per step
- [x] Add validation rule configuration
- [x] Add pipeline testing UI
- [ ] Add import/export for pipelines (scaffolded, needs polish)

---

### 2.2 RAG Pipeline Builder (P0)

#### Current State:
- Schema defined but no builder UI

#### Required:

```
┌─────────────────────────────────────────────────────────────┐
│ RAG Pipeline Builder                                         │
├─────────────────────────────────────────────────────────────┤
│ Pipeline: Character Lookup                                   │
├─────────────────────────────────────────────────────────────┤
│ Target Stores:                                               │
│ [✓] characterSheets                                         │
│ [✓] characterDevelopment                                    │
│ [ ] characterInventory                                      │
│ [ ] characterPositions                                      │
├─────────────────────────────────────────────────────────────┤
│ Search Configuration:                                        │
│                                                              │
│ Method: ( ) Keyword Search                                  │
│         (•) Semantic Search (if available)                  │
│         ( ) Hybrid                                          │
│                                                              │
│ Fields to Search:                                           │
│ [✓] name        [✓] description    [ ] id                   │
│ [✓] personality [✓] background     [ ] createdAt            │
│                                                              │
│ Max Results: [5____]                                        │
│ Min Score:   [0.5__]                                        │
├─────────────────────────────────────────────────────────────┤
│ Query Processing:                                            │
│                                                              │
│ Pre-process Query:                                          │
│ [✓] Extract entity names                                    │
│ [✓] Expand synonyms                                         │
│ [ ] Use agent to reformulate                                │
│                                                              │
│ Query Template:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Find characters matching: {{query}}                     │ │
│ │ Context: {{context}}                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Result Processing:                                           │
│                                                              │
│ Result Format: (•) Summary  ( ) Full Entry  ( ) Custom      │
│                                                              │
│ Post-process with Agent: [ ]                                │
│ Summarization Agent: [_____________▼]                       │
├─────────────────────────────────────────────────────────────┤
│ Triggers:                                                    │
│ [✓] Can be triggered from Response Pipeline                 │
│ [✓] Can be triggered manually                               │
│ [ ] Auto-trigger on new entries                             │
└─────────────────────────────────────────────────────────────┘
```

**File**: `ui/components/curation-pipeline-builder.js` ✅ **COMPLETED** (RAG included in same component)

#### Tasks:
- [x] Create RAG pipeline builder component (integrated into CurationPipelineBuilder)
- [x] Add store selection with field picker
- [x] Add search method configuration
- [x] Add query template editor
- [x] Add result processing options
- [x] Add trigger configuration
- [x] Add testing interface with sample queries
- [ ] Integrate with ST's vector database if available (future enhancement)

---

### 2.3 Store Schema Editor (P1)

#### Current State:
- Default schemas defined
- Basic store browser exists

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Store Schema Editor: characterSheets                         │
├─────────────────────────────────────────────────────────────┤
│ Basic Info:                                                 │
│ Name: [characterSheets_______]                              │
│ Display Name: [Character Sheets]                            │
│ Description: [Store for character information___]           │
│ Icon: [👤 ▼]                                                │
│ Type: (•) Collection (many entries)  ( ) Singleton (one)    │
├─────────────────────────────────────────────────────────────┤
│ Fields:                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name          Type      Required  Default    [Actions]  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ id            string    ✓         (auto)     [↑][↓][✕]  │ │
│ │ name          string    ✓         ""         [↑][↓][✕]  │ │
│ │ type          enum      ✓         "npc"      [↑][↓][✕]  │ │
│ │ description   text      ○         ""         [↑][↓][✕]  │ │
│ │ personality   text      ○         ""         [↑][↓][✕]  │ │
│ │ relationships object    ○         {}         [↑][↓][✕]  │ │
│ │ createdAt     datetime  ✓         (auto)     [↑][↓][✕]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [+ Add Field]                                               │
├─────────────────────────────────────────────────────────────┤
│ Field Editor (editing: type)                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Field Name: [type___________]                           │ │
│ │ Type: [enum ▼]                                          │ │
│ │ Enum Values: [main] [npc] [mentioned] [+Add]            │ │
│ │ Required: [✓]                                           │ │
│ │ Default: [npc ▼]                                        │ │
│ │ Description: [Character type classification___]         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Indexes: [name] [type] [+Add Index]                         │
│ Primary Key: [id ▼]                                         │
├─────────────────────────────────────────────────────────────┤
│ CRUD Prompt Instructions:                                    │
│ Create: [When creating entries, ensure...____________]      │
│ Read:   [When reading entries, format as...___________]     │
│ Update: [When updating, preserve existing...___________]    │
│ Delete: [Before deleting, verify..._________________]       │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create schema editor component
- [ ] Add field type selection with validation
- [ ] Add enum value management
- [ ] Add nested object schema support
- [ ] Add array item schema support
- [ ] Add index configuration
- [ ] Add CRUD prompt instruction editors
- [ ] Add schema validation preview
- [ ] Add schema import/export (JSON Schema compatible)

---

### 2.4 Data Entry Editor (P1)

#### Current State:
- Basic data viewer
- Can see entries

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Entry Editor: characterSheets / char_001                     │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ name*         [Alice_____________________________]      │ │
│ │ type*         [main ▼]                                  │ │
│ │ description   ┌──────────────────────────────────────┐  │ │
│ │               │ A young adventurer with a mysterious │  │ │
│ │               │ past and a talent for magic...       │  │ │
│ │               └──────────────────────────────────────┘  │ │
│ │ personality   ┌──────────────────────────────────────┐  │ │
│ │               │ Curious, determined, sometimes       │  │ │
│ │               │ reckless but ultimately kind...      │  │ │
│ │               └──────────────────────────────────────┘  │ │
│ │ relationships ┌──────────────────────────────────────┐  │ │
│ │               │ { "bob": "friend",                   │  │ │
│ │               │   "mentor": "student" }              │  │ │
│ │               └──────────────────────────────────────┘  │ │
│ │               [Edit as Form] [Edit as JSON]             │ │
│ │ createdAt     2024-01-15 10:30:00 (readonly)            │ │
│ │ updatedAt     2024-01-16 14:22:00 (readonly)            │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Validation: ✓ All required fields filled                    │
│             ✓ Type constraints satisfied                    │
├─────────────────────────────────────────────────────────────┤
│ [Save]  [Save & New]  [Cancel]  [Delete Entry]              │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create dynamic form generator from schema
- [ ] Add proper input types per field type
- [ ] Add JSON editor mode toggle
- [ ] Add relationship field editor (object builder)
- [ ] Add array field editor (item list)
- [ ] Add validation feedback
- [ ] Add entry history/versioning
- [ ] Add entry linking (relationships to other stores)

---

## System 3: RESPONSE PIPELINE SYSTEM

### 3.1 Action Participant Configuration (P0)

#### Current State:
- Basic action CRUD
- No participant configuration

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Action Participants                                          │
├─────────────────────────────────────────────────────────────┤
│ Participant Mode:                                           │
│ ( ) Single Position                                         │
│ (•) Multiple Positions                                      │
│ ( ) Entire Team(s)                                          │
│ ( ) Dynamic (SME Selection)                                 │
├─────────────────────────────────────────────────────────────┤
│ [If Single Position]                                        │
│ Position: [Lead Writer ▼]                                   │
├─────────────────────────────────────────────────────────────┤
│ [If Multiple Positions]                                     │
│ Selected Positions:                                         │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ [✓] Lead Writer (Prose Team)                          │   │
│ │ [✓] Style Editor (Prose Team)                         │   │
│ │ [ ] Dialogue Writer (Prose Team)                      │   │
│ │ [✓] Continuity Checker (QA Team)                      │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ [If Team(s)]                                                │
│ Selected Teams:                                             │
│ [✓] Prose Team (all positions)                              │
│ [ ] QA Team                                                 │
│ [ ] Planning Team                                           │
│                                                             │
│ Include Leaders: [✓]                                        │
│ Include Members: [✓]                                        │
├─────────────────────────────────────────────────────────────┤
│ [If Dynamic/SME]                                            │
│ SME Keywords from: (•) Action Input  ( ) Phase Context      │
│ Max SMEs: [3___]                                            │
│ Fallback Position: [Lead Writer ▼]                          │
├─────────────────────────────────────────────────────────────┤
│ Orchestration:                                              │
│ (•) Sequential - One after another                          │
│ ( ) Parallel - All at once                                  │
│ ( ) Round Robin - Take turns until consensus                │
│ ( ) Consensus - Iterate until agreement                     │
│                                                             │
│ [If Round Robin or Consensus]                               │
│ Max Rounds: [3___]                                          │
│ Consensus Threshold: [80__]%                                │
└─────────────────────────────────────────────────────────────┘
```

**File**: `ui/components/participant-selector.js` (NEW)

#### Tasks:
- [x] Create participant selector component ✅ DONE
- [x] Add position multi-select ✅ DONE
- [x] Add team selection with member options ✅ DONE
- [x] Add SME dynamic selection configuration ✅ DONE
- [x] Add orchestration mode selector ✅ DONE
- [x] Add round/consensus configuration ✅ DONE
- [x] Show participant preview (who will actually participate) ✅ DONE
- [x] Integrate into pipeline-modal.js action editor ✅ DONE

---

### 3.2 Per-Participant Configuration (P0)

#### Current State:
- No per-participant settings

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Per-Participant Settings                                     │
├─────────────────────────────────────────────────────────────┤
│ Configure individual settings for each participant:         │
│                                                             │
│ ┌─ Lead Writer ─────────────────────────────────────────┐   │
│ │ Prompt Modifiers:                                     │   │
│ │   Prefix: [Focus on narrative flow..._________]       │   │
│ │   Suffix: [End with a cliffhanger if appropriate]     │   │
│ │                                                       │   │
│ │ Context Injection (added to their context):           │   │
│ │   [✓] Include previous draft                          │   │
│ │   [✓] Include outline                                 │   │
│ │   [ ] Include other participants' responses           │   │
│ │   Custom: [_______________________________]           │   │
│ │                                                       │   │
│ │ Input Override:                                       │   │
│ │   ( ) Use action input                                │   │
│ │   (•) Custom input: [{{phase.outline}}____]           │   │
│ │                                                       │   │
│ │ Output Target:                                        │   │
│ │   (•) Contribute to action output                     │   │
│ │   ( ) Write to specific variable: [___________]       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Style Editor ────────────────────────────────────────┐   │
│ │ [Similar configuration...]                            │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Configure Another Participant]                           │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create per-participant settings component
- [ ] Add prompt modifier overrides per participant
- [ ] Add context injection configuration
- [ ] Add input/output overrides per participant
- [ ] Add participant ordering configuration

---

### 3.3 Thread Configuration (P0)

#### Current State:
- Thread manager exists but no UI configuration

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Action Thread Configuration                                  │
├─────────────────────────────────────────────────────────────┤
│ Action Thread (shared by all participants):                 │
│ [✓] Enabled                                                 │
│                                                             │
│ First Message Template:                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ We are now working on: {{action.name}}                  │ │
│ │ Input: {{action.input}}                                 │ │
│ │ Previous context: {{phase.context}}                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Max Messages: [50___]                                       │
│ Include in Context: [✓] Last [10__] messages               │
├─────────────────────────────────────────────────────────────┤
│ Team Task Threads (per-team sub-threads):                   │
│                                                             │
│ ┌─ Prose Team Thread ───────────────────────────────────┐   │
│ │ [✓] Enabled                                           │   │
│ │ First Message: [Team is drafting prose..._____]       │   │
│ │ Max Messages: [20___]                                 │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ QA Team Thread ──────────────────────────────────────┐   │
│ │ [ ] Enabled                                           │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create thread configuration component
- [ ] Add first message template editor with token support
- [ ] Add max messages configuration
- [ ] Add team task thread configuration
- [ ] Add thread visibility options (who can see what)
- [ ] Add thread history viewer in execution mode

---

### 3.4 Context Configuration (P0)

#### Current State:
- Context manager exists but no UI

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Action Context Configuration                                 │
├─────────────────────────────────────────────────────────────┤
│ Context Sources (what to include):                          │
│                                                             │
│ Static Context:                                             │
│ [✓] Character Card    [✓] Persona                          │
│ [ ] World Info        [ ] Scenario                          │
│                                                             │
│ Global Variables:                                           │
│ [✓] instructions      [✓] outlineDraft                     │
│ [✓] finalOutline      [ ] firstDraft                       │
│ [ ] secondDraft       [ ] finalDraft                       │
│ [✓] commentary                                              │
│                                                             │
│ Phase Context:                                              │
│ [✓] Current phase output                                    │
│ [✓] Previous phase outputs: [All ▼] / [Select specific]    │
│                                                             │
│ Store Data:                                                 │
│ [✓] characterSheets   [ ] plotLines                        │
│ [✓] currentSituation  [ ] dialogueHistory                  │
│                                                             │
│ Custom Context Blocks:                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Key: [additionalNotes]                                  │ │
│ │ Value: [Remember to maintain the tone..._________]      │ │
│ │                                              [Remove]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [+ Add Custom Context Block]                                │
├─────────────────────────────────────────────────────────────┤
│ Context Priority (drag to reorder):                         │
│ 1. [Static Context          ] ↕                            │
│ 2. [Global Variables        ] ↕                            │
│ 3. [Store Data              ] ↕                            │
│ 4. [Phase Context           ] ↕                            │
│ 5. [Custom Blocks           ] ↕                            │
├─────────────────────────────────────────────────────────────┤
│ Context Exclusions (never include):                         │
│ [firstDraft] [secondDraft] [+Add]                          │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create context configuration component
- [ ] Add source selection checkboxes
- [ ] Add store data picker with field selection
- [ ] Add custom context block editor
- [ ] Add context priority ordering (drag-drop)
- [ ] Add context exclusion list
- [ ] Add context preview (show assembled context)
- [ ] Add token count estimation

---

### 3.5 Input/Output Configuration (P0)

#### Current State:
- Basic input/output in schema but no UI

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Action Input Configuration                                   │
├─────────────────────────────────────────────────────────────┤
│ Input Source:                                               │
│ (•) Phase Input (user's original request)                   │
│ ( ) Previous Action Output: [action_outline ▼]              │
│ ( ) Global Variable: [outlineDraft ▼]                       │
│ ( ) Store Query: [characterSheets ▼] [Query..._____]        │
│ ( ) Custom Template                                         │
├─────────────────────────────────────────────────────────────┤
│ [If Custom Template]                                        │
│ Input Template:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Based on the outline: {{global.finalOutline}}           │ │
│ │ And the character info: {{store.characterSheets}}       │ │
│ │ Write the next scene.                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Input Transform (optional):                                 │
│ ( ) None                                                    │
│ ( ) Extract JSON field: [content______]                     │
│ ( ) Regex extract: [/```([\s\S]*?)```/]                    │
│ ( ) Custom function                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Action Output Configuration                                  │
├─────────────────────────────────────────────────────────────┤
│ Output Target:                                              │
│ (•) Phase Output (contributes to phase consolidation)       │
│ ( ) Team Output: [proseTeam ▼]                              │
│ ( ) Global Variable: [firstDraft ▼]                         │
│ ( ) Store: [storyDraft ▼]                                   │
│ ( ) Next Action Input                                       │
│ ( ) Thread (add as message)                                 │
├─────────────────────────────────────────────────────────────┤
│ Output Key (for object outputs): [draft_________]           │
│ Append Mode: [ ] (check to append instead of replace)       │
├─────────────────────────────────────────────────────────────┤
│ Output Transform (optional):                                │
│ ( ) None                                                    │
│ ( ) Wrap in object: { "{{key}}": output }                   │
│ ( ) Extract code block                                      │
│ ( ) Parse as JSON                                           │
│ ( ) Custom function                                         │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create input configuration component
- [ ] Create output configuration component
- [ ] Add source/target type selectors
- [ ] Add template editor with token picker
- [ ] Add transform options
- [ ] Add validation (ensure targets exist)
- [ ] Add data flow visualization

---

### 3.6 RAG Integration in Actions (P1)

#### Current State:
- RAG schema defined but no UI

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ RAG Configuration                                            │
├─────────────────────────────────────────────────────────────┤
│ Enable RAG for this action: [✓]                             │
├─────────────────────────────────────────────────────────────┤
│ RAG Pipeline: [Character Lookup ▼]                          │
│                                                             │
│ Query Template:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Find characters mentioned in: {{action.input}}          │ │
│ │ Scene context: {{phase.currentScene}}                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Result Destination:                                         │
│ (•) Add to action context                                   │
│ ( ) Add to action thread (as RAG message)                   │
│ ( ) Store in variable: [ragResults_____]                    │
│                                                             │
│ Result Format:                                              │
│ (•) Include full entries                                    │
│ ( ) Summary only                                            │
│ ( ) Custom template: [________________]                     │
├─────────────────────────────────────────────────────────────┤
│ Fallback (if no results):                                   │
│ ( ) Continue without RAG data                               │
│ (•) Use default: [No relevant data found_______]            │
│ ( ) Skip action                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create RAG configuration component for actions
- [ ] Add RAG pipeline selector
- [ ] Add query template editor
- [ ] Add result destination options
- [ ] Add result format configuration
- [ ] Add fallback handling

---

### 3.7 Execution & Monitoring (P1)

#### Current State:
- Basic execution display
- Limited progress information

#### Missing:

```
┌─────────────────────────────────────────────────────────────┐
│ Pipeline Execution Monitor                                   │
├─────────────────────────────────────────────────────────────┤
│ [▶ Running] Pipeline: Default Story Pipeline                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━ 45%                  │
├─────────────────────────────────────────────────────────────┤
│ Phase 2 of 5: Drafting                    [Pause] [Abort]   │
│ ├─ Action 1: Create Outline       ✓ Complete (2.3s)        │
│ ├─ Action 2: Draft Scene          ● Running...              │
│ │   └─ Lead Writer                ● Generating...           │
│ │   └─ Style Editor               ○ Waiting                 │
│ └─ Action 3: Review Draft         ○ Pending                 │
├─────────────────────────────────────────────────────────────┤
│ Current Action: Draft Scene                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Participant: Lead Writer (GPT-4)                        │ │
│ │ Status: Generating response...                          │ │
│ │ Tokens: ~1,234 in / ~567 out (estimated)                │ │
│ │ Time: 5.2s elapsed                                      │ │
│ │                                                         │ │
│ │ [Show Prompt] [Show Context] [Show Thread]              │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Live Output Stream:                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ The morning sun cast long shadows across the           │ │
│ │ courtyard as Alice approached the ancient tower...     │ │
│ │ █                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Logs:                                                       │
│ [10:23:45] Phase 2 started                                  │
│ [10:23:46] Action 1 started - Create Outline                │
│ [10:23:48] Lead Writer generating...                        │
│ [10:23:51] Action 1 complete (2.3s, 890 tokens)            │
│ [10:23:51] Action 2 started - Draft Scene                   │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create detailed execution monitor component
- [ ] Add per-participant status display
- [ ] Add live output streaming
- [ ] Add "Show Prompt/Context/Thread" modals
- [ ] Add token usage tracking
- [ ] Add timing information
- [ ] Add detailed log viewer
- [ ] Add execution history browser
- [ ] Add ability to inspect/edit mid-execution (when paused)

---

## System 4: SHARED COMPONENTS

### 4.1 Token Picker Component (P1)

```
┌─────────────────────────────────────────────────────────────┐
│ Insert Token                                      [Search]  │
├─────────────────────────────────────────────────────────────┤
│ ST Macros        Pipeline         Phase          Action     │
├─────────────────────────────────────────────────────────────┤
│ {{char}}         {{pipeline.id}}  {{phase.id}}   {{action}} │
│ {{user}}         {{pipeline.in}}  {{phase.name}} {{input}}  │
│ {{persona}}      {{global.*}}     {{phase.out}}  {{output}} │
│ {{scenario}}                      {{team.*}}                │
│ {{personality}}                                             │
│ ...                                                         │
├─────────────────────────────────────────────────────────────┤
│ Stores                    Agents                            │
│ {{store.characters}}      {{agent.name}}                    │
│ {{store.plotLines}}       {{position.role}}                 │
│ {{store.scenes}}                                            │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:
- [ ] Create token picker modal/dropdown component
- [ ] Categorize all available tokens
- [ ] Add search/filter functionality
- [ ] Add click-to-insert functionality
- [ ] Show token descriptions on hover
- [ ] Integrate into all text editors

---

### 4.2 JSON/Form Editor Toggle (P2)

#### Tasks:
- [ ] Create dual-mode editor component
- [ ] Add JSON validation with error highlighting
- [ ] Add form generation from JSON schema
- [ ] Sync between modes
- [ ] Add format/prettify button

---

### 4.3 Import/Export System (P2)

#### Tasks:
- [ ] Create unified import/export for all systems
- [ ] Support JSON format
- [ ] Add selective export (choose what to include)
- [ ] Add merge vs replace options on import
- [ ] Add backup/restore functionality
- [ ] Add preset library (shareable configurations)

---

## Implementation Phases

### Phase A: Critical Fixes 
1. Fix all existing bugs
2. Add window exports consistency
3. Basic error handling improvements

### Phase B: Curation Pipeline Builder 
1. CRUD Pipeline Builder UI
2. RAG Pipeline Builder UI  
3. Store schema editor
4. Data entry editor improvements

### Phase C: Pipeline Action Editor 
1. Participant selector
2. Per-participant configuration
3. Thread configuration
4. Context configuration
5. Input/Output configuration

### Phase D: Agent Prompt Builder 
1. Prompt builder component
2. ST preset integration
3. Token drag-drop
4. API configuration improvements

### Phase E: Execution & Polish 
1. Execution monitor improvements
2. Token picker component
3. Import/Export system
4. Testing & bug fixes

---

## File Structure (New Components Needed)

### Completed Components
```
ui/components/
├── prompt-builder.js        ✅ DONE - ST macros, presets, drag-drop tokens
└── participant-selector.js  ✅ DONE - Multi-mode selection, orchestration
```

### Remaining Components

```
TheCouncil/
├── ui/
│   ├── components/                    (NEW DIRECTORY)
│   │   ├── prompt-builder.js          P0 - Agent prompts
│   │   ├── token-picker.js            P1 - Token insertion
│   │   ├── participant-selector.js    P0 - Action participants
│   │   ├── context-configurator.js    P0 - Context setup
│   │   ├── io-configurator.js         P0 - Input/Output
│   │   ├── thread-configurator.js     P0 - Thread setup
│   │   ├── curation-pipeline-builder.js  P0 - CRUD pipelines
│   │   ├── rag-pipeline-builder.js    P0 - RAG pipelines
│   │   ├── schema-editor.js           P1 - Store schemas
│   │   ├── entry-editor.js            P1 - Data entries
│   │   ├── execution-monitor.js       P1 - Live monitoring
│   │   ├── json-form-editor.js        P2 - Dual mode editor
│   │   └── drag-drop-list.js          P2 - Reusable drag-drop
│   ├── agents-modal.js                (UPDATE)
│   ├── curation-modal.js              (UPDATE)
│   └── pipeline-modal.js              (UPDATE)
```

---

## Summary

**Total New Components Needed**: 13
**Total Existing Files to Update**: 3 major modals
**Estimated Effort**: 5-6 weeks for full implementation

**Immediate Priority** (can't function without):
1. Curation Pipeline Builder
2. Action Participant Configuration  
3. Action Context/IO Configuration
4. Agent Prompt Builder with ST integration

---

*This document should be updated as work progresses.*
