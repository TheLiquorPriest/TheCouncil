# The Council - Expected UI Behavior

**Version:** 2.1.0-alpha
**Last Updated:** 2025-12-13
**Purpose:** Authoritative specification of expected UI behavior for testing and validation

---

## Overview

This document defines the expected behavior for every UI element in The Council extension. Use this as the ground truth for testing and validation. Each section documents:
- Initial states
- Button behaviors and expected results
- State transitions
- Visual indicators
- Error states
- Edge cases

**Cross-Reference:** See `docs/VIEWS.md` for element inventory, `docs/SYSTEM_DEFINITIONS.md` for system architecture.

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
**Trigger:** Automatically shown when extension loads
**CSS Class:** `.council-nav-container`

### 1.1 Initial State

| Property | Expected Value |
|----------|----------------|
| **Visibility** | Visible (`.visible` class present) |
| **Position** | Loaded from localStorage (`council_nav_position`) or default `{ x: 20, y: 100 }` |
| **Expanded State** | Expanded (not collapsed) |
| **Status Indicator** | Gray circle (idle state) |
| **Status Text** | "Ready" |
| **Run Button** | Enabled |
| **Stop Button** | Disabled |

### 1.2 Header Elements

| Element | Selector | Behavior |
|---------|----------|----------|
| Icon | `.council-nav-icon` | Static display: emoji building icon |
| Title | `.council-nav-label` | Static text: "Council" |
| Status Indicator | `.council-nav-status-indicator` | Color reflects pipeline state (see 1.5) |
| Toggle Button | `.council-nav-toggle` | Click toggles expanded/collapsed state |

### 1.3 Button Behaviors

| Button | Selector | Click Action | Expected Result |
|--------|----------|--------------|-----------------|
| Curation | `[data-action="open-curation"]` | Opens modal | Curation Modal appears, Overview tab active |
| Characters | `[data-action="open-character"]` | Opens modal | Character Modal appears, Characters tab active |
| Pipeline | `[data-action="open-pipeline"]` | Opens modal | Pipeline Modal appears, Presets tab active |
| Injection | `[data-action="open-injection"]` | Opens modal | Injection Modal appears |
| Run | `[data-action="run-pipeline"]` | Opens Pipeline Modal | Pipeline Modal opens to Execution tab |
| Stop | `[data-action="stop-pipeline"]` | Aborts pipeline run | Pipeline execution stops, status updates |

### 1.4 State Transitions

| Transition | Trigger | Visual Changes |
|------------|---------|----------------|
| Expand to Collapse | Click toggle (when expanded) | Buttons and footer hide, toggle shows `>` |
| Collapse to Expand | Click toggle (when collapsed) | Buttons and footer appear, toggle shows `v` |
| Idle to Running | Pipeline starts | Status indicator pulses blue, Run disabled, Stop enabled |
| Running to Completed | Pipeline completes | Status indicator solid green, "Completed" text |
| Running to Failed | Pipeline errors | Status indicator solid red, "Failed" text |
| Running to Aborted | Stop clicked | Status indicator gray, "Aborted" text |

### 1.5 Status Indicator States

| State | CSS Class | Color | Animation |
|-------|-----------|-------|-----------|
| Idle | (default) | `#666` gray | None |
| Running | `.running` | `#4a90d9` blue | Pulse animation |
| Success | `.success` | `#4caf50` green | None |
| Error | `.error` | `#f44336` red | None |

### 1.6 Drag Behavior

| Action | Trigger | Expected Result |
|--------|---------|-----------------|
| Start drag | Mousedown on header (not on buttons) | Container gets `.dragging` class, cursor changes to grabbing |
| Move | Mousemove while dragging | Container follows cursor, constrained to viewport |
| End drag | Mouseup | Position saved to localStorage |

### 1.7 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+C` / `Cmd+Shift+C` | Toggle nav visibility |

### 1.8 Error States

| Condition | Expected Behavior |
|-----------|-------------------|
| No pipeline configured | Run button disabled (if no active pipeline in PipelineSystem) |
| API error during run | Status shows "Failed", console logs error |
| Modal not available | Warning logged, button click has no effect |

---

## 2. Curation Modal

**File:** `ui/curation-modal.js`
**Trigger:** Click "Curation" in Navigation Modal
**CSS Class:** `.council-curation-modal`

### 2.1 Initial State

| Property | Expected Value |
|----------|----------------|
| **Visibility** | Hidden until triggered |
| **Default Tab** | Overview |
| **Search Query** | Empty |
| **Selected Store** | None |
| **Selected Entry** | None |

### 2.2 Modal Structure

| Element | Selector | Behavior |
|---------|----------|----------|
| Overlay | `.council-curation-overlay` | Click closes modal |
| Close Button | `[data-action="close"]` | Click closes modal |
| Import Button | `[data-action="import"]` | Opens file picker for JSON import |
| Export Button | `[data-action="export"]` | Downloads all store data as JSON |
| Save All Button | `[data-action="save-all"]` | Persists all pending changes |

