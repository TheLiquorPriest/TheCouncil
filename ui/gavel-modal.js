/**
 * TheCouncil - Gavel Modal UI
 *
 * User review/intervention modal for pipeline output review:
 * - Display phase output for review
 * - Allow editing of specified fields
 * - Approve, reject, or skip options
 * - Commentary/feedback input
 * - History of reviews
 *
 * @version 2.0.0
 */

const GavelModal = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== STATE =====

  /**
   * Modal visibility state
   * @type {boolean}
   */
  _isVisible: false,

  /**
   * Current gavel request data
   * @type {Object|null}
   */
  _currentRequest: null,

  /**
   * Edited values
   * @type {Object}
   */
  _editedValues: {},

  /**
   * User commentary
   * @type {string}
   */
  _commentary: "",

  /**
   * History of gavel decisions
   * @type {Array}
   */
  _history: [],

  /**
   * Maximum history entries
   * @type {number}
   */
  _maxHistory: 50,

  /**
   * Reference to PipelineSystem
   * @type {Object|null}
   */
  _pipelineSystem: null,

  /**
   * Reference to Logger
   * @type {Object|null}
   */
  _logger: null,

  /**
   * DOM element references
   * @type {Object}
   */
  _elements: {
    modal: null,
    overlay: null,
    content: null,
    editor: null,
    actions: null,
  },

  /**
   * Initialization flag
   * @type {boolean}
   */
  _initialized: false,

  /**
   * Event listener cleanup functions
   * @type {Function[]}
   */
  _cleanupFns: [],

  /**
   * Resolve function for current promise
   * @type {Function|null}
   */
  _resolvePromise: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the Gavel Modal
   * @param {Object} options - Configuration options
   * @param {Object} options.pipelineSystem - Reference to PipelineSystem
   * @param {Object} options.logger - Logger instance
   * @returns {GavelModal}
   */
  init(options = {}) {
    if (this._initialized) {
      this._log("warn", "GavelModal already initialized");
      return this;
    }

    this._pipelineSystem = options.pipelineSystem;
    this._logger = options.logger;

    this._log("info", "Initializing Gavel Modal...");

    // Create modal DOM
    this._createModal();

    // Subscribe to system events
    this._subscribeToEvents();

    // Load history from storage
    this._loadHistory();

    this._initialized = true;
    this._log("info", "Gavel Modal initialized");

    return this;
  },

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    // Run cleanup functions
    for (const cleanup of this._cleanupFns) {
      try {
        cleanup();
      } catch (e) {
        this._log("error", "Cleanup error:", e);
      }
    }
    this._cleanupFns = [];

    // Remove DOM elements
    if (this._elements.modal) {
      this._elements.modal.remove();
    }
    if (this._elements.overlay) {
      this._elements.overlay.remove();
    }

    this._elements = {
      modal: null,
      overlay: null,
      content: null,
      editor: null,
      actions: null,
    };

    this._initialized = false;
    this._currentRequest = null;
    this._resolvePromise = null;
    this._log("info", "Gavel Modal destroyed");
  },

  // ===== MODAL CREATION =====

  /**
   * Create the modal DOM structure
   */
  _createModal() {
    // Create overlay
    this._elements.overlay = document.createElement("div");
    this._elements.overlay.className = "council-gavel-overlay";
    // Don't close on overlay click for gavel - require explicit action

    // Create modal container
    this._elements.modal = document.createElement("div");
    this._elements.modal.className = "council-gavel-modal";
    this._elements.modal.innerHTML = this._getModalTemplate();

    // Append to body
    document.body.appendChild(this._elements.overlay);
    document.body.appendChild(this._elements.modal);

    // Cache element references
    this._elements.content = this._elements.modal.querySelector(
      ".council-gavel-content",
    );
    this._elements.editor = this._elements.modal.querySelector(
      ".council-gavel-editor",
    );
    this._elements.actions = this._elements.modal.querySelector(
      ".council-gavel-actions",
    );

    // Bind event handlers
    this._bindEvents();

    // Inject styles if not present
    this._injectStyles();
  },

  /**
   * Get modal template HTML
   * @returns {string}
   */
  _getModalTemplate() {
    return `
      <div class="council-gavel-container">
        <div class="council-gavel-header">
          <h2 class="council-gavel-title">
            <span class="council-gavel-icon">⚖️</span>
            Review Required
          </h2>
          <div class="council-gavel-header-info">
            <span class="council-gavel-phase-name"></span>
          </div>
        </div>

        <div class="council-gavel-body">
          <div class="council-gavel-prompt-section">
            <label>Review Instructions</label>
            <div class="council-gavel-prompt"></div>
          </div>

          <div class="council-gavel-content">
            <!-- Output content rendered here -->
          </div>

          <div class="council-gavel-editor">
            <!-- Editable fields rendered here -->
          </div>

          <div class="council-gavel-commentary-section">
            <label>Your Feedback / Commentary (optional)</label>
            <textarea class="council-gavel-commentary" rows="3" placeholder="Add any notes, feedback, or instructions for the next phase..."></textarea>
          </div>
        </div>

        <div class="council-gavel-footer">
          <div class="council-gavel-footer-info">
            <span class="council-gavel-skip-hint"></span>
          </div>
          <div class="council-gavel-actions">
            <button class="council-gavel-btn council-gavel-btn-skip" data-action="skip" title="Skip review and continue">
              ⏭️ Skip
            </button>
            <button class="council-gavel-btn council-gavel-btn-reject" data-action="reject" title="Reject and request revision">
              ❌ Reject
            </button>
            <button class="council-gavel-btn council-gavel-btn-approve" data-action="approve" title="Approve and continue">
              ✅ Approve
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Bind event handlers
   */
  _bindEvents() {
    const modal = this._elements.modal;

    // Button clicks
    modal.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        this._handleAction(action);
      });
    });

    // Commentary input
    const commentary = modal.querySelector(".council-gavel-commentary");
    if (commentary) {
      commentary.addEventListener("input", (e) => {
        this._commentary = e.target.value;
      });
    }

    // Keyboard shortcuts
    const keyHandler = (e) => {
      if (!this._isVisible) return;

      // Ctrl/Cmd + Enter to approve
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this._handleAction("approve");
      }
      // Escape to skip (if allowed)
      if (e.key === "Escape" && this._currentRequest?.canSkip) {
        e.preventDefault();
        this._handleAction("skip");
      }
    };
    document.addEventListener("keydown", keyHandler);
    this._cleanupFns.push(() =>
      document.removeEventListener("keydown", keyHandler),
    );
  },

  /**
   * Subscribe to PipelineSystem events
   */
  _subscribeToEvents() {
    if (!this._pipelineSystem) return;

    const handler = (data) => {
      this.show(data);
    };

    this._pipelineSystem.on("gavel:requested", handler);
    this._cleanupFns.push(() =>
      this._pipelineSystem.off("gavel:requested", handler),
    );
  },

  // ===== SHOW / HIDE =====

  /**
   * Show the gavel modal with request data
   * @param {Object} data - Gavel request data
   * @param {string} data.phaseId - Phase ID
   * @param {string} data.phaseName - Phase name
   * @param {string} data.prompt - Review prompt/instructions
   * @param {*} data.output - Output to review
   * @param {string[]} data.editableFields - Fields that can be edited
   * @param {boolean} data.canSkip - Whether skip is allowed
   * @returns {Promise<Object>} Resolves with user decision
   */
  show(data) {
    if (!this._initialized) {
      this._log("error", "GavelModal not initialized");
      return Promise.reject(new Error("GavelModal not initialized"));
    }

    return new Promise((resolve) => {
      this._currentRequest = data;
      this._resolvePromise = resolve;
      this._editedValues = {};
      this._commentary = "";

      // Update UI
      this._updateModalContent();

      // Show modal
      this._isVisible = true;
      this._elements.overlay.classList.add("visible");
      this._elements.modal.classList.add("visible");

      // Focus first editable field or commentary
      setTimeout(() => {
        const firstInput =
          this._elements.editor.querySelector("input, textarea");
        if (firstInput) {
          firstInput.focus();
        } else {
          const commentary = this._elements.modal.querySelector(
            ".council-gavel-commentary",
          );
          if (commentary) commentary.focus();
        }
      }, 100);

      this._log("info", "Gavel Modal shown for phase:", data.phaseName);
    });
  },

  /**
   * Hide the modal
   */
  hide() {
    this._isVisible = false;
    this._elements.overlay.classList.remove("visible");
    this._elements.modal.classList.remove("visible");

    this._log("info", "Gavel Modal hidden");
  },

  /**
   * Check if modal is visible
   * @returns {boolean}
   */
  isVisible() {
    return this._isVisible;
  },

  // ===== CONTENT RENDERING =====

  /**
   * Update modal content with current request data
   */
  _updateModalContent() {
    const data = this._currentRequest;
    if (!data) return;

    // Update header
    const phaseName = this._elements.modal.querySelector(
      ".council-gavel-phase-name",
    );
    if (phaseName) {
      phaseName.textContent = data.phaseName || data.phaseId || "Unknown Phase";
    }

    // Update prompt
    const prompt = this._elements.modal.querySelector(".council-gavel-prompt");
    if (prompt) {
      prompt.textContent =
        data.prompt || "Please review the output below and approve or reject.";
    }

    // Update skip hint
    const skipHint = this._elements.modal.querySelector(
      ".council-gavel-skip-hint",
    );
    const skipBtn = this._elements.modal.querySelector('[data-action="skip"]');
    if (skipHint && skipBtn) {
      if (data.canSkip) {
        skipHint.textContent =
          "Press Escape or click Skip to continue without review";
        skipBtn.style.display = "";
      } else {
        skipHint.textContent = "Review is required for this phase";
        skipBtn.style.display = "none";
      }
    }

    // Render output content
    this._renderOutputContent();

    // Render editable fields
    this._renderEditableFields();

    // Clear commentary
    const commentary = this._elements.modal.querySelector(
      ".council-gavel-commentary",
    );
    if (commentary) {
      commentary.value = "";
    }
  },

  /**
   * Render the output content for review
   */
  _renderOutputContent() {
    const output = this._currentRequest?.output;
    const content = this._elements.content;

    if (!content) return;

    if (!output) {
      content.innerHTML =
        '<div class="council-gavel-empty">No output to review</div>';
      return;
    }

    // Render based on output type
    if (typeof output === "string") {
      content.innerHTML = `
        <div class="council-gavel-output">
          <div class="council-gavel-output-text">${this._escapeHtml(output)}</div>
        </div>
      `;
    } else if (typeof output === "object") {
      content.innerHTML = `
        <div class="council-gavel-output">
          <div class="council-gavel-output-sections">
            ${this._renderOutputSections(output)}
          </div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="council-gavel-output">
          <pre>${this._escapeHtml(String(output))}</pre>
        </div>
      `;
    }
  },

  /**
   * Render output sections for object output
   * @param {Object} output - Output object
   * @returns {string} HTML string
   */
  _renderOutputSections(output) {
    const editableFields = this._currentRequest?.editableFields || [];

    return Object.entries(output)
      .map(([key, value]) => {
        const isEditable = editableFields.includes(key);
        const displayValue =
          typeof value === "object"
            ? JSON.stringify(value, null, 2)
            : String(value);

        if (isEditable) {
          // Will be rendered in editable section
          return "";
        }

        return `
          <div class="council-gavel-output-section">
            <div class="council-gavel-output-label">${this._escapeHtml(this._formatLabel(key))}</div>
            <div class="council-gavel-output-value">
              ${typeof value === "object" ? `<pre>${this._escapeHtml(displayValue)}</pre>` : this._escapeHtml(displayValue)}
            </div>
          </div>
        `;
      })
      .filter(Boolean)
      .join("");
  },

  /**
   * Render editable fields
   */
  _renderEditableFields() {
    const output = this._currentRequest?.output;
    const editableFields = this._currentRequest?.editableFields || [];
    const editor = this._elements.editor;

    if (!editor) return;

    if (!editableFields.length || !output || typeof output !== "object") {
      editor.innerHTML = "";
      editor.style.display = "none";
      return;
    }

    editor.style.display = "block";
    editor.innerHTML = `
      <div class="council-gavel-editor-header">
        <h4>✏️ Editable Fields</h4>
        <p>You can modify these fields before approving:</p>
      </div>
      <div class="council-gavel-editor-fields">
        ${editableFields
          .map((field) => {
            const value = output[field];
            const displayValue =
              typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value || "");

            // Determine if multiline
            const isMultiline =
              typeof value === "object" ||
              (typeof value === "string" &&
                (value.length > 100 || value.includes("\n")));

            return `
              <div class="council-gavel-editor-field">
                <label>${this._escapeHtml(this._formatLabel(field))}</label>
                ${
                  isMultiline
                    ? `<textarea class="council-gavel-editor-input" data-field="${this._escapeHtml(field)}" rows="5">${this._escapeHtml(displayValue)}</textarea>`
                    : `<input type="text" class="council-gavel-editor-input" data-field="${this._escapeHtml(field)}" value="${this._escapeHtml(displayValue)}">`
                }
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    // Bind input handlers
    editor.querySelectorAll(".council-gavel-editor-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const field = e.target.dataset.field;
        this._editedValues[field] = e.target.value;
      });
    });
  },

  /**
   * Format a field name as a label
   * @param {string} key - Field key
   * @returns {string} Formatted label
   */
  _formatLabel(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  },

  // ===== ACTION HANDLERS =====

  /**
   * Handle action button clicks
   * @param {string} action - Action name
   */
  _handleAction(action) {
    this._log("debug", `Gavel action: ${action}`);

    switch (action) {
      case "approve":
        this._submitDecision("approved");
        break;
      case "reject":
        this._submitDecision("rejected");
        break;
      case "skip":
        if (this._currentRequest?.canSkip) {
          this._submitDecision("skipped");
        }
        break;
    }
  },

  /**
   * Submit the user's decision
   * @param {string} decision - Decision type (approved, rejected, skipped)
   */
  _submitDecision(decision) {
    const data = this._currentRequest;
    if (!data) return;

    // Build result
    const result = {
      decision,
      phaseId: data.phaseId,
      phaseName: data.phaseName,
      originalOutput: data.output,
      editedValues: { ...this._editedValues },
      commentary: this._commentary.trim(),
      timestamp: new Date().toISOString(),
    };

    // Compute final output with edits
    if (decision === "approved" && Object.keys(this._editedValues).length > 0) {
      if (typeof data.output === "object") {
        result.finalOutput = { ...data.output, ...this._parseEditedValues() };
      } else {
        result.finalOutput = data.output;
      }
    } else {
      result.finalOutput = data.output;
    }

    // Add to history
    this._addToHistory(result);

    // Submit to pipeline system
    if (this._pipelineSystem) {
      try {
        this._pipelineSystem.submitGavelResponse(result);
      } catch (error) {
        this._log("error", "Failed to submit gavel response:", error);
      }
    }

    // Resolve promise
    if (this._resolvePromise) {
      this._resolvePromise(result);
      this._resolvePromise = null;
    }

    // Hide modal
    this.hide();

    // Clear state
    this._currentRequest = null;
    this._editedValues = {};
    this._commentary = "";

    this._log(
      "info",
      `Gavel decision: ${decision} for phase ${data.phaseName}`,
    );
  },

  /**
   * Parse edited values, handling JSON strings
   * @returns {Object} Parsed values
   */
  _parseEditedValues() {
    const parsed = {};

    for (const [field, value] of Object.entries(this._editedValues)) {
      // Try to parse as JSON if it looks like JSON
      if (
        typeof value === "string" &&
        ((value.startsWith("{") && value.endsWith("}")) ||
          (value.startsWith("[") && value.endsWith("]")))
      ) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      } else {
        parsed[field] = value;
      }
    }

    return parsed;
  },

  // ===== HISTORY =====

  /**
   * Add decision to history
   * @param {Object} result - Decision result
   */
  _addToHistory(result) {
    this._history.unshift(result);

    // Trim history
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(0, this._maxHistory);
    }

    // Save to storage
    this._saveHistory();
  },

  /**
   * Load history from storage
   */
  _loadHistory() {
    try {
      const stored = localStorage.getItem("council_gavel_history");
      if (stored) {
        this._history = JSON.parse(stored);
      }
    } catch (error) {
      this._log("warn", "Failed to load gavel history:", error);
      this._history = [];
    }
  },

  /**
   * Save history to storage
   */
  _saveHistory() {
    try {
      localStorage.setItem(
        "council_gavel_history",
        JSON.stringify(this._history),
      );
    } catch (error) {
      this._log("warn", "Failed to save gavel history:", error);
    }
  },

  /**
   * Get history
   * @returns {Array} History array
   */
  getHistory() {
    return [...this._history];
  },

  /**
   * Clear history
   */
  clearHistory() {
    this._history = [];
    this._saveHistory();
  },

  // ===== STYLES =====

  /**
   * Inject modal styles
   */
  _injectStyles() {
    if (document.getElementById("council-gavel-styles")) return;

    const style = document.createElement("style");
    style.id = "council-gavel-styles";
    style.textContent = `
      /* Gavel Modal Overlay */
      .council-gavel-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        z-index: 10998;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
      }
      .council-gavel-overlay.visible {
        opacity: 1;
        visibility: visible;
      }

      /* Gavel Modal */
      .council-gavel-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        width: 90vw;
        max-width: 800px;
        max-height: 85vh;
        background: var(--SmartThemeBlurTintColor, #1a1a2e);
        border: 2px solid #ffc107;
        border-radius: 12px;
        z-index: 10999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 193, 7, 0.2);
      }
      .council-gavel-modal.visible {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }

      .council-gavel-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 85vh;
      }

      /* Header */
      .council-gavel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
        background: rgba(255, 193, 7, 0.1);
      }
      .council-gavel-title {
        margin: 0;
        font-size: 1.4em;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ffc107;
      }
      .council-gavel-icon {
        font-size: 1.3em;
      }
      .council-gavel-phase-name {
        font-size: 0.9em;
        color: var(--SmartThemeBodyColor, #aaa);
        background: rgba(0, 0, 0, 0.2);
        padding: 4px 10px;
        border-radius: 4px;
      }

      /* Body */
      .council-gavel-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      /* Prompt Section */
      .council-gavel-prompt-section {
        margin-bottom: 20px;
      }
      .council-gavel-prompt-section label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--SmartThemeQuoteColor, #4a90d9);
      }
      .council-gavel-prompt {
        background: rgba(74, 144, 217, 0.1);
        border-left: 3px solid var(--SmartThemeQuoteColor, #4a90d9);
        padding: 12px 16px;
        border-radius: 0 6px 6px 0;
        font-style: italic;
        color: var(--SmartThemeBodyColor, #ccc);
      }

      /* Content */
      .council-gavel-content {
        margin-bottom: 20px;
      }
      .council-gavel-output {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 8px;
        overflow: hidden;
      }
      .council-gavel-output-text {
        padding: 16px;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.6;
        max-height: 300px;
        overflow-y: auto;
      }
      .council-gavel-output-sections {
        padding: 0;
      }
      .council-gavel-output-section {
        padding: 12px 16px;
        border-bottom: 1px solid var(--SmartThemeBorderColor, #333);
      }
      .council-gavel-output-section:last-child {
        border-bottom: none;
      }
      .council-gavel-output-label {
        font-weight: 600;
        color: var(--SmartThemeQuoteColor, #4a90d9);
        margin-bottom: 4px;
        font-size: 0.9em;
      }
      .council-gavel-output-value {
        color: var(--SmartThemeBodyColor, #ccc);
      }
      .council-gavel-output-value pre {
        margin: 0;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        overflow-x: auto;
        font-size: 0.9em;
      }
      .council-gavel-empty {
        padding: 20px;
        text-align: center;
        color: var(--SmartThemeBodyColor, #888);
        font-style: italic;
      }

      /* Editor */
      .council-gavel-editor {
        margin-bottom: 20px;
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-radius: 8px;
        padding: 16px;
      }
      .council-gavel-editor-header {
        margin-bottom: 16px;
      }
      .council-gavel-editor-header h4 {
        margin: 0 0 4px 0;
        color: #4caf50;
      }
      .council-gavel-editor-header p {
        margin: 0;
        font-size: 0.9em;
        color: var(--SmartThemeBodyColor, #aaa);
      }
      .council-gavel-editor-fields {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .council-gavel-editor-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .council-gavel-editor-field label {
        font-weight: 500;
        font-size: 0.9em;
      }
      .council-gavel-editor-input {
        width: 100%;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 6px;
        color: var(--SmartThemeBodyColor, #ccc);
        font-family: inherit;
        font-size: 0.95em;
        transition: border-color 0.2s;
      }
      .council-gavel-editor-input:focus {
        outline: none;
        border-color: #4caf50;
      }
      textarea.council-gavel-editor-input {
        resize: vertical;
        min-height: 80px;
        font-family: monospace;
      }

      /* Commentary */
      .council-gavel-commentary-section {
        margin-top: 16px;
      }
      .council-gavel-commentary-section label {
        display: block;
        font-weight: 500;
        margin-bottom: 8px;
        font-size: 0.9em;
        color: var(--SmartThemeBodyColor, #aaa);
      }
      .council-gavel-commentary {
        width: 100%;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--SmartThemeBorderColor, #333);
        border-radius: 6px;
        color: var(--SmartThemeBodyColor, #ccc);
        font-family: inherit;
        font-size: 0.95em;
        resize: vertical;
      }
      .council-gavel-commentary:focus {
        outline: none;
        border-color: var(--SmartThemeQuoteColor, #4a90d9);
      }

      /* Footer */
      .council-gavel-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-top: 1px solid var(--SmartThemeBorderColor, #333);
        background: rgba(0, 0, 0, 0.2);
      }
      .council-gavel-footer-info {
        font-size: 0.85em;
        color: var(--SmartThemeBodyColor, #888);
      }
      .council-gavel-skip-hint {
        font-style: italic;
      }
      .council-gavel-actions {
        display: flex;
        gap: 10px;
      }

      /* Buttons */
      .council-gavel-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.95em;
        font-weight: 600;
        transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .council-gavel-btn:hover {
        transform: translateY(-1px);
      }
      .council-gavel-btn:active {
        transform: translateY(0);
      }
      .council-gavel-btn-approve {
        background: #4caf50;
        color: white;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
      }
      .council-gavel-btn-approve:hover {
        background: #43a047;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }
      .council-gavel-btn-reject {
        background: #f44336;
        color: white;
        box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
      }
      .council-gavel-btn-reject:hover {
        background: #e53935;
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
      }
      .council-gavel-btn-skip {
        background: rgba(255, 255, 255, 0.1);
        color: var(--SmartThemeBodyColor, #ccc);
      }
      .council-gavel-btn-skip:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Responsive */
      @media (max-width: 600px) {
        .council-gavel-modal {
          width: 95vw;
          max-height: 90vh;
        }
        .council-gavel-footer {
          flex-direction: column;
          gap: 12px;
        }
        .council-gavel-footer-info {
          text-align: center;
        }
        .council-gavel-actions {
          width: 100%;
          justify-content: center;
        }
        .council-gavel-btn {
          padding: 10px 16px;
          font-size: 0.9em;
        }
      }

      /* Animations */
      @keyframes gavelPulse {
        0%, 100% { box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 193, 7, 0.2); }
        50% { box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 193, 7, 0.4); }
      }
      .council-gavel-modal.visible {
        animation: gavelPulse 2s infinite;
      }
    `;
    document.head.appendChild(style);
  },

  // ===== UTILITIES =====

  /**
   * Escape HTML entities
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  _escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {...*} args - Arguments
   */
  _log(level, ...args) {
    if (this._logger) {
      this._logger.log(level, "[GavelModal]", ...args);
    } else if (level !== "debug") {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        "[GavelModal]",
        ...args,
      );
    }
  },

  // ===== PUBLIC API =====

  /**
   * Programmatically approve current review
   */
  approve() {
    if (this._isVisible && this._currentRequest) {
      this._handleAction("approve");
    }
  },

  /**
   * Programmatically reject current review
   */
  reject() {
    if (this._isVisible && this._currentRequest) {
      this._handleAction("reject");
    }
  },

  /**
   * Programmatically skip current review
   */
  skip() {
    if (this._isVisible && this._currentRequest?.canSkip) {
      this._handleAction("skip");
    }
  },

  /**
   * Get current request data
   * @returns {Object|null} Current request
   */
  getCurrentRequest() {
    return this._currentRequest ? { ...this._currentRequest } : null;
  },

  /**
   * Set edited value programmatically
   * @param {string} field - Field name
   * @param {*} value - New value
   */
  setEditedValue(field, value) {
    this._editedValues[field] = value;

    // Update UI if visible
    if (this._isVisible) {
      const input = this._elements.editor?.querySelector(
        `[data-field="${field}"]`,
      );
      if (input) {
        input.value =
          typeof value === "object"
            ? JSON.stringify(value, null, 2)
            : String(value);
      }
    }
  },

  /**
   * Set commentary programmatically
   * @param {string} text - Commentary text
   */
  setCommentary(text) {
    this._commentary = text;

    // Update UI if visible
    if (this._isVisible) {
      const commentary = this._elements.modal?.querySelector(
        ".council-gavel-commentary",
      );
      if (commentary) {
        commentary.value = text;
      }
    }
  },

  /**
   * Get summary of gavel modal state
   * @returns {Object} Summary
   */
  getSummary() {
    return {
      version: this.VERSION,
      initialized: this._initialized,
      isVisible: this._isVisible,
      hasCurrentRequest: !!this._currentRequest,
      currentPhase: this._currentRequest?.phaseName || null,
      historyCount: this._history.length,
      editedFieldCount: Object.keys(this._editedValues).length,
    };
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.GavelModal = GavelModal;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GavelModal };
}
