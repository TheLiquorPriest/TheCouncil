# The Council - Known Issues & Status

## ✅ Fixed Issues

### Curation System
- ✅ **Pipeline steps aren't saving** - Added `savePipelines()` and `loadPipelines()` persistence methods. Pipelines now auto-save on registration and load on initialization.

### Pipeline System
- ✅ **Edit Action: Select Positions - broken** - Fixed `ParticipantSelector._getPositions()` to use `AgentsSystem.getAllPositions()` directly instead of relying on `getSummary()` which only returned counts.

### Agents System
- ✅ **SME Subsystem** - Implemented dynamic SME matching in `PipelineSystem._resolveDynamicSMEs()` with keyword extraction and scoring.

### Preset System
- ✅ **Position Import Accuracy** - Rewrote `PresetManager.applyPreset()` with proper dependency ordering: Teams → Positions (by tier) → Team member updates.
- ✅ **getSummary() missing data** - `AgentsSystem.getSummary()` now includes actual `agents`, `positions`, `teams` arrays in addition to counts.
- ✅ **New presets not showing** - Added `quick-pipeline.json` and `standard-pipeline.json` to known presets list in `PresetManager._fetchKnownPresets()`.

### UI/UX
- ✅ **Curation team visual distinction** - Added separate sections and styling for Curation vs Pipeline teams in Agents modal.
- ✅ **Mobile support** - Added comprehensive mobile styles to `main.css`, `agents-modal.js`, and `pipeline-modal.js`.

---

## 🔴 Remaining Issues

### Curation System
- [ ] Curation Agents aren't fully separated from Pipeline agents - need complete isolation in the curation system itself, which should be a completely separate system that offers integration with the pipeline system.
- [ ] Many small issues throughout the Curation UI.

### Pipeline System
- [ ] Threads subsystem not fully implemented.
- [ ] Outputs/Variables Subsystem not fully implemented.
- [ ] Pipeline system needs a second pass at quality and integrity - ensure all features are developed and tested thoroughly, logic is sound and robust.

### UI/UX
- [ ] Many small issues across all systems.
- [ ] Add button next to send message button that runs the active pipeline using the user's input as the pipeline input.
- [ ] Edit Agents Build Prompt from tokens does not work properly - drag and drop insert is broken and reorder is broken.

---

## Priority Backlog

### P1 - High Priority
- [ ] **Separate Curation agents from Pipeline agents** - Completely isolate curation agents in the curation system, separate from pipeline system.
- [ ] **Threads subsystem** - Fully implement threads subsystem for conversation management.
- [ ] **Second pass at Curation System quality and integrity** - Ensure all features are developed and tested thoroughly.
- [ ] **Integration with Pipeline System** - Ensure curation system offers seamless integration with the pipeline system.
- [ ] **Persistent Store Default Schemas** - The curation system should provide highly optimized default schemas for efficient data storage and retrieval for each persistent store by default.
- [ ] **Build out Character System** - Develop a robust character system that allows users to create and manage characters Agents which should integrate with the pipeline system similar to the curation system and integrate with the curation system for data integration -- the curation system handles character stores CRUD and Retrival, the Character system is responsible for character creation, management, and integration with the pipeline system in the sense that these agents are a specialized type of agent that acts more like an avatar of the characters they represent. This system should not borrow from the current agents system. Like the curation system it needs to be self-contained with its own agent definition and assignment system, position system, and team system. 

### P2 - Medium Priority
- [x] **Build remaining components** - ✅ TokenPicker and ExecutionMonitor created.
- [x] **Add more preset templates** - ✅ Quick (4-phase) and Standard (10-phase) presets added.
- [x] **Mobile support** - ✅ Comprehensive mobile styles added.
- [ ] **Prompt Builder Overhaul** - Complete rewrite designed to replicate ST prompt builder but expand functionality for powerful integration in our systems.
- [ ] **End-to-end testing** - Test full pipeline execution with mocked LLM.

### P3 - Nice to Have
- [ ] **Unit tests for core modules**
- [ ] **Import/export UI for pipelines and agent configs**
- [ ] **UI polish and theme support**
- [ ] **Documentation/onboarding** for preset format

---

## Recently Completed

| Date | Issue | Resolution |
|------|-------|------------|
| 2024 | ParticipantSelector positions broken | Use `getAllPositions()` directly |
| 2024 | Preset position import incorrect | Proper dependency ordering + position type field |
| 2024 | Curation pipelines not persisting | Added `savePipelines()`/`loadPipelines()` |
| 2024 | SME matching not implemented | Added `_resolveDynamicSMEs()` with keyword scoring |
| 2024 | getSummary() missing arrays | Added positions/teams/agents arrays to output |
| 2024 | Curation team visual distinction | Added separate sections + styling in Agents modal |
| 2024 | TokenPicker component | Created `ui/components/token-picker.js` |
| 2024 | ExecutionMonitor component | Created `ui/components/execution-monitor.js` |
| 2024 | Quick preset template | Created `data/presets/quick-pipeline.json` (4 phases) |
| 2024 | Standard preset template | Created `data/presets/standard-pipeline.json` (10 phases) |
| 2024 | New presets not discoverable | Added to known presets list in PresetManager |
| 2024 | Mobile support | Added comprehensive responsive styles to main.css and modals |

---

## Notes for Future Development

### Architecture Considerations
- The Curation system should maintain its own agent registry separate from the main AgentsSystem
- Threads need proper lifecycle management tied to phases and actions
- Output routing needs formalization with clear variable scoping rules

### Technical Debt
- Some inline styles in modals should be moved to main.css
- Event listener cleanup could be more thorough in some components
- Error handling could be more granular in preset loading

### Testing Priorities
1. Preset loading and application flow
2. Pipeline execution with multiple participants
3. SME keyword matching accuracy
4. Mobile UI interactions
5. Curation pipeline CRUD operations