### 2.3 Tab: Overview (Default)

**Trigger:** Click "Overview" tab or modal opens

| Element | Expected Content |
|---------|------------------|
| Stats Section | Total stores, total entries count |
| Singleton Stores Section | Lists: World Info, Author Notes, Character Card, Chat Context |
| Collection Stores Section | Lists: Characters, Messages, Lorebooks, Custom Data, Personas, Presets, Tags, World Info Entries, Groups, Chats |

**Store Display:**
- Each store shows: Icon, Name, Entry count
- Clicking a store navigates to Stores tab with that store selected

### 2.4 Tab: Stores

**Trigger:** Click "Stores" tab

#### 2.4.1 Store List View

| Element | Type | Behavior |
|---------|------|----------|
| Stores Table | Table | Lists all stores with columns: Name, Type, Entry Count |
| Type Badge | Static | Shows "Singleton" or "Collection" |
| View Button | Button | Expands to show store entries inline |
| +Add Button | Button | Opens Create Entry form (Collection stores only) |

#### 2.4.2 Store Entries View (Inline Expand)

| Element | Type | Behavior |
|---------|------|----------|
| Entries List | Table | Shows all entries in selected store |
| Entry Name | Static | Entry identifier or first field value |
| Edit Button | Button | Opens inline edit form for entry |
| Delete Button | Button | Shows confirmation, then deletes entry |
| Close Button | Button | Collapses entries view |

#### 2.4.3 Create Entry Form

| Field | Type | Validation |
|-------|------|------------|
| Entry Name | Text Input | Required, non-empty |
| Entry Content | Textarea | JSON format for structured data |
| Create Button | Button | Validates, creates entry, closes form |
| Cancel Button | Button | Closes form without saving |

**Error States:**
- Empty name: Show "Name is required" error
- Invalid JSON: Show "Invalid JSON format" error
- Duplicate key: Show "Entry already exists" error

### 2.5 Tab: Search

**Trigger:** Click "Search" tab

| Element | Type | Behavior |
|---------|------|----------|
| Search Input | Text Input | Query text, triggers search on Enter or button click |
| Store Filter | Select | Dropdown with "All Stores" + individual store names |
| Search Button | Button | Executes search with current query and filter |
| Results List | Dynamic | Shows matching entries with store name, entry name, match preview |

**Search Behavior:**
- Searches entry names and content
- Case-insensitive matching
- Highlights matched text in results

**Empty States:**
- No query: "Enter a search query"
- No results: "No entries match your query"

### 2.6 Tab: Team

**Trigger:** Click "Team" tab

#### 2.6.1 Positions Section

| Element | Content | Actions |
|---------|---------|---------|
| Position Cards (x6) | Archivist, Story Topologist, Lore Topologist, Character Topologist, Scene Topologist, Location Topologist | |
| Position Name | Static display | |
| Role Description | Brief purpose text | |
| Assigned Agent | Current agent name or "Unassigned" | |
| Reassign Button | Opens agent selection dialog | |

#### 2.6.2 Agents Section

| Element | Content | Actions |
|---------|---------|---------|
| Agent Cards (x6) | Default agents for each position | |
| Agent Name | Static display | |
| Edit Button | Opens Edit Agent modal | |
| Duplicate Button | Creates copy of agent | |
| + Create Agent Button | Opens Create Agent modal | |

#### 2.6.3 Edit/Create Agent Modal (Nested)

| Field | Type | Validation |
|-------|------|------------|
| Agent Name | Text Input | Required, non-empty |
| Description | Textarea | Optional |
| API Configuration | Section | See 2.6.4 |
| System Prompt | Section | Contains Prompt Builder component |
| Save/Create Button | Button | Validates all fields, saves |
| Cancel Button | Button | Closes without saving |

#### 2.6.4 API Configuration Fields

| Field | Type | Default | Range |
|-------|------|---------|-------|
| Use Current Connection | Checkbox | Checked | |
| API Endpoint | Text (disabled if checkbox) | "" | |
| API Key | Password (disabled if checkbox) | "" | |
| Model | Text | "" | |
| Temperature | Slider | 0.7 | 0.0 - 2.0 |
| Max Tokens | Number | 2048 | 1+ |
| Top P | Slider | 1.0 | 0.0 - 1.0 |

#### 2.6.5 Reassign Agent Dialog

| Element | Behavior |
|---------|----------|
| Agent Dropdown | Lists all available agents (includes custom) |
| Confirm Button | Assigns selected agent to position |
| Cancel Button | Closes without change |

### 2.7 Tab: Pipelines

**Trigger:** Click "Pipelines" tab

#### 2.7.1 Sub-Tab Structure

