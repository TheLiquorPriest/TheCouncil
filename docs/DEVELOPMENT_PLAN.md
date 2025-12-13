# Alpha 3 Development Plan

**Version:** 3-alpha
**Created:** 2025-12-13
**Status:** Active Development
**Context Budget:** ~80k tokens per session

---

## Executive Summary

Alpha 3 focuses on three critical areas:
1. **Bug Fixes** - Resolve all issues identified in UI testing (97.4% pass rate → 100%)
2. **Curation System Enhancements** - Manual pipeline triggering, preview mode, 28 default pipelines
3. **Kernel Preset System** - Centralize configuration management across all systems

**Priority Order:** Bugs → Curation → Presets

---

## Phase 1: Bug Fixes (P0-P3)

**Estimated Effort:** 5-6 hours
**Source:** UI Test Report (`docs/testing/UI_REPORT-20251213.md`)

### 1.1 Critical (P0) - Fix Immediately

#### Task 1.1.1: injection-edit-functionality

**Priority:** P0
**File:** `ui/injection-modal.js`
**Issue:** Edit button for token mappings immediately deletes instead of opening edit form

**Implementation:**
1. Add `editMapping(token)` method:
   - Find existing mapping by token
   - Open Add Mapping form
   - Pre-fill all fields (token, source type, source value, max results, format)
   - Change form title to "Edit Mapping"
   - Change button text to "Save Changes"
2. Update row button click handlers to distinguish Edit vs Delete
3. Add delete confirmation dialog

**Acceptance Criteria:**
- [ ] Edit button opens form with pre-filled values
- [ ] User can modify and save mapping
- [ ] Delete button shows confirmation dialog
- [ ] Console logs appropriate messages

---

### 1.2 High Priority (P1) - Fix Before Beta

#### Task 1.2.1: nav-modal-auto-reappear

**Priority:** P1
**File:** `ui/nav-modal.js`
**Issue:** Navigation Modal doesn't reappear after closing other modals

**Implementation:**
```javascript
// In NavModal.init()
this._kernel.on('modal:hidden', (modalId) => {
  if (['curation', 'character', 'pipeline', 'injection'].includes(modalId)) {
    this.show();
  }
});
```

**Acceptance Criteria:**
- [ ] Nav Modal appears after closing Curation Modal
- [ ] Nav Modal appears after closing Character Modal
- [ ] Nav Modal appears after closing Pipeline Modal
- [ ] Nav Modal appears after closing Injection Modal

---

### 1.3 Medium Priority (P2) - Fix During Beta

#### Task 1.3.1: prompt-builder-mode-switch-error

**Priority:** P2
**File:** `ui/components/prompt-builder.js`
**Issue:** Console error when switching Prompt Builder modes

**Implementation:**
1. Add defensive null checks in `_renderModeContent()`
2. Verify initialization order in `init()` method
3. Ensure `_tokenCategories`, `_presets` are initialized before access

**Debugging Steps:**
1. Open Pipeline Modal > Agents Tab > + New Agent
2. Open browser DevTools console
3. Click "ST Preset" tab - observe error
4. Check stack trace for specific line number

**Acceptance Criteria:**
- [ ] No console errors when switching modes
- [ ] All mode content renders correctly

#### Task 1.3.2: injection-delete-confirmation

**Priority:** P2
**File:** `ui/injection-modal.js`
**Issue:** Delete removes mapping without confirmation

**Note:** This will be addressed as part of Task 1.1.1 (injection-edit-functionality)

---

### 1.4 Low Priority (P3) - Nice to Have

#### Task 1.4.1: update-injection-docs

**Priority:** P3
**File:** `docs/UI_BEHAVIOR.md` (Section 5.4)
**Issue:** Quick Add buttons documentation doesn't match implementation

**Changes:**
Update Section 5.4 Quick Add Buttons to reflect actual 12 tokens:
- `{{char}}`, `{{user}}`, `{{scenario}}`, `{{personality}}`, `{{persona}}`
- `{{description}}`, `{{world_info}}`, `{{system}}`, `{{jailbreak}}`
- `{{chat}}`, `{{example_dialogue}}`, `{{first_message}}`

