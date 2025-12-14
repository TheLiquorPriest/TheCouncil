# Task 3.4.1 Handoff: Create Tiered Presets

## Status: COMPLETE

## Model Used: opus

## What Was Implemented

Created three tiered presets for The Council extension that provide different levels of complexity and API usage:

### 1. Basic Preset (`data/presets/basic.json`)
- **Purpose**: Minimal single-phase workflow for fast responses with low API usage
- **Agents**: 3 (Publisher, Editor, Archivist)
- **Phases**: 1 (Generate Response)
- **Orchestration Mode**: Injection (replaces ST tokens with Curation RAG outputs)
- **Key Features**:
  - Single-phase pipeline for minimal latency
  - Character system disabled by default
  - Compact UI mode enabled
  - Auto-approve gavel (no user interruptions)
  - Lower timeouts (20s action, 2min phase, 5min pipeline)
  - Single-threaded execution (maxParallelActions: 1)
  - Minimal curation stores (storyDraft, storyOutline, characterSheets, currentSituation)

### 2. Standard Preset (`data/presets/standard.json`)
- **Purpose**: Balanced 3-phase workflow with full prose team
- **Agents**: 8 (Publisher, Editor, Scene Writer, Dialogue Writer, Action Writer, Character Writer, Continuity Specialist, Archivist)
- **Phases**: 3 (Context Gathering, Draft, Review)
- **Orchestration Mode**: Synthesis
- **Key Features**:
  - Full prose team (5 writers) for quality narrative
  - Context gathering phase with continuity check
  - Editorial review phase with polish
  - All default curation stores
  - Character system enabled
  - Moderate parallelism (maxParallelActions: 2, maxParallelAgents: 3)
  - 45s default timeout

### 3. Comprehensive Preset (`data/presets/comprehensive.json`)
- **Purpose**: Full 19-phase editorial workflow for maximum quality
- **Agents**: 23 (Full editorial board with all teams)
- **Phases**: 19 (Full editorial pipeline)
- **Orchestration Mode**: Synthesis
- **User Gavel Points**: 5 (Instructions, Outline, First Draft, Second Draft, Final Draft)
- **Key Features**:
  - 6 complete teams: Prose, Plot, World, Character, Environment, Curation
  - Multiple review cycles with parallel team reviews
  - CRUD pipelines for data curation
  - Deliberative RAG for context gathering
  - Team commentary and response archiving
  - Higher parallelism (maxParallelActions: 5, maxParallelAgents: 8)
  - Longer timeouts (90s action, 10min phase, 1hr pipeline)
  - Auto-extraction enabled for curation
  - Storage compression enabled

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `data/presets/basic.json` | Created | Basic preset with 3 agents, 1 phase, injection mode |
| `data/presets/standard.json` | Created | Standard preset with 8 agents, 3 phases, synthesis mode |
| `data/presets/comprehensive.json` | Created | Comprehensive preset with 23 agents, 19 phases, 5 gavels |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| Basic preset created with minimal agents | PASS | 3 agents (Publisher, Editor, Archivist) |
| Basic preset has single-phase pipeline | PASS | 1 phase (Generate Response) |
| Basic preset uses injection mode | PASS | orchestration.mode: "injection" |
| Basic preset optimized for low API usage | PASS | Single execution, low timeouts, minimal stores |
| Standard preset created with full prose team | PASS | 8 agents including 5 prose specialists |
| Standard preset has 3-phase pipeline | PASS | Context, Draft, Review phases |
| Standard preset uses synthesis mode | PASS | orchestration.mode: "synthesis" |
| Standard preset has all default stores | PASS | Full positionMapping with all store types |
| Comprehensive preset has all teams | PASS | 6 teams fully staffed |
| Comprehensive preset has 19-phase pipeline | PASS | 19 phases with full editorial workflow |
| Comprehensive preset has multiple gavel points | PASS | 5 user_gavel actions |
| All presets follow CompiledPresetSchema format | PASS | Valid JSON with all required system configs |
| JSON syntax valid | PASS | All files parse successfully |

## Issues Encountered

None. Implementation proceeded smoothly following the existing preset format from Task 3.3.1.

## Testing Notes

### Validation Performed
- JSON syntax validation: All three presets parse successfully
- Structure validation: All required system configurations present
- Agent count verification: basic=3, standard=8, comprehensive=23
- Phase count verification: basic=1, standard=3, comprehensive=19
- Gavel point count: comprehensive=5

### Browser Test Required: YES

To verify presets load correctly in the UI:
1. Start SillyTavern
2. Open The Council extension
3. Navigate to Pipeline modal
4. Test loading each preset from the preset selector
5. Verify the correct agents, teams, and phases appear

## Preset Comparison Summary

| Feature | Basic | Standard | Comprehensive |
|---------|-------|----------|---------------|
| Agents | 3 | 8 | 23 |
| Positions | 3 | 8 | 23 |
| Teams | 2 | 3 | 6 |
| Phases | 1 | 3 | 19 |
| Gavel Points | 0 | 0 | 5 |
| Mode | injection | synthesis | synthesis |
| Parallel Actions | 1 | 2 | 5 |
| Default Timeout | 20s | 45s | 90s |
| Character System | disabled | enabled | enabled |
| Auto Extraction | off | off | on |
| Use Case | Quick responses | Balanced quality/speed | Maximum quality |

## Next Steps

1. Run browser tests to verify preset loading
2. Test switching between presets in the UI
3. Verify preset values are correctly applied to system configurations