| Sub-Tab | Default | Content |
|---------|---------|---------|
| CRUD | Active | CRUD pipeline list |
| RAG | Inactive | RAG pipeline list |

#### 2.7.2 CRUD Pipelines List

| Element | Type | Behavior |
|---------|------|----------|
| Pipeline Name | Static | Pipeline identifier |
| Operation Badge | Badge | Create/Read/Update/Delete |
| Target Store | Static | Associated store name |
| Edit Button | Button | Opens edit form |
| Delete Button | Button | Confirmation, then deletes |
| Run Button | Button | Executes pipeline |
| + Create Pipeline Button | Button | Opens create form |

#### 2.7.3 Create/Edit CRUD Pipeline Form

| Field | Type | Validation |
|-------|------|------------|
| Pipeline Name | Text Input | Required |
| Operation | Select | Create, Read, Update, Delete |
| Target Store | Select | List of all stores |
| Entry Selector | Text Input | Filter expression |
| Save/Create Button | Button | Validates, saves |
| Cancel Button | Button | Closes form |

#### 2.7.4 RAG Pipelines List

| Element | Type | Behavior |
|---------|------|----------|
| Pipeline Name | Static | Pipeline identifier |
| Source Stores | Badges | Data source stores |
| Retrieval Method | Static | Search/Semantic/Hybrid |
| Edit Button | Button | Opens edit form |
| Delete Button | Button | Confirmation, then deletes |
| Run Button | Button | Executes pipeline |
| + Create Pipeline Button | Button | Opens create form |

#### 2.7.5 Create/Edit RAG Pipeline Form

| Field | Type | Validation |
|-------|------|------------|
| Pipeline Name | Text Input | Required |
| Source Stores | Multi-select | At least one store |
| Retrieval Method | Select | Search, Semantic, Hybrid |
| Query Template | Textarea | Supports tokens |
| Result Limit | Number | 1-100 |
| Save/Create Button | Button | Validates, saves |
| Cancel Button | Button | Closes form |

### 2.8 Footer

| Element | Content |
|---------|---------|
| Status Text | Current operation status or empty |
| Close Button | Closes modal |

---

## 3. Character Modal

**File:** `ui/character-modal.js`
**Trigger:** Click "Characters" in Navigation Modal
**CSS Class:** `.council-character-modal`

### 3.1 Initial State

| Property | Expected Value |
|----------|----------------|
| **Visibility** | Hidden until triggered |
| **Default Tab** | Characters |
| **Search Query** | Empty |
| **Type Filter** | "All" |
| **Status Filter** | "All" |

### 3.2 Tab: Characters (Default)

**Trigger:** Click "Characters" tab or modal opens

#### 3.2.1 Filter Controls

| Element | Type | Options |
|---------|------|---------|
| Search Input | Text | Filters by character name |
| Type Filter | Select | All, Avatar, NPC, Main Cast, Recurring, Supporting, Background |
| Status Filter | Select | All, Active, Inactive |
| Create All Agents Button | Button | Creates avatar agents for all characters |

#### 3.2.2 Character Cards Grid

| Element | Content | Actions |
|---------|---------|---------|
| Avatar Image | Character portrait or placeholder | |
| Character Name | Static text | |
| Type Badge | Avatar/NPC/etc. | |
| Status Indicator | Active (green) / Inactive (gray) | |
| View Button | Opens detail view | |
| Create Agent Button | Creates avatar agent for this character | |
| Edit Button | Opens character edit form | |

**Card Visual States:**
- Active character: Full opacity, green indicator
- Inactive character: Reduced opacity, gray indicator
- Has avatar agent: Blue border highlight

#### 3.2.3 Character Detail View (Modal/Panel)

| Element | Content |
|---------|---------|
| Character Name | Full name |
| Full Description | Complete character description |
| Personality | Personality traits |
| Scenario | Character context |
| Close Button | Returns to list |

#### 3.2.4 Create Agent Behavior

| Trigger | Expected Result |
|---------|-----------------|
| Click "Create Agent" on card | Shows loading state, creates avatar agent in Character System |
| Click "Create All Agents" | Iterates all characters, creates agents, shows progress |

**Success State:** Button changes to "Agent Created" (disabled)
**Error State:** Toast notification with error message

### 3.3 Tab: Director

**Trigger:** Click "Director" tab

#### 3.3.1 Director Configuration

| Field | Type | Purpose |
|-------|------|---------|
| Director Name | Text Input | Director identifier (default: "Character Director") |
| Description | Textarea | Director purpose description |
| API Configuration | Section | See 3.3.2 |
| System Prompt | Section | Contains Prompt Builder component |
| Save Button | Button | Persists configuration |
| Reset Button | Button | Reverts to defaults |

#### 3.3.2 API Configuration Section