#### Task 1.4.2: add-missing-svg

**Priority:** P3
**File:** `img/council_pipeline.svg`
**Issue:** Missing SVG asset causes 404 error

**Implementation:**
1. Search codebase for references: `grep -r "council_pipeline.svg" .`
2. Either create SVG icon or update reference to use existing icon

---

## Phase 2: Curation System Enhancements

**Estimated Effort:** 8-12 hours
**Focus:** Pipeline execution, preview mode, default pipelines

### 2.1 Manual Pipeline Triggering

#### Task 2.1.1: curation-pipeline-run-button

**Priority:** P0
**Files:** `ui/curation-modal.js`, `core/curation-system.js`
**Issue:** Cannot manually trigger curation pipelines from UI

**Implementation:**

1. **Add Run Button to Pipeline List Items:**
```javascript
// In CurationModal._renderPipelinesTab()
const runButton = document.createElement('button');
runButton.className = 'council-btn council-btn-primary council-btn-sm';
runButton.innerHTML = '▶ Run';
runButton.onclick = () => this._runPipeline(pipeline.id);
```

2. **Add Pipeline Runner Method:**
```javascript
async _runPipeline(pipelineId) {
  const pipeline = this._curationSystem.getPipeline(pipelineId);
  if (!pipeline) return;

  // Show execution modal or inline progress
  this._showPipelineExecution(pipeline);

  // Execute via Curation System
  try {
    const result = await this._curationSystem.executePipeline(pipelineId, {
      source: 'manual',
      preview: false
    });
    this._showPipelineResult(result);
  } catch (error) {
    this._showPipelineError(error);
  }
}
```

3. **Add Result Display UI:**
   - Success: Show affected records, changes made
   - Error: Show error message with retry option

**Acceptance Criteria:**
- [ ] Run button appears next to each pipeline
- [ ] Clicking Run executes pipeline
- [ ] Progress indicator during execution
- [ ] Results/errors displayed after completion
- [ ] Console logs `[CurationSystem] Pipeline executed: {id}`

---

### 2.2 Pipeline Preview Mode

#### Task 2.2.1: curation-pipeline-preview

**Priority:** P1
**Files:** `core/curation-system.js`, `ui/curation-modal.js`
**Issue:** No way to test pipelines without modifying actual data

**Implementation (In-Memory Clone):**

1. **Add Preview Method to CurationSystem:**
```javascript
/**
 * Execute pipeline in preview mode (non-destructive)
 * Creates temporary in-memory store clone
 */
async executePipelinePreview(pipelineId, options = {}) {
  const pipeline = this.getPipeline(pipelineId);
  if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);

  // Create temporary store clones
  const previewStores = new Map();
  for (const storeId of pipeline.targetStores || [pipeline.storeId]) {
    const originalData = this._stores.get(storeId);
    previewStores.set(storeId, this._deepClone(originalData));
  }

  // Execute with preview stores
  const result = await this._executePipelineInternal(pipeline, {
    ...options,
    stores: previewStores,
    preview: true
  });

  // Return result with diff
  return {
    ...result,
    preview: true,
    changes: this._calculateDiff(pipeline.targetStores, previewStores),
    applyChanges: () => this._applyPreviewChanges(previewStores)
  };
}
```

2. **Add Preview Button to UI:**
```javascript
const previewButton = document.createElement('button');
previewButton.className = 'council-btn council-btn-secondary council-btn-sm';
previewButton.innerHTML = '👁 Preview';
previewButton.onclick = () => this._previewPipeline(pipeline.id);
```

3. **Add Preview Results Modal:**
   - Show "before" and "after" comparison
   - Highlight changes (added, modified, deleted)
   - "Apply Changes" button to commit
   - "Discard" button to cancel

