# The Council - Default Pipeline Reference

**Version:** 2.0.0  
**Status:** Reference Document

---

## Overview

This document defines the default "Editorial Board" pipeline that ships with The Council. It represents a comprehensive multi-agent workflow designed for high-quality narrative response generation.

---

## Agent Organization

### Executive

| Position | Role |
|----------|------|
| **Publisher** | The big boss. Directs the pipeline process, makes final decisions, approves SME requests. |

### Teams

#### Prose Team
| Position | Tier | Role |
|----------|------|------|
| **Editor** | Leader | Oversees prose quality, synthesizes drafts, makes final editorial passes |
| Writer: Scene | Member | Focuses on scene-setting, atmosphere, pacing |
| Writer: Dialogue | Member | Focuses on character voice, conversation flow |
| Writer: Action | Member | Focuses on action sequences, physical descriptions |
| Writer: Character | Member | Focuses on character thoughts, emotions, internal state |

#### Plot Team
| Position | Tier | Role |
|----------|------|------|
| **Plot Architect** | Leader | Oversees plot structure, creates outlines |
| Macro Plot Specialist | Member | Focuses on overarching story arcs, long-term progression |
| Micro Plot Specialist | Member | Focuses on scene-level plot beats, immediate conflict |
| Continuity Specialist | Member | Ensures consistency with established events |

#### World Team
| Position | Tier | Role |
|----------|------|------|
| **Scholar** | Leader | Oversees world-building accuracy |
| Lore Specialist | Member | Focuses on world rules, magic systems, technology |
| Story Specialist | Member | Focuses on narrative context, story history |

#### Character Team
| Position | Tier | Role |
|----------|------|------|
| **Character Director** | Leader | Oversees character portrayal accuracy |
| Main Character Agents | Member | One static agent per main character |
| Minor Character Agents | Member | Dynamically spun up as needed |

*Note: Character agents not present in the response are bypassed.*

#### Environment Team
| Position | Tier | Role |
|----------|------|------|
| **Environment Director** | Leader | Oversees setting descriptions |
| Interior Specialist | Member | Focuses on indoor environments, rooms, buildings |
| Exterior Specialist | Member | Focuses on outdoor environments, landscapes, weather |

#### Record Keeping Team (Curation)
| Position | Tier | Role |
|----------|------|------|
| **Archivist** | Leader | Oversees all data curation and retrieval |
| Story Topologist | Member | Manages story/plot structure data |
| Lore Topologist | Member | Manages world-building data |
| Character Topologist | Member | Manages character data |
| Scene Topologist | Member | Manages scene data |
| Location Topologist | Member | Manages location data |

### Subject Matter Experts (SMEs)

SMEs are spun up dynamically when consensus determines they're needed. Maximum 2 per pipeline run.

**Examples:**
- Firearms and Ballistics Expert
- Physics Expert
- Survivalism Expert
- US History Expert
- Medicine Expert
- Military Tactics Expert
- Legal Expert
- Psychology Expert

---

## Thread Structure

### Main Threads (Always Visible)

| Thread | Purpose |
|--------|---------|
| **Main** | Primary deliberation space for leaders and executives |
| **Context** | Context retrieval discussions and results |
| **Instructions** | User instruction interpretation |
| **Outline** | Outline drafts and revisions |
| **Drafting** | Draft synthesis and reviewer feedback |
| **Final Response** | Final approved content |

### Team Threads (Collapsed by Default)

| Thread | Purpose |
|--------|---------|
| **Prose** | Prose team internal discussions |
| **Plot** | Plot team internal discussions |
| **World** | World team internal discussions |
| **Characters** | Character team internal discussions |
| **Environment** | Environment team internal discussions |
| **Record Keeping** | Curation team internal discussions |

---

## Pipeline Phases

### Phase Notation

```
{Threads}: Phase Name: Description - Participants
```

- `{Thread1, Thread2}` - Threads active during this phase
- `async:` prefix - Phase runs asynchronously (parallel with other async phases)
- `User Gavel` - User review/edit point

---

### Phase 1: Curate Persistent Stores

**Threads:** `{Record Keeping}`  
**Participants:** Record Keeping Team  
**Type:** Synchronous

**Description:**  
Update or build persistent data stores based on recent chat history and story developments.

**Actions:**
1. Story Topologist reviews story structure changes
2. Lore Topologist reviews world-building additions
3. Character Topologist reviews character developments
4. Scene Topologist reviews scene progression
5. Location Topologist reviews location details
6. Archivist synthesizes and commits store updates

**Output:** Updated persistent stores

---

### Phase 2: Preliminary Context

**Threads:** `{Main, Context}`  
**Participants:** Team Leads - Archivist, Scholar, Plot Architect  
**Type:** Synchronous