| Field | Type | Default | Range |
|-------|------|---------|-------|
| API Endpoint | Select | Current ST connection | Available APIs |
| Model | Select | Default model | Available models |
| Temperature | Slider | 0.7 | 0.0 - 2.0 |
| Max Tokens | Number | 2048 | 1+ |
| Advanced Toggle | Button | Collapsed | Shows advanced options |

#### 3.3.3 Advanced API Options (Collapsed by Default)

| Field | Type | Default | Range |
|-------|------|---------|-------|
| Top P | Slider | 1.0 | 0.0 - 1.0 |
| Top K | Number | 0 | 0+ |
| Repetition Penalty | Slider | 1.0 | 0.0 - 2.0 |
| Presence Penalty | Slider | 0.0 | -2.0 - 2.0 |
| Frequency Penalty | Slider | 0.0 | -2.0 - 2.0 |

### 3.4 Tab: Settings

**Trigger:** Click "Settings" tab

#### 3.4.1 System Status Section

| Display | Content |
|---------|---------|
| Total Characters | Count from Curation System |
| Active Avatars | Count of spawned character agents |
| Sync Status | Timestamp of last sync with ST |

#### 3.4.2 Actions Section

| Button | Action | Expected Result |
|--------|--------|-----------------|
| Sync Characters | Syncs with SillyTavern | Updates character list, shows sync count |
| Despawn All | Removes all avatar agents | All character agents deactivated |
| Export Config | Downloads JSON | Character system configuration file |
| Import Config | File picker | Loads configuration from JSON |

#### 3.4.3 Danger Zone Section

| Button | Action | Confirmation |
|--------|--------|--------------|
| Reset All | Factory reset | "This will reset all character configurations. Are you sure?" |

**Reset All Behavior:**
1. Show confirmation dialog
2. If confirmed: Clear all custom settings, despawn all agents, reset director
3. Show success toast

---

## 4. Pipeline Modal

**File:** `ui/pipeline-modal.js`
**Trigger:** Click "Pipeline" in Navigation Modal
**CSS Class:** `.council-pipeline-modal`

### 4.1 Initial State

| Property | Expected Value |
|----------|----------------|
| **Visibility** | Hidden until triggered |
| **Default Tab** | Presets |
| **10 Tabs Available** | Presets, Agents, Positions, Teams, Pipelines, Phases, Actions, Execution, Threads, Outputs |

### 4.2 Tab: Presets (Default)

**Trigger:** Click "Presets" tab or modal opens

#### 4.2.1 Preset Cards Grid

| Element | Content | Actions |
|---------|---------|---------|
| Preset Name | Preset identifier | |
| Description | Brief summary | |
| Load Button | Loads preset configuration | |
| Delete Button | Removes preset (not built-in) | |

**Built-in Presets (read-only):**
- Default Pipeline (empty)
- Quick Pipeline (single phase)
- Standard Pipeline (multi-phase)

#### 4.2.2 Preset Actions

| Button | Action | Expected Result |
|--------|--------|-----------------|
| + Save Current | Opens save dialog | Creates new preset from current config |
| Import | Opens file picker | Loads preset from JSON file |
| Export | Downloads JSON | Current configuration as preset file |

#### 4.2.3 Save Preset Dialog

| Field | Type | Validation |
|-------|------|------------|
| Preset Name | Text Input | Required, unique |
| Description | Textarea | Optional |
| Save Button | Button | Creates preset |
| Cancel Button | Button | Closes dialog |

### 4.3 Tab: Agents

**Trigger:** Click "Agents" tab

#### 4.3.1 Agent Cards Grid

| Element | Content | Visual |
|---------|---------|--------|
| Agent Name | Identifier | |
| Role Badge | Agent function | Color-coded |
| Status Badge | Ready/Busy/Error | Green/Yellow/Red |
| Edit Button | Opens config | |
| Duplicate Button | Creates copy | |
| Delete Button | Removes agent | |
| + Create Agent Button | Opens create form | |

#### 4.3.2 Agent Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| Ready | Green | Available for actions |
| Busy | Yellow | Currently executing |
| Error | Red | Last execution failed |

### 4.4 Tab: Positions

**Trigger:** Click "Positions" tab

#### 4.4.1 Position Cards Grid

| Element | Content | Actions |
|---------|---------|---------|
| Position Name | Identifier | |
| Role Description | Purpose | |
| Assigned Agent | Current agent or "Unassigned" | |
| Edit Button | Opens config | |
| Reassign Button | Opens agent picker | |
| Delete Button | Removes position | |
| + Create Position Button | Opens create form | |

#### 4.4.2 Create/Edit Position Form

| Field | Type | Validation |
|-------|------|------------|
| Position Name | Text Input | Required |
| Description | Textarea | Optional |
| Prompt Modifier | Textarea | Prefix/suffix for prompts |
| Default Agent | Select | Agent dropdown |
| Save/Create Button | Button | Validates, saves |
| Cancel Button | Button | Closes form |

### 4.5 Tab: Teams

**Trigger:** Click "Teams" tab

#### 4.5.1 Team Cards Grid

| Element | Content | Visual |
|---------|---------|--------|
| Team Name | Identifier | |
| Member Count Badge | Position count | |
| Mode Badge | Synthesis/Compilation/Injection | |
| Edit Button | Opens config | |
| Delete Button | Removes team | |
| + Create Team Button | Opens create form | |

#### 4.5.2 Create/Edit Team Form

| Field | Type | Validation |
|-------|------|------------|
| Team Name | Text Input | Required |
| Description | Textarea | Optional |
| Mode | Select | Synthesis, Compilation, Injection |
| Positions | Multi-select | Available positions |
| Save/Create Button | Button | Validates, saves |
| Cancel Button | Button | Closes form |

### 4.6 Tab: Pipelines

**Trigger:** Click "Pipelines" tab

#### 4.6.1 Pipeline Cards Grid

| Element | Content | Actions |
|---------|---------|---------|
| Pipeline Name | Identifier | |
| Phase Count Badge | Number of phases | |
| Status Badge | Ready/Running/Error | |
| Edit Button | Opens config | |
| Run Button | Starts execution | |
| Delete Button | Removes pipeline | |
| + Create Pipeline Button | Opens create form | |

#### 4.6.2 Create/Edit Pipeline Form

| Field | Type | Validation |
|-------|------|------------|
| Pipeline Name | Text Input | Required |
| Description | Textarea | Optional |
| Phases | Sortable List | Drag to reorder |
| Add Phase Button | Button | Opens phase picker or creates new |
| Save/Create Button | Button | Validates, saves |
| Cancel Button | Button | Closes form |

### 4.7 Tab: Phases

**Trigger:** Click "Phases" tab

#### 4.7.1 Phase Cards Grid

| Element | Content | Actions |
|---------|---------|---------|
| Phase Name | Identifier | |
| Action Count Badge | Number of actions | |
| Order Badge | Sequence position | |
| Edit Button | Opens config | |
| Delete Button | Removes phase | |
| + Create Phase Button | Opens create form | |

#### 4.7.2 Create/Edit Phase Form

| Field | Type | Validation |
|-------|------|------------|
| Phase Name | Text Input | Required |
| Description | Textarea | Optional |
| Order | Number Input | 0+ |
| Actions | Sortable List | Drag to reorder |
| Add Action Button | Button | Opens action picker |
| Continue on Error | Checkbox | Default: false |
| Save/Create Button | Button | Validates, saves |
| Cancel Button | Button | Closes form |

### 4.8 Tab: Actions

**Trigger:** Click "Actions" tab

#### 4.8.1 Action Cards Grid

| Element | Content | Visual |
|---------|---------|--------|
| Action Name | Identifier | |
| Type Badge | Generate/Transform/Validate/etc. | Color-coded |
| Target | Team/Agent | |
| Edit Button | Opens config | |
| Delete Button | Removes action | |
| + Create Action Button | Opens create form | |

#### 4.8.2 Create/Edit Action Form

| Field | Type | Validation |
|-------|------|------------|
| Action Name | Text Input | Required |
| Description | Textarea | Optional |
| Type | Select | Generate, Transform, Validate, CRUD, RAG, Gavel, System |
| Target Team | Select | Team dropdown |
| Input Variables | Multi-select | Available variables |
| Output Variable | Text Input | Variable name |
| Prompt | Section | Contains Prompt Builder component |
| Save/Create Button | Button | Validates, saves |
| Cancel Button | Button | Closes form |

### 4.9 Tab: Execution

**Trigger:** Click "Execution" tab

#### 4.9.1 Execution Status Display

| Element | Content | Updates |
|---------|---------|---------|
| Status Text | Idle/Running/Paused/Completed/Error | Real-time |
| Progress Bar | Percentage complete | Per-action |
| Current Phase | Active phase name | On phase change |
| Current Action | Active action name | On action change |

#### 4.9.2 Execution Log

| Element | Behavior |
|---------|----------|
| Log Container | Scrollable, auto-scrolls to bottom |
| Log Entry | Timestamp + phase/action + message |
| Clear Log Button | Empties log display |

#### 4.9.3 Execution Controls

| Button | State: Idle | State: Running | State: Paused |
|--------|-------------|----------------|---------------|
| Start | Enabled | Disabled | Disabled |
| Pause | Disabled | Enabled | Disabled |
| Resume | Disabled | Disabled | Enabled |
| Stop | Disabled | Enabled | Enabled |

#### 4.9.4 Execution State Transitions

