# Task 3.2.2: kernel-config-manager

## Metadata

- **Group**: 3 - Kernel Preset System
- **Block**: 2 - Config Schemas
- **Priority**: P0
- **Complexity**: complex
- **Agent**: dev-opus
- **Status**: PENDING

## Description

Add a config manager to the Kernel that centralizes configuration for all systems. Handles schema registration, config get/set, preset compilation, and import/export.

## Files

- `core/kernel.js` - Add config manager implementation

## Dependencies

- Task 3.2.1: define-system-config-schemas (needs schemas)

## Acceptance Criteria

- [ ] Config manager added to Kernel
- [ ] Systems can register their config schemas
- [ ] Get/set config per system with validation
- [ ] Compile all configs into preset
- [ ] Load compiled preset across systems
- [ ] Import/export single system configs
- [ ] Auto-detect system from config structure
- [ ] Events emitted on config changes

## Implementation Notes

### Config Manager Structure

```javascript
// In kernel.js

_configManager: {
  schemas: new Map(),      // systemId → schema
  configs: new Map(),      // systemId → current config
  presets: new Map(),      // presetName → compiled preset
  dirty: new Set()         // systems with unsaved changes
},
```

### Schema Registration

```javascript
/**
 * Register a system's config schema
 * Called by each system during init
 */
registerConfigSchema(systemId, schema) {
  this._configManager.schemas.set(systemId, schema);
  this._log('debug', `Registered config schema: ${systemId}`);
}
```

### Config Get/Set

```javascript
/**
 * Get a system's current config
 */
getSystemConfig(systemId) {
  return this._configManager.configs.get(systemId) || null;
}

/**
 * Set a system's config with validation
 */
setSystemConfig(systemId, config) {
  const schema = this._configManager.schemas.get(systemId);

  if (schema && !this._validateConfig(config, schema)) {
    throw new Error(`Invalid config for ${systemId}`);
  }

  this._configManager.configs.set(systemId, config);
  this._configManager.dirty.add(systemId);

  this._emit('config:changed', { systemId, config });
  this._emit(`${systemId}:config:reload`, config);

  return true;
}

/**
 * Update specific fields in a system's config
 */
updateSystemConfig(systemId, updates) {
  const current = this.getSystemConfig(systemId) || {};
  const merged = { ...current, ...updates };
  return this.setSystemConfig(systemId, merged);
}
```

### Preset Compilation

```javascript
/**
 * Compile all system configs into a named preset
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
    compiled.systems[systemId] = this._deepClone(config);
  }

  this._configManager.presets.set(name, compiled);
  this._emit('preset:compiled', { name, preset: compiled });

  return compiled;
}

/**
 * Load a compiled preset across all systems
 */
loadCompiledPreset(preset) {
  if (!preset.systems) {
    throw new Error('Invalid preset: missing systems');
  }

  for (const [systemId, config] of Object.entries(preset.systems)) {
    this.setSystemConfig(systemId, config);
  }

  this._configManager.dirty.clear();
  this._emit('preset:loaded', { name: preset.name });

  return true;
}
```

### Import/Export

```javascript
/**
 * Export a single system's config
 */
exportSystemConfig(systemId) {
  const config = this._configManager.configs.get(systemId);
  if (!config) {
    throw new Error(`No config for system: ${systemId}`);
  }

  return {
    systemId,
    version: this.VERSION,
    exportedAt: Date.now(),
    config: this._deepClone(config)
  };
}

/**
 * Import a system config (auto-detects system if not specified)
 */
importSystemConfig(data) {
  let systemId = data.systemId;

  if (!systemId) {
    systemId = this._detectSystemFromConfig(data.config);
    if (!systemId) {
      throw new Error('Could not detect target system');
    }
  }

  this.setSystemConfig(systemId, data.config);
  return systemId;
}

/**
 * Detect system from config structure
 */
_detectSystemFromConfig(config) {
  if (config.storeSchemas || config.crudPipelines) return 'curation';
  if (config.directorConfig || config.voicingDefaults) return 'character';
  if (config.customTokens || config.macros) return 'promptBuilder';
  if (config.teams && config.pipelines) return 'pipeline';
  if (config.injectionMappings) return 'orchestration';
  if (config.activePreset !== undefined) return 'kernel';
  return null;
}
```

### Validation

```javascript
/**
 * Validate config against schema
 */
_validateConfig(config, schema) {
  for (const [key, def] of Object.entries(schema)) {
    if (def.required && config[key] === undefined) {
      this._log('error', `Missing required field: ${key}`);
      return false;
    }

    if (config[key] !== undefined && def.type) {
      if (!this._validateType(config[key], def.type)) {
        this._log('error', `Invalid type for ${key}`);
        return false;
      }
    }
  }
  return true;
}

_validateType(value, type) {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && !Array.isArray(value);
    case 'enum': return true; // handled separately
    default: return true;
  }
}

_deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
```

### Events

| Event | Payload | When |
|-------|---------|------|
| `config:changed` | `{ systemId, config }` | Config updated |
| `{systemId}:config:reload` | `config` | System should reload |
| `preset:compiled` | `{ name, preset }` | Preset created |
| `preset:loaded` | `{ name }` | Preset applied |

## Testing

1. Register schema for test system
2. Set config → verify validation
3. Get config → verify retrieval
4. Compile preset → verify all systems included
5. Load preset → verify configs applied
6. Export/import → verify round-trip
7. Verify events emitted