**Description:**  
Deliberate to determine what preliminary context should be retrieved. Decision by consensus.

**Actions:**
1. Archivist proposes relevant stored data
2. Scholar proposes relevant world context
3. Plot Architect proposes relevant plot context
4. Leaders discuss and reach consensus
5. Context retrieved and posted to Context thread

**Output:** Initial context compilation

---

### Phase 3: Understand User Instructions

**Threads:** `{Main, Instructions}`  
**Participants:** Publisher, Editor, Plot Architect, Scholar  
**Type:** Synchronous

**Description:**  
Deliberate on user instructions and intent. Decision by consensus.

**Actions:**
1. Publisher opens discussion on user's message
2. Editor interprets from prose perspective
3. Plot Architect interprets from plot perspective
4. Scholar interprets from world perspective
5. Leaders reach consensus on interpreted instructions
6. Final interpretation posted to Instructions thread

**Output:** Interpreted user instructions

---

### Phase 4: User Gavel - Instructions

**Threads:** `{Main}`  
**Participants:** User  
**Type:** Gavel

**Description:**  
User can review and edit the interpreted instructions before proceeding.

**Output:** User-approved instructions

---

### Phase 5: Secondary Context Pass

**Threads:** `{Main, Context}`  
**Participants:** Team Leads - Archivist, Scholar, Plot Architect  
**Type:** Synchronous

**Description:**  
Assess whether additional context should be included based on interpreted instructions. Decision by consensus.

**Actions:**
1. Review interpreted instructions
2. Identify any missing context
3. Retrieve additional context if needed
4. Update Context thread

**Output:** Complete context compilation

---

### Phase 6: Outline Draft

**Threads:** `{Plot, Outline}`  
**Participants:** Plot Team  
**Type:** Synchronous

**Description:**  
The Plot Team drafts the initial outline.

**Actions:**
1. Plot Architect directs outline approach
2. Macro Plot Specialist contributes arc considerations
3. Micro Plot Specialist contributes beat suggestions
4. Continuity Specialist checks against established events
5. Plot Architect synthesizes into draft outline
6. Draft posted to Outline thread

**Output:** Draft outline

---

### Phase 7a: Outline Review - World Team

**Threads:** `{World}`  
**Participants:** World Team  
**Type:** Asynchronous

**Description:**  
World Team reviews initial outline for world-building accuracy.

**Actions:**
1. Scholar directs review focus
2. Lore Specialist checks world rule compliance
3. Story Specialist checks narrative consistency
4. Feedback compiled in World thread

**Output:** World team feedback

---

### Phase 7b: Outline Review - Prose Team

**Threads:** `{Prose}`  
**Participants:** Prose Team  
**Type:** Asynchronous

**Description:**  
Prose Team reviews initial outline for narrative quality.

**Actions:**
1. Editor directs review focus
2. Writers assess from their specialties
3. Feedback compiled in Prose thread

**Output:** Prose team feedback

---

### Phase 7c: Outline Review - SME Request

**Threads:** `{Plot, Main}`  
**Participants:** Plot Team, Publisher  
**Type:** Asynchronous

**Description:**  
Plot Team discusses whether to request SME agents from Publisher.

**Actions:**
1. Plot Team discusses in Plot thread
2. If SMEs needed, Plot Architect requests from Publisher in Main thread
3. Publisher approves/denies (max 2 SMEs)
4. If approved, SME agents are spun up

**Output:** SME activation decision

---

### Phase 8: Outline Discussion

**Threads:** `{Main, Outline}`  
**Participants:** Plot Architect, Editor, Scholar, SMEs (if activated)  
**Type:** Synchronous

**Description:**  
Deliberate and decide final outline by consensus. SMEs identify any domain-specific issues.

**Actions:**
1. Review all team feedback
2. SMEs raise any domain concerns
3. Leaders discuss and resolve issues
4. Reach consensus on final outline
5. Final outline posted to Outline thread (replaces draft)

**Output:** Final outline

---

### Phase 9: User Gavel - Outline

**Threads:** `{Main}`  
**Participants:** User  
**Type:** Gavel

**Description:**  
User can review and edit the final outline before drafting begins.

**Output:** User-approved outline

---

### Phase 10: First Draft

**Threads:** `{Prose, Drafting}`  
**Participants:** Prose Team  
**Type:** Synchronous

**Description:**  
The Prose Team specialists each produce their contributions, Editor synthesizes into single draft.

**Actions:**
1. Editor assigns sections based on outline
2. Writer: Scene drafts scene-setting portions
3. Writer: Dialogue drafts conversation portions
4. Writer: Action drafts action portions
5. Writer: Character drafts internal/emotional portions
6. Editor synthesizes all contributions
7. First draft posted to Drafting thread

**Output:** First draft