**Acceptance Criteria:**
- [ ] Preview button appears next to Run button
- [ ] Preview executes without modifying actual stores
- [ ] Preview shows changes that would be made
- [ ] User can apply or discard preview changes
- [ ] Console logs `[CurationSystem] Pipeline preview: {id}`

---

### 2.3 Default Pipelines (28 Total)

#### Task 2.3.1: create-default-crud-pipelines

**Priority:** P0
**Files:** `core/curation-system.js`, `data/pipelines/crud/*.json`
**Issue:** No default CRUD pipelines for stores

**14 Stores Requiring CRUD Pipelines:**

| # | Store ID | Type | CRUD Pipeline ID |
|---|----------|------|------------------|
| 1 | storyDraft | Singleton | crud-storyDraft |
| 2 | storyOutline | Singleton | crud-storyOutline |
| 3 | storySynopsis | Singleton | crud-storySynopsis |
| 4 | plotLines | Collection | crud-plotLines |
| 5 | scenes | Collection | crud-scenes |
| 6 | dialogueHistory | Collection | crud-dialogueHistory |
| 7 | characterSheets | Collection | crud-characterSheets |
| 8 | characterDevelopment | Collection | crud-characterDevelopment |
| 9 | characterInventory | Collection | crud-characterInventory |
| 10 | characterPositions | Collection | crud-characterPositions |
| 11 | factionSheets | Collection | crud-factionSheets |
| 12 | locationSheets | Collection | crud-locationSheets |
| 13 | currentSituation | Singleton | crud-currentSituation |
| 14 | agentCommentary | Collection | crud-agentCommentary |

**CRUD Pipeline Template (Collection):**
```json
{
  "id": "crud-{storeId}",
  "name": "{StoreName} CRUD",
  "description": "Create, Read, Update, Delete operations for {StoreName}",
  "storeId": "{storeId}",
  "operations": {
    "create": {
      "actions": [
        {
          "id": "validate-input",
          "name": "Validate Input",
          "positionId": "archivist",
          "promptTemplate": "Validate the following data for {StoreName}:\n{{input}}\n\nEnsure all required fields are present and valid."
        },
        {
          "id": "create-entry",
          "name": "Create Entry",
          "positionId": "{storeTopologist}",
          "promptTemplate": "Create a new {StoreName} entry with the validated data."
        }
      ]
    },
    "read": {
      "actions": [
        {
          "id": "query-store",
          "name": "Query Store",
          "positionId": "archivist",
          "promptTemplate": "Retrieve {StoreName} data matching: {{query}}"
        }
      ]
    },
    "update": {
      "actions": [
        {
          "id": "validate-update",
          "name": "Validate Update",
          "positionId": "archivist",
          "promptTemplate": "Validate the update for {StoreName} entry {{id}}:\n{{changes}}"
        },
        {
          "id": "apply-update",
          "name": "Apply Update",
          "positionId": "{storeTopologist}",
          "promptTemplate": "Apply the validated changes to {StoreName} entry {{id}}."
        }
      ]
    },
    "delete": {
      "actions": [
        {
          "id": "confirm-delete",
          "name": "Confirm Delete",
          "positionId": "archivist",
          "promptTemplate": "Confirm deletion of {StoreName} entry {{id}}. Check for dependencies."
        }
      ]
    }
  }
}
```

**CRUD Pipeline Template (Singleton):**
```json
{
  "id": "crud-{storeId}",
  "name": "{StoreName} CRUD",
  "description": "Read and Update operations for {StoreName} (singleton)",
  "storeId": "{storeId}",
  "operations": {
    "read": {
      "actions": [
        {
          "id": "get-current",
          "name": "Get Current State",
          "positionId": "archivist",
          "promptTemplate": "Retrieve current {StoreName} data."
        }
      ]
    },
    "update": {
      "actions": [
        {
          "id": "validate-update",
          "name": "Validate Update",
          "positionId": "archivist",
          "promptTemplate": "Validate the update for {StoreName}:\n{{changes}}"
        },
        {
          "id": "apply-update",
          "name": "Apply Update",
          "positionId": "{storeTopologist}",
          "promptTemplate": "Apply the validated changes to {StoreName}."
        }
      ]
    }
  }
}
```

