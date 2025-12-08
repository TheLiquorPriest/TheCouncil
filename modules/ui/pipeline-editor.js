// modules/ui/pipeline-editor.js - Dynamic Pipeline Editor for The Council
// UI for viewing and modifying pipeline phase definitions

const PipelineEditor = {
  // ===== VERSION =====
  VERSION: "1.0.0",

  // ===== MODULE REFERENCES =====
  _config: null,
  _state: null,
  _schemas: null,
  _executor: null,

  // ===== DOM REFERENCES =====
  _container: null,
  _modal: null,
  _isVisible: false,
  _initialized: false,

  // ===== STATE =====
  _phases: [],
  _originalPhases: [],
  _selectedPhaseIndex: -1,
  _hasChanges: false,
  _expandedSections: new Set(["basic"]),

  // ===== CONSTANTS =====
  SECTION_ICONS: {
    basic: "📋",
    agents: "👥",
    context: "📦",
    outputs: "📤",
    threads: "💬",
    rag: "🔍",
    execution: "⚡",
    gavel: "⚖️",
  },

  // ===== INITIALIZATION =====

  /**
   * Initialize the pipeline editor
   * @param {Object} modules - Module references
   * @returns {PipelineEditor}
   */
  init(modules = {}) {
    console.log("[Pipeline Editor] Initializing...");

    this._config = modules.config || window.CouncilConfig || null;
    this._state = modules.state || window.CouncilState || null;
    this._schemas = modules.schemas || window.PipelineSchemas || null;
    this._executor = modules.executor || window.PipelineExecutor || null;

    // Load current phases
    this._loadPhases();

    // Create modal
    this._createModal();

    // Inject styles
    this._injectStyles();

    this._initialized = true;
    console.log("[Pipeline Editor] Initialized");
    return this;
  },

  /**
   * Load phases from config
   */
  _loadPhases() {
    const configPhases = this._config?.PIPELINE_PHASES || [];
    this._phases = JSON.parse(JSON.stringify(configPhases)); // Deep clone
    this._originalPhases = JSON.parse(JSON.stringify(configPhases));
    this._hasChanges = false;
  },

  // ===== MODAL CREATION =====

  /**
   * Create the editor modal
   */
  _createModal() {
    if (document.getElementById("council-pipeline-editor-modal")) {
      this._modal = document.getElementById("council-pipeline-editor-modal");
      return;
    }

    const modalHtml = `
      <div id="council-pipeline-editor-modal" class="pipeline-editor-modal">
        <div class="pipeline-editor-container">
          <div class="pipeline-editor-header">
            <h3>🔧 Pipeline Editor</h3>
            <div class="pipeline-editor-header-actions">
              <button class="pe-btn pe-btn-secondary" id="pe-import-btn" title="Import Pipeline">📥 Import</button>
              <button class="pe-btn pe-btn-secondary" id="pe-export-btn" title="Export Pipeline">📤 Export</button>
              <button class="pe-btn pe-btn-icon" id="pe-close-btn" title="Close">×</button>
            </div>
          </div>

          <div class="pipeline-editor-body">
            <!-- Left sidebar: Phase list -->
            <div class="pipeline-editor-sidebar">
              <div class="pe-sidebar-header">
                <span>Phases</span>
                <button class="pe-btn pe-btn-small" id="pe-add-phase-btn" title="Add Phase">+ Add</button>
              </div>
              <div class="pe-phase-list" id="pe-phase-list">
                <!-- Phase items rendered here -->
              </div>
            </div>

            <!-- Main content: Phase editor -->
            <div class="pipeline-editor-main">
              <div class="pe-no-selection" id="pe-no-selection">
                <div class="pe-no-selection-icon">📋</div>
                <div class="pe-no-selection-text">Select a phase to edit</div>
                <div class="pe-no-selection-hint">Or click "Add" to create a new phase</div>
              </div>

              <div class="pe-phase-editor" id="pe-phase-editor" style="display: none;">
                <!-- Phase editor content rendered here -->
              </div>
            </div>
          </div>

          <div class="pipeline-editor-footer">
            <div class="pe-footer-left">
              <span class="pe-changes-indicator" id="pe-changes-indicator" style="display: none;">
                ⚠️ Unsaved changes
              </span>
            </div>
            <div class="pe-footer-right">
              <button class="pe-btn pe-btn-secondary" id="pe-reset-btn">Reset</button>
              <button class="pe-btn pe-btn-secondary" id="pe-cancel-btn">Cancel</button>
              <button class="pe-btn pe-btn-primary" id="pe-save-btn">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    this._modal = document.getElementById("council-pipeline-editor-modal");

    // Bind events
    this._bindModalEvents();
  },

  /**
   * Bind modal events
   */
  _bindModalEvents() {
    // Close button
    document.getElementById("pe-close-btn")?.addEventListener("click", () => {
      this.hide();
    });

    // Cancel button
    document.getElementById("pe-cancel-btn")?.addEventListener("click", () => {
      this.hide();
    });

    // Save button
    document.getElementById("pe-save-btn")?.addEventListener("click", () => {
      this.save();
    });

    // Reset button
    document.getElementById("pe-reset-btn")?.addEventListener("click", () => {
      this.reset();
    });

    // Add phase button
    document
      .getElementById("pe-add-phase-btn")
      ?.addEventListener("click", () => {
        this.addPhase();
      });

    // Import button
    document.getElementById("pe-import-btn")?.addEventListener("click", () => {
      this.importPipeline();
    });

    // Export button
    document.getElementById("pe-export-btn")?.addEventListener("click", () => {
      this.exportPipeline();
    });

    // Click outside to close
    this._modal?.addEventListener("click", (e) => {
      if (e.target === this._modal) {
        this.hide();
      }
    });

    // Escape key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isVisible) {
        this.hide();
      }
    });
  },

  // ===== RENDERING =====

  /**
   * Render the phase list
   */
  _renderPhaseList() {
    const listEl = document.getElementById("pe-phase-list");
    if (!listEl) return;

    if (this._phases.length === 0) {
      listEl.innerHTML = `
        <div class="pe-empty-list">
          <div>No phases defined</div>
          <div class="pe-empty-hint">Click "Add" to create one</div>
        </div>
      `;
      return;
    }

    const html = this._phases
      .map(
        (phase, index) => `
        <div class="pe-phase-item ${index === this._selectedPhaseIndex ? "selected" : ""}"
             data-index="${index}"
             draggable="true">
          <div class="pe-phase-item-drag">⋮⋮</div>
          <div class="pe-phase-item-content">
            <div class="pe-phase-item-name">${phase.icon || "📌"} ${phase.name || phase.id}</div>
            <div class="pe-phase-item-id">${phase.id}</div>
          </div>
          <div class="pe-phase-item-actions">
            <button class="pe-btn-icon pe-duplicate-btn" data-index="${index}" title="Duplicate">📋</button>
            <button class="pe-btn-icon pe-delete-btn" data-index="${index}" title="Delete">🗑️</button>
          </div>
        </div>
      `,
      )
      .join("");

    listEl.innerHTML = html;

    // Bind phase item events
    this._bindPhaseItemEvents();
  },

  /**
   * Bind phase item events
   */
  _bindPhaseItemEvents() {
    const items = document.querySelectorAll(".pe-phase-item");
    items.forEach((item) => {
      // Select phase
      item.addEventListener("click", (e) => {
        if (
          e.target.closest(".pe-delete-btn") ||
          e.target.closest(".pe-duplicate-btn")
        ) {
          return;
        }
        const index = parseInt(item.dataset.index, 10);
        // Force selection and editor render on click
        this.selectPhase(index);
        this._renderPhaseEditor();
      });

      // Drag and drop for reordering
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", item.dataset.index);
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        item.classList.add("drag-over");
      });

      item.addEventListener("dragleave", () => {
        item.classList.remove("drag-over");
      });

      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.classList.remove("drag-over");
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        const toIndex = parseInt(item.dataset.index);
        this.movePhase(fromIndex, toIndex);
      });
    });

    // Delete buttons
    document.querySelectorAll(".pe-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        this.deletePhase(index);
      });
    });

    // Duplicate buttons
    document.querySelectorAll(".pe-duplicate-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        this.duplicatePhase(index);
      });
    });
  },

  /**
   * Render the phase editor
   */
  _renderPhaseEditor() {
    const noSelectionEl = document.getElementById("pe-no-selection");
    const editorEl = document.getElementById("pe-phase-editor");

    if (
      this._selectedPhaseIndex < 0 ||
      !this._phases[this._selectedPhaseIndex]
    ) {
      if (noSelectionEl) noSelectionEl.style.display = "flex";
      if (editorEl) editorEl.style.display = "none";
      return;
    }

    if (noSelectionEl) noSelectionEl.style.display = "none";
    if (editorEl) editorEl.style.display = "block";

    const phase = this._phases[this._selectedPhaseIndex];

    // Defensive: ensure agents array exists
    if (!Array.isArray(phase.agents)) {
      phase.agents = [];
    }

    const html = `
      <div class="pe-editor-header">
        <input type="text" class="pe-phase-name-input" id="pe-phase-name"
               value="${this._escapeHtml(phase.name || "")}"
               placeholder="Phase Name">
        <div class="pe-phase-id">ID: ${phase.id}</div>
      </div>

      <div class="pe-editor-sections">
        ${this._renderSection("basic", "Basic Info", this._renderBasicSection(phase))}
        ${this._renderSection("agents", "Agents", this._renderAgentsSection(phase))}

        ${this._renderSection("context", "Context", this._renderContextSection(phase))}
        ${this._renderSection("outputs", "Outputs", this._renderOutputsSection(phase))}
        ${this._renderSection("threads", "Threads", this._renderThreadsSection(phase))}
        ${this._renderSection("rag", "RAG Config", this._renderRAGSection(phase))}
        ${this._renderSection("execution", "Execution", this._renderExecutionSection(phase))}
        ${this._renderSection("gavel", "User Approval", this._renderGavelSection(phase))}
      </div>
    `;

    editorEl.innerHTML = html;

    // Bind editor events
    this._bindEditorEvents();
  },

  /**
   * Render a collapsible section
   */
  _renderSection(id, title, content) {
    const icon = this.SECTION_ICONS[id] || "📄";
    const isExpanded = this._expandedSections.has(id);

    return `
      <div class="pe-section ${isExpanded ? "expanded" : ""}" data-section="${id}">
        <div class="pe-section-header">
          <span class="pe-section-toggle">${isExpanded ? "▼" : "▶"}</span>
          <span class="pe-section-icon">${icon}</span>
          <span class="pe-section-title">${title}</span>
        </div>
        <div class="pe-section-body">
          ${content}
        </div>
      </div>
    `;
  },

  /**
   * Render basic info section
   */
  _renderBasicSection(phase) {
    return `
      <div class="pe-form-group">
        <label>Phase ID</label>
        <input type="text" class="pe-input" id="pe-field-id"
               value="${this._escapeHtml(phase.id || "")}"
               placeholder="unique_phase_id">
        <div class="pe-field-hint">Unique identifier (use snake_case)</div>
      </div>

      <div class="pe-form-group">
        <label>Icon</label>
        <input type="text" class="pe-input pe-input-small" id="pe-field-icon"
               value="${this._escapeHtml(phase.icon || "")}"
               placeholder="📌">
        <div class="pe-field-hint">Emoji icon for the phase</div>
      </div>

      <div class="pe-form-group">
        <label>Description</label>
        <textarea class="pe-textarea" id="pe-field-description"
                  placeholder="Describe what this phase does...">${this._escapeHtml(phase.description || "")}</textarea>
      </div>

      <div class="pe-form-group">
        <label>Dependencies</label>
        <input type="text" class="pe-input" id="pe-field-dependencies"
               value="${(phase.dependencies || []).join(", ")}"
               placeholder="phase_id_1, phase_id_2">
        <div class="pe-field-hint">Comma-separated list of phase IDs that must complete first</div>
      </div>
    `;
  },

  /**
   * Render agents section
   */
  _renderAgentsSection(phase) {
    const agents = phase.agents || [];
    const allAgents = this._getAvailableAgents();

    const agentCheckboxes = allAgents
      .map(
        (agent) => `
        <label class="pe-checkbox-label">
          <input type="checkbox" class="pe-agent-checkbox" data-agent="${agent.id}"
                 ${agents.includes(agent.id) ? "checked" : ""}>
          <span>${agent.icon || "👤"} ${agent.name || agent.id}</span>
        </label>
      `,
      )
      .join("");

    return `
      <div class="pe-form-group">
        <label>Assigned Agents <button class="pe-btn pe-btn-small" type="button" id="pe-refresh-agents">↻</button></label>
        <div class="pe-checkbox-grid">
          ${agentCheckboxes || '<div class="pe-empty">No agents available</div>'}
        </div>
      </div>

      <div class="pe-form-group">
        <label>Agent Order (comma-separated IDs)</label>
        <input type="text" class="pe-input" id="pe-field-agent-order"
               value="${agents.join(", ")}"
               placeholder="agent_1, agent_2, agent_3">
        <div class="pe-field-hint">Order in which agents are called</div>
      </div>

      <div class="pe-form-group">
        <label>Agent Prompts (per agent) <button class="pe-btn pe-btn-small" type="button" id="pe-refresh-prompts">↻</button></label>
        <div class="pe-field-hint">Select a saved ST preset or enter a custom prompt per agent. Tokens: one per line as token|prefix|suffix.</div>
        <div class="pe-agent-override-list">
          ${(phase.agents || [])
            .map((agentId) => {
              const ov = phase.agentPromptOverrides?.[agentId] || {};
              const preset = ov.source === "preset" ? ov.presetName || "" : "";
              const custom =
                ov.source === "custom"
                  ? ov.customText || ""
                  : ov.customText || "";
              const tokens = this._formatTokens(ov.tokens);
              return `
              <div class="pe-agent-override-row" data-agent="${agentId}">
                <div class="pe-row">
                  <div>
                    <label>Agent</label>
                    <div class="pe-field-hint">${agentId}</div>
                  </div>
                  <div>
                    <label>Preset</label>
                    <select class="pe-select" data-role="preset">
                      ${this._renderSavedPromptOptions(preset)}
                    </select>
                  </div>
                  <div>
                    <label>Custom Prompt</label>
                    <textarea class="pe-textarea" data-role="custom" placeholder="Custom prompt...">${this._escape(custom)}</textarea>
                  </div>
                </div>
                <div class="pe-row">
                  <div style="flex:1;">
                    <label>Tokens (token|prefix|suffix per line)</label>
                    <textarea class="pe-textarea" data-role="tokens" placeholder="persona||\ncharacter_card||">${tokens}</textarea>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  },

  /**
   * Render context section
   */
  _renderContextSection(phase) {
    const context = phase.context || {};
    const inject = context.inject || [];
    const phaseContext = context.phase || [];
    const persistent = context.persistent || [];

    return `
      <div class="pe-form-group">
        <label>Inject Context</label>
        <input type="text" class="pe-input" id="pe-field-context-inject"
               value="${inject.join(", ")}"
               placeholder="user_input, character_card, story_synopsis">
        <div class="pe-field-hint">Context keys to inject from global/static</div>
      </div>

      <div class="pe-form-group">
        <label>Phase Context Blocks</label>
        <input type="text" class="pe-input" id="pe-field-context-phase"
               value="${phaseContext.join(", ")}"
               placeholder="phase_notes, discussion_summary">
        <div class="pe-field-hint">Phase-scoped context blocks to create</div>
      </div>

      <div class="pe-form-group">
        <label>Persistent References</label>
        <input type="text" class="pe-input" id="pe-field-context-persistent"
               value="${persistent.join(", ")}"
               placeholder="plotLines, characterSheets, scenes">
        <div class="pe-field-hint">Persistent store keys to resolve</div>
      </div>
    `;
  },

  /**
   * Render outputs section
   */
  _renderOutputsSection(phase) {
    const outputs = phase.outputs || {};
    const permanentOptions = [
      "global_context",
      "instructions",
      "outline_draft",
      "final_outline",
      "first_draft",
      "second_draft",
      "final_draft",
      "commentary",
    ];

    const permanentSelect = permanentOptions
      .map(
        (opt) =>
          `<option value="${opt}" ${outputs.permanent === opt ? "selected" : ""}>${opt}</option>`,
      )
      .join("");

    return `
      <div class="pe-form-group">
        <label>Phase Output Target</label>
        <input type="text" class="pe-input" id="pe-field-outputs-phase"
               value="${this._escapeHtml(outputs.phase?.target || "")}"
               placeholder="phase_output_key">
        <div class="pe-field-hint">Key for this phase's output</div>
      </div>

      <div class="pe-form-group">
        <label>Permanent Output Block</label>
        <select class="pe-select" id="pe-field-outputs-permanent">
          <option value="">-- None --</option>
          ${permanentSelect}
        </select>
        <div class="pe-field-hint">Permanent block this phase writes to</div>
      </div>
    `;
  },

  /**
   * Render threads section
   */
  _renderThreadsSection(phase) {
    const threads = phase.threads || {};
    const main = threads.main || {};
    const collaboration = threads.collaboration || [];
    const team = threads.team || [];

    return `
      <div class="pe-form-group">
        <label class="pe-checkbox-label">
          <input type="checkbox" id="pe-field-threads-main-enabled"
                 ${main.enabled !== false ? "checked" : ""}>
          <span>Enable Main Phase Thread</span>
        </label>
      </div>

      <div class="pe-form-group">
        <label>Main Thread Initial Prompt</label>
        <textarea class="pe-textarea" id="pe-field-threads-main-prompt"
                  placeholder="Initial prompt for main thread...">${this._escapeHtml(main.initialPrompt || "")}</textarea>
      </div>

      <div class="pe-form-group">
        <label>Collaboration Threads</label>
        <input type="text" class="pe-input" id="pe-field-threads-collab"
               value="${collaboration.join(", ")}"
               placeholder="workshop, review">
        <div class="pe-field-hint">Collaboration thread IDs (comma-separated)</div>
      </div>

      <div class="pe-form-group">
        <label>Team Threads</label>
        <input type="text" class="pe-input" id="pe-field-threads-team"
               value="${team.join(", ")}"
               placeholder="writing, recordkeeping">
        <div class="pe-field-hint">Team thread IDs (comma-separated)</div>
      </div>
    `;
  },

  /**
   * Render RAG section
   */
  _renderRAGSection(phase) {
    const rag = phase.rag || {};

    return `
      <div class="pe-form-group">
        <label class="pe-checkbox-label">
          <input type="checkbox" id="pe-field-rag-enabled" ${rag.enabled ? "checked" : ""}>
          <span>Enable RAG for this phase</span>
        </label>
      </div>

      <div class="pe-form-group">
        <label class="pe-checkbox-label">
          <input type="checkbox" id="pe-field-rag-async" ${rag.async !== false ? "checked" : ""}>
          <span>Async RAG (non-blocking)</span>
        </label>
      </div>

      <div class="pe-form-group">
        <label>RAG Scope</label>
        <select class="pe-select" id="pe-field-rag-scope">
          <option value="team" ${rag.scope === "team" ? "selected" : ""}>Team</option>
          <option value="agent" ${rag.scope === "agent" ? "selected" : ""}>Agent</option>
          <option value="phase" ${rag.scope === "phase" ? "selected" : ""}>Phase</option>
        </select>
      </div>

      <div class="pe-form-group">
        <label>Record Keeper Query</label>
        <textarea class="pe-textarea" id="pe-field-rag-query"
                  placeholder="Query for Record Keeper team...">${this._escapeHtml(rag.recordKeeperQuery || "")}</textarea>
      </div>

      <div class="pe-form-group">
        <label class="pe-checkbox-label">
          <input type="checkbox" id="pe-field-rag-manifest" ${rag.contextManifestIncluded !== false ? "checked" : ""}>
          <span>Include Context Manifest</span>
        </label>
      </div>
    `;
  },

  /**
   * Render execution section
   */
  _renderExecutionSection(phase) {
    const execution = phase.execution || {};

    return `
      <div class="pe-form-group">
        <label class="pe-checkbox-label">
          <input type="checkbox" id="pe-field-exec-parallel" ${execution.parallel ? "checked" : ""}>
          <span>Run agents in parallel</span>
        </label>
      </div>

      <div class="pe-form-group">
        <label>Timeout (ms)</label>
        <input type="number" class="pe-input pe-input-small" id="pe-field-exec-timeout"
               value="${execution.timeout || 300000}" min="1000" step="1000">
        <div class="pe-field-hint">Maximum time for phase execution</div>
      </div>

      <div class="pe-form-group">
        <label>Retry Count</label>
        <input type="number" class="pe-input pe-input-small" id="pe-field-exec-retry"
               value="${execution.retryCount || 1}" min="0" max="5">
        <div class="pe-field-hint">Number of retries on failure</div>
      </div>
    `;
  },

  /**
   * Render gavel (user approval) section
   */
  _renderGavelSection(phase) {
    const gavel = phase.gavel || {};

    return `
      <div class="pe-form-group">
        <label class="pe-checkbox-label">
          <input type="checkbox" id="pe-field-gavel-required" ${gavel.required ? "checked" : ""}>
          <span>Require user approval</span>
        </label>
      </div>

      <div class="pe-form-group">
        <label>Approval Prompt</label>
        <textarea class="pe-textarea" id="pe-field-gavel-prompt"
                  placeholder="Message shown when requesting approval...">${this._escapeHtml(gavel.prompt || "")}</textarea>
      </div>

      <div class="pe-form-group">
        <label>Editable Fields</label>
        <input type="text" class="pe-input" id="pe-field-gavel-fields"
               value="${(gavel.editableFields || []).join(", ")}"
               placeholder="outline, draft">
        <div class="pe-field-hint">Fields the user can edit during approval</div>
      </div>
    `;
  },

  /**
   * Bind editor events
   */
  _bindEditorEvents() {
    // Section toggles
    document.querySelectorAll(".pe-section-header").forEach((header) => {
      header.addEventListener("click", () => {
        const section = header.closest(".pe-section");
        const sectionId = section?.dataset?.section;
        if (sectionId) {
          this.toggleSection(sectionId);
        }
      });
    });

    // Phase name input
    document.getElementById("pe-phase-name")?.addEventListener("input", (e) => {
      this._updatePhaseField("name", e.target.value);
    });

    // All other inputs
    this._bindFieldInputs();
  },

  /**
   * Bind field input events
   */
  _bindFieldInputs() {
    // Basic fields
    this._bindInput("pe-field-id", "id");
    this._bindInput("pe-field-icon", "icon");
    this._bindInput("pe-field-description", "description");
    this._bindInput(
      "pe-field-dependencies",
      "dependencies",
      this._parseCommaSeparated,
    );

    // Agent order

    this._bindInput(
      "pe-field-agent-order",

      "agents",

      this._parseCommaSeparated,
    );

    // Agent checkboxes
    document.querySelectorAll(".pe-agent-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        this._updateAgentsFromCheckboxes();
      });
    });
    // Refresh agent list (re-render)
    document
      .getElementById("pe-refresh-agents")
      ?.addEventListener("click", () => {
        this._renderPhaseEditor();
      });

    // Agent prompt overrides (per-agent UI)
    const syncAgentOverrides = () => {
      if (
        this._selectedPhaseIndex < 0 ||
        !this._phases[this._selectedPhaseIndex]
      )
        return;
      const overrides = {};
      const rows = document.querySelectorAll(".pe-agent-override-row");
      rows.forEach((row) => {
        const agentId = row.dataset.agent;
        const preset = row.querySelector('[data-role="preset"]')?.value || "";
        const custom = row.querySelector('[data-role="custom"]')?.value || "";
        const tokensText =
          row.querySelector('[data-role="tokens"]')?.value || "";
        const tokens = this._parseTokens(tokensText);
        if (preset && preset !== "(no saved prompts detected)") {
          overrides[agentId] = {
            source: "preset",
            presetName: preset,
            tokens,
          };
        } else if (custom.trim()) {
          overrides[agentId] = {
            source: "custom",
            customText: custom.trim(),
            tokens,
          };
        }
      });
      this._phases[this._selectedPhaseIndex].agentPromptOverrides = overrides;
      this._markChanged();
    };

    document
      .querySelectorAll(
        ".pe-agent-override-row select, .pe-agent-override-row textarea",
      )
      .forEach((el) => {
        el.addEventListener("change", syncAgentOverrides);
        el.addEventListener("input", syncAgentOverrides);
      });
    const refreshPromptsBtn = document.getElementById("pe-refresh-prompts");
    if (refreshPromptsBtn) {
      refreshPromptsBtn.addEventListener("click", () => {
        this._renderPhaseEditor();
      });
    }

    // Context fields
    this._bindNestedInput(
      "pe-field-context-inject",
      ["context", "inject"],
      this._parseCommaSeparated,
    );
    this._bindNestedInput(
      "pe-field-context-phase",
      ["context", "phase"],
      this._parseCommaSeparated,
    );
    this._bindNestedInput(
      "pe-field-context-persistent",
      ["context", "persistent"],
      this._parseCommaSeparated,
    );

    // Output fields
    this._bindNestedInput("pe-field-outputs-phase", [
      "outputs",
      "phase",
      "target",
    ]);
    this._bindNestedInput("pe-field-outputs-permanent", [
      "outputs",
      "permanent",
    ]);

    // Thread fields
    this._bindNestedInput(
      "pe-field-threads-main-enabled",
      ["threads", "main", "enabled"],
      (v) => v,
    );
    this._bindNestedInput("pe-field-threads-main-prompt", [
      "threads",
      "main",
      "initialPrompt",
    ]);
    this._bindNestedInput(
      "pe-field-threads-collab",
      ["threads", "collaboration"],
      this._parseCommaSeparated,
    );
    this._bindNestedInput(
      "pe-field-threads-team",
      ["threads", "team"],
      this._parseCommaSeparated,
    );

    // RAG fields
    this._bindNestedInput("pe-field-rag-enabled", ["rag", "enabled"], (v) => v);
    this._bindNestedInput("pe-field-rag-async", ["rag", "async"], (v) => v);
    this._bindNestedInput("pe-field-rag-scope", ["rag", "scope"]);
    this._bindNestedInput("pe-field-rag-query", ["rag", "recordKeeperQuery"]);
    this._bindNestedInput(
      "pe-field-rag-manifest",
      ["rag", "contextManifestIncluded"],
      (v) => v,
    );

    // Execution fields
    this._bindNestedInput(
      "pe-field-exec-parallel",
      ["execution", "parallel"],
      (v) => v,
    );
    this._bindNestedInput(
      "pe-field-exec-timeout",
      ["execution", "timeout"],
      (v) => parseInt(v) || 300000,
    );
    this._bindNestedInput(
      "pe-field-exec-retry",
      ["execution", "retryCount"],
      (v) => parseInt(v) || 1,
    );

    // Gavel fields
    this._bindNestedInput(
      "pe-field-gavel-required",
      ["gavel", "required"],
      (v) => v,
    );
    this._bindNestedInput("pe-field-gavel-prompt", ["gavel", "prompt"]);
    this._bindNestedInput(
      "pe-field-gavel-fields",
      ["gavel", "editableFields"],
      this._parseCommaSeparated,
    );
  },

  /**
   * Bind a simple input field
   */
  _bindInput(elementId, field, transformer = null) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const eventType = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventType, (e) => {
      let value = el.type === "checkbox" ? el.checked : e.target.value;
      if (transformer) {
        value = transformer(value);
      }
      this._updatePhaseField(field, value);
    });
  },

  /**
   * Bind a nested input field
   */
  _bindNestedInput(elementId, path, transformer = null) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const eventType = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventType, (e) => {
      let value = el.type === "checkbox" ? el.checked : e.target.value;
      if (transformer) {
        value = transformer(value);
      }
      this._updatePhaseNestedField(path, value);
    });
  },

  /**
   * Parse comma-separated values
   */
  _parseCommaSeparated(value) {
    if (!value || typeof value !== "string") return [];
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  },

  _parseAgentPrompts(value) {
    if (!value || typeof value !== "string") return {};
    const lines = value.split("\n");
    const map = {};
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key) map[key] = val;
    }
    return map;
  },

  _formatAgentPrompts(map) {
    if (!map || typeof map !== "object") return "";
    return Object.entries(map)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  },

  _renderSavedPromptOptions(selected = "") {
    const prompts = this._getSavedPrompts();
    const opts = prompts.length ? prompts : ["(no saved prompts detected)"];
    return opts
      .map(
        (name) =>
          `<option value="${this._escape(name)}" ${
            name === selected ? "selected" : ""
          }>${this._escape(name)}</option>`,
      )
      .join("");
  },

  _getSavedPrompts() {
    try {
      const ctx = window?.SillyTavern?.getContext?.();
      if (!ctx) return [];
      const presetManager = ctx.getPresetManager?.();
      if (presetManager?.getAllPresets) {
        const names = presetManager.getAllPresets();
        if (!names.length) {
          console.warn(
            "[Pipeline Editor] No presets found via ST preset manager.",
          );
        }
        return names;
      }
      console.warn(
        "[Pipeline Editor] ST preset manager not available in context.",
      );
      return [];
    } catch (e) {
      console.warn(
        "[Pipeline Editor] Failed to read ST saved prompts via preset manager:",
        e,
      );
      return [];
    }
  },

  /**
   * Update a phase field
   */
  _updatePhaseField(field, value) {
    if (this._selectedPhaseIndex < 0) return;

    this._phases[this._selectedPhaseIndex][field] = value;
    this._markChanged();

    // Update phase list if name or id changed
    if (field === "name" || field === "id" || field === "icon") {
      this._renderPhaseList();
    }
  },

  /**
   * Update a nested phase field
   */
  _updatePhaseNestedField(path, value) {
    if (this._selectedPhaseIndex < 0) return;

    const phase = this._phases[this._selectedPhaseIndex];
    let current = phase;

    // Navigate to parent
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    // Set value
    current[path[path.length - 1]] = value;
    this._markChanged();
  },

  /**
   * Update agents from checkboxes
   */
  _updateAgentsFromCheckboxes() {
    const checkboxes = document.querySelectorAll(".pe-agent-checkbox:checked");
    const agents = Array.from(checkboxes).map((cb) => cb.dataset.agent);
    this._updatePhaseField("agents", agents);

    // Update the agent order input
    const orderInput = document.getElementById("pe-field-agent-order");
    if (orderInput) {
      orderInput.value = agents.join(", ");
    }
  },

  /**
   * Mark that changes have been made
   */
  _markChanged() {
    this._hasChanges = true;
    const indicator = document.getElementById("pe-changes-indicator");
    if (indicator) {
      indicator.style.display = "inline";
    }
  },

  // ===== PHASE MANAGEMENT =====

  /**
   * Select a phase for editing
   */
  selectPhase(index) {
    this._selectedPhaseIndex = index;
    this._renderPhaseList();
    this._renderPhaseEditor();
  },

  /**
   * Add a new phase
   */
  addPhase() {
    const newId = `new_phase_${Date.now()}`;
    const newPhase = {
      id: newId,
      name: "New Phase",
      icon: "📌",
      description: "",
      agents: [],
      threads: {
        main: { enabled: true },
        collaboration: [],
        team: [],
      },
      context: {
        inject: [],
        phase: [],
        persistent: [],
      },
      outputs: {},
      rag: { enabled: false },
      execution: { timeout: 300000, retryCount: 1 },
      gavel: { required: false },
    };

    this._phases.push(newPhase);
    this._markChanged();
    this._renderPhaseList();
    this.selectPhase(this._phases.length - 1);
  },

  /**
   * Delete a phase
   */
  deletePhase(index) {
    if (index < 0 || index >= this._phases.length) return;

    const phase = this._phases[index];
    if (!confirm(`Delete phase "${phase.name || phase.id}"?`)) {
      return;
    }

    this._phases.splice(index, 1);
    this._markChanged();

    // Adjust selection
    if (this._selectedPhaseIndex === index) {
      this._selectedPhaseIndex = -1;
    } else if (this._selectedPhaseIndex > index) {
      this._selectedPhaseIndex--;
    }

    this._renderPhaseList();
    this._renderPhaseEditor();
  },

  /**
   * Duplicate a phase
   */
  duplicatePhase(index) {
    if (index < 0 || index >= this._phases.length) return;

    const original = this._phases[index];
    const duplicate = JSON.parse(JSON.stringify(original));
    duplicate.id = `${original.id}_copy_${Date.now()}`;
    duplicate.name = `${original.name} (Copy)`;

    this._phases.splice(index + 1, 0, duplicate);
    this._markChanged();
    this._renderPhaseList();
    this.selectPhase(index + 1);
  },

  /**
   * Move a phase (reorder)
   */
  movePhase(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= this._phases.length) return;
    if (toIndex < 0 || toIndex >= this._phases.length) return;

    const [phase] = this._phases.splice(fromIndex, 1);
    this._phases.splice(toIndex, 0, phase);

    // Adjust selection
    if (this._selectedPhaseIndex === fromIndex) {
      this._selectedPhaseIndex = toIndex;
    } else if (
      fromIndex < this._selectedPhaseIndex &&
      toIndex >= this._selectedPhaseIndex
    ) {
      this._selectedPhaseIndex--;
    } else if (
      fromIndex > this._selectedPhaseIndex &&
      toIndex <= this._selectedPhaseIndex
    ) {
      this._selectedPhaseIndex++;
    }

    this._markChanged();
    this._renderPhaseList();
  },

  /**
   * Toggle section expansion
   */
  toggleSection(sectionId) {
    if (this._expandedSections.has(sectionId)) {
      this._expandedSections.delete(sectionId);
    } else {
      this._expandedSections.add(sectionId);
    }

    const section = document.querySelector(
      `.pe-section[data-section="${sectionId}"]`,
    );
    if (section) {
      section.classList.toggle(
        "expanded",
        this._expandedSections.has(sectionId),
      );
      const toggle = section.querySelector(".pe-section-toggle");
      if (toggle) {
        toggle.textContent = this._expandedSections.has(sectionId) ? "▼" : "▶";
      }
    }
  },

  // ===== SAVE / RESET =====

  /**
   * Save changes
   */
  save() {
    if (!this._hasChanges) {
      this.hide();
      return;
    }

    // Validate phases
    const errors = this._validatePhases();
    if (errors.length > 0) {
      alert("Validation errors:\n" + errors.join("\n"));
      return;
    }

    // Update config
    if (this._config) {
      this._config.PIPELINE_PHASES = JSON.parse(JSON.stringify(this._phases));
    }

    // Update executor if available
    if (this._executor?._loadPhases) {
      this._executor._loadPhases();
    }

    this._originalPhases = JSON.parse(JSON.stringify(this._phases));
    this._hasChanges = false;

    const indicator = document.getElementById("pe-changes-indicator");
    if (indicator) {
      indicator.style.display = "none";
    }

    console.log("[Pipeline Editor] Changes saved");
    this.hide();
  },

  /**
   * Reset changes
   */
  reset() {
    if (this._hasChanges && !confirm("Discard all changes?")) {
      return;
    }

    this._phases = JSON.parse(JSON.stringify(this._originalPhases));
    this._hasChanges = false;
    this._selectedPhaseIndex = -1;

    const indicator = document.getElementById("pe-changes-indicator");
    if (indicator) {
      indicator.style.display = "none";
    }

    this._renderPhaseList();
    this._renderPhaseEditor();
  },

  /**
   * Validate phases
   */
  _validatePhases() {
    const errors = [];
    const ids = new Set();

    for (let i = 0; i < this._phases.length; i++) {
      const phase = this._phases[i];

      if (!phase.id) {
        errors.push(`Phase ${i + 1}: Missing ID`);
      } else if (ids.has(phase.id)) {
        errors.push(`Phase ${i + 1}: Duplicate ID "${phase.id}"`);
      } else {
        ids.add(phase.id);
      }

      if (!phase.name) {
        errors.push(`Phase ${i + 1}: Missing name`);
      }
    }

    return errors;
  },

  // ===== IMPORT / EXPORT =====

  /**
   * Import pipeline from file
   */
  importPipeline() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          if (Array.isArray(data)) {
            this._phases = data;
          } else if (data.phases && Array.isArray(data.phases)) {
            this._phases = data.phases;
          } else {
            throw new Error("Invalid format");
          }

          this._markChanged();
          this._selectedPhaseIndex = -1;
          this._renderPhaseList();
          this._renderPhaseEditor();

          console.log(
            "[Pipeline Editor] Imported",
            this._phases.length,
            "phases",
          );
        } catch (err) {
          alert("Failed to import: " + err.message);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  },

  /**
   * Export pipeline to file
   */
  exportPipeline() {
    const data = {
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      phases: this._phases,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `council-pipeline-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log("[Pipeline Editor] Exported pipeline");
  },

  // ===== VISIBILITY =====

  /**
   * Show the editor modal
   */
  show() {
    // Ensure modal exists; recreate if missing (e.g., after DOM reset)
    if (
      !this._modal ||
      !document.getElementById("council-pipeline-editor-modal")
    ) {
      this._createModal();
    }

    this._loadPhases();

    // Ensure a phase is selected so the editor renders
    if (this._phases.length > 0 && this._selectedPhaseIndex < 0) {
      this._selectedPhaseIndex = 0;
    }

    this._renderPhaseList();
    this._renderPhaseEditor();

    if (this._modal) {
      this._modal.classList.add("visible");
    }
    this._isVisible = true;
  },

  /**
   * Hide the editor modal
   */
  hide() {
    if (
      this._hasChanges &&
      !confirm("You have unsaved changes. Close anyway?")
    ) {
      return;
    }

    if (this._modal) {
      this._modal.classList.remove("visible");
    }
    this._isVisible = false;
  },

  /**
   * Toggle visibility
   */
  toggle() {
    if (this._isVisible) {
      this.hide();
    } else {
      this.show();
    }
  },

  /**
   * Check if visible
   */
  isVisible() {
    return this._isVisible;
  },

  // ===== HELPERS =====

  /**
   * Get available agents from config
   */
  _getAvailableAgents() {
    const roles = this._config?.AGENT_ROLES || {};
    return Object.entries(roles).map(([id, role]) => ({
      id,
      name: role.name || id,
      icon: role.icon || "👤",
    }));
  },

  /**
   * Escape HTML
   */
  _escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  _parseTokens(text) {
    if (!text || typeof text !== "string") return [];
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length)
      .map((l) => {
        const [token, prefix, suffix] = l.split("|");
        return {
          token: token?.trim() || "",
          prefix: prefix || "",
          suffix: suffix || "",
        };
      })
      .filter((t) => t.token);
  },

  /**

   * Escape for prompt (alias)

   */

  _escape(text) {
    return this._escapeHtml(text);
  },

  /**
   * Format tokens array into textarea text
   */
  _formatTokens(tokens) {
    if (!Array.isArray(tokens)) return "";
    return tokens
      .map((t) => `${t.token || ""}|${t.prefix || ""}|${t.suffix || ""}`)
      .join("\n");
  },

  /**
   * Check if initialized
   */
  isInitialized() {
    return this._initialized;
  },

  // ===== STYLES =====

  /**
   * Inject styles
   */
  _injectStyles() {
    if (document.getElementById("council-pipeline-editor-styles")) return;

    const styles = `
      .pipeline-editor-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .pipeline-editor-modal.visible {
        display: flex;
      }

      .pipeline-editor-container {
        width: 90%;
        max-width: 1200px;
        height: 85%;
        max-height: 800px;
        background: var(--council-bg, #1a1a2e);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .pipeline-editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--council-header-bg, #16213e);
        border-bottom: 1px solid var(--council-border, #0f3460);
      }

      .pipeline-editor-header h3 {
        margin: 0;
        color: var(--council-text, #e8e8e8);
      }

      .pipeline-editor-header-actions {
        display: flex;
        gap: 8px;
      }

      .pipeline-editor-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .pipeline-editor-sidebar {
        width: 250px;
        border-right: 1px solid var(--council-border, #0f3460);
        display: flex;
        flex-direction: column;
      }

      .pe-sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 1px solid var(--council-border, #0f3460);
        font-weight: 500;
        color: var(--council-text, #e8e8e8);
      }

      .pe-phase-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .pe-phase-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        margin-bottom: 4px;
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .pe-phase-item:hover {
        background: var(--council-hover, #1a2744);
      }

      .pe-phase-item.selected {
        background: var(--council-accent, #4a9eff);
        border-color: var(--council-accent, #4a9eff);
      }

      .pe-phase-item.dragging {
        opacity: 0.5;
      }

      .pe-phase-item.drag-over {
        border-color: var(--council-accent, #4a9eff);
        border-style: dashed;
      }

      .pe-phase-item-drag {
        color: var(--council-text-muted, #a0a0a0);
        cursor: grab;
      }

      .pe-phase-item-content {
        flex: 1;
        min-width: 0;
      }

      .pe-phase-item-name {
        font-size: 13px;
        color: var(--council-text, #e8e8e8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pe-phase-item-id {
        font-size: 10px;
        color: var(--council-text-muted, #a0a0a0);
      }

      .pe-phase-item-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .pe-phase-item:hover .pe-phase-item-actions {
        opacity: 1;
      }

      .pipeline-editor-main {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .pe-no-selection {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--council-text-muted, #a0a0a0);
      }

      .pe-no-selection-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .pe-no-selection-text {
        font-size: 16px;
        margin-bottom: 8px;
      }

      .pe-no-selection-hint {
        font-size: 12px;
        opacity: 0.7;
      }

      .pe-editor-header {
        margin-bottom: 16px;
      }

      .pe-phase-name-input {
        width: 100%;
        font-size: 18px;
        font-weight: 500;
        padding: 8px 12px;
        background: var(--council-bg-light, #1e2a4a);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        color: var(--council-text, #e8e8e8);
        margin-bottom: 4px;
      }

      .pe-phase-id {
        font-size: 11px;
        color: var(--council-text-muted, #a0a0a0);
      }

      .pe-section {
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .pe-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: var(--council-header-bg, #16213e);
        cursor: pointer;
        color: var(--council-text, #e8e8e8);
      }

      .pe-section-toggle {
        font-size: 10px;
        width: 12px;
      }

      .pe-section-body {
        display: none;
        padding: 12px;
      }

      .pe-section.expanded .pe-section-body {
        display: block;
      }

      .pe-form-group {
        margin-bottom: 12px;
      }

      .pe-form-group label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--council-text, #e8e8e8);
        margin-bottom: 4px;
      }

      .pe-input, .pe-select, .pe-textarea {
        width: 100%;
        padding: 8px 10px;
        background: var(--council-bg-light, #1e2a4a);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        color: var(--council-text, #e8e8e8);
        font-size: 13px;
      }

      .pe-input-small {
        width: 120px;
      }

      .pe-textarea {
        min-height: 60px;
        resize: vertical;
      }

      .pe-field-hint {
        font-size: 10px;
        color: var(--council-text-muted, #a0a0a0);
        margin-top: 2px;
      }

      .pe-checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        color: var(--council-text, #e8e8e8);
      }

      .pe-checkbox-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 8px;
      }

      .pipeline-editor-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-top: 1px solid var(--council-border, #0f3460);
        background: var(--council-header-bg, #16213e);
      }

      .pe-footer-right {
        display: flex;
        gap: 8px;
      }

      .pe-changes-indicator {
        color: var(--council-warning, #ffc107);
        font-size: 12px;
      }

      .pe-btn {
        padding: 6px 12px;
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 4px;
        background: transparent;
        color: var(--council-text, #e8e8e8);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .pe-btn:hover {
        background: var(--council-hover, #1a2744);
      }

      .pe-btn-primary {
        background: var(--council-accent, #4a9eff);
        border-color: var(--council-accent, #4a9eff);
        color: white;
      }

      .pe-btn-primary:hover {
        background: #3a8eef;
      }

      .pe-btn-small {
        padding: 4px 8px;
        font-size: 11px;
      }

      .pe-btn-icon {
        background: transparent;
        border: none;
        padding: 4px;
        cursor: pointer;
        font-size: 14px;
        opacity: 0.7;
      }

      .pe-btn-icon:hover {
        opacity: 1;
      }

      .pe-empty-list {
        text-align: center;
        padding: 20px;
        color: var(--council-text-muted, #a0a0a0);
      }

      .pe-empty-hint {
        font-size: 11px;
        margin-top: 4px;
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.id = "council-pipeline-editor-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  },

  /**
   * Destroy and cleanup
   */
  destroy() {
    this._modal?.remove();
    document.getElementById("council-pipeline-editor-styles")?.remove();
    this._modal = null;
    this._initialized = false;
    console.log("[Pipeline Editor] Destroyed");
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.PipelineEditor = PipelineEditor;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PipelineEditor;
}