---

### Phase 11: User Gavel - First Draft

**Threads:** `{Main}`  
**Participants:** User  
**Type:** Gavel

**Description:**  
User can review and edit the first draft.

**Output:** User-approved first draft

---

### Phase 12a: Draft Review - Character Team

**Threads:** `{Characters, Main}`  
**Participants:** Character Team  
**Type:** Asynchronous

**Description:**  
Character Team compiles feedback on character portrayal.

**Actions:**
1. Character Director assigns review tasks
2. Character agents review their character's portrayal
3. Character Director compiles and posts to Main thread

**Output:** Character feedback

---

### Phase 12b: Draft Review - Environment Team

**Threads:** `{Environment, Main}`  
**Participants:** Environment Team  
**Type:** Asynchronous

**Description:**  
Environment Team compiles feedback on setting descriptions.

**Actions:**
1. Environment Director assigns review tasks
2. Interior/Exterior Specialists review relevant portions
3. Environment Director compiles and posts to Main thread

**Output:** Environment feedback

---

### Phase 12c: Draft Review - SMEs

**Threads:** `{Main}`  
**Participants:** Active SMEs  
**Type:** Asynchronous

**Description:**  
SMEs provide domain-specific feedback.

**Actions:**
1. Each SME reviews for accuracy in their domain
2. Feedback posted directly to Main thread

**Output:** SME feedback

---

### Phase 13: Second Draft

**Threads:** `{Prose, Drafting}`  
**Participants:** Prose Team  
**Type:** Synchronous

**Description:**  
The Prose Team refines the first draft by consensus, incorporating feedback.

**Actions:**
1. Editor reviews all feedback from Main thread
2. Writers refine their sections based on feedback
3. Team reaches consensus on changes
4. Editor makes final pass
5. Second draft posted to Drafting thread (replaces first)

**Output:** Second draft

---

### Phase 14: User Gavel - Second Draft

**Threads:** `{Main}`  
**Participants:** User  
**Type:** Gavel

**Description:**  
User can review and edit the second draft.

**Output:** User-approved second draft

---

### Phase 15a: Draft Review - Plot Team

**Threads:** `{Plot, Main}`  
**Participants:** Plot Team  
**Type:** Asynchronous

**Description:**  
Plot Team compiles feedback on plot execution.

**Actions:**
1. Plot Architect assigns review tasks
2. Specialists review from their perspectives
3. Plot Architect compiles and posts to Main thread

**Output:** Plot feedback

---

### Phase 15b: Draft Review - World Team

**Threads:** `{World, Main}`  
**Participants:** World Team  
**Type:** Asynchronous

**Description:**  
World Team compiles feedback on world consistency.

**Actions:**
1. Scholar assigns review tasks
2. Specialists review from their perspectives
3. Scholar compiles and posts to Main thread

**Output:** World feedback

---

### Phase 15c: Draft Review - Publisher

**Threads:** `{Main}`  
**Participants:** Publisher  
**Type:** Asynchronous

**Description:**  
Publisher performs sanity check and provides high-level feedback.

**Actions:**
1. Publisher reviews overall quality
2. Checks alignment with user intent
3. Posts feedback to Main thread

**Output:** Publisher feedback

---

### Phase 16: Final Draft

**Threads:** `{Prose, Drafting}`  
**Participants:** Prose Team  
**Type:** Synchronous

**Description:**  
The Prose Team produces the final draft, incorporating all feedback.

**Actions:**
1. Editor reviews all feedback from Main thread
2. Writers make final refinements by consensus
3. Editor makes final editorial pass
4. Final draft posted to Drafting thread (replaces second)

**Output:** Final draft

---

### Phase 17: User Gavel - Final Draft

**Threads:** `{Main}`  
**Participants:** User  
**Type:** Gavel

**Description:**  
User can review and make final edits before publication.

**Output:** User-approved final draft

---

### Phase 18: Team Commentary

**Threads:** `{Main}`  
**Participants:** All Team Leads, Archivist  
**Type:** Synchronous

**Description:**  
Team leads may comment on the final draft. Archivist records commentary for future reference.

**Actions:**
1. Editor comments (optional)
2. Plot Architect comments (optional)
3. Scholar comments (optional)
4. Character Director comments (optional)
5. Environment Director comments (optional)
6. Publisher comments (optional)
7. Archivist records all commentary to persistent store

**Output:** Archived commentary

---

### Phase 19: Final Response

**Threads:** `{Final Response}`  
**Participants:** System  
**Type:** Synchronous

**Description:**  
Final draft is posted to the Final Response thread and sent as the SillyTavern chat response.

**Actions:**
1. Final draft posted to Final Response thread
2. Response sent to ST chat
3. Pipeline completes

**Output:** Published response

---

