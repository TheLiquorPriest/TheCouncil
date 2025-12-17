# Task 5.7.2: Prompt Resolution Integration

**ID**: 5.7.2
**Name**: prompt-resolution-integration
**Priority**: P0
**Agent**: dev-opus
**Status**: COMPLETE
**Completed**: 2025-12-17
**Commit**: 7a21be5
**Depends On**: 5.7.1

## Problem Statement

Pipeline steps have `promptConfig` with different modes (custom, preset, tokens) but there's no implementation to resolve these into actual prompts using the PromptBuilder system.

## Objective

Implement prompt resolution that:
1. Builds prompt context from step input, previous outputs, and variables
2. Resolves prompts based on `promptConfig.mode` (custom, preset, tokens)
3. Integrates with PromptBuilder for token resolution
4. Handles macro expansion and transforms

## Technical Requirements

### 1. Build Prompt Context

Create context object for token resolution:

```javascript
// Location: curation-system.js, new method

_buildStepPromptContext(step, stepInput, executionContext) {
  // Get PromptBuilder for token resolution
  const promptBuilder = this._kernel.getModule('promptBuilder');

  // Build context with all available data
  const context = {
    // Current step's input
    input: stepInput,

    // Previous step output (if any)
    previousOutput: executionContext.previousStepOutput,

    // All named variables from prior steps
    variables: { ...executionContext.variables },

    // Pipeline metadata
    pipeline: {
      id: executionContext.pipeline.id,
      name: executionContext.pipeline.name,
      operation: executionContext.pipeline.operation
    },

    // Step metadata
    step: {
      id: step.id,
      name: step.name,
      index: executionContext.currentStepIndex
    },

    // Store data (for RAG-like operations)
    store: executionContext.targetStore ?
      this._getStoreDataForContext(executionContext.targetStore, step) : null,

    // ST context tokens (will be resolved by PromptBuilder)
    // These are available through PromptBuilder's token resolution
  };

  return context;
}
```

### 2. Get Store Data for Context

Extract relevant store data for prompt context:

```javascript
// Location: curation-system.js, new method

_getStoreDataForContext(store, step) {
  // If store is a Map, convert to array
  const entries = store instanceof Map ?
    Array.from(store.entries()).map(([key, value]) => ({ key, ...value })) :
    Object.entries(store).map(([key, value]) => ({ key, ...value }));

  // Return summary for context (avoid huge prompts)
  return {
    count: entries.length,
    sample: entries.slice(0, 5),  // First 5 entries as sample
    keys: entries.map(e => e.key).slice(0, 20),  // First 20 keys
    // Full data available if needed
    _entries: entries
  };
}
```

### 3. Resolve Step Prompt

Main prompt resolution method based on promptConfig.mode:

```javascript
// Location: curation-system.js, new method

async _resolveStepPrompt(step, context) {
  const promptBuilder = this._kernel.getModule('promptBuilder');
  const { promptConfig } = step;

  if (!promptConfig) {
    // Fallback to promptTemplate if no config
    return this._resolveTemplateTokens(step.promptTemplate || '', context);
  }

  switch (promptConfig.mode) {
    case 'custom':
      // Custom text prompt - resolve any embedded tokens
      return this._resolveCustomPrompt(promptConfig.customPrompt, context, promptBuilder);

    case 'preset':
      // Load preset prompt and resolve
      return this._resolvePresetPrompt(promptConfig.presetName, context, promptBuilder);

    case 'tokens':
      // Build from token stack
      return this._resolveTokenStackPrompt(promptConfig.tokens, context, promptBuilder);

    default:
      this._logger.warn(`Unknown prompt mode: ${promptConfig.mode}, using custom`);
      return this._resolveCustomPrompt(promptConfig.customPrompt || '', context, promptBuilder);
  }
}
```

### 4. Resolve Custom Prompt

Handle custom text with embedded tokens:

