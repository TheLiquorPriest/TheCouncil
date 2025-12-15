# Alpha 3.0.0 Plan Overview

## Executive Summary

Alpha 3.0.0 focuses on three critical areas to improve The Council's stability, usability, and configuration management.

## Goals

### 1. Bug Fixes & Polish (Group 1) ✅ COMPLETE
Resolve all issues identified in UI testing to achieve 100% pass rate.

- Fix injection edit functionality
- Fix nav modal auto-reappear behavior
- Fix prompt builder mode switch errors
- Update documentation
- Add missing assets

### 2. Curation Enhancements (Group 2)
Make the Curation System more usable with manual pipeline control and preview capabilities.

- Add "Run" button to manually trigger pipelines
- Add preview mode for safe pipeline testing
- Create 14 default CRUD pipelines
- Create 14 default RAG pipelines
- Add pipeline testing integration

### 3. Kernel Preset System (Group 3)
Centralize configuration management with per-system schemas and tiered presets.

- Define per-system configuration schemas
- Add Kernel config manager
- Migrate existing presets to new format
- Create tiered presets (basic, standard, comprehensive)

## Priority Order

```
Group 1: Bug Fixes     →  Group 2: Curation  →  Group 3: Presets
   (P0-P3)                   (P0-P1)               (P0-P1)
```

## Success Criteria

### Group 1 ✅
- [x] All P0-P3 bugs resolved
- [x] UI test pass rate: 100%
- [x] No console errors on normal use

### Group 2
- [ ] Pipeline run button works
- [ ] Preview mode functional
- [ ] 28 default pipelines available
- [ ] Pipeline tests pass

### Group 3
- [ ] Per-system schemas defined
- [ ] Config manager functional
- [ ] Existing presets migrated
- [ ] 3 tiered presets available

## Out of Scope

- New system implementations
- Major UI redesigns
- Performance optimization (deferred to Alpha 4)
- Import/export enhancements (deferred)

## Dependencies

- SillyTavern running locally for UI testing
- Browser automation (Playwright MCP) for verification
- All Alpha 2.0.0 work complete (baseline)

## Source Documents

- UI Test Report: `docs/testing/UI_REPORT-20251213.md`
- Original plan: `Reference!-OLD-MONO-DOC.md`
- System definitions: `.claude/definitions/SYSTEM_DEFINITIONS.md`
