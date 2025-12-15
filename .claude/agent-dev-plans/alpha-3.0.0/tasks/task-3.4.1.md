# Task 3.4.1: create-tiered-presets

## Metadata

- **Group**: 3 - Kernel Preset System
- **Block**: 4 - Tiered Presets
- **Priority**: P1
- **Complexity**: complex
- **Agent**: dev-opus
- **Status**: PENDING

## Description

Create three tiered presets (basic, standard, comprehensive) that offer different levels of pipeline complexity, API usage, and quality output. Each tier targets different use cases.

## Files

- `data/presets/basic.json` - Minimal preset
- `data/presets/standard.json` - Balanced preset
- `data/presets/comprehensive.json` - Maximum quality preset
- `ui/nav-modal.js` - Add preset selector (optional)

## Dependencies

- Task 3.3.1: migrate-existing-presets (needs new format)

## Acceptance Criteria

- [ ] 3 tiered preset files created
- [ ] Each tier has appropriate agents/phases/settings
- [ ] Presets registered as built-in on init
- [ ] Presets selectable in UI (stretch goal)
- [ ] Documentation in each preset file

## Implementation Notes

### Tier Definitions

| Tier | Agents | Phases | Mode | API Cost | Quality |
|------|--------|--------|------|----------|---------|
| Basic | 3 | 1 | injection | Low | Good |
| Standard | 8 | 3 | synthesis | Medium | Better |
| Comprehensive | 23 | 19 | synthesis | High | Best |

### Basic Preset

**Target Use Case**: Quick responses, low API usage, simple scenarios

```json
{
  "name": "basic",
  "description": "Minimal configuration for quick responses with low API usage",
  "version": "2.2.0",
  "systems": {
    "pipeline": {
      "agents": [
        { "id": "publisher", "name": "Publisher", "model": "default" },
        { "id": "editor", "name": "Editor", "model": "default" },
        { "id": "archivist", "name": "Archivist", "model": "default" }
      ],
      "positions": [
        { "id": "lead-editor", "agentId": "editor" },
        { "id": "data-manager", "agentId": "archivist" }
      ],
      "teams": [
        { "id": "core-team", "positionIds": ["lead-editor", "data-manager"] }
      ],
      "pipelines": [
        {
          "id": "basic-pipeline",
          "name": "Basic Pipeline",
          "phases": [
            {
              "id": "respond",
              "name": "Generate Response",
              "teamId": "core-team",
              "actions": [
                { "id": "draft", "positionId": "lead-editor" }
              ]
            }
          ]
        }
      ]
    },
    "orchestration": {
      "mode": "injection",
      "executionSettings": {
        "timeout": 30000,
        "retries": 1,
        "gavelEnabled": false
      }
    }
  }
}
```

### Standard Preset

**Target Use Case**: Balanced quality/speed for typical roleplay

```json
{
  "name": "standard",
  "description": "Balanced configuration for quality roleplay with moderate API usage",
  "version": "2.2.0",
  "systems": {
    "pipeline": {
      "agents": [
        { "id": "publisher", ... },
        { "id": "editor", ... },
        { "id": "story-editor", ... },
        { "id": "dialogue-editor", ... },
        { "id": "continuity-editor", ... },
        { "id": "archivist", ... },
        { "id": "character-voice", ... },
        { "id": "world-builder", ... }
      ],
      "teams": [
        { "id": "prose-team", ... },
        { "id": "continuity-team", ... }
      ],
      "pipelines": [
        {
          "id": "standard-pipeline",
          "phases": [
            { "id": "context", "name": "Context Gathering" },
            { "id": "draft", "name": "Draft Generation" },
            { "id": "review", "name": "Review & Polish" }
          ]
        }
      ]
    },
    "orchestration": {
      "mode": "synthesis",
      "executionSettings": {
        "timeout": 60000,
        "retries": 2,
        "gavelEnabled": true
      }
    }
  }
}
```

### Comprehensive Preset

**Target Use Case**: Maximum quality for serious writers

```json
{
  "name": "comprehensive",
  "description": "Full editorial pipeline for maximum quality output",
  "version": "2.2.0",
  "systems": {
    "pipeline": {
      "agents": [
        // 23 agents across all departments
        { "id": "publisher", ... },
        { "id": "managing-editor", ... },
        { "id": "story-editor", ... },
        { "id": "dialogue-editor", ... },
        { "id": "continuity-editor", ... },
        { "id": "prose-stylist", ... },
        { "id": "character-voice-1", ... },
        { "id": "character-voice-2", ... },
        { "id": "character-voice-3", ... },
        { "id": "world-builder", ... },
        { "id": "fact-checker", ... },
        { "id": "pacing-analyst", ... },
        { "id": "emotional-beat-tracker", ... },
        // ... more agents
      ],
      "teams": [
        { "id": "executive", ... },
        { "id": "prose-team", ... },
        { "id": "dialogue-team", ... },
        { "id": "continuity-team", ... },
        { "id": "character-team", ... },
        { "id": "world-team", ... }
      ],
      "pipelines": [
        {
          "id": "comprehensive-pipeline",
          "phases": [
            // 19 phases for full editorial workflow
            { "id": "situation-analysis", ... },
            { "id": "character-state-check", ... },
            { "id": "world-state-check", ... },
            { "id": "continuity-review", ... },
            { "id": "outline-draft", ... },
            { "id": "prose-draft", ... },
            { "id": "dialogue-draft", ... },
            { "id": "voice-check", ... },
            { "id": "pacing-review", ... },
            { "id": "emotional-beats", ... },
            { "id": "fact-check", ... },
            { "id": "continuity-final", ... },
            { "id": "prose-polish", ... },
            { "id": "dialogue-polish", ... },
            { "id": "editorial-review", ... },
            { "id": "executive-review", ... },
            { "id": "gavel-point-1", ... },
            { "id": "final-assembly", ... },
            { "id": "publish", ... }
          ],
          "gavelPoints": [
            { "afterPhase": "outline-draft", "required": false },
            { "afterPhase": "dialogue-draft", "required": false },
            { "afterPhase": "editorial-review", "required": true },
            { "afterPhase": "executive-review", "required": false },
            { "afterPhase": "final-assembly", "required": true }
          ]
        }
      ]
    },
    "orchestration": {
      "mode": "synthesis",
      "executionSettings": {
        "timeout": 120000,
        "retries": 3,
        "gavelEnabled": true
      }
    }
  }
}
```

### Registration

In kernel.js init:

```javascript
async _registerBuiltInPresets() {
  const builtIn = ['basic', 'standard', 'comprehensive'];

  for (const name of builtIn) {
    const preset = await this._loadPresetFile(`data/presets/${name}.json`);
    this._configManager.presets.set(name, preset);
  }

  this._log('info', 'Built-in presets registered');
}
```

### UI Selector (Stretch Goal)

Add preset dropdown to Nav Modal settings:

```javascript
_renderPresetSelector() {
  const select = document.createElement('select');
  select.id = 'council-preset-selector';

  for (const [name, preset] of this._kernel._configManager.presets) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = `${preset.name} - ${preset.description}`;
    select.appendChild(option);
  }

  select.onchange = () => {
    const preset = this._kernel._configManager.presets.get(select.value);
    this._kernel.loadCompiledPreset(preset);
  };

  return select;
}
```

## Testing

1. Create all 3 preset files
2. Verify JSON validity
3. Load each preset in extension
4. Verify agents/phases created correctly
5. Test pipeline execution at each tier
6. Compare output quality across tiers
