# Task 3.2.1: define-system-config-schemas

## Metadata

- **Group**: 3 - Kernel Preset System
- **Block**: 2 - Config Schemas
- **Priority**: P0
- **Complexity**: complex
- **Agent**: dev-opus
- **Status**: PENDING

## Description

Define per-system configuration schemas that specify the structure, types, and validation rules for each system's configuration. This enables type-safe config management and auto-detection during import.

## Files

- `schemas/config-schemas.js` - Create new file with all schemas
- `schemas/systems.js` - Import and expose config schemas

## Dependencies

None - first task in Group 3

## Acceptance Criteria

- [ ] Config schema defined for each of 6 systems
- [ ] Schemas include type definitions and required fields
- [ ] Helper functions for schema access
- [ ] Schemas exported via systems.js
- [ ] Schema validation function available

## Implementation Notes

### Schema Structure

```javascript
// schemas/config-schemas.js

const SystemConfigSchemas = {

  // Curation System Config
  curation: {
    version: { type: "string", required: true },
    storeSchemas: {
      type: "array",
      items: { ref: "StoreSchema" },
      default: []
    },
    crudPipelines: {
      type: "array",
      items: { ref: "CRUDPipelineSchema" },
      default: []
    },
    ragPipelines: {
      type: "array",
      items: { ref: "RAGPipelineSchema" },
      default: []
    },
    agents: {
      type: "array",
      items: { ref: "AgentSchema" },
      default: []
    },
    positions: {
      type: "array",
      items: { ref: "PositionSchema" },
      default: []
    }
  },

  // Character System Config
  character: {
    version: { type: "string", required: true },
    directorConfig: {
      type: "object",
      schema: {
        enabled: { type: "boolean", default: true },
        systemPrompt: { type: "string", default: "" }
      }
    },
    voicingDefaults: {
      type: "object",
      schema: {
        style: { type: "string", default: "natural" },
        consistency: { type: "number", default: 0.8 }
      }
    },
    avatarSettings: {
      type: "object",
      schema: {
        autoGenerate: { type: "boolean", default: false },
        sourceStores: { type: "array", items: { type: "string" } }
      }
    }
  },

  // Prompt Builder System Config
  promptBuilder: {
    version: { type: "string", required: true },
    customTokens: {
      type: "array",
      items: { ref: "TokenDefinitionSchema" },
      default: []
    },
    macros: {
      type: "array",
      items: { ref: "MacroSchema" },
      default: []
    },
    transforms: {
      type: "array",
      items: { ref: "TransformSchema" },
      default: []
    },
    presetPrompts: {
      type: "array",
      items: { ref: "PresetPromptSchema" },
      default: []
    }
  },

  // Pipeline Builder System Config
  pipeline: {
    version: { type: "string", required: true },
    agents: {
      type: "array",
      items: { ref: "AgentSchema" },
      default: []
    },
    positions: {
      type: "array",
      items: { ref: "PositionSchema" },
      default: []
    },
    teams: {
      type: "array",
      items: { ref: "TeamSchema" },
      default: []
    },
    pipelines: {
      type: "array",
      items: { ref: "PipelineSchema" },
      default: []
    }
  },

  // Orchestration System Config
  orchestration: {
    version: { type: "string", required: true },
    mode: {
      type: "enum",
      values: ["synthesis", "compilation", "injection"],
      default: "synthesis"
    },
    injectionMappings: {
      type: "array",
      items: { ref: "InjectionMappingSchema" },
      default: []
    },
    executionSettings: {
      type: "object",
      schema: {
        timeout: { type: "number", default: 60000 },
        retries: { type: "number", default: 2 },
        gavelEnabled: { type: "boolean", default: true }
      }
    }
  },

  // Kernel Global Config
  kernel: {
    version: { type: "string", required: true },
    activePreset: { type: "string", default: null },
    uiSettings: {
      type: "object",
      schema: {
        theme: { type: "string", default: "default" },
        compactMode: { type: "boolean", default: false }
      }
    },
    apiDefaults: {
      type: "object",
      schema: {
        temperature: { type: "number", default: 0.7 },
        maxTokens: { type: "number", default: 2048 }
      }
    }
  }
};

// Compiled Preset Schema (full export)
const CompiledPresetSchema = {
  name: { type: "string", required: true },
  description: { type: "string", default: "" },
  version: { type: "string", required: true },
  createdAt: { type: "number", required: true },
  systems: {
    type: "object",
    properties: {
      curation: { ref: "SystemConfigSchemas.curation" },
      character: { ref: "SystemConfigSchemas.character" },
      promptBuilder: { ref: "SystemConfigSchemas.promptBuilder" },
      pipeline: { ref: "SystemConfigSchemas.pipeline" },
      orchestration: { ref: "SystemConfigSchemas.orchestration" },
      kernel: { ref: "SystemConfigSchemas.kernel" }
    }
  }
};

// Helper functions
function getSchema(systemId) {
  return SystemConfigSchemas[systemId] || null;
}

function getSystemIds() {
  return Object.keys(SystemConfigSchemas);
}

function detectSystem(config) {
  if (config.storeSchemas || config.crudPipelines) return 'curation';
  if (config.directorConfig || config.voicingDefaults) return 'character';
  if (config.customTokens || config.macros) return 'promptBuilder';
  if (config.teams && config.pipelines) return 'pipeline';
  if (config.injectionMappings) return 'orchestration';
  if (config.activePreset !== undefined) return 'kernel';
  return null;
}

function createDefaultConfig(systemId) {
  const schema = SystemConfigSchemas[systemId];
  if (!schema) return null;

  const config = {};
  for (const [key, def] of Object.entries(schema)) {
    if (def.default !== undefined) {
      config[key] = def.default;
    } else if (def.type === 'array') {
      config[key] = [];
    } else if (def.type === 'object') {
      config[key] = {};
    }
  }
  return config;
}

export {
  SystemConfigSchemas,
  CompiledPresetSchema,
  getSchema,
  getSystemIds,
  detectSystem,
  createDefaultConfig
};
```

### Update systems.js

```javascript
import {
  SystemConfigSchemas,
  CompiledPresetSchema,
  getSchema,
  detectSystem
} from './config-schemas.js';

// Add to exports
export { SystemConfigSchemas, CompiledPresetSchema };
```

## Testing

1. Import schemas in browser console
2. Verify all 6 system schemas accessible
3. Test detectSystem() with sample configs
4. Test createDefaultConfig() for each system
5. Verify schema validation catches invalid configs
