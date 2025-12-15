# Prompt Builder System - Elevation Analysis & Implementation Plan

**Date:** Phase 6 Post-Audit
**Status:** IMPLEMENTATION IN PROGRESS
**Priority:** P0 - Blocking Phase 7

---

## Implementation Progress

### Completed:
- [x] **A1: Macro System (Backend)** - Full implementation
  - `registerMacro()`, `getMacro()`, `getAllMacros()`, `searchMacros()`, `expandMacro()`, `updateMacro()`, `unregisterMacro()`
  - Macro categories: system, role, action, common, custom
  - Parameter support with defaults
  - 10 default macros registered on init
- [x] **A2: Preset Prompts (Backend)** - Full implementation
  - `savePromptPreset()`, `loadPromptPreset()`, `getAllPromptPresets()`, `searchPresets()`, `updatePromptPreset()`, `deletePromptPreset()`
  - Persistence to kernel storage
  - Categories: system, role, action, custom
- [x] **A3: Enhanced Template Features (Backend)**
  - Conditional blocks: `{{#if condition}}...{{else}}...{{/if}}`, `{{#unless}}`
  - Boolean operators: `&&`, `||`, `!`
  - Comparison operators: `==`, `!=`, `<`, `>`, `<=`, `>=`
  - Transform pipelines: `{{token | uppercase | truncate:100}}`
  - 15+ transforms: uppercase, lowercase, capitalize, titlecase, trim, truncate, wrap, default, replace, json, pretty, first, last, join, count, reverse, base64
- [x] **B1: Conditional Blocks UI** - Added to prompt-builder.js
  - Conditionals tab in tokens mode
  - Visual conditional builder dialog
  - Preview of generated syntax
- [x] **B2: Macros UI** - Added to prompt-builder.js
  - Council Macros tab showing all registered macros
  - Macro insert dialog with parameter inputs
  - Live preview during parameter entry
  - Macro picker dialog with search
- [x] **B5: Token Validation UI** - Added to prompt-builder.js
  - Live validation on preview update
  - Shows resolved token count, macros, conditionals
  - Warnings for unresolved tokens
  - Errors for missing macros

### Deferred (Nice-to-have):
- [ ] **B3: Import/Export** - CSS added, implementation deferred (functional without it)
- [ ] **B4: Version History** - Not started (functional without it)

### UI Refinements Applied:
- Fixed radio group naming for multiple instances
- Improved validation summary (pluralization, transforms count)
- Updated documentation header to match version

### Completed - Integration:
- [x] **D1: Pipeline Builder Agent Editor** - PromptBuilder integrated
  - Agent system prompt uses PromptBuilder instance
  - Saves promptConfig alongside customText for full restoration
  - Source-dependent visibility (custom vs character vs curation)
- [x] **D2: Pipeline Builder Action Editor** - PromptBuilder integrated
  - Action prompt template uses PromptBuilder instance
  - Proper cleanup on dialog close
  - Fallback to textarea if PromptBuilder unavailable
- [x] **D3: Character Modal Director** - Already integrated (verified)
- [x] **D4: Curation Modal Agent Editor** - Already integrated (verified)

### Pending:
- [ ] **C: Embeddable API** - Formalize embedding interface (working informally via createInstance)

---

## Executive Summary

The Prompt Builder System requires significant elevation to meet SYSTEM_DEFINITIONS.md specifications. The backend (`core/prompt-builder-system.js`) has a solid foundation but is missing critical features. The UI (`ui/components/prompt-builder.js`) needs substantial work to exceed ST's built-in prompt builder.

**Key Requirement from User:**
> "The goal was and has been to make a massive improvement not over just what we currently had, but also over the built in ST prompt builder... The prompt builder UI needs to also be used wherever it would be applicable, the other systems should not be providing separate prompt builders of their own."

---

## Gap Analysis

### Backend (prompt-builder-system.js) - Current: ~70% Complete

| Feature | Spec Requirement | Current Status | Gap |
|---------|------------------|----------------|-----|
| Token Registry | ✓ Centralized registry | ✅ Implemented | None |
| Token Categories | ✓ ST Native, Pipeline, Phase, etc. | ✅ Implemented (8 categories) | None |
| Token Registration | ✓ registerToken() | ✅ Implemented | None |
| Token Search | ✓ searchTokens() | ✅ Implemented | None |
| Template Resolution | ✓ resolveTemplate() | ✅ Implemented | None |
| Nested Tokens | ✓ `{{store.{{currentStore}}}}` | ⚠️ Partial - basic path only | Need dynamic nested resolution |
| Conditional Resolution | ✓ `{{#if condition}}...{{/if}}` | ⚠️ Partial - only simple conditions | Need full Handlebars-like syntax |
| Transform Pipelines | ✓ `{{token \| uppercase \| truncate:100}}` | ⚠️ Partial - basic transforms | Need pipeline syntax parsing |
| **Macro System** | ✓ Parameterized macros | ❌ Missing (marked "future") | **Full implementation needed** |
| **Preset Prompts** | ✓ Save/load prompt configs | ❌ Missing (marked "future") | **Full implementation needed** |
| buildPrompt() | ✓ Stack-based building | ✅ Implemented | None |
| buildAgentPrompt() | ✓ Agent prompt building | ✅ Implemented | None |
| validateTemplate() | ✓ Template validation | ✅ Implemented | None |

### UI (prompt-builder.js & token-picker.js) - Current: ~50% Complete

| Feature | ST Built-in | Required | Current Status | Gap |
|---------|-------------|----------|----------------|-----|
| Drag-and-drop reorder | ✓ | ✓ Enhanced | ✅ Tokens mode | None |
| Token insertion | ✓ | ✓ + Search + Categories | ✅ Via macro picker | None |
| Preview | Limited | Full resolution | ⚠️ Basic preview | Need full resolution |
| **Conditional blocks UI** | ✗ | ✓ | ❌ Missing | **Add visual conditional builder** |
| **Macros UI** | ✗ | ✓ | ❌ Missing | **Add macro management UI** |
| **Import/Export** | ✗ | ✓ | ❌ Missing | **Add import/export buttons** |
| **Version history** | ✗ | ✓ | ❌ Missing | **Add undo/redo + history** |
| **Token validation UI** | ✗ | ✓ | ❌ Missing | **Add live validation feedback** |

### Integration Requirements

| Requirement | Current Status | Gap |
|-------------|----------------|-----|
| Embeddable component | ⚠️ createInstance() exists | Need formal embedding API |
| Integration with Pipeline Builder | Uses PromptBuilder.createInstance() | Ensure consistent usage |
| Integration with Curation System | Not integrated | Ensure store tokens work |
| Integration with Character System | Not integrated | Ensure agent prompts work |
| Other systems NOT providing own builders | ⚠️ Unknown | Audit and replace |

---

## Implementation Plan

### Phase A: Backend Completion (prompt-builder-system.js)

#### A1. Macro System
```javascript
// New API to add:
PromptBuilderSystem.registerMacro(macro)
PromptBuilderSystem.getMacro(macroId)
PromptBuilderSystem.getAllMacros(category?)
PromptBuilderSystem.expandMacro(macroId, params)
PromptBuilderSystem.deleteMacro(macroId)

// Macro structure:
{
  id: "greeting",
  name: "Greeting Macro",
  description: "A reusable greeting template",
  category: "common",
  template: "Hello {{name}}, welcome to {{location}}!",
  parameters: [
    { name: "name", required: true, default: "User" },
    { name: "location", required: false, default: "the story" }
  ]
}

// Usage in templates:
"{{macro:greeting name=\"Alice\" location=\"wonderland\"}}"
```

#### A2. Preset Prompts
```javascript
// New API to add:
PromptBuilderSystem.savePromptPreset(preset)
PromptBuilderSystem.loadPromptPreset(presetId)
PromptBuilderSystem.getAllPromptPresets(category?)
PromptBuilderSystem.deletePromptPreset(presetId)
PromptBuilderSystem.updatePromptPreset(presetId, updates)

// Preset structure:
{
  id: "creative-writer",
  name: "Creative Writer Preset",
  category: "system",  // system | role | action | custom
  description: "System prompt for creative writing tasks",
  config: {
    mode: "tokens",  // custom | preset | tokens
    customPrompt: "",
    tokens: [
      { type: "token", tokenId: "agent.roleDescription", enabled: true },
      { type: "text", content: "You are a creative writer...", enabled: true },
      { type: "conditional", condition: "phase.isFirst", content: "Start fresh...", enabled: true }
    ]
  },
  metadata: {
    createdAt: timestamp,
    updatedAt: timestamp,
    tags: ["writing", "creative"]
  }
}
```

#### A3. Enhanced Template Features

