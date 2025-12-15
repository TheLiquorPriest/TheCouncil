# Alpha 3.0.0 Reference

Context and specifications for this development plan.

## Key Files

### Core Systems
- `core/kernel.js` - The Council Kernel
- `core/curation-system.js` - Curation System
- `core/pipeline-builder-system.js` - Pipeline Builder
- `core/orchestration-system.js` - Orchestration System

### UI
- `ui/curation-modal.js` - Curation UI
- `ui/injection-modal.js` - Injection mode UI
- `ui/nav-modal.js` - Navigation modal
- `ui/components/prompt-builder.js` - Prompt Builder component

### Schemas
- `schemas/systems.js` - All data schemas
- `schemas/config-schemas.js` - Per-system config schemas (to create)

### Presets
- `data/presets/default-pipeline.json`
- `data/presets/quick-pipeline.json`
- `data/presets/standard-pipeline.json`

## Architecture Reference

### Kernel Event Bus

```javascript
// Emitting events
this._kernel.emit('system:event', { data });

// Listening to events
this._kernel.on('system:event', (data) => { });
```

### Modal Pattern

```javascript
// Show modal through Kernel
this._kernel.showModal('modalId');

// Hide modal (triggers kernel:modal:hidden)
this._kernel.hideModal();
```

### Storage Pattern

```javascript
// Per-chat storage
const data = this._kernel.load('key');
this._kernel.save('key', data);
```

## Group 2: Curation Architecture

### Pipeline Execution Flow

```
UI: Click "Run" button
    ↓
CurationModal._runPipeline(id)
    ↓
CurationSystem.executePipeline(id, options)
    ↓
Pipeline actions execute sequentially
    ↓
Results returned to UI
```

### Preview Mode Design

```
UI: Click "Preview" button
    ↓
CurationModal._previewPipeline(id)
    ↓
CurationSystem.executePipelinePreview(id)
    ↓
Clone stores in memory
    ↓
Execute pipeline on clones
    ↓
Calculate diff
    ↓
Return preview result with applyChanges()
```

### 14 Stores for Default Pipelines

| Store | Type | Topologist |
|-------|------|------------|
| storyDraft | Singleton | storykeeper |
| storyOutline | Singleton | storykeeper |
| storySynopsis | Singleton | storykeeper |
| plotLines | Collection | plotmaster |
| scenes | Collection | scenemaster |
| dialogueHistory | Collection | dialoguist |
| characterSheets | Collection | charactermaster |
| characterDevelopment | Collection | charactermaster |
| characterInventory | Collection | inventorist |
| characterPositions | Collection | cartographer |
| factionSheets | Collection | factionmaster |
| locationSheets | Collection | cartographer |
| currentSituation | Singleton | situationalist |
| agentCommentary | Collection | commentator |

## Group 3: Preset Architecture

### Current State
- Presets in `data/presets/*.json`
- Pipeline system owns preset management
- No per-system schemas

### Target State

```javascript
// Kernel manages all configs
Kernel._configManager = {
  schemas: Map<systemId, schema>,
  configs: Map<systemId, config>,
  presets: Map<name, compiledPreset>
};

// Per-system config structure
{
  curation: { ... },
  character: { ... },
  promptBuilder: { ... },
  pipeline: { ... },
  orchestration: { ... },
  kernel: { ... }
}
```

### Tiered Presets

| Preset | Agents | Mode | Use Case |
|--------|--------|------|----------|
| basic | 3 | injection | Quick, low API |
| standard | 8 | synthesis | Balanced |
| comprehensive | 23 | synthesis | Max quality |

## Testing

### Browser Automation

```javascript
// Navigate
mcp__playwright__browser_navigate({ url: "http://127.0.0.1:8000/" })

// Get element refs
mcp__playwright__browser_snapshot()

// Click element
mcp__playwright__browser_click({ element: "desc", ref: "eXXX" })

// Check console
mcp__playwright__browser_console_messages({ level: "error" })
```

### Integration Tests

```javascript
// In browser console
window.TheCouncil.runIntegrationTests()
```

## Source Documents

- UI Test Report: Generated 2025-12-13
- System Definitions: `.claude/definitions/SYSTEM_DEFINITIONS.md`
- UI Views: `.claude/definitions/VIEWS.md`
- Original Plan: `Reference!-OLD-MONO-DOC.md`