**Implementation:**
1. Create `data/pipelines/crud/` directory
2. Generate 14 CRUD pipeline JSON files
3. Register pipelines in `CurationSystem._registerDefaultCRUDPipelines()`
4. Update `CurationSystem.init()` to load default pipelines

---

#### Task 2.3.2: create-default-rag-pipelines

**Priority:** P0
**Files:** `core/curation-system.js`, `data/pipelines/rag/*.json`
**Issue:** No default RAG pipelines for stores

**14 RAG Pipelines:**

| # | Store ID | RAG Pipeline ID | Purpose |
|---|----------|-----------------|---------|
| 1 | storyDraft | rag-storyDraft | Retrieve current draft context |
| 2 | storyOutline | rag-storyOutline | Retrieve outline for planning |
| 3 | storySynopsis | rag-storySynopsis | Get 5W+H context |
| 4 | plotLines | rag-plotLines | Find relevant plot threads |
| 5 | scenes | rag-scenes | Get scene context |
| 6 | dialogueHistory | rag-dialogueHistory | Find relevant dialogue |
| 7 | characterSheets | rag-characterSheets | Character lookup |
| 8 | characterDevelopment | rag-characterDevelopment | Character arc context |
| 9 | characterInventory | rag-characterInventory | What characters have |
| 10 | characterPositions | rag-characterPositions | Where characters are |
| 11 | factionSheets | rag-factionSheets | Faction information |
| 12 | locationSheets | rag-locationSheets | Location details |
| 13 | currentSituation | rag-currentSituation | Current story state |
| 14 | agentCommentary | rag-agentCommentary | Past agent notes |

**RAG Pipeline Template:**
```json
{
  "id": "rag-{storeId}",
  "name": "{StoreName} RAG",
  "description": "Retrieval-Augmented Generation for {StoreName}",
  "targetStores": ["{storeId}"],
  "canTriggerFromPipeline": true,
  "canTriggerManually": true,
  "actions": [
    {
      "id": "parse-query",
      "name": "Parse Query",
      "positionId": "archivist",
      "promptTemplate": "Parse the following query to extract search terms:\n{{query}}\n\nIdentify key entities, attributes, and relationships to search for."
    },
    {
      "id": "search-store",
      "name": "Search Store",
      "positionId": "{storeTopologist}",
      "promptTemplate": "Search {StoreName} for entries matching:\n{{parsedQuery}}\n\nReturn the most relevant results."
    },
    {
      "id": "rank-results",
      "name": "Rank Results",
      "positionId": "archivist",
      "promptTemplate": "Rank the following results by relevance to the original query:\n\nQuery: {{query}}\nResults: {{searchResults}}\n\nReturn top {{maxResults}} results."
    },
    {
      "id": "format-output",
      "name": "Format Output",
      "positionId": "archivist",
      "promptTemplate": "Format the ranked results for context injection:\n{{rankedResults}}\n\nProvide clear, concise context."
    }
  ],
  "inputSchema": {
    "query": { "type": "string", "required": true },
    "maxResults": { "type": "number", "default": 5 }
  },
  "outputSchema": {
    "results": { "type": "array" },
    "formatted": { "type": "string" }
  }
}
```

**Implementation:**
1. Create `data/pipelines/rag/` directory
2. Generate 14 RAG pipeline JSON files
3. Register pipelines in `CurationSystem._registerDefaultRAGPipelines()`
4. Update `CurationSystem.init()` to load default pipelines

---

#### Task 2.3.3: pipeline-testing-integration

**Priority:** P1
**Files:** `tests/curation-pipelines-test.js`, `.claude/commands/test-pipelines.md`
**Issue:** No automated testing for default pipelines

