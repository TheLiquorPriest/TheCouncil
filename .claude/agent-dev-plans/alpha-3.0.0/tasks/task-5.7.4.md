# Task 5.7.4: Output Handling & Store Integration

**ID**: 5.7.4
**Name**: output-handling-store-integration
**Priority**: P0
**Agent**: dev-opus
**Status**: COMPLETE
**Completed**: 2025-12-17
**Commit**: f83dda5
**Depends On**: 5.7.3

## Problem Statement

After an LLM call completes, the response needs to be:
1. Parsed (potentially as JSON for store operations)
2. Routed based on `outputTarget` (next_step, store, variable)
3. Written to the target store (for CRUD operations)

Currently none of this is implemented.

## Objective

Implement output handling that:
1. Parses LLM responses (text or JSON)
2. Routes output based on step's `outputTarget`
3. Writes to Curation stores for store-targeted outputs
4. Manages variables for variable-targeted outputs
5. Passes data to next step for next_step targets

## Technical Requirements

### 1. Parse Step Output

Handle different response formats:

```javascript
// Location: curation-system.js, new method

_parseStepOutput(step, llmResponse) {
  const content = llmResponse.content;

  if (!content) {
    return { raw: '', parsed: null, type: 'empty' };
  }

  // Check if output should be JSON
  const expectJson = step.outputTarget === 'store' || step.expectJson === true;

  if (expectJson) {
    return this._parseJsonOutput(content, step);
  }

  // Text output
  return {
    raw: content,
    parsed: content.trim(),
    type: 'text'
  };
}

_parseJsonOutput(content, step) {
  // Try to extract JSON from response
  // LLMs often wrap JSON in markdown code blocks

  let jsonStr = content;

  // Try extracting from code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try extracting from raw JSON bounds
  const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!codeBlockMatch && jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      raw: content,
      parsed,
      type: 'json'
    };
  } catch (error) {
    this._logger.warn(`Failed to parse JSON output for step ${step.id}:`, error);

    // Return as text with parse error
    return {
      raw: content,
      parsed: null,
      type: 'json_error',
      error: error.message
    };
  }
}
```

### 2. Route Step Output

Direct output to appropriate destination:

```javascript
// Location: curation-system.js, new method

async _routeStepOutput(step, stepResult, executionContext) {
  const { outputTarget, variableName } = step;
  const output = stepResult.output;

  switch (outputTarget) {
    case 'next_step':
      // Store for next step's input
      executionContext.previousStepOutput = output.parsed || output.raw;
      this._logger.debug(`Step ${step.id} output routed to next step`);
      break;

    case 'store':
      // Write to curation store
      if (!executionContext.preview) {
        await this._writeToStore(output, executionContext);
      } else {
        // Record what would be written for preview
        executionContext.previewWrites = executionContext.previewWrites || [];
        executionContext.previewWrites.push({
          stepId: step.id,
          stepName: step.name,
          storeId: executionContext.pipeline.storeId,
          operation: executionContext.pipeline.operation,
          data: output.parsed
        });
      }
      // Also pass to next step
      executionContext.previousStepOutput = output.parsed || output.raw;
      break;

    case 'variable':
      // Store in named variable
      if (variableName) {
        executionContext.variables[variableName] = output.parsed || output.raw;
        this._logger.debug(`Step ${step.id} output stored in variable: ${variableName}`);
      } else {
        this._logger.warn(`Step ${step.id} has variable output but no variableName`);
      }
      // Also pass to next step
      executionContext.previousStepOutput = output.parsed || output.raw;
      break;

    default:
      this._logger.warn(`Unknown outputTarget: ${outputTarget}, defaulting to next_step`);
      executionContext.previousStepOutput = output.parsed || output.raw;
  }
}
```

### 3. Write to Store

Handle store write operations:

```javascript
// Location: curation-system.js, new method

async _writeToStore(output, executionContext) {
  const { storeId, operation } = executionContext.pipeline;
  const store = executionContext.targetStore;
  const schema = executionContext.targetStoreSchema;

  if (!store) {
    throw new Error(`Target store not found: ${storeId}`);
  }

  const data = output.parsed;
  if (!data) {
    throw new Error('No valid data to write to store (JSON parse failed or empty)');
  }

  this._logger.debug(`Writing to store ${storeId} with operation ${operation}:`, data);

  // Emit store write start event
  this._emit('pipeline:store:write:start', {
    pipelineId: executionContext.pipeline.id,
    storeId,
    operation,
    dataPreview: this._summarizeData(data)
  });

  try {
    let result;

    switch (operation) {
      case 'create':
        result = await this._storeCreate(store, schema, data, executionContext);
        break;

      case 'update':
        result = await this._storeUpdate(store, schema, data, executionContext);
        break;

      case 'delete':
        result = await this._storeDelete(store, schema, data, executionContext);
        break;

      case 'upsert':
        result = await this._storeUpsert(store, schema, data, executionContext);
        break;

      default:
        throw new Error(`Unknown store operation: ${operation}`);
    }

    // Record affected records
    executionContext.affectedRecords = executionContext.affectedRecords || [];
    executionContext.affectedRecords.push(...(result.affectedRecords || []));

    // Emit store write complete event
    this._emit('pipeline:store:write:complete', {
      pipelineId: executionContext.pipeline.id,
      storeId,
      operation,
      affectedCount: result.affectedRecords?.length || 0
    });

    return result;

  } catch (error) {
    // Emit store write error event
    this._emit('pipeline:store:write:error', {
      pipelineId: executionContext.pipeline.id,
      storeId,
      operation,
      error: error.message
    });

    throw error;
  }
}

_summarizeData(data) {
  if (Array.isArray(data)) {
    return `Array with ${data.length} items`;
  }
  if (typeof data === 'object') {
    return `Object with keys: ${Object.keys(data).slice(0, 5).join(', ')}...`;
  }
  return String(data).slice(0, 100);
}
```

### 4. Store Operations

Implement CRUD operations on stores:

```javascript
// Location: curation-system.js, new methods

async _storeCreate(store, schema, data, executionContext) {
  const records = Array.isArray(data) ? data : [data];
  const affectedRecords = [];

  for (const record of records) {
    // Validate against schema if available
    if (schema) {
      this._validateRecordAgainstSchema(record, schema);
    }

    // Generate key if not provided
    const key = record.key || record.id || this._generateRecordKey(record);

    // Check if key already exists
    if (store.has ? store.has(key) : store[key]) {
      throw new Error(`Record with key ${key} already exists. Use 'update' or 'upsert' operation.`);
    }

    // Add metadata
    const enrichedRecord = {
      ...record,
      _meta: {
        createdAt: new Date().toISOString(),
        createdBy: executionContext.pipeline.id,
        version: 1
      }
    };

    // Write to store
    if (store instanceof Map) {
      store.set(key, enrichedRecord);
    } else {
      store[key] = enrichedRecord;
    }

    affectedRecords.push({ key, operation: 'create', record: enrichedRecord });
  }

  // Trigger persistence
  await this._persistStore(executionContext.pipeline.storeId);

  return { affectedRecords };
}

async _storeUpdate(store, schema, data, executionContext) {
  const records = Array.isArray(data) ? data : [data];
  const affectedRecords = [];

  for (const record of records) {
    const key = record.key || record.id;
    if (!key) {
      throw new Error('Update operation requires a key or id field');
    }

    // Get existing record
    const existing = store instanceof Map ? store.get(key) : store[key];
    if (!existing) {
      throw new Error(`Record with key ${key} not found for update`);
    }

    // Merge with existing
    const updated = {
      ...existing,
      ...record,
      _meta: {
        ...existing._meta,
        updatedAt: new Date().toISOString(),
        updatedBy: executionContext.pipeline.id,
        version: (existing._meta?.version || 0) + 1
      }
    };

    // Validate
    if (schema) {
      this._validateRecordAgainstSchema(updated, schema);
    }

    // Write
    if (store instanceof Map) {
      store.set(key, updated);
    } else {
      store[key] = updated;
    }

    affectedRecords.push({ key, operation: 'update', record: updated, previousRecord: existing });
  }

  await this._persistStore(executionContext.pipeline.storeId);

  return { affectedRecords };
}

async _storeDelete(store, schema, data, executionContext) {
  const keys = Array.isArray(data) ? data.map(d => d.key || d.id || d) : [data.key || data.id || data];
  const affectedRecords = [];

  for (const key of keys) {
    const existing = store instanceof Map ? store.get(key) : store[key];

    if (!existing) {
      this._logger.warn(`Record with key ${key} not found for delete`);
      continue;
    }

    // Delete
    if (store instanceof Map) {
      store.delete(key);
    } else {
      delete store[key];
    }

    affectedRecords.push({ key, operation: 'delete', previousRecord: existing });
  }

  await this._persistStore(executionContext.pipeline.storeId);

  return { affectedRecords };
}

async _storeUpsert(store, schema, data, executionContext) {
  const records = Array.isArray(data) ? data : [data];
  const affectedRecords = [];

  for (const record of records) {
    const key = record.key || record.id || this._generateRecordKey(record);
    const existing = store instanceof Map ? store.get(key) : store[key];

    if (existing) {
      // Update
      const updated = {
        ...existing,
        ...record,
        _meta: {
          ...existing._meta,
          updatedAt: new Date().toISOString(),
          updatedBy: executionContext.pipeline.id,
          version: (existing._meta?.version || 0) + 1
        }
      };

      if (schema) this._validateRecordAgainstSchema(updated, schema);

      if (store instanceof Map) {
        store.set(key, updated);
      } else {
        store[key] = updated;
      }

      affectedRecords.push({ key, operation: 'update', record: updated, previousRecord: existing });
    } else {
      // Create
      const newRecord = {
        ...record,
        _meta: {
          createdAt: new Date().toISOString(),
          createdBy: executionContext.pipeline.id,
          version: 1
        }
      };

      if (schema) this._validateRecordAgainstSchema(newRecord, schema);

      if (store instanceof Map) {
        store.set(key, newRecord);
      } else {
        store[key] = newRecord;
      }

      affectedRecords.push({ key, operation: 'create', record: newRecord });
    }
  }

  await this._persistStore(executionContext.pipeline.storeId);

  return { affectedRecords };
}

_generateRecordKey(record) {
  // Generate a key based on record content
  const timestamp = Date.now();
  const hash = this._simpleHash(JSON.stringify(record));
  return `record_${timestamp}_${hash}`;
}

_simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

_validateRecordAgainstSchema(record, schema) {
  // Basic schema validation
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in record)) {
        throw new Error(`Required field missing: ${field}`);
      }
    }
  }

  // Type validation could be added here
  return true;
}

async _persistStore(storeId) {
  // Trigger Kernel settings save
  const stContext = this._kernel.getModule('stContext');
  if (stContext?.saveSettingsDebounced) {
    stContext.saveSettingsDebounced();
  }

  // Emit persistence event
  this._emit('store:persisted', { storeId });
}
```

### 5. Final Result Assembly

After all steps complete, assemble the final result:

```javascript
// Location: curation-system.js, in _executeCRUDPipeline

_assembleFinalResult(executionContext) {
  const { pipeline, stepResults, errors, affectedRecords, previewWrites } = executionContext;

  return {
    success: errors.length === 0,
    pipeline: {
      id: pipeline.id,
      name: pipeline.name,
      operation: pipeline.operation,
      storeId: pipeline.storeId
    },
    execution: {
      startTime: executionContext.startTime,
      endTime: Date.now(),
      duration: Date.now() - executionContext.startTime,
      stepsExecuted: stepResults.length,
      totalSteps: executionContext.totalSteps
    },
    stepResults: stepResults.map(r => ({
      stepId: r.stepId,
      stepName: r.stepName,
      success: r.success,
      duration: r.duration,
      // Don't include full output in summary
      outputType: r.output?.type,
      outputLength: r.output?.raw?.length
    })),
    affectedRecords: affectedRecords || [],
    previewWrites: executionContext.preview ? previewWrites : undefined,
    errors: errors.length > 0 ? errors : undefined,
    variables: Object.keys(executionContext.variables).length > 0 ? executionContext.variables : undefined
  };
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `core/curation-system.js` | Add output parsing, routing, store operations, result assembly |

## Acceptance Criteria

1. [x] LLM responses are parsed correctly (text and JSON)
2. [x] JSON extraction handles markdown code blocks
3. [x] Output routing works for all three targets (next_step, store, variable)
4. [x] Store create operation works correctly
5. [x] Store update operation works correctly
6. [x] Store delete operation works correctly
7. [x] Store upsert operation works correctly
8. [x] Records are validated against schema
9. [x] Store changes are persisted
10. [x] Final result is assembled with all relevant data
11. [x] Events are emitted for store operations

## Testing

```javascript
// Test JSON parsing
const output = curationSystem._parseJsonOutput('```json\n{"name": "test"}\n```', step);
console.log('Parsed:', output);

// Test store create (manual)
const result = await curationSystem._storeCreate(store, schema, { name: 'test' }, execContext);
console.log('Create result:', result);

// Test full pipeline execution
const pipelineResult = await curationSystem.executePipeline(pipelineId, { data: {} });
console.log('Pipeline result:', pipelineResult);
```

## Notes

- Store operations modify extension settings, triggering auto-save
- JSON parsing is resilient to LLM formatting quirks
- Schema validation is basic; could be enhanced
- Preview mode records what would happen without executing store writes