| From | To | Trigger | Visual |
|------|----|---------| -------|
| Idle | Running | Click Start | Progress bar appears, status "Running" |
| Running | Paused | Click Pause | Progress bar paused, status "Paused" |
| Paused | Running | Click Resume | Progress bar resumes |
| Running | Completed | Pipeline finishes | Status "Completed", all controls disabled |
| Running | Error | Action fails | Status "Error", error in log |
| Any Running | Idle | Click Stop | Status "Aborted" |

### 4.10 Tab: Threads

**Trigger:** Click "Threads" tab

#### 4.10.1 Thread Cards Grid

| Element | Content | Actions |
|---------|---------|---------|
| Thread Name | Identifier | |
| Message Count Badge | Thread length | |
| Status Badge | Active/Archived | |
| View Button | Opens detail view | |
| Archive Button | Archives thread | |
| Delete Button | Removes thread | |
| + Create Thread Button | Opens create form | |

#### 4.10.2 Thread Detail View

| Element | Content |
|---------|---------|
| Thread Name | Header |
| Messages List | Scrollable list of messages |
| Message Sender | Agent/User indicator |
| Message Content | Full message text |
| Close Button | Returns to list |

### 4.11 Tab: Outputs

**Trigger:** Click "Outputs" tab

#### 4.11.1 Output Cards Grid

| Element | Content | Actions |
|---------|---------|---------|
| Output Name | Variable name | |
| Value Preview | First 100 chars | |
| Type Badge | String/Object/Array | |
| View Button | Opens full view | |
| Copy Button | Copies to clipboard | |

#### 4.11.2 Output Actions

| Button | Action | Expected Result |
|--------|--------|-----------------|
| Export | Downloads JSON | All outputs as JSON file |
| Clear | Clears all outputs | Confirmation, then clears |

#### 4.11.3 Output Detail View

| Element | Content |
|---------|---------|
| Output Name | Variable name |
| Full Value | Complete content, scrollable |
| Copy Button | Copies full value |
| Close Button | Returns to list |

---

## 5. Injection Modal

**File:** `ui/injection-modal.js`
**Trigger:** Click "Injection" in Navigation Modal
**CSS Class:** `.council-injection-modal`

### 5.1 Initial State

| Property | Expected Value |
|----------|----------------|
| **Visibility** | Hidden until triggered |
| **Injection Enabled** | Based on saved state (default: false) |
| **Token Mappings** | Loaded from saved configuration |

### 5.2 Main View Elements

| Element | Type | Behavior |
|---------|------|----------|
| Enable Injection Toggle | Toggle | Activates/deactivates injection mode |
| Status Indicator | Badge | "Enabled" (green) or "Disabled" (gray) |
| Token Mappings Section | Table | Lists all configured mappings |

### 5.3 Token Mapping Row

| Element | Content | Actions |
|---------|---------|---------|
| Token Name | e.g., `{{char}}` | |
| Source | Badge: Pipeline/Store/Static | |
| Value Preview | First 50 chars | |
| Edit Button | Opens edit form | |
| Delete Button | Removes mapping | |

### 5.4 Quick Add Buttons

**Layout:** Row of buttons for common ST tokens

| Button | Token Added | Description |
|--------|-------------|-------------|
| `{{char}}` | char | AI character name |
| `{{user}}` | user | User name |
| `{{scenario}}` | scenario | Current scenario / situation |
| `{{personality}}` | personality | AI personality description |
| `{{persona}}` | persona | User persona / character description |
| `{{description}}` | description | AI description field |
| `{{world_info}}` | world_info | World info / lorebook entries |
| `{{system}}` | system | System prompt content |
| `{{jailbreak}}` | jailbreak | Jailbreak prompt content |
| `{{chat}}` | chat | Chat history / conversation context |
| `{{example_dialogue}}` | example_dialogue | Example dialogue entries |
| `{{first_message}}` | first_message | First message / greeting |

**Quick Add Behavior:**
1. Click button
2. Mapping added with pipeline selection dialog
3. Token is mapped to selected RAG pipeline (or auto-mapped if only one available)

### 5.5 Add/Edit Mapping Form

| Field | Type | Behavior |
|-------|------|----------|
| Token | Select | List of ST tokens not yet mapped |
| Source Type | Select | Pipeline, Store, Static |
| Source Value | Dynamic | Changes based on type |
| Add/Save Button | Button | Validates, saves mapping |
| Cancel Button | Button | Closes form |

#### 5.5.1 Source Type: Pipeline

| Field | Behavior |
|-------|----------|
| Pipeline Select | Dropdown of available pipelines |
| Output Variable Select | Variables from selected pipeline |

#### 5.5.2 Source Type: Store

| Field | Behavior |
|-------|----------|
| Store Select | Dropdown of all stores |
| Entry Selector | Filter expression for entries |

#### 5.5.3 Source Type: Static

| Field | Behavior |
|-------|----------|
| Value Textarea | Static text value |

### 5.6 Toggle Behavior

