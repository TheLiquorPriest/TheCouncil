# Task 3.1: Prompt Builder System Core - Handoff

## Status: COMPLETE

## Model Used: opus

## What Was Implemented

### 1. Created `core/prompt-builder-system.js`

A comprehensive Prompt Builder System that provides:

#### Token Registry
- `registerToken(token)` - Register a token with id, name, description, category, resolver, syntax, metadata
- `unregisterToken(tokenId)` - Remove a token from the registry
- `getToken(tokenId)` - Get a single token definition
- `getAllTokens(category?)` - Get all tokens, optionally filtered by category
- `getTokensByCategory()` - Get tokens grouped by category
- `searchTokens(query)` - Search tokens by name, description, or ID
- `hasToken(tokenId)` - Check if a token exists

#### Token Categories
```javascript
TOKEN_CATEGORIES: {
  ST_NATIVE, PIPELINE, PHASE, ACTION, STORE, AGENT, TEAM, GLOBAL, CUSTOM
}
```

#### Template Resolution
- `resolveToken(tokenId, context)` - Resolve a single token to its value
- `resolveTemplate(template, context, options)` - Resolve all `{{token}}` placeholders in a template string
- Supports nested paths: `{{phase.input}}`, `{{store.characterSheets}}`
- Passes ST native macros through for ST to resolve
- Options: `preserveUnresolved`, `unresolvedPlaceholder`, `passSTMacros`

#### Prompt Building
- `buildPrompt(config, context)` - Stack-based prompt assembly with support for:
  - Static text blocks
  - Token insertions
  - Template resolution
  - Conditional sections
  - Transform pipelines (uppercase, lowercase, capitalize, trim, truncate)
- `buildFromStack(stack, context, options)` - Convenience method for stack-based building
- `buildAgentPrompt(agent, position, actionContext)` - Build complete agent prompts with:
  - Position role description
  - Agent system prompt
  - Prompt prefix/suffix
  - Action instructions

#### Validation
- `validateTemplate(template, context)` - Returns `{ valid, tokens, missing }`
- `getTemplateTokens(template)` - Extract all token paths from template
- `hasTokens(template)` - Check if template contains tokens

#### Context Building
- `buildContext(options)` - Build a complete resolution context object with all scopes

#### Preset Integration
- `applyPreset(preset, options)` - Apply preset's custom tokens
- `exportPresetData()` - Export custom tokens for preset saving

### 2. Absorbed `utils/token-resolver.js`

The token-resolver.js functionality has been fully absorbed into PromptBuilderSystem:
- All token resolution logic migrated
- ST native macros list preserved
- Context path resolution preserved
- String/array/object formatting preserved

The file has been marked as deprecated with a clear migration note:
```javascript
/**
 * @deprecated Use PromptBuilderSystem instead:
 * const pb = window.TheCouncil.getSystem('promptBuilder');
 * pb.resolveTemplate(template, context);
 */
```

### 3. Updated `index.js`

- Added `core/prompt-builder-system.js` to module loading list
- Added `Systems.PromptBuilderSystem` reference
- Added initialization in `initializeSystems()` (first, before other systems)
- Added to debug logging

## Files Modified

| File | Changes |
|------|---------|
| `core/prompt-builder-system.js` | **CREATED** - 850+ lines, full implementation |
| `utils/token-resolver.js` | Added deprecation notice at top |
| `index.js` | Added PromptBuilderSystem to loading, references, and initialization |

## Issues Encountered

None. The implementation went smoothly.

## Verification

The success criteria can be tested in browser console:

```javascript
// Get the PromptBuilderSystem
const pb = window.TheCouncil.getSystem('promptBuilder')

// Test template resolution
pb.resolveTemplate('Hello {{user}}', { user: 'TestUser' })
// Returns: "Hello TestUser"

// Test with context scopes
pb.resolveTemplate('Phase: {{phase.name}}', { phase: { name: 'Planning' } })
// Returns: "Phase: Planning"

// Get all pipeline tokens
pb.getAllTokens('pipeline')
// Returns array of pipeline token definitions

// Get all ST native tokens
pb.getAllTokens('st_native')
// Returns array of ST native macro definitions

// Test validation
pb.validateTemplate('Hello {{user}} and {{unknown}}', { user: 'Test' })
// Returns: { valid: false, tokens: ['user', 'unknown'], missing: ['unknown'] }

// Test prompt building
pb.buildPrompt({
  stack: [
    { type: 'text', content: 'System Prompt', enabled: true },
    { type: 'template', template: 'User: {{input}}', enabled: true }
  ]
}, { input: 'Hello world' })
// Returns: "System Prompt\n\nUser: Hello world"
```

## Architecture Notes

The PromptBuilderSystem follows the established patterns:

1. **Kernel Integration**: Uses `init(kernel)` pattern and registers with Kernel
2. **Event Emission**: Emits events via Kernel's event bus (`promptBuilder:*`)
3. **Logging**: Uses Kernel's logger module
4. **Module Pattern**: Follows the standard Council system pattern

Default tokens are registered on initialization covering:
- ST Native macros (char, user, persona, etc.)
- Pipeline scope (id, name, userInput)
- Phase scope (id, name, input, output)
- Action scope (id, name, input, output, context)
- Global scope (instructions, drafts, commentary)
- Agent/Position scope
- Team scope
- Store scope

## Next Task

**Task 3.2: Prompt Builder UI Integration**
- Refactor `ui/components/prompt-builder.js` to use PromptBuilderSystem
- Refactor `ui/components/token-picker.js` to use PromptBuilderSystem
- Fix drag-and-drop functionality
- Add preview functionality using `resolveTemplate`

## Dependencies Met

Task 3.1 depends on Task 0.1 (Kernel Core) which is complete.
