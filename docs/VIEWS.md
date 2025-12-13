# The Council - Exhaustive UI Views Map

This document provides a complete map of all views, states, buttons, and interactions in The Council extension.

**Version:** 2.1.0-alpha
**Last Updated:** 2025-12-13
**Purpose:** UI testing checklist and navigation reference

---

## Table of Contents

1. [Navigation Modal](#1-navigation-modal)
2. [Curation Modal](#2-curation-modal)
3. [Character Modal](#3-character-modal)
4. [Pipeline Modal](#4-pipeline-modal)
5. [Injection Modal](#5-injection-modal)
6. [Gavel Modal](#6-gavel-modal)
7. [Shared Components](#7-shared-components)

---

## 1. Navigation Modal

**File:** `ui/nav-modal.js`
**Trigger:** Extension loads in SillyTavern

### 1.1 Expanded State

| Element | Type | Action |
|---------|------|--------|
| Header "🏛️ Council" | Static | - |
| Collapse Button (▼) | Button | Collapses to minimal state |
| **📚 Curation** | Button | Opens Curation Modal |
| **👥 Characters** | Button | Opens Character Modal |
| **🔧 Pipeline** | Button | Opens Pipeline Modal |
| **💉 Injection** | Button | Opens Injection Modal |
| **▶️ Run** | Button | Starts pipeline execution |
| **⏹️ Stop** | Button | Stops pipeline execution |
| Status Bar | Static | Shows system status |

### 1.2 Collapsed State

| Element | Type | Action |
|---------|------|--------|
| Header "🏛️ Council" | Static | - |
| Expand Button (▶) | Button | Expands to full state |

### 1.3 States

- [ ] **Default**: Expanded, all buttons enabled
- [ ] **Running**: Run button disabled, Stop button active
- [ ] **Collapsed**: Only header and expand button visible
- [ ] **Error**: Status bar shows error message

---

## 2. Curation Modal

**File:** `ui/curation-modal.js`
**Trigger:** Click "📚 Curation" in Navigation Modal

### 2.1 Modal Structure

| Element | Type | Action |
|---------|------|--------|
| Close Button (×) | Button | Closes modal |
| Tab Bar | Navigation | Switches between tabs |

### 2.2 Tab: Overview

**Default tab when modal opens**

| Element | Type | Action |
|---------|------|--------|
| Stats Section | Static | Shows store statistics |
| **Singleton Stores** header | Static | - |
| World Info | Static | Store info display |
| Author Notes | Static | Store info display |
| Character Card | Static | Store info display |
| Chat Context | Static | Store info display |
| **Collection Stores** header | Static | - |
| Characters | Static | Store info display |
| Messages | Static | Store info display |
| Lorebooks | Static | Store info display |
| Custom Data | Static | Store info display |
| Personas | Static | Store info display |
| Presets | Static | Store info display |
| Tags | Static | Store info display |
| World Info Entries | Static | Store info display |
| Groups | Static | Store info display |
| Chats | Static | Store info display |

### 2.3 Tab: Stores

| Element | Type | Action |
|---------|------|--------|
| Stores Table | Table | Lists all stores |
| Store Name | Static | Store identifier |
| Type Badge | Static | Singleton/Collection |
| Entry Count | Static | Number of entries |
| **View** button (per row) | Button | Shows store entries |
| **+Add** button (per row) | Button | Opens Create Entry form |

#### 2.3.1 Create Entry Form (Inline)

| Element | Type | Action |
|---------|------|--------|
| Entry Name | Text Input | Entry identifier |
| Entry Content | Textarea | Entry data |
| **Create** | Button | Creates entry |
| **Cancel** | Button | Closes form |

#### 2.3.2 View Store Entries (Inline)

| Element | Type | Action |
|---------|------|--------|
| Entries List | Table | Shows all entries |
| Entry Name | Static | Entry identifier |
| **Edit** button | Button | Opens edit form |
| **Delete** button | Button | Deletes entry |
| **Close** | Button | Closes entries view |

### 2.4 Tab: Search

| Element | Type | Action |
|---------|------|--------|
| Search Input | Text Input | Query text |
| Store Filter Dropdown | Select | Filter by store |
| **Search** button | Button | Executes search |
| Results List | Dynamic | Shows matching entries |

### 2.5 Tab: Team

| Element | Type | Action |
|---------|------|--------|
| **Positions** section header | Static | - |
| Position Cards (×6) | Cards | Shows position info |
| **Reassign** button (per card) | Button | Opens agent reassign |
| **Agents** section header | Static | - |
| Agent Cards (×6) | Cards | Shows agent info |
| **Edit** button (per card) | Button | Opens Edit Agent modal |
| **Duplicate** button (per card) | Button | Duplicates agent |
| **+ Create Agent** | Button | Opens Create Agent modal |

#### 2.5.1 Position Card Details

| Element | Type | Action |
|---------|------|--------|
| Position Name | Static | e.g., "Archivist" |
| Role Description | Static | Position purpose |
| Assigned Agent | Static | Currently assigned |
| **Reassign** | Button | Change assignment |

#### 2.5.2 Edit Agent Modal

| Element | Type | Action |
|---------|------|--------|
| Modal Header | Static | "Edit Agent" |
| **×** Close button | Button | Closes modal |
| Agent Name | Text Input | Agent identifier |
| Description | Textarea | Agent description |
| API Configuration | Section | API settings |
| System Prompt | Section | Contains Prompt Builder |
| **Save** | Button | Saves changes |
| **Cancel** | Button | Discards changes |

#### 2.5.3 Create Agent Modal

| Element | Type | Action |
|---------|------|--------|
| Modal Header | Static | "Create Agent" |
| **×** Close button | Button | Closes modal |
| Agent Name | Text Input | Agent identifier |
| Description | Textarea | Agent description |
| API Configuration | Section | API settings |
| System Prompt | Section | Contains Prompt Builder |
| **Create** | Button | Creates agent |
| **Cancel** | Button | Closes modal |

#### 2.5.4 Reassign Agent Dialog

| Element | Type | Action |
|---------|------|--------|
| Dialog Header | Static | "Reassign Position" |
| Agent Dropdown | Select | Available agents |
| **Confirm** | Button | Applies reassignment |
| **Cancel** | Button | Closes dialog |

### 2.6 Tab: Pipelines

| Element | Type | Action |
|---------|------|--------|
| **CRUD** sub-tab | Tab | Shows CRUD pipelines |
| **RAG** sub-tab | Tab | Shows RAG pipelines |

#### 2.6.1 CRUD Sub-tab

| Element | Type | Action |
|---------|------|--------|
| Pipeline List | Table | Lists CRUD pipelines |
| Pipeline Name | Static | Pipeline identifier |
| Operation Type | Badge | Create/Read/Update/Delete |
| Target Store | Static | Store name |
| **Edit** button | Button | Opens edit form |
| **Delete** button | Button | Deletes pipeline |
| **Run** button | Button | Executes pipeline |
| **+ Create Pipeline** | Button | Opens create form |

#### 2.6.2 Create CRUD Pipeline Form

| Element | Type | Action |
|---------|------|--------|
| Pipeline Name | Text Input | Pipeline identifier |
| Operation | Select | Create/Read/Update/Delete |
| Target Store | Select | Store dropdown |
| Entry Selector | Text Input | Entry filter |
| **Create** | Button | Creates pipeline |
| **Cancel** | Button | Closes form |

#### 2.6.3 RAG Sub-tab

| Element | Type | Action |
|---------|------|--------|
| Pipeline List | Table | Lists RAG pipelines |
| Pipeline Name | Static | Pipeline identifier |
| Source Stores | Badges | Data sources |
| Retrieval Method | Static | Search method |
| **Edit** button | Button | Opens edit form |
| **Delete** button | Button | Deletes pipeline |
| **Run** button | Button | Executes pipeline |
| **+ Create Pipeline** | Button | Opens create form |

#### 2.6.4 Create RAG Pipeline Form

| Element | Type | Action |
|---------|------|--------|
| Pipeline Name | Text Input | Pipeline identifier |
| Source Stores | Multi-select | Data sources |
| Retrieval Method | Select | Search/Semantic/Hybrid |
| Query Template | Textarea | Query format |
| Result Limit | Number Input | Max results |
| **Create** | Button | Creates pipeline |
| **Cancel** | Button | Closes form |

---

## 3. Character Modal

**File:** `ui/character-modal.js`
**Trigger:** Click "👥 Characters" in Navigation Modal

### 3.1 Modal Structure

| Element | Type | Action |
|---------|------|--------|
| Close Button (×) | Button | Closes modal |
| Tab Bar | Navigation | Switches between tabs |

### 3.2 Tab: Characters

| Element | Type | Action |
|---------|------|--------|
| Search Input | Text Input | Filter characters |
| Type Filter | Select | All/Avatar/NPC/etc. |
| Status Filter | Select | All/Active/Inactive |
| **Create All Agents** | Button | Bulk create agents |
| Character Cards | Grid | Character display |

#### 3.2.1 Character Card

| Element | Type | Action |
|---------|------|--------|
| Avatar Image | Image | Character portrait |
| Character Name | Static | Character identifier |
| Type Badge | Badge | Avatar/NPC/etc. |
| Status Indicator | Badge | Active/Inactive |
| **View** button | Button | Opens character detail |
| **Create Agent** button | Button | Creates avatar agent |
| **Edit** button | Button | Opens character edit |

#### 3.2.2 Character Detail View

| Element | Type | Action |
|---------|------|--------|
| Character Name | Static | Character identifier |
| Full Description | Static | Character details |
| Personality | Static | Character traits |
| Scenario | Static | Character context |
| **Close** | Button | Returns to list |

### 3.3 Tab: Director

| Element | Type | Action |
|---------|------|--------|
| Director Name | Text Input | Director identifier |
| Description | Textarea | Director purpose |
| API Configuration | Section | API settings |
| System Prompt | Section | Contains Prompt Builder |
| **Save** | Button | Saves configuration |
| **Reset** | Button | Resets to defaults |

#### 3.3.1 API Configuration Section

| Element | Type | Action |
|---------|------|--------|
| API Endpoint | Select | API selection |
| Model | Select | Model selection |
| Temperature | Slider | 0.0-2.0 |
| Max Tokens | Number Input | Token limit |
| **Advanced** toggle | Button | Shows advanced options |

#### 3.3.2 Advanced API Options (collapsed by default)

| Element | Type | Action |
|---------|------|--------|
| Top P | Slider | Nucleus sampling |
| Top K | Number Input | Top-k sampling |
| Repetition Penalty | Slider | Repeat reduction |
| Presence Penalty | Slider | Topic diversity |
| Frequency Penalty | Slider | Word diversity |

### 3.4 Tab: Settings

| Element | Type | Action |
|---------|------|--------|
| **System Status** section | Static | - |
| Total Characters | Static | Count display |
| Active Avatars | Static | Count display |
| Sync Status | Static | Last sync time |
| **Actions** section | Static | - |
| **Sync Characters** | Button | Syncs with ST |
| **Despawn All** | Button | Removes all avatars |
| **Export Config** | Button | Downloads config |
| **Import Config** | Button | Uploads config |
| **Danger Zone** section | Static | - |
| **Reset All** | Button | Factory reset |

---

## 4. Pipeline Modal

**File:** `ui/pipeline-modal.js`
**Trigger:** Click "🔧 Pipeline" in Navigation Modal

### 4.1 Modal Structure

| Element | Type | Action |
|---------|------|--------|
| Close Button (×) | Button | Closes modal |
| Tab Bar (10 tabs) | Navigation | Switches between tabs |

### 4.2 Tab: Presets

| Element | Type | Action |
|---------|------|--------|
| Preset Cards | Grid | Available presets |
| Preset Name | Static | Preset identifier |
| Description | Static | Preset summary |
| **Load** button | Button | Loads preset |
| **Delete** button | Button | Deletes preset |
| **+ Save Current** | Button | Saves current config |
| **Import** | Button | Imports preset file |
| **Export** | Button | Exports preset file |

#### 4.2.1 Save Preset Dialog

| Element | Type | Action |
|---------|------|--------|
| Preset Name | Text Input | Preset identifier |
| Description | Textarea | Preset description |
| **Save** | Button | Saves preset |
| **Cancel** | Button | Closes dialog |

### 4.3 Tab: Agents

| Element | Type | Action |
|---------|------|--------|
| Agent Cards | Grid | Pipeline agents |
| Agent Name | Static | Agent identifier |
| Role | Badge | Agent function |
| Status | Badge | Ready/Busy/Error |
| **Edit** button | Button | Opens agent config |
| **Duplicate** button | Button | Duplicates agent |
| **Delete** button | Button | Removes agent |
| **+ Create Agent** | Button | Opens create form |

#### 4.3.1 Create/Edit Agent Form

| Element | Type | Action |
|---------|------|--------|
| Agent Name | Text Input | Agent identifier |
| Description | Textarea | Agent purpose |
| Role | Select | Agent role |
| API Configuration | Section | API settings |
| System Prompt | Section | Contains Prompt Builder |
| **Save/Create** | Button | Saves agent |
| **Cancel** | Button | Closes form |

### 4.4 Tab: Positions

| Element | Type | Action |
|---------|------|--------|
| Position Cards | Grid | Team positions |
| Position Name | Static | Position identifier |
| Role Description | Static | Position purpose |
| Assigned Agent | Static | Current agent |
| **Edit** button | Button | Opens position config |
| **Reassign** button | Button | Changes agent |
| **Delete** button | Button | Removes position |
| **+ Create Position** | Button | Opens create form |

#### 4.4.1 Create/Edit Position Form

| Element | Type | Action |
|---------|------|--------|
| Position Name | Text Input | Position identifier |
| Description | Textarea | Position purpose |
| Prompt Modifier | Textarea | Prompt additions |
| Default Agent | Select | Agent dropdown |
| **Save/Create** | Button | Saves position |
| **Cancel** | Button | Closes form |

### 4.5 Tab: Teams

| Element | Type | Action |
|---------|------|--------|
| Team Cards | Grid | Configured teams |
| Team Name | Static | Team identifier |
| Member Count | Badge | Position count |
| Mode | Badge | Orchestration mode |
| **Edit** button | Button | Opens team config |
| **Delete** button | Button | Removes team |
| **+ Create Team** | Button | Opens create form |

#### 4.5.1 Create/Edit Team Form

| Element | Type | Action |
|---------|------|--------|
| Team Name | Text Input | Team identifier |
| Description | Textarea | Team purpose |
| Mode | Select | Synthesis/Compilation/Injection |
| Positions | Multi-select | Team members |
| **Save/Create** | Button | Saves team |
| **Cancel** | Button | Closes form |

### 4.6 Tab: Pipelines

| Element | Type | Action |
|---------|------|--------|
| Pipeline Cards | Grid | Defined pipelines |
| Pipeline Name | Static | Pipeline identifier |
| Phase Count | Badge | Number of phases |
| Status | Badge | Ready/Running/Error |
| **Edit** button | Button | Opens pipeline config |
| **Run** button | Button | Executes pipeline |
| **Delete** button | Button | Removes pipeline |
| **+ Create Pipeline** | Button | Opens create form |

#### 4.6.1 Create/Edit Pipeline Form

| Element | Type | Action |
|---------|------|--------|
| Pipeline Name | Text Input | Pipeline identifier |
| Description | Textarea | Pipeline purpose |
| Phases | Sortable List | Phase sequence |
| **Add Phase** | Button | Adds new phase |
| **Save/Create** | Button | Saves pipeline |
| **Cancel** | Button | Closes form |

### 4.7 Tab: Phases

| Element | Type | Action |
|---------|------|--------|
| Phase Cards | Grid | Defined phases |
| Phase Name | Static | Phase identifier |
| Action Count | Badge | Number of actions |
| Order | Badge | Phase sequence |
| **Edit** button | Button | Opens phase config |
| **Delete** button | Button | Removes phase |
| **+ Create Phase** | Button | Opens create form |

#### 4.7.1 Create/Edit Phase Form

| Element | Type | Action |
|---------|------|--------|
| Phase Name | Text Input | Phase identifier |
| Description | Textarea | Phase purpose |
| Order | Number Input | Sequence position |
| Actions | Sortable List | Action sequence |
| **Add Action** | Button | Adds new action |
| Continue on Error | Checkbox | Error handling |
| **Save/Create** | Button | Saves phase |
| **Cancel** | Button | Closes form |

### 4.8 Tab: Actions

| Element | Type | Action |
|---------|------|--------|
| Action Cards | Grid | Defined actions |
| Action Name | Static | Action identifier |
| Type | Badge | Action type |
| Target | Static | Team/Agent |
| **Edit** button | Button | Opens action config |
| **Delete** button | Button | Removes action |
| **+ Create Action** | Button | Opens create form |

#### 4.8.1 Create/Edit Action Form

| Element | Type | Action |
|---------|------|--------|
| Action Name | Text Input | Action identifier |
| Description | Textarea | Action purpose |
| Type | Select | Generate/Transform/Validate/etc. |
| Target Team | Select | Team dropdown |
| Input Variables | Multi-select | Input data |
| Output Variable | Text Input | Output name |
| Prompt | Section | Contains Prompt Builder |
| **Save/Create** | Button | Saves action |
| **Cancel** | Button | Closes form |

### 4.9 Tab: Execution

| Element | Type | Action |
|---------|------|--------|
| Execution Status | Static | Current state |
| Progress Bar | Progress | Completion % |
| Current Phase | Static | Active phase |
| Current Action | Static | Active action |
| **Execution Log** | Scrollable | Step-by-step log |
| **Start** | Button | Begins execution |
| **Pause** | Button | Pauses execution |
| **Resume** | Button | Resumes execution |
| **Stop** | Button | Stops execution |
| **Clear Log** | Button | Clears log |

#### 4.9.1 Execution States

- [ ] **Idle**: Start button enabled
- [ ] **Running**: Pause/Stop enabled, Start disabled
- [ ] **Paused**: Resume/Stop enabled
- [ ] **Completed**: All disabled, log shows results
- [ ] **Error**: Log shows error, Start enabled

### 4.10 Tab: Threads

| Element | Type | Action |
|---------|------|--------|
| Thread Cards | Grid | Context threads |
| Thread Name | Static | Thread identifier |
| Message Count | Badge | Thread length |
| Status | Badge | Active/Archived |
| **View** button | Button | Opens thread detail |
| **Archive** button | Button | Archives thread |
| **Delete** button | Button | Removes thread |
| **+ Create Thread** | Button | Opens create form |

#### 4.10.1 Thread Detail View

| Element | Type | Action |
|---------|------|--------|
| Thread Name | Static | Thread identifier |
| Messages List | Scrollable | Thread messages |
| Message Sender | Static | Agent/User |
| Message Content | Static | Message text |
| **Close** | Button | Returns to list |

### 4.11 Tab: Outputs

| Element | Type | Action |
|---------|------|--------|
| Output Cards | Grid | Pipeline outputs |
| Output Name | Static | Variable name |
| Value Preview | Static | Truncated value |
| Type | Badge | String/Object/Array |
| **View** button | Button | Opens full view |
| **Copy** button | Button | Copies to clipboard |
| **Export** | Button | Exports all outputs |
| **Clear** | Button | Clears all outputs |

#### 4.11.1 Output Detail View

| Element | Type | Action |
|---------|------|--------|
| Output Name | Static | Variable name |
| Full Value | Scrollable | Complete content |
| **Copy** | Button | Copies to clipboard |
| **Close** | Button | Returns to list |

---

## 5. Injection Modal

**File:** `ui/injection-modal.js`
**Trigger:** Click "💉 Injection" in Navigation Modal

### 5.1 Modal Structure

| Element | Type | Action |
|---------|------|--------|
| Close Button (×) | Button | Closes modal |
| Modal Title | Static | "💉 Injection Mode" |

### 5.2 Main View

| Element | Type | Action |
|---------|------|--------|
| **Enable Injection** toggle | Toggle | Activates injection |
| Status Indicator | Badge | Enabled/Disabled |
| **Token Mappings** section | Static | - |
| Mapping List | Table | Token mappings |

### 5.3 Token Mapping Row

| Element | Type | Action |
|---------|------|--------|
| Token Name | Static | Token identifier |
| Source | Badge | Pipeline/Store/Static |
| Value Preview | Static | Truncated value |
| **Edit** button | Button | Opens edit form |
| **Delete** button | Button | Removes mapping |

### 5.4 Quick Add Buttons

| Element | Type | Action |
|---------|------|--------|
| **{{char}}** | Button | Adds char mapping |
| **{{user}}** | Button | Adds user mapping |
| **{{scenario}}** | Button | Adds scenario mapping |
| **{{personality}}** | Button | Adds personality mapping |
| **{{persona}}** | Button | Adds persona mapping |
| **{{mesExamples}}** | Button | Adds examples mapping |
| **{{system}}** | Button | Adds system mapping |
| **{{jailbreak}}** | Button | Adds jailbreak mapping |
| **{{description}}** | Button | Adds description mapping |
| **{{main}}** | Button | Adds main mapping |
| **{{nsfw}}** | Button | Adds nsfw mapping |
| **{{worldInfo}}** | Button | Adds worldInfo mapping |

### 5.5 Add Mapping Form

| Element | Type | Action |
|---------|------|--------|
| Token | Select | Target token |
| Source Type | Select | Pipeline/Store/Static |
| Source Value | Dynamic | Based on type |
| **Add** | Button | Creates mapping |
| **Cancel** | Button | Closes form |

#### 5.5.1 Source Type: Pipeline

| Element | Type | Action |
|---------|------|--------|
| Pipeline | Select | Pipeline dropdown |
| Output Variable | Select | Variable dropdown |

#### 5.5.2 Source Type: Store

| Element | Type | Action |
|---------|------|--------|
| Store | Select | Store dropdown |
| Entry Selector | Text Input | Entry filter |

#### 5.5.3 Source Type: Static

| Element | Type | Action |
|---------|------|--------|
| Value | Textarea | Static text |

### 5.6 Edit Mapping Form

Same as Add Mapping Form with pre-filled values.

---

## 6. Gavel Modal

**File:** `ui/gavel-modal.js`
**Trigger:** Pipeline execution requires human review

### 6.1 Modal Structure

| Element | Type | Action |
|---------|------|--------|
| Header | Static | "⚖️ Review Required" |
| Agent Info | Static | Reviewing agent |
| Phase/Action | Static | Current context |

### 6.2 Content Sections

| Element | Type | Action |
|---------|------|--------|
| **Prompt Section** | Collapsible | - |
| Prompt Preview | Static | Input prompt |
| **Expand Prompt** | Button | Shows full prompt |
| **Output Content** | Section | - |
| Generated Content | Static/Editable | Agent output |
| **Edit Mode** toggle | Toggle | Enables editing |

### 6.3 Editor Section (when editing enabled)

| Element | Type | Action |
|---------|------|--------|
| Content Editor | Textarea | Editable output |
| **Character Count** | Static | Length display |
| **Reset** | Button | Reverts changes |

### 6.4 Commentary Section

| Element | Type | Action |
|---------|------|--------|
| Commentary | Textarea | Reviewer notes |
| Placeholder | Static | "Add any notes..." |

### 6.5 Action Buttons

| Element | Type | Action |
|---------|------|--------|
| **⏭️ Skip** | Button | Skips review, uses output |
| **❌ Reject** | Button | Rejects output, retries |
| **✅ Approve** | Button | Approves output |

### 6.6 States

- [ ] **Pending**: All buttons enabled
- [ ] **Editing**: Edit mode active, content editable
- [ ] **Approved**: Modal closes, pipeline continues
- [ ] **Rejected**: Modal closes, action retries
- [ ] **Skipped**: Modal closes, output used as-is

---

## 7. Shared Components

### 7.1 Prompt Builder Component

**File:** `ui/components/prompt-builder.js`
**Used in:** Agent forms, Director config, Action forms

#### 7.1.1 Mode Selector

| Element | Type | Action |
|---------|------|--------|
| **Custom Prompt** tab | Tab | Free-form editing |
| **ST Preset** tab | Tab | SillyTavern preset |
| **Build from Tokens** tab | Tab | Token composition |

#### 7.1.2 Custom Prompt Mode

| Element | Type | Action |
|---------|------|--------|
| Prompt Editor | Textarea | Free-form prompt |
| **Insert Token** | Button | Opens token picker |
| **Insert Macro** | Button | Opens macro picker |
| Character Count | Static | Length display |
| Token Preview | Section | Shows resolved tokens |

#### 7.1.3 ST Preset Mode

| Element | Type | Action |
|---------|------|--------|
| Preset Dropdown | Select | ST preset list |
| Preview | Static | Preset content |
| **Load** | Button | Applies preset |

#### 7.1.4 Build from Tokens Mode

| Element | Type | Action |
|---------|------|--------|
| Token Categories | Accordion | 8 categories |
| Token Checkboxes | Checkbox | Token selection |
| Token Order | Sortable | Drag to reorder |
| Preview | Static | Combined result |
| **Apply** | Button | Builds prompt |

#### 7.1.5 Token Categories

| Category | Tokens |
|----------|--------|
| **Character** | char, user, persona, description, personality |
| **Context** | scenario, mesExamples, chat, worldInfo |
| **System** | system, jailbreak, main, nsfw |
| **Custom** | User-defined tokens |
| **Curation** | Store-sourced tokens |
| **Pipeline** | Pipeline output tokens |
| **Transform** | Transform functions |
| **Conditional** | Conditional blocks |

### 7.2 Token Picker Component

**File:** `ui/components/token-picker.js`

| Element | Type | Action |
|---------|------|--------|
| Search Input | Text Input | Filter tokens |
| Category Tabs | Tabs | Filter by category |
| Token List | Grid | Available tokens |
| Token Name | Button | Inserts token |
| Token Description | Tooltip | Shows purpose |

### 7.3 Participant Selector Component

**File:** `ui/components/participant-selector.js`

| Element | Type | Action |
|---------|------|--------|
| Available List | Scrollable | Unselected items |
| Selected List | Scrollable | Selected items |
| **→** | Button | Adds to selected |
| **←** | Button | Removes from selected |
| **↑/↓** | Buttons | Reorders selected |

### 7.4 Context Config Component

**File:** `ui/components/context-config.js`

| Element | Type | Action |
|---------|------|--------|
| Include Chat History | Checkbox | Toggle |
| History Depth | Number Input | Message count |
| Include World Info | Checkbox | Toggle |
| Include Character Card | Checkbox | Toggle |
| Custom Context | Textarea | Additional context |

### 7.5 Execution Monitor Component

**File:** `ui/components/execution-monitor.js`

| Element | Type | Action |
|---------|------|--------|
| Phase Indicator | Progress | Current phase |
| Action Indicator | Progress | Current action |
| Agent Status | Badges | Agent states |
| Log Stream | Scrollable | Real-time log |
| **Pause** | Button | Pauses execution |
| **Cancel** | Button | Stops execution |

---

## Testing Checklist

### Navigation Modal
- [ ] Verify expanded state shows all 6 buttons
- [ ] Click collapse button, verify collapsed state
- [ ] Click expand button, verify expanded state
- [ ] Click each button, verify correct modal opens
- [ ] Verify Run button starts execution
- [ ] Verify Stop button stops execution
- [ ] Verify status bar updates

### Curation Modal
- [ ] Open modal, verify Overview tab default
- [ ] Click each of 5 tabs, verify content changes
- [ ] Overview: Verify all 14 stores listed
- [ ] Stores: Click View on each store type
- [ ] Stores: Click +Add, fill form, create entry
- [ ] Search: Enter query, select store, execute search
- [ ] Team: View all 6 positions and 6 agents
- [ ] Team: Click Edit on agent, verify form opens
- [ ] Team: Click Reassign on position, verify dialog
- [ ] Team: Click + Create Agent, fill form
- [ ] Pipelines: Switch between CRUD and RAG tabs
- [ ] Pipelines: Create new CRUD pipeline
- [ ] Pipelines: Create new RAG pipeline

### Character Modal
- [ ] Open modal, verify Characters tab default
- [ ] Characters: Use search filter
- [ ] Characters: Use type filter dropdown
- [ ] Characters: Use status filter dropdown
- [ ] Characters: Click Create All Agents
- [ ] Characters: View character detail
- [ ] Director: Edit director configuration
- [ ] Director: Test Prompt Builder modes
- [ ] Settings: Click each action button
- [ ] Settings: Test Export/Import

### Pipeline Modal
- [ ] Open modal, cycle through all 10 tabs
- [ ] Presets: Load, save, import, export preset
- [ ] Agents: Create, edit, duplicate, delete agent
- [ ] Positions: Create, edit, reassign, delete position
- [ ] Teams: Create, edit, delete team
- [ ] Pipelines: Create, edit, run, delete pipeline
- [ ] Phases: Create, edit, delete phase
- [ ] Actions: Create, edit, delete action
- [ ] Execution: Start, pause, resume, stop execution
- [ ] Threads: Create, view, archive thread
- [ ] Outputs: View, copy, export outputs

### Injection Modal
- [ ] Open modal, toggle Enable Injection
- [ ] Click each of 12 Quick Add buttons
- [ ] Add custom mapping with Pipeline source
- [ ] Add custom mapping with Store source
- [ ] Add custom mapping with Static source
- [ ] Edit existing mapping
- [ ] Delete mapping

### Gavel Modal
- [ ] Trigger via pipeline execution
- [ ] Expand/collapse prompt section
- [ ] Toggle edit mode
- [ ] Edit content in editor
- [ ] Add commentary
- [ ] Click Skip button
- [ ] Click Reject button
- [ ] Click Approve button

### Shared Components
- [ ] Prompt Builder: Test all 3 modes
- [ ] Token Picker: Search and insert tokens
- [ ] Participant Selector: Add/remove/reorder items
- [ ] Context Config: Toggle all options
- [ ] Execution Monitor: Verify real-time updates

---

## Browser Automation Reference

### Get Element Refs

```
mcp__playwright__browser_snapshot()
```

### Click Element

```
mcp__playwright__browser_click(element: "description", ref: "eXXX")
```

### Type Text

```
mcp__playwright__browser_type(element: "description", ref: "eXXX", text: "value")
```

### Check Console

```
mcp__playwright__browser_console_messages(level: "error")
```

### Run Integration Tests

```javascript
// Via browser_evaluate:
window.TheCouncil.runIntegrationTests()
```