| State Change | Visual | System Effect |
|--------------|--------|---------------|
| Off to On | Toggle turns green, badge shows "Enabled" | OrchestrationSystem enters injection mode |
| On to Off | Toggle turns gray, badge shows "Disabled" | Injection mode disabled |

### 5.7 Validation

| Condition | Error Message |
|-----------|---------------|
| Duplicate token | "This token is already mapped" |
| Missing pipeline | "Select a pipeline" |
| Missing store | "Select a store" |
| Empty static value | "Enter a value" |

---

## 6. Gavel Modal

**File:** `ui/gavel-modal.js`
**Trigger:** Pipeline execution reaches gavel point
**CSS Class:** `.council-gavel-modal`

### 6.1 Initial State (When Shown)

| Property | Expected Value |
|----------|----------------|
| **Visibility** | Shown when gavel requested |
| **Overlay** | Blocks interaction (no click-to-close) |
| **Edit Mode** | Disabled by default |
| **Commentary** | Empty |

### 6.2 Header Section

| Element | Content |
|---------|---------|
| Icon | Scales of justice emoji |
| Title | "Review Required" |
| Phase Name | Current phase name |

### 6.3 Prompt Section

| Element | Behavior |
|---------|----------|
| Review Instructions | Gavel prompt from phase configuration |
| Expand Button | Toggles full prompt visibility |

### 6.4 Content Section

| Element | Content |
|---------|---------|
| Output Content | Generated content for review |
| Read-only by default | Text is not editable |

### 6.5 Editor Section (When Edit Mode Enabled)

| Element | Behavior |
|---------|----------|
| Edit Mode Toggle | Enables/disables editing |
| Content Editor | Textarea with generated content |
| Character Count | Live count of characters |
| Reset Button | Reverts to original content |

### 6.6 Commentary Section

| Element | Behavior |
|---------|----------|
| Commentary Textarea | Optional feedback input |
| Placeholder | "Add any notes, feedback, or instructions for the next phase..." |

### 6.7 Action Buttons

| Button | Icon | Action | Expected Result |
|--------|------|--------|-----------------|
| Skip | arrow | Skip review | Uses output as-is, continues pipeline |
| Reject | X | Reject output | Retries action, modal remains open |
| Approve | checkmark | Approve output | Uses output (edited if applicable), continues |

### 6.8 State Transitions

| State | Description | Available Actions |
|-------|-------------|-------------------|
| Pending | Initial state | Skip, Reject, Approve |
| Editing | Edit mode active | Edit content, Reset, Skip, Reject, Approve |

### 6.9 Action Results

| Action | Modal Behavior | Pipeline Behavior |
|--------|----------------|-------------------|
| Skip | Closes immediately | Continues with original output |
| Reject | Remains open | Action retries, new output displayed |
| Approve | Closes immediately | Continues with current content |

### 6.10 Skip Availability

| Condition | Skip Button |
|-----------|-------------|
| `canSkip: true` in config | Enabled |
| `canSkip: false` in config | Disabled, tooltip explains |

### 6.11 Edit Tracking

When edit mode is enabled and content is modified:
- Character count updates live
- Reset button becomes enabled
- Modified indicator appears

---

## 7. Shared Components

### 7.1 Prompt Builder Component

**File:** `ui/components/prompt-builder.js`
**Used In:** Agent forms, Director config, Action forms
**Version:** 2.1.0

#### 7.1.1 Mode Selector (Tabs)

| Tab | Label | Active State |
|-----|-------|--------------|
| Custom | "Custom Prompt" | Free-form editing active |
| Preset | "ST Preset" | Preset dropdown visible |
| Tokens | "Build from Tokens" | Token builder visible |

#### 7.1.2 Custom Prompt Mode

| Element | Behavior |
|---------|----------|
| Prompt Editor | Large textarea for free-form prompt |
| Insert Token Button | Opens token picker modal |
| Insert Macro Button | Opens macro picker modal |
| Character Count | Live count below editor |
| Token Preview | Shows resolved tokens (if any) |

**Supported Syntax:**
- `{{token}}` - Standard token
- `{{macro:id param="value"}}` - Parameterized macro
- `{{#if condition}}...{{else}}...{{/if}}` - Conditional
- `{{#unless condition}}...{{/unless}}` - Unless conditional
- `{{token | transform | transform:arg}}` - Transform pipeline

#### 7.1.3 ST Preset Mode

| Element | Behavior |
|---------|----------|
| Preset Dropdown | Lists available ST presets |
| Preview | Shows preset content (read-only) |
| Load Button | Loads selected preset |

**Preset Loading:**
1. Fetches preset from SillyTavern
2. Displays content in preview
3. Applies to prompt configuration

#### 7.1.4 Build from Tokens Mode