## Pipeline Summary

| # | Phase | Type | Threads | Key Participants |
|---|-------|------|---------|------------------|
| 1 | Curate Stores | Sync | Record Keeping | Record Keeping Team |
| 2 | Preliminary Context | Sync | Main, Context | Archivist, Scholar, Plot Architect |
| 3 | Understand Instructions | Sync | Main, Instructions | Publisher, Editor, Plot Architect, Scholar |
| 4 | **User Gavel** | Gavel | Main | User |
| 5 | Secondary Context | Sync | Main, Context | Archivist, Scholar, Plot Architect |
| 6 | Outline Draft | Sync | Plot, Outline | Plot Team |
| 7a | Outline Review | Async | World | World Team |
| 7b | Outline Review | Async | Prose | Prose Team |
| 7c | SME Request | Async | Plot, Main | Plot Team, Publisher |
| 8 | Outline Discussion | Sync | Main, Outline | Leaders + SMEs |
| 9 | **User Gavel** | Gavel | Main | User |
| 10 | First Draft | Sync | Prose, Drafting | Prose Team |
| 11 | **User Gavel** | Gavel | Main | User |
| 12a | Draft Review | Async | Characters, Main | Character Team |
| 12b | Draft Review | Async | Environment, Main | Environment Team |
| 12c | Draft Review | Async | Main | SMEs |
| 13 | Second Draft | Sync | Prose, Drafting | Prose Team |
| 14 | **User Gavel** | Gavel | Main | User |
| 15a | Draft Review | Async | Plot, Main | Plot Team |
| 15b | Draft Review | Async | World, Main | World Team |
| 15c | Draft Review | Async | Main | Publisher |
| 16 | Final Draft | Sync | Prose, Drafting | Prose Team |
| 17 | **User Gavel** | Gavel | Main | User |
| 18 | Commentary | Sync | Main | All Leads, Archivist |
| 19 | Final Response | Sync | Final Response | System |

---

## Phase Flow Diagram

```
[1. Curate Stores]
        │
        ▼
[2. Preliminary Context]
        │
        ▼
[3. Understand Instructions]
        │
        ▼
[4. USER GAVEL: Instructions]
        │
        ▼
[5. Secondary Context]
        │
        ▼
[6. Outline Draft]
        │
        ├──────────────────────────────┐
        ▼                              ▼
[7a. World Review]  [7b. Prose Review]  [7c. SME Request]
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                [8. Outline Discussion]
                            │
                            ▼
                [9. USER GAVEL: Outline]
                            │
                            ▼
                    [10. First Draft]
                            │
                            ▼
                [11. USER GAVEL: First Draft]
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
[12a. Character]    [12b. Environment]    [12c. SMEs]
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                    [13. Second Draft]
                            │
                            ▼
                [14. USER GAVEL: Second Draft]
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
[15a. Plot Review]  [15b. World Review]  [15c. Publisher]
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                    [16. Final Draft]
                            │
                            ▼
                [17. USER GAVEL: Final Draft]
                            │
                            ▼
                    [18. Commentary]
                            │
                            ▼
                    [19. Final Response]
```

---

## Gavel Points Summary

| Gavel | After Phase | Content Being Reviewed |
|-------|-------------|----------------------|
| 1 | Understand Instructions | Interpreted user intent |
| 2 | Outline Discussion | Final story outline |
| 3 | First Draft | Initial prose draft |
| 4 | Second Draft | Refined draft after first review |
| 5 | Final Draft | Complete draft after all reviews |

**Note:** Users can configure which gavels are enabled. For faster generation, gavels can be disabled or set to auto-approve.

---

## Estimated API Calls

Assuming all teams are active and all positions filled:

| Phase Group | Estimated Calls |
|-------------|-----------------|
| Curation (1) | 6 |
| Context (2, 5) | 6 |
| Instructions (3) | 4 |
| Outline (6-8) | 15 |
| First Draft (10, 12) | 10 |
| Second Draft (13, 15) | 10 |
| Final Draft (16) | 5 |
| Commentary (18) | 6 |
| **Total** | **~62 calls** |

**Optimization Options:**
- Disable optional reviews
- Use parallel execution where possible
- Skip gavels (auto-approve)
- Reduce team sizes
- Use faster/cheaper models for review phases

---

## Configuration Options

### Quick Mode
- Skip all gavels (auto-approve)
- Disable team threads
- Single draft iteration

### Standard Mode (Default)
- All phases enabled
- Key gavels enabled (Instructions, Final Draft)
- Full team participation

### Comprehensive Mode
- All phases enabled
- All gavels enabled
- Extended deliberation rounds
- Additional SME slots

---

*This pipeline represents the "full editorial board" experience. Users can customize by removing phases, disabling teams, or creating simpler pipelines.*