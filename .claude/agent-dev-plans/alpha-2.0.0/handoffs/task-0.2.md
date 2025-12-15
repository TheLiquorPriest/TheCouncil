# Task 0.2 Handoff: Kernel Storage & Preset Management

**Task:** Add Kernel storage & preset management
**Status:** ✅ Complete
**Date:** 2025-12-11
**Branch:** phase-0

## Summary

Successfully implemented comprehensive storage abstraction and preset management directly into the Kernel (core/kernel.js). All functionality from core/preset-manager.js has been migrated into the Kernel, making it the single source of truth for data persistence and preset operations.

## Deliverables Completed

### 1. Storage Abstraction ✅

Added to `core/kernel.js`:

**Methods:**
- `saveData(key, data, options)` - Save data with chat/character/global scoping
- `loadData(key, options)` - Load data from storage with default values
- `clearData(key, options)` - Clear specific key or all Council data
- `hasData(key, options)` - Check if data exists
- `_getScopedKey(key, scope)` - Internal scoping logic

**Features:**
- **ST Integration:** Uses `window.SillyTavern.getContext().extensionSettings` when available
- **Fallback:** Falls back to localStorage when ST is not available
- **Chat-scoped keys:** Default scope is per-chat (uses chatId from ST context)
- **Multiple scopes:** 'global', 'chat', 'character'
- **Merge support:** Optional deep merge when saving
- **Events:** Emits `kernel:storage:saved`, `kernel:storage:loaded`, `kernel:storage:cleared`, `kernel:storage:error`

**Key Patterns:**
```javascript
// Save data (chat-scoped by default)
await kernel.saveData('my_key', { foo: 'bar' });

// Load with default value
const data = await kernel.loadData('my_key', { defaultValue: {} });

// Global scope
await kernel.saveData('global_key', data, { scope: 'global' });

// Clear all Council data
await kernel.clearData(null);
```

### 2. Preset Management ✅

Added to `core/kernel.js`:

**Properties:**
- `PRESETS_DIR` - "data/presets" directory path
- `_extensionPath` - Extension path (set during init)
- `_presets` - Map cache of loaded presets

**Methods:**
- `discoverPresets()` - Discover and load all presets from data/presets/
- `loadPreset(presetId)` - Load a specific preset by ID
- `applyPreset(presetIdOrData, options)` - Apply preset to all systems
- `saveAsPreset(name, options)` - Save current config as new preset
- `getCurrentPresetId()` - Get active preset ID
- `getCurrentPreset()` - Get active preset object
- `getAllPresets()` - Get all cached preset metadata
- `getPreset(presetId)` - Get specific preset from cache
- `exportPreset(presetId)` - Export preset as JSON string
- `importPreset(data, options)` - Import preset from JSON

**Features:**
- **File Discovery:** Searches for known preset files (default-pipeline.json, standard-pipeline.json, quick-pipeline.json)
- **Validation:** Basic validation (checks for required id and name fields)
- **Caching:** All discovered presets cached in `_presets` Map
- **Hooks Integration:** Runs `beforePresetApply` and `afterPresetApply` hooks
- **System Delegation:** Calls `applyPreset()` on each registered system that implements it
- **State Tracking:** Updates `session.activePresetId` in global state
- **Events:** Emits `kernel:presets:discovered`, `kernel:preset:applied`, `kernel:preset:created`, `kernel:preset:imported`, `kernel:presets:error`

**Apply Preset Flow:**
1. Load preset by ID or accept preset object
2. Run `beforePresetApply` hook
3. For each system with `applyPreset()` method:
   - Call system's `applyPreset(preset, options)`
   - Collect results and errors
4. Update global state with active preset ID
5. Run `afterPresetApply` hook
6. Emit `kernel:preset:applied` event
7. Return results object

**Save As Preset Flow:**
1. Create preset skeleton with metadata
2. For each system with `exportPresetData()` method:
   - Call to get system's preset data
   - Merge into preset object
3. Cache preset in `_presets` Map
4. Optionally persist to storage
5. Emit `kernel:preset:created` event

### 3. Cleanup ✅

- Removed duplicate preset delegation methods from Kernel (lines ~1417-1474)
- Marked `core/preset-manager.js` as DEPRECATED with clear migration instructions
- File will be removed in Task 6.2 cleanup phase

### 4. Testing ✅

Created `test-kernel-storage.html` - standalone test page with:
- Storage tests (save, load, clear, scoped keys)
- Preset discovery tests
- Preset management tests (save as, import, export)
- Full integration workflow test

## File Changes

### Modified Files:
1. **core/kernel.js** (~580 lines added)
   - Storage abstraction section (lines 616-819)
   - Preset management section (lines 821-1201)
   - Removed old delegation methods

2. **core/preset-manager.js** (deprecated notice added)
   - Header updated with deprecation warning
   - File kept for reference until Task 6.2

### New Files:
1. **test-kernel-storage.html** (test harness)
2. **.claude/handoffs/task-0.2.md** (this file)

## Success Criteria - Met ✅

From Task 0.2 in DEVELOPMENT_PLAN.md:

```javascript
// ✅ Can save/load data via Kernel
window.TheCouncil.saveData('test', { foo: 'bar' })
window.TheCouncil.loadData('test') // returns { foo: 'bar' }

// ✅ Can discover and load presets from data/presets/
window.TheCouncil.discoverPresets() // returns preset list
```

All success criteria verified in test-kernel-storage.html

## API Changes

### New Public API Methods:

**Storage:**
- `TheCouncil.saveData(key, data, options)` → Promise<boolean>
- `TheCouncil.loadData(key, options)` → Promise<any>
- `TheCouncil.clearData(key, options)` → Promise<boolean>
- `TheCouncil.hasData(key, options)` → Promise<boolean>

**Presets:**
- `TheCouncil.discoverPresets()` → Promise<Array>
- `TheCouncil.loadPreset(presetId)` → Promise<Object>
- `TheCouncil.applyPreset(presetIdOrData, options)` → Promise<Object>
- `TheCouncil.saveAsPreset(name, options)` → Promise<Object>
- `TheCouncil.getCurrentPresetId()` → string|null
- `TheCouncil.getCurrentPreset()` → Object|null
- `TheCouncil.getAllPresets()` → Array<Object>
- `TheCouncil.getPreset(presetId)` → Object|null
- `TheCouncil.exportPreset(presetId)` → string
- `TheCouncil.importPreset(data, options)` → Object

## System Integration Contract

For systems to participate in preset management, they should implement:

```javascript
const MySystem = {
  /**
   * Apply preset data to this system
   * @param {Object} preset - Full preset object
   * @param {Object} options - Application options
   * @returns {Promise<Object>} Result summary
   */
  async applyPreset(preset, options) {
    // Extract system-specific data from preset
    // Apply to system state
    // Return result { success: boolean, ... }
  },

  /**
   * Export current system state for preset creation
   * @returns {Promise<Object>} Preset data fragment
   */
  async exportPresetData() {
    // Collect current system configuration
    // Return object to merge into preset
  }
};
```

## Events

### Storage Events:
- `kernel:storage:saved` - { key, scope }
- `kernel:storage:loaded` - { key, scope }
- `kernel:storage:cleared` - { key, scope }
- `kernel:storage:error` - { key, error }

### Preset Events:
- `kernel:presets:discovered` - { count, presets[] }
- `kernel:preset:applied` - { preset, results }
- `kernel:preset:created` - { preset }
- `kernel:preset:imported` - { preset }
- `kernel:presets:error` - { error }

## Hooks

Preset application hooks (already existed, now used):
- `beforePresetApply` - Context: preset object
- `afterPresetApply` - Context: { preset, results }

## Known Limitations

1. **Preset Discovery:** Only checks for known preset filenames (default-pipeline.json, standard-pipeline.json, quick-pipeline.json). Does not scan directory.

2. **Validation:** Basic validation only (checks for id and name). Full schema validation not implemented.

3. **ST Context:** Scoped keys use ST's chatId and characterId when available. Falls back to "default" if not in ST context.

4. **Preset Application:** Depends on systems implementing `applyPreset()` method. No enforcement or validation of system compatibility.

## Testing Notes

Test file demonstrates all functionality works correctly:
- Storage operations persist correctly to localStorage (simulating ST storage)
- Preset discovery loads all 3 preset files from data/presets/
- Full workflow test validates end-to-end functionality

**To test in browser:**
1. Serve the directory with a local server
2. Open `test-kernel-storage.html`
3. Run individual tests or full workflow
4. Check console and on-page output for results

## Migration Guide

For code currently using PresetManager:

```javascript
// OLD (deprecated)
const presetManager = window.TheCouncilPresetManager;
await presetManager.init(options);
await presetManager.discoverPresets();

// NEW (use Kernel)
await window.TheCouncil.init(options);
await window.TheCouncil.discoverPresets();
```

All PresetManager methods have equivalent Kernel methods. Update imports and references.

## Next Steps

1. **Task 0.3:** Kernel UI Infrastructure (modal registry, toast system, etc.)
2. **Task 1.1:** Update Curation System to use Kernel storage instead of direct localStorage
3. **Task 6.2:** Remove deprecated preset-manager.js file entirely

## Dependencies

**Depends on:**
- Task 0.1 (Kernel Core) - ✅ Complete

**Depended on by:**
- Task 1.1 (Curation System Kernel Integration)
- Task 4.1 (Pipeline Builder - will use preset management)
- Task 6.2 (Cleanup - will remove preset-manager.js)

## Notes

- Storage keys are prefixed with `TheCouncil_` to avoid conflicts
- Chat-scoped keys include chatId in the key for isolation between conversations
- Preset cache is in-memory only (not persisted) - presets are reloaded from files on each init
- The `_extensionPath` property allows customization of preset directory location
- Hooks provide extension points for custom logic during preset application

---

**Task Status:** ✅ COMPLETE
**Ready for:** Commit and merge to phase-0 branch
**Estimated Time:** ~1.5 hours actual (2 hours estimated)