| Element | Behavior |
|---------|----------|
| Token Categories | Accordion with 8 categories |
| Token Checkboxes | Select tokens to include |
| Token Order | Drag-and-drop reordering |
| Preview | Combined result preview |
| Apply Button | Builds prompt from selections |

#### 7.1.5 Token Categories

| Category | Icon | Tokens |
|----------|------|--------|
| Character | mask | char, user, persona, description, personality |
| Context | message | scenario, mesExamples, chat, worldInfo |
| System | gear | system, jailbreak, main, nsfw |
| Custom | star | User-defined tokens |
| Curation | database | Store-sourced tokens |
| Pipeline | workflow | Pipeline output tokens |
| Transform | sparkle | Transform functions |
| Conditional | branch | Conditional blocks |

#### 7.1.6 Validation Feedback

| Condition | Visual | Message |
|-----------|--------|---------|
| Valid | Green checkmark | "All tokens resolved" |
| Unknown token | Yellow warning | "Unknown token: {{xxx}}" |
| Syntax error | Red X | "Syntax error at position X" |
| Empty | Gray info | "Enter a prompt" |

### 7.2 Token Picker Component

**File:** `ui/components/token-picker.js`

| Element | Behavior |
|---------|----------|
| Search Input | Filters tokens by name/description |
| Category Tabs | Filter by category |
| Token List | Grid of available tokens |
| Token Button | Click inserts token at cursor |
| Token Tooltip | Hover shows description |

**Token Insertion:**
1. Click token in list
2. Token inserted at cursor position in editor
3. Picker closes (or stays open with Shift+click)

### 7.3 Participant Selector Component

**File:** `ui/components/participant-selector.js`

| Element | Behavior |
|---------|----------|
| Available List | Scrollable list of unselected items |
| Selected List | Scrollable list of selected items |
| Add Arrow (right) | Moves selected to Selected list |
| Remove Arrow (left) | Moves selected to Available list |
| Up Arrow | Moves item up in Selected |
| Down Arrow | Moves item down in Selected |

**Interaction:**
- Click item to select
- Double-click to add/remove
- Drag to reorder selected items

### 7.4 Context Config Component

**File:** `ui/components/context-config.js`

| Element | Type | Default |
|---------|------|---------|
| Include Chat History | Checkbox | Checked |
| History Depth | Number | 10 |
| Include World Info | Checkbox | Checked |
| Include Character Card | Checkbox | Checked |
| Custom Context | Textarea | Empty |

### 7.5 Execution Monitor Component

**File:** `ui/components/execution-monitor.js`

| Element | Content | Updates |
|---------|---------|---------|
| Phase Indicator | Progress bar with phase name | Per-phase |
| Action Indicator | Progress bar with action name | Per-action |
| Agent Status | Badge grid with agent states | Per-action |
| Log Stream | Scrollable real-time log | Continuous |
| Pause Button | Pauses execution | When running |
| Cancel Button | Cancels execution | When running |

**Agent Status Colors:**
- Green: Completed successfully
- Blue: Currently executing
- Yellow: Waiting
- Red: Error
- Gray: Not started

---

## Visual State Reference

### Button States

| State | Visual | Cursor |
|-------|--------|--------|
| Default | Normal colors | Pointer |
| Hover | Lighter background | Pointer |
| Active/Pressed | Darker background | Pointer |
| Disabled | 40% opacity | Not-allowed |
| Loading | Spinner icon | Wait |

### Badge Colors

| Type | Background | Text |
|------|------------|------|
| Success | Green (#4caf50) | White |
| Warning | Yellow (#ff9800) | Dark |
| Error | Red (#f44336) | White |
| Info | Blue (#4a90d9) | White |
| Neutral | Gray (#666) | White |

### Input Validation States

| State | Border Color | Icon |
|-------|--------------|------|
| Default | Theme border | None |
| Focus | Blue (#4a90d9) | None |
| Valid | Green (#4caf50) | Checkmark |
| Invalid | Red (#f44336) | X |
| Warning | Yellow (#ff9800) | Exclamation |

---

## Error Handling Reference

### Toast Notifications

| Type | Duration | Position |
|------|----------|----------|
| Success | 3 seconds | Bottom-right |
| Info | 3 seconds | Bottom-right |
| Warning | 5 seconds | Bottom-right |
| Error | 5 seconds (or until dismissed) | Bottom-right |

### Confirmation Dialogs

| Action Type | Dialog Required |
|-------------|-----------------|
| Delete | Always |
| Reset | Always |
| Overwrite | If data exists |
| Cancel with unsaved changes | If changes detected |

### Error Recovery

| Error Type | Recovery Action |
|------------|-----------------|
| API timeout | Retry button in toast |
| Validation error | Highlight field, show message |
| Save failure | Keep form open, show error |
| Load failure | Show placeholder, retry option |

---

*Document Status: Complete*
*Last Validation: 2025-12-13*