**Implementation:**
1. Create test file `tests/curation-pipelines-test.js`
2. Test each CRUD pipeline:
   - Create operation with valid data
   - Read operation
   - Update operation
   - Delete operation (collections only)
3. Test each RAG pipeline:
   - Query with sample data
   - Verify result format
4. Create slash command for manual testing

**Acceptance Criteria:**
- [ ] All 14 CRUD pipelines pass validation tests
- [ ] All 14 RAG pipelines pass validation tests
- [ ] Tests can run via `/test-pipelines` command
- [ ] Test results logged to console

---

## Phase 3: Kernel Preset System

**Estimated Effort:** 10-15 hours
**Focus:** Centralize configuration management, per-system schemas

### 3.1 Architecture Design

#### Current State
- Presets stored in `data/presets/*.json`
- Pipeline system owns preset management
- No per-system configuration schemas
- Import/export not system-aware

#### Target State
- Kernel owns all system configurations
- Each system defines its own config schema
- Kernel handles cross-system compilation
- Import/export is per-system with auto-detection
- Tiered defaults: basic, complex, comprehensive

### 3.2 Per-System Config Schemas

#### Task 3.2.1: define-system-config-schemas

**Priority:** P0
**File:** `schemas/config-schemas.js`
**Issue:** No per-system configuration schemas

**System Config Schemas:**

```javascript
const SystemConfigSchemas = {
  // Curation System Config
  curation: {
    version: { type: "string", required: true },
    storeSchemas: { type: "array", items: StoreSchemaSchema },
    crudPipelines: { type: "array", items: CRUDPipelineSchema },
    ragPipelines: { type: "array", items: RAGPipelineSchema },
    agents: { type: "array", items: AgentSchema },
    positions: { type: "array", items: PositionSchema }
  },

  // Character System Config
  character: {
    version: { type: "string", required: true },
    directorConfig: { type: "object", schema: DirectorConfigSchema },
    voicingDefaults: { type: "object", schema: VoicingDefaultsSchema },
    avatarSettings: { type: "object", schema: AvatarSettingsSchema }
  },

  // Prompt Builder System Config
  promptBuilder: {
    version: { type: "string", required: true },
    customTokens: { type: "array", items: TokenDefinitionSchema },
    macros: { type: "array", items: MacroSchema },
    transforms: { type: "array", items: TransformSchema },
    presetPrompts: { type: "array", items: PresetPromptSchema }
  },

  // Pipeline Builder System Config
  pipeline: {
    version: { type: "string", required: true },
    agents: { type: "array", items: AgentSchema },
    positions: { type: "array", items: PositionSchema },
    teams: { type: "array", items: TeamSchema },
    pipelines: { type: "array", items: PipelineSchema }
  },

  // Orchestration System Config
  orchestration: {
    version: { type: "string", required: true },
    mode: { type: "enum", values: ["synthesis", "compilation", "injection"] },
    injectionMappings: { type: "array", items: InjectionMappingSchema },
    executionSettings: { type: "object", schema: ExecutionSettingsSchema }
  },

  // Kernel Global Config
  kernel: {
    version: { type: "string", required: true },
    activePreset: { type: "string" },
    uiSettings: { type: "object", schema: UISettingsSchema },
    apiDefaults: { type: "object", schema: ApiConfigSchema }
  }
};
```

**Implementation:**
1. Create `schemas/config-schemas.js`
2. Define schema for each system
3. Export as `SystemConfigSchemas`
4. Update `schemas/systems.js` to import config schemas

---

#### Task 3.2.2: kernel-config-manager

**Priority:** P0
**File:** `core/kernel.js`
**Issue:** Kernel doesn't manage system configurations

**Implementation:**