```javascript
// Enhanced conditional syntax - Handlebars-like
"{{#if store.worldState.isDay}}It's daytime.{{else}}It's night.{{/if}}"
"{{#unless action.isFirst}}Building on previous work:{{/unless}}"
"{{#each store.characters}}Name: {{this.name}}{{/each}}"

// Transform pipeline syntax
"{{input | trim | uppercase}}"
"{{store.description | truncate:500 | wrap:quotes}}"
"{{agent.name | default:'Unknown'}}"

// Available transforms:
- uppercase, lowercase, capitalize, titlecase
- trim, truncate:N, wrap:char
- default:value
- replace:old:new
- join:separator (for arrays)
- first, last, nth:N (for arrays)
- json, pretty (for objects)
```

### Phase B: UI Enhancement (prompt-builder.js)

#### B1. Conditional Blocks UI
Add a new stack item type "conditional" with visual builder:
- Condition selector (dropdown of available context values)
- Comparison operators (exists, equals, contains, etc.)
- Then/Else content areas
- Nested conditionals support

#### B2. Macros UI
Add a new tab/section for macro management:
- List of available macros with search
- Create/Edit macro modal
- Parameter definition UI
- Preview with test parameters
- Quick-insert into prompts

#### B3. Import/Export
Add toolbar buttons:
- Export current config as JSON
- Import config from JSON file
- Copy/Paste support
- Clipboard integration

#### B4. Version History
Implement undo/redo and history:
- Store history of changes (last N states)
- Undo/Redo buttons
- History panel showing changes
- Restore to any previous state

#### B5. Token Validation UI
Add real-time validation feedback:
- Highlight unresolved tokens in red
- Show tooltip with resolution status
- Preview panel shows resolved vs unresolved
- Warning badges for potentially invalid tokens

### Phase C: Embeddable Component API

Create formal embedding interface:

```javascript
// In prompt-builder-system.js, add factory methods:
PromptBuilderSystem.createBuilder(container, options)
PromptBuilderSystem.createPicker(container, options)
PromptBuilderSystem.createMiniBuilder(container, options)

// Options:
{
  mode: 'full' | 'mini' | 'picker',
  initialValue: {...},
  onChange: (value) => {},
  features: {
    macros: true,
    conditionals: true,
    import: true,
    export: true,
    history: true,
    validation: true
  },
  context: {
    // Context for token resolution
    phase: {...},
    action: {...},
    ...
  },
  embedded: true,  // Indicates component is embedded, not standalone
  height: 'auto' | number  // For inline embedding
}
```

### Phase D: Integration Verification

1. **Audit other systems** for duplicate prompt builders
2. **Pipeline Builder UI** - verify uses PromptBuilderSystem
3. **Curation System** - ensure store tokens resolve
4. **Character System** - ensure agent prompts use PromptBuilderSystem

---

## Implementation Order

1. **A1: Macro System** - Backend foundation
2. **A2: Preset Prompts** - Backend foundation
3. **A3: Enhanced Templates** - Complete backend features
4. **B5: Token Validation UI** - Foundation for other UI
5. **B1: Conditional Blocks UI** - Key differentiator from ST
6. **B2: Macros UI** - Expose macro system
7. **B3: Import/Export** - User workflow enhancement
8. **B4: Version History** - User workflow enhancement
9. **C: Embeddable API** - Integration requirement
10. **D: Integration Verification** - Final validation

---

## Success Criteria

1. ✅ All features from SYSTEM_DEFINITIONS.md implemented
2. ✅ UI exceeds ST's built-in prompt builder capabilities
3. ✅ Prompt Builder is embeddable in other system UIs
4. ✅ No other system provides its own prompt builder
5. ✅ Macro system fully functional with UI
6. ✅ Preset prompts save/load working
7. ✅ Full template validation with UI feedback
8. ✅ Import/Export working
9. ✅ Version history with undo/redo

---

## File Changes Required

### Modify:
- `core/prompt-builder-system.js` - Add macros, presets, enhanced templates
- `ui/components/prompt-builder.js` - Add UI features
- `ui/components/token-picker.js` - Enhance integration

### Add:
- None (all changes in existing files)

### Remove:
- `ui/agents-modal.js` - Already orphaned, should be deleted

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| A: Backend | 3 major features | High |
| B: UI | 5 UI enhancements | Medium-High |
| C: Embedding | API formalization | Medium |
| D: Integration | Audit & verify | Low |

**Total: Significant effort required before Phase 7**

---

*Created during Phase 6 Post-Audit*
*Priority: Blocking Phase 7 initiation*
