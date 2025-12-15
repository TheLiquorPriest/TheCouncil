# Task 2.3.2: create-default-rag-pipelines

## Metadata

- **Group**: 2 - Curation Enhancements
- **Block**: 3 - Default Pipelines
- **Priority**: P0
- **Complexity**: moderate
- **Agent**: dev-sonnet
- **Status**: PENDING

## Description

Create 14 default RAG (Retrieval-Augmented Generation) pipelines for all defined stores. Each pipeline handles intelligent data retrieval for context injection.

## Files

- `data/pipelines/rag/` - Create directory and 14 JSON files
- `core/curation-system.js` - Register default RAG pipelines on init

## Dependencies

None - can run in parallel with 2.3.1

## Acceptance Criteria

- [ ] 14 RAG pipeline JSON files created
- [ ] Each pipeline has query parsing, search, ranking, formatting
- [ ] Pipelines registered on CurationSystem init
- [ ] Pipelines visible in Curation Modal
- [ ] RAG pipelines usable in Injection mode

## Implementation Notes

### Directory Structure

```
data/pipelines/rag/
├── rag-storyDraft.json
├── rag-storyOutline.json
├── rag-storySynopsis.json
├── rag-plotLines.json
├── rag-scenes.json
├── rag-dialogueHistory.json
├── rag-characterSheets.json
├── rag-characterDevelopment.json
├── rag-characterInventory.json
├── rag-characterPositions.json
├── rag-factionSheets.json
├── rag-locationSheets.json
├── rag-currentSituation.json
└── rag-agentCommentary.json
```

### RAG Pipeline Template

```json
{
  "id": "rag-{storeId}",
  "name": "{StoreName} RAG",
  "description": "Retrieval-Augmented Generation for {StoreName}",
  "targetStores": ["{storeId}"],
  "type": "rag",
  "canTriggerFromPipeline": true,
  "canTriggerManually": true,
  "actions": [
    {
      "id": "parse-query",
      "name": "Parse Query",
      "positionId": "archivist",
      "promptTemplate": "Parse query to extract search terms:\n{{query}}\n\nIdentify key entities and relationships."
    },
    {
      "id": "search-store",
      "name": "Search Store",
      "positionId": "{topologist}",
      "promptTemplate": "Search {StoreName} for:\n{{parsedQuery}}\n\nReturn relevant results."
    },
    {
      "id": "rank-results",
      "name": "Rank Results",
      "positionId": "archivist",
      "promptTemplate": "Rank by relevance to:\nQuery: {{query}}\nResults: {{searchResults}}\n\nReturn top {{maxResults}} results."
    },
    {
      "id": "format-output",
      "name": "Format Output",
      "positionId": "archivist",
      "promptTemplate": "Format for context injection:\n{{rankedResults}}\n\nProvide clear, concise context."
    }
  ],
  "inputSchema": {
    "query": { "type": "string", "required": true },
    "maxResults": { "type": "number", "default": 5 }
  },
  "outputSchema": {
    "results": { "type": "array" },
    "formatted": { "type": "string" }
  }
}
```

### Store-Specific Customizations

| Store | Topologist | Search Focus |
|-------|------------|--------------|
| storyDraft | storykeeper | Current narrative |
| storyOutline | storykeeper | Plot structure |
| storySynopsis | storykeeper | 5W+H context |
| plotLines | plotmaster | Active threads |
| scenes | scenemaster | Recent scenes |
| dialogueHistory | dialoguist | Character speech |
| characterSheets | charactermaster | Character details |
| characterDevelopment | charactermaster | Arc progress |
| characterInventory | inventorist | Possessions |
| characterPositions | cartographer | Locations |
| factionSheets | factionmaster | Faction info |
| locationSheets | cartographer | Place details |
| currentSituation | situationalist | Current state |
| agentCommentary | commentator | Past notes |

### Registration (curation-system.js)

```javascript
async _registerDefaultRAGPipelines() {
  const ragFiles = await this._loadPipelineFiles('data/pipelines/rag/');
  for (const pipeline of ragFiles) {
    this._ragPipelines.set(pipeline.id, pipeline);
  }
  this._logger.log('info', `Registered ${ragFiles.length} RAG pipelines`);
}
```

## Testing

1. Verify all 14 JSON files created
2. Check JSON syntax validity
3. Restart extension, verify pipelines load
4. Check Curation Modal shows pipelines
5. Test RAG query on one pipeline
6. Verify Injection mode can use RAG pipelines
