# Task 2.3.1: create-default-crud-pipelines

## Metadata

- **Group**: 2 - Curation Enhancements
- **Block**: 3 - Default Pipelines
- **Priority**: P0
- **Complexity**: moderate
- **Agent**: dev-sonnet
- **Status**: PENDING

## Description

Create 14 default CRUD (Create, Read, Update, Delete) pipelines for all defined stores. Each pipeline should handle basic data operations with appropriate validation.

## Files

- `data/pipelines/crud/` - Create directory and 14 JSON files
- `core/curation-system.js` - Register default pipelines on init

## Dependencies

None - can run in parallel with 2.3.2

## Acceptance Criteria

- [ ] 14 CRUD pipeline JSON files created
- [ ] Singleton stores have Read/Update operations
- [ ] Collection stores have full CRUD operations
- [ ] Pipelines registered on CurationSystem init
- [ ] Pipelines visible in Curation Modal

## Implementation Notes

### Directory Structure

```
data/pipelines/crud/
├── crud-storyDraft.json
├── crud-storyOutline.json
├── crud-storySynopsis.json
├── crud-plotLines.json
├── crud-scenes.json
├── crud-dialogueHistory.json
├── crud-characterSheets.json
├── crud-characterDevelopment.json
├── crud-characterInventory.json
├── crud-characterPositions.json
├── crud-factionSheets.json
├── crud-locationSheets.json
├── crud-currentSituation.json
└── crud-agentCommentary.json
```

### Store Types

**Singleton Stores** (Read/Update only):
- storyDraft
- storyOutline
- storySynopsis
- currentSituation

**Collection Stores** (Full CRUD):
- plotLines
- scenes
- dialogueHistory
- characterSheets
- characterDevelopment
- characterInventory
- characterPositions
- factionSheets
- locationSheets
- agentCommentary

### Collection CRUD Template

```json
{
  "id": "crud-{storeId}",
  "name": "{StoreName} CRUD",
  "description": "CRUD operations for {StoreName}",
  "storeId": "{storeId}",
  "type": "crud",
  "operations": {
    "create": {
      "actions": [
        {
          "id": "validate-input",
          "name": "Validate Input",
          "positionId": "archivist",
          "promptTemplate": "Validate data for {StoreName}:\n{{input}}"
        },
        {
          "id": "create-entry",
          "name": "Create Entry",
          "positionId": "{topologist}",
          "promptTemplate": "Create new {StoreName} entry."
        }
      ]
    },
    "read": { ... },
    "update": { ... },
    "delete": { ... }
  }
}
```

### Singleton CRUD Template

```json
{
  "id": "crud-{storeId}",
  "name": "{StoreName} CRUD",
  "description": "Read/Update operations for {StoreName}",
  "storeId": "{storeId}",
  "type": "crud",
  "operations": {
    "read": { ... },
    "update": { ... }
  }
}
```

### Registration (curation-system.js)

```javascript
async _registerDefaultCRUDPipelines() {
  const crudFiles = await this._loadPipelineFiles('data/pipelines/crud/');
  for (const pipeline of crudFiles) {
    this._crudPipelines.set(pipeline.id, pipeline);
  }
  this._logger.log('info', `Registered ${crudFiles.length} CRUD pipelines`);
}
```

## Testing

1. Verify all 14 JSON files created
2. Check JSON syntax validity
3. Restart extension, verify pipelines load
4. Check Curation Modal shows pipelines
5. Test a CRUD operation on one pipeline
