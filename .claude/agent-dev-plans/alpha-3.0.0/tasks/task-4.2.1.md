# Task 4.2.1: curation-stores-verification

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 4.2.1 |
| Name | curation-stores-verification |
| Priority | P0 (Critical) |
| Agent | ui-feature-verification-test-opus |
| Browser Test | Yes |
| Dependencies | 4.1.1 |

## Description
Verify all Curation System data stores work correctly through the UI. Test CRUD operations on all 4 singleton stores and all 10 collection stores. Verify schema validation and indexing.

## Files
- `core/curation-system.js`
- `ui/curation-modal.js`
- `schemas/systems.js`

## Verification Points

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| C1 | Singleton Stores (4) | CRUD on World Info, Author Notes, Character Card, Chat Context | All operations succeed |
| C2 | Collection Stores (10) | CRUD on all collection stores | All operations succeed |
| C3 | Store Schemas | Create entry with invalid data | Validation error shown |
| C4 | Store Indexing | Query by indexed field | Results return correctly |
| C5 | Search Functionality | Cross-store search query | Matching results from multiple stores |

## Stores to Test

### Singleton Stores
1. World Info
2. Author Notes
3. Character Card
4. Chat Context

### Collection Stores
1. Characters
2. Messages
3. Lorebooks
4. Custom Data
5. Personas
6. Presets
7. Tags
8. World Info Entries
9. Groups
10. Chats

## Acceptance Criteria
- [ ] All 4 singleton stores support read/write
- [ ] All 10 collection stores support full CRUD
- [ ] Invalid data rejected with clear error
- [ ] Indexed queries return correct results
- [ ] Cross-store search returns matches

## Notes
Created: 2025-12-15
Source: Group 4 Comprehensive Verification Plan