1. **Add Config Manager to Kernel:**
```javascript
// In kernel.js
_configManager: {
  schemas: new Map(),      // System config schemas
  configs: new Map(),      // Current configs per system
  presets: new Map(),      // Named presets (full configs)
  dirty: new Set()         // Systems with unsaved changes
},

/**
 * Register a system's config schema
 */
registerConfigSchema(systemId, schema) {
  this._configManager.schemas.set(systemId, schema);
  this._log('info', `Registered config schema for ${systemId}`);
},

/**
 * Get a system's current config
 */
getSystemConfig(systemId) {
  return this._configManager.configs.get(systemId);
},

/**
 * Set a system's config
 */
setSystemConfig(systemId, config) {
  // Validate against schema
  const schema = this._configManager.schemas.get(systemId);
  if (schema && !this._validateConfig(config, schema)) {
    throw new Error(`Invalid config for ${systemId}`);
  }

  this._configManager.configs.set(systemId, config);
  this._configManager.dirty.add(systemId);
  this._emit('config:changed', { systemId, config });
},

/**
 * Compile all system configs into a preset
 */
compilePreset(name, description = '') {
  const compiled = {
    name,
    description,
    version: this.VERSION,
    createdAt: Date.now(),
    systems: {}
  };

  for (const [systemId, config] of this._configManager.configs) {
    compiled.systems[systemId] = config;
  }

  return compiled;
},

/**
 * Load a compiled preset
 */
loadPreset(preset) {
  for (const [systemId, config] of Object.entries(preset.systems)) {
    this.setSystemConfig(systemId, config);

    // Notify system to reload config
    this._emit(`${systemId}:config:reload`, config);
  }
}
```

2. **Add Import/Export Methods:**
```javascript
/**
 * Export a single system's config
 */
exportSystemConfig(systemId) {
  const config = this._configManager.configs.get(systemId);
  return {
    systemId,
    version: this.VERSION,
    exportedAt: Date.now(),
    config
  };
},

/**
 * Import a system config (auto-detects system from schema)
 */
importSystemConfig(data) {
  // Auto-detect system from data structure
  const systemId = data.systemId || this._detectSystemFromConfig(data.config);

  if (!systemId) {
    throw new Error('Could not determine target system for import');
  }

  this.setSystemConfig(systemId, data.config);
  return systemId;
},

/**
 * Detect system from config structure
 */
_detectSystemFromConfig(config) {
  // Check for distinctive fields
  if (config.storeSchemas || config.crudPipelines) return 'curation';
  if (config.directorConfig || config.voicingDefaults) return 'character';
  if (config.customTokens || config.macros) return 'promptBuilder';
  if (config.teams && config.pipelines) return 'pipeline';
  if (config.injectionMappings) return 'orchestration';
  return null;
}
```

---

### 3.3 Update Existing Presets

#### Task 3.3.1: migrate-existing-presets

**Priority:** P1
**Files:** `data/presets/*.json`
**Issue:** Current presets don't match new schema structure

**Current Files to Migrate:**
- `data/presets/default-pipeline.json`
- `data/presets/quick-pipeline.json`
- `data/presets/standard-pipeline.json`

**Migration Steps:**
1. Read existing preset structure
2. Map to new per-system format
3. Validate against new schemas
4. Write updated files
5. Create migration script for user presets

---

### 3.4 Tiered Default Presets

#### Task 3.4.1: create-tiered-presets

**Priority:** P1
**Files:** `data/presets/basic.json`, `data/presets/standard.json`, `data/presets/comprehensive.json`

**Basic Preset:**
- Minimal agents (Publisher, Editor, Archivist)
- Single-phase pipeline
- Essential stores only
- Injection mode by default
- Good for quick responses, low API usage

**Standard Preset:**
- Full prose team
- 3-phase pipeline (context, draft, review)
- All default stores
- Synthesis mode by default
- Balanced quality/speed

**Comprehensive Preset:**
- All teams fully staffed
- Full 19-phase editorial pipeline
- All stores with default pipelines
- Multiple gavel points
- Maximum quality, higher API usage

**Implementation:**
1. Create preset files
2. Register as built-in presets in Kernel
3. Add preset selector to UI (Nav Modal settings)
4. Document each preset's use case

---

## Testing Strategy

