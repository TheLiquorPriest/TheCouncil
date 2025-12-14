# Task 3.2.2: Kernel Config Manager

## Status: COMPLETE

## Model Used: opus (Claude Opus 4.5)

## Branch: alpha3-phase-3

## Task Description
**Priority:** P0
**File:** `core/kernel.js`
**Issue:** Kernel doesn't manage system configurations

## What Was Implemented

### 1. Config Manager Object (`_configManager`)
Added centralized configuration management with:
- `schemas: new Map()` - System config schemas (systemId -> schema)
- `configs: new Map()` - Current configs per system (systemId -> config)
- `presets: new Map()` - Named presets (presetId -> compiled preset)
- `dirty: new Set()` - Systems with unsaved changes

### 2. Schema Registration Methods
- **`registerConfigSchema(systemId, schema)`** - Register a system's config schema with validation
- **`getConfigSchema(systemId)`** - Get a registered config schema
- **`getRegisteredSchemaIds()`** - Get all registered system IDs

### 3. Config Management Methods
- **`getSystemConfig(systemId)`** - Get a system's current config (returns null if not set)
- **`getAllSystemConfigs()`** - Get all current system configs as object
- **`setSystemConfig(systemId, config, options)`** - Set with validation and events
  - Options: `{ validate: true, notify: true }`
  - Throws Error if validation fails
  - Emits `kernel:config:changed` and `{systemId}:config:reload`
- **`updateSystemConfig(systemId, updates, options)`** - Merge update with existing config
- **`clearSystemConfig(systemId, notify)`** - Clear a system's config

### 4. Dirty Tracking Methods
- **`isConfigDirty(systemId)`** - Check if system (or any) has unsaved changes
- **`markConfigClean(systemId)`** - Mark system (or all) as saved

### 5. Preset Compilation Methods
- **`compilePreset(name, description, options)`** - Compile all system configs into named preset
  - Options: `{ includeMetadata: true }`
  - Returns preset object with id, name, description, version, systems, metadata
  - Caches preset automatically
  - Emits `kernel:config:preset:compiled`

- **`loadCompiledPreset(presetOrId, options)`** - Load and apply a preset
  - Options: `{ merge: false, notify: true }`
  - Returns `{ presetId, presetName, applied: [], errors: [] }`
  - Emits `kernel:config:preset:loaded`

### 6. Import/Export Methods
- **`exportSystemConfig(systemId)`** - Export single system config as portable object
  - Returns `{ systemId, version, exportedAt, config }`
  - Deep clones config to prevent mutation

- **`exportMultipleConfigs(systemIds)`** - Export multiple systems (null for all)
  - Returns array of export objects

- **`importSystemConfig(data, options)`** - Import with auto-detection
  - Options: `{ validate: true, overwrite: true }`
  - Auto-detects system if not specified
  - Supports both wrapped `{ systemId, config }` and direct config formats
  - Emits `kernel:config:imported`

### 7. Helper Methods
- **`_detectSystemFromConfig(config)`** - Detect system from config structure
  - Detects: curation, character, promptBuilder, pipeline, orchestration, kernel
  - Warns if passed a compiled preset

- **`_validateConfig(config, schema)`** - Validate config against schema
  - Returns `{ valid: boolean, errors: string[] }`
  - Supports: required, type, nested object, array items, enum, min/max, pattern

- **`_validateFieldType(value, fieldSchema)`** - Validate field type
  - Supports: string, number, boolean, array, object, enum, any
  - Handles nullable fields

### 8. Cache Management Methods
- **`getCachedConfigPresets()`** - Get all cached preset metadata
- **`getCachedConfigPreset(presetId)`** - Get specific cached preset
- **`cacheConfigPreset(preset)`** - Cache a preset without applying
- **`removeCachedConfigPreset(presetId)`** - Remove cached preset

## Files Modified
- `core/kernel.js` - Added ~572 lines (Config Manager section)

## Events Emitted
| Event | When | Data |
|-------|------|------|
| `kernel:config:schema:registered` | Schema registered | `{ systemId, schema }` |
| `kernel:config:changed` | Config set/updated | `{ systemId, config, oldConfig }` |
| `{systemId}:config:reload` | System should reload | `{ config, oldConfig }` |
| `kernel:config:cleared` | Config cleared | `{ systemId, oldConfig }` |
| `kernel:config:preset:compiled` | Preset compiled | `{ preset }` |
| `kernel:config:preset:loaded` | Preset loaded | `{ preset, results }` |
| `kernel:config:imported` | Config imported | `{ systemId, config }` |

## Acceptance Criteria Results
The development plan did not specify explicit acceptance criteria for Task 3.2.2. Implementation was verified against the requirements specified in the Implementation section:

- [x] `_configManager` object with schemas, configs, presets, dirty tracking
- [x] `registerConfigSchema(systemId, schema)` method
- [x] `getSystemConfig(systemId)` method
- [x] `setSystemConfig(systemId, config)` method with validation
- [x] `compilePreset(name, description)` method
- [x] `loadPreset(preset)` method (implemented as `loadCompiledPreset`)
- [x] `exportSystemConfig(systemId)` method
- [x] `importSystemConfig(data)` method with auto-detection
- [x] `_detectSystemFromConfig(config)` helper
- [x] `_validateConfig(config, schema)` helper
- [x] Emits `kernel:config:changed` event
- [x] Emits `{systemId}:config:reload` event
- [x] File syntax verified (no JavaScript errors)

## Additional Methods (Beyond Requirements)
The implementation includes several additional methods not explicitly required but useful:
- `getConfigSchema(systemId)` - Retrieve registered schemas
- `getRegisteredSchemaIds()` - List all systems with schemas
- `getAllSystemConfigs()` - Bulk config retrieval
- `updateSystemConfig()` - Partial config updates (merge)
- `clearSystemConfig()` - Clear individual system configs
- `isConfigDirty()` / `markConfigClean()` - Dirty state management
- `exportMultipleConfigs()` - Bulk export
- `getCachedConfigPresets()` / `getCachedConfigPreset()` - Preset cache access
- `cacheConfigPreset()` / `removeCachedConfigPreset()` - Preset cache management
- `_validateFieldType()` - Field-level type validation

## Issues Encountered
1. **File Modification Race Condition**: The Edit tool reported "File has been unexpectedly modified" errors multiple times. Resolved by using a more targeted edit string pattern.

## Browser Test Required: YES
This modifies core Kernel functionality. Browser testing should verify:
1. Kernel initializes without errors
2. Systems can register schemas
3. Configs can be set/get/updated
4. Validation rejects invalid configs
5. Events are emitted correctly
6. Presets can be compiled and loaded
7. Import/export functions correctly

## Dependencies
- **Task 3.2.1** (config-schemas.js) - COMPLETE
  - Provides `ConfigSchemas` with system-specific schemas
  - Systems will use these schemas with `registerConfigSchema()`

## Next Steps
1. **Task 3.3.1**: Migrate existing presets to new schema structure
2. **Task 3.4.x**: Create tiered default presets using the new Config Manager
3. Systems should be updated to register their schemas during init
4. UI should be updated to use Kernel config methods

## Session Notes
- Session ID: 82548c12-8f74-4cc6-b1c5-993c93be71e2
- Context saved to memory-keeper for continuity
