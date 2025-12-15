# Task 3.3.1: migrate-existing-presets

## Metadata

- **Group**: 3 - Kernel Preset System
- **Block**: 3 - Preset Migration
- **Priority**: P1
- **Complexity**: moderate
- **Agent**: dev-sonnet
- **Status**: PENDING

## Description

Migrate existing preset files to the new per-system schema format. Update the three existing presets and create a migration utility for user presets.

## Files

- `data/presets/default-pipeline.json` - Update format
- `data/presets/quick-pipeline.json` - Update format
- `data/presets/standard-pipeline.json` - Update format
- `scripts/migrate-presets.cjs` - Migration utility (if needed)

## Dependencies

- Task 3.2.2: kernel-config-manager (needs config structure)

## Acceptance Criteria

- [ ] All 3 existing presets migrated to new format
- [ ] Preset version updated to 2.2.0
- [ ] Per-system configuration sections added
- [ ] Pipeline data moved to systems.pipeline
- [ ] Migration script handles user presets
- [ ] Old presets backed up before migration

## Implementation Notes

### Current Format (2.1.0)

```json
{
  "name": "preset-name",
  "version": "2.1.0",
  "agents": [...],
  "positions": [...],
  "teams": [...],
  "pipelines": [...]
}
```

### New Format (2.2.0)

```json
{
  "name": "preset-name",
  "description": "Preset description",
  "version": "2.2.0",
  "createdAt": 1702600000000,
  "systems": {
    "curation": {
      "version": "2.0.0",
      "storeSchemas": [],
      "crudPipelines": [],
      "ragPipelines": [],
      "agents": [],
      "positions": []
    },
    "character": {
      "version": "2.0.0",
      "directorConfig": { "enabled": true },
      "voicingDefaults": { "style": "natural" },
      "avatarSettings": { "autoGenerate": false }
    },
    "promptBuilder": {
      "version": "2.1.0",
      "customTokens": [],
      "macros": [],
      "transforms": [],
      "presetPrompts": []
    },
    "pipeline": {
      "version": "2.0.0",
      "agents": [...],
      "positions": [...],
      "teams": [...],
      "pipelines": [...]
    },
    "orchestration": {
      "version": "2.0.0",
      "mode": "synthesis",
      "injectionMappings": [],
      "executionSettings": {
        "timeout": 60000,
        "retries": 2,
        "gavelEnabled": true
      }
    },
    "kernel": {
      "version": "2.0.0",
      "activePreset": null,
      "uiSettings": { "theme": "default" },
      "apiDefaults": { "temperature": 0.7 }
    }
  }
}
```

### Migration Function

```javascript
function migratePreset(oldPreset) {
  const newPreset = {
    name: oldPreset.name,
    description: oldPreset.description || "",
    version: "2.2.0",
    createdAt: Date.now(),
    systems: {
      curation: createDefaultCurationConfig(),
      character: createDefaultCharacterConfig(),
      promptBuilder: createDefaultPromptBuilderConfig(),
      pipeline: {
        version: "2.0.0",
        agents: oldPreset.agents || [],
        positions: oldPreset.positions || [],
        teams: oldPreset.teams || [],
        pipelines: oldPreset.pipelines || []
      },
      orchestration: createDefaultOrchestrationConfig(),
      kernel: createDefaultKernelConfig()
    }
  };

  // Copy any existing system-specific data
  if (oldPreset.systems) {
    for (const [systemId, config] of Object.entries(oldPreset.systems)) {
      newPreset.systems[systemId] = {
        ...newPreset.systems[systemId],
        ...config
      };
    }
  }

  return newPreset;
}
```

### Migration Steps

1. **Backup existing files**
   ```bash
   cp data/presets/default-pipeline.json data/presets/default-pipeline.json.backup
   ```

2. **Read and migrate each preset**
   - Load JSON
   - Run migration function
   - Validate against new schema
   - Write updated JSON

3. **Verify migration**
   - Check all fields present
   - Verify pipeline data preserved
   - Test loading in extension

### Files to Migrate

| File | Notes |
|------|-------|
| default-pipeline.json | Empty pipeline, minimal config |
| quick-pipeline.json | Single-phase, basic agents |
| standard-pipeline.json | Multi-phase, full teams |

## Testing

1. Back up original files
2. Run migration on each preset
3. Verify JSON syntax valid
4. Load presets in extension
5. Verify pipeline data intact
6. Test preset compilation/loading