### Unit Tests
- Schema validation tests
- Config manager tests
- Import/export tests

### Integration Tests
- Pipeline execution tests
- Cross-system communication tests
- Preset loading tests

### UI Tests
- Update `/ui-test` command to cover new features
- Add pipeline execution tests
- Add preset switching tests

---

## Task Dependency Graph

```
Phase 1: Bug Fixes (Independent)
├── 1.1.1 injection-edit-functionality
├── 1.2.1 nav-modal-auto-reappear
├── 1.3.1 prompt-builder-mode-switch-error
├── 1.4.1 update-injection-docs
└── 1.4.2 add-missing-svg

Phase 2: Curation (Sequential)
├── 2.1.1 curation-pipeline-run-button
├── 2.2.1 curation-pipeline-preview
│   └── Depends on: 2.1.1
├── 2.3.1 create-default-crud-pipelines
├── 2.3.2 create-default-rag-pipelines
│   └── Can run parallel with 2.3.1
└── 2.3.3 pipeline-testing-integration
    └── Depends on: 2.3.1, 2.3.2

Phase 3: Kernel Preset System (Sequential)
├── 3.2.1 define-system-config-schemas
├── 3.2.2 kernel-config-manager
│   └── Depends on: 3.2.1
├── 3.3.1 migrate-existing-presets
│   └── Depends on: 3.2.2
└── 3.4.1 create-tiered-presets
    └── Depends on: 3.3.1
```

---

## Estimated Effort Summary

| Phase | Tasks | Simple | Moderate | Complex | Total Hours |
|-------|-------|--------|----------|---------|-------------|
| 1: Bug Fixes | 5 | 3 | 2 | 0 | 5-6 |
| 2: Curation | 5 | 1 | 2 | 2 | 8-12 |
| 3: Presets | 4 | 0 | 2 | 2 | 10-15 |
| **Total** | **14** | **4** | **6** | **4** | **23-33** |

---

## Session Guidelines

### Context Budget
- Target: ~80k tokens per session
- Leave 20k buffer for tool calls and responses

### Handoff Protocol
1. Complete current task fully
2. Update todo list with remaining tasks
3. Create handoff doc in `.claude/handoffs/`
4. Note any blockers or decisions needed

### Success Criteria Per Session
- At least one task fully completed
- All changes tested
- Code committed with clear message
- Handoff doc created if session ends mid-phase

---

## Quick Reference

| Task ID | Priority | Complexity | Primary File | Est. Hours |
|---------|----------|------------|--------------|------------|
| injection-edit-functionality | P0 | Moderate | `ui/injection-modal.js` | 2-3 |
| nav-modal-auto-reappear | P1 | Simple | `ui/nav-modal.js` | 0.5 |
| prompt-builder-mode-switch-error | P2 | Moderate | `ui/components/prompt-builder.js` | 1-2 |
| update-injection-docs | P3 | Simple | `docs/UI_BEHAVIOR.md` | 0.25 |
| add-missing-svg | P3 | Simple | `img/council_pipeline.svg` | 0.5 |
| curation-pipeline-run-button | P0 | Moderate | `ui/curation-modal.js` | 2-3 |
| curation-pipeline-preview | P1 | Complex | `core/curation-system.js` | 3-4 |
| create-default-crud-pipelines | P0 | Complex | `core/curation-system.js` | 3-4 |
| create-default-rag-pipelines | P0 | Moderate | `core/curation-system.js` | 2-3 |
| pipeline-testing-integration | P1 | Moderate | `tests/curation-pipelines-test.js` | 2 |
| define-system-config-schemas | P0 | Moderate | `schemas/config-schemas.js` | 2-3 |
| kernel-config-manager | P0 | Complex | `core/kernel.js` | 4-5 |
| migrate-existing-presets | P1 | Moderate | `data/presets/*.json` | 2-3 |
| create-tiered-presets | P1 | Complex | `data/presets/*.json` | 3-4 |

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-13
**Source:** UI Test Report, User Requirements (2025-12-13)