```javascript
// Location: curation-system.js, new method

async _resolveCustomPrompt(customPrompt, context, promptBuilder) {
  if (!customPrompt) return '';

  // Replace context variables first {{input}}, {{previousOutput}}, {{variables.name}}
  let resolved = this._resolveContextVariables(customPrompt, context);

  // Then resolve any Council/ST tokens through PromptBuilder
  // Look for {{token:xxx}} patterns
  const tokenPattern = /\{\{(\w+):([^}]+)\}\}/g;
  let match;

  while ((match = tokenPattern.exec(customPrompt)) !== null) {
    const [fullMatch, type, tokenId] = match;

    try {
      // Use PromptBuilder to resolve token
      const tokenValue = await promptBuilder.resolveToken({ type, id: tokenId }, context);
      resolved = resolved.replace(fullMatch, tokenValue || '');
    } catch (error) {
      this._logger.warn(`Failed to resolve token ${fullMatch}: ${error.message}`);
      // Leave token as-is or replace with empty
    }
  }

  return resolved;
}

_resolveContextVariables(text, context) {
  return text
    // {{input}} - step input
    .replace(/\{\{input\}\}/g, JSON.stringify(context.input, null, 2))
    // {{previousOutput}} - previous step output
    .replace(/\{\{previousOutput\}\}/g, context.previousOutput || '')
    // {{variables.name}} - named variables
    .replace(/\{\{variables\.(\w+)\}\}/g, (match, varName) => {
      return context.variables[varName] || '';
    })
    // {{pipeline.name}}, {{pipeline.operation}}, etc.
    .replace(/\{\{pipeline\.(\w+)\}\}/g, (match, prop) => {
      return context.pipeline[prop] || '';
    })
    // {{step.name}}, {{step.index}}, etc.
    .replace(/\{\{step\.(\w+)\}\}/g, (match, prop) => {
      return context.step[prop] || '';
    })
    // {{store.count}}, {{store.keys}}, etc.
    .replace(/\{\{store\.(\w+)\}\}/g, (match, prop) => {
      if (!context.store) return '';
      const value = context.store[prop];
      return Array.isArray(value) ? value.join(', ') : String(value || '');
    });
}
```

### 5. Resolve Preset Prompt

Load and resolve a saved preset:

```javascript
// Location: curation-system.js, new method

async _resolvePresetPrompt(presetName, context, promptBuilder) {
  if (!presetName) {
    this._logger.warn('No preset name provided');
    return '';
  }

  // Get preset from PromptBuilder
  const preset = promptBuilder.getPreset(presetName);
  if (!preset) {
    this._logger.warn(`Preset not found: ${presetName}`);
    return '';
  }

  // Build prompt from preset's stack
  const result = promptBuilder.buildPrompt({
    stack: preset.stack || [],
    separator: preset.separator || '\n\n'
  }, context);

  return result.text || '';
}
```

### 6. Resolve Token Stack Prompt

Build from array of tokens (main mode for curation):

```javascript
// Location: curation-system.js, new method

async _resolveTokenStackPrompt(tokens, context, promptBuilder) {
  if (!tokens || !tokens.length) {
    return '';
  }

  // Use PromptBuilder's buildPrompt with the token stack
  const result = promptBuilder.buildPrompt({
    stack: tokens,
    separator: '\n\n',
    trim: true
  }, context);

  // Log resolution details for debugging
  if (result.warnings?.length) {
    result.warnings.forEach(w => this._logger.warn(`Prompt resolution: ${w}`));
  }

  return result.text || '';
}
```

### 7. Template Token Resolution (Legacy Support)

Support old-style promptTemplate field:

```javascript
// Location: curation-system.js, new method

_resolveTemplateTokens(template, context) {
  if (!template) return '';

  // Simple mustache-style replacement
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return match; // Can't resolve, leave as-is
      }
    }

    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `core/curation-system.js` | Add all prompt resolution methods |

## Integration with PromptBuilder

The PromptBuilder system (`core/prompt-builder-system.js`) provides:

- `buildPrompt({ stack, separator }, context)` - Build from token stack
- `resolveToken(token, context)` - Resolve single token
- `getPreset(name)` - Get saved preset
- Token types: `st` (SillyTavern), `council` (Council macros), `custom` (user-defined)

## Acceptance Criteria

1. [x] `_buildStepPromptContext` creates comprehensive context
2. [x] `_resolveStepPrompt` handles all promptConfig modes
3. [x] Custom prompts resolve context variables correctly
4. [x] Token stack prompts integrate with PromptBuilder
5. [x] Preset prompts load and resolve correctly
6. [x] Legacy promptTemplate is supported
7. [x] Warnings are logged for resolution issues
8. [x] Store data is available in context when relevant

## Testing

```javascript
// Test context building
const context = curationSystem._buildStepPromptContext(step, { test: 'input' }, execContext);
console.log('Context:', context);

// Test custom prompt resolution
const resolved = await curationSystem._resolveCustomPrompt(
  'Input: {{input}}, Pipeline: {{pipeline.name}}',
  context,
  promptBuilder
);
console.log('Resolved:', resolved);

// Test token stack
const stackResult = await curationSystem._resolveTokenStackPrompt(
  [{ id: 'char', type: 'st' }, { id: 'persona', type: 'st' }],
  context,
  promptBuilder
);
console.log('Stack result:', stackResult);
```

## Notes

- Context should be serializable for debugging/preview
- Token resolution errors should not crash execution
- Consider caching resolved tokens within a step for performance
