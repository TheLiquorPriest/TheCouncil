/**
 * modules/ui/pipeline-visualizer.js - Real-time Pipeline Visualization for The Council
 * Renders a phase flow with live status, context/output highlights, and thread activity markers.
 */
const PipelineVisualizer = {
  VERSION: "1.0.0",

  // Module references
  _executor: null,
  _state: null,
  _threadManager: null,
  _outputManager: null,

  // DOM/state
  _container: null,
  _canvas: null,
  _phases: [],
  _phaseStates: new Map(), // phaseId -> { status, startedAt, completedAt, error }
  _currentPhaseId: null,
  _listenersBound: false,
  _isVisible: false,
  _initialized: false,

  // Status colors
  STATUS_COLORS: {
    pending: "#6c757d",
    active: "#4a9eff",
    complete: "#4caf50",
    error: "#f44336",
  },

  /**
   * Initialize the visualizer
   * @param {Object} modules - { executor, state, threadManager, outputManager }
   */
  init(modules = {}) {
    if (this._initialized) return this;
    this._executor = modules.executor || null;
    this._state = modules.state || null;
    this._threadManager = modules.threadManager || null;
    this._outputManager = modules.outputManager || null;

    this._loadPhases();
    this._bindExecutorEvents();
    this._bindThreadEvents();

    this._initialized = true;
    return this;
  },

  /**
   * Create and return the root container element (call once, then append to DOM)
   */
  createContainer() {
    const container = document.createElement("div");
    container.id = "council-pipeline-visualizer";
    container.className = "council-pipeline-visualizer";
    container.innerHTML = `
      <div class="pv-header">
        <div class="pv-title">🗺️ Pipeline Flow</div>
        <div class="pv-legend">
          <span class="pv-dot pv-pending"></span>Pending
          <span class="pv-dot pv-active"></span>Active
          <span class="pv-dot pv-complete"></span>Complete
          <span class="pv-dot pv-error"></span>Error
        </div>
      </div>
      <div class="pv-canvas" id="pv-canvas"></div>
    `;
    this._container = container;
    this._canvas = container.querySelector("#pv-canvas");
    this.render();
    return container;
  },

  /**
   * Load phase list from executor
   */
  _loadPhases() {
    if (!this._executor) return;
    const phases =
      this._executor.getMigratedPhases?.() ||
      this._executor.getPhases?.() ||
      [];
    this._phases = phases;
    this._phaseStates.clear();
    phases.forEach((p) => {
      this._phaseStates.set(p.id, { status: "pending" });
    });
  },

  /**
   * Bind executor events for real-time updates
   */
  _bindExecutorEvents() {
    if (!this._executor || this._listenersBound) return;

    this._executor.on?.("phase:start", ({ phase }) => {
      this._currentPhaseId = phase.id;
      this._updatePhaseState(phase.id, {
        status: "active",
        startedAt: Date.now(),
      });
    });

    this._executor.on?.("phase:complete", ({ phase }) => {
      this._updatePhaseState(phase.id, {
        status: "complete",
        completedAt: Date.now(),
      });
      if (this._currentPhaseId === phase.id) this._currentPhaseId = null;
    });

    this._executor.on?.("phase:error", ({ phase }) => {
      this._updatePhaseState(phase.id, { status: "error" });
      if (this._currentPhaseId === phase.id) this._currentPhaseId = null;
    });

    this._executor.on?.("pipeline:start", () => {
      this._loadPhases();
      this.render();
    });

    this._executor.on?.("pipeline:complete", () => {
      this.render();
    });

    this._listenersBound = true;
  },

  /**
   * Bind thread events to highlight activity
   */
  _bindThreadEvents() {
    if (!this._threadManager?.on) return;
    this._threadManager.on("thread:entry", ({ phaseId }) => {
      if (!phaseId) return;
      const card = this._canvas?.querySelector(`[data-phase="${phaseId}"]`);
      if (!card) return;
      card.classList.add("pv-pulse");
      setTimeout(() => card.classList.remove("pv-pulse"), 500);
    });
  },

  /**
   * Update phase state and re-render
   */
  _updatePhaseState(phaseId, patch) {
    const current = this._phaseStates.get(phaseId) || { status: "pending" };
    this._phaseStates.set(phaseId, { ...current, ...patch });
    this.render();
  },

  /**
   * Render the visualization
   */
  render() {
    if (!this._canvas) return;
    const phases = this._phases || [];
    if (phases.length === 0) {
      this._canvas.innerHTML = `<div class="pv-empty">No phases loaded</div>`;
      return;
    }

    const cards = phases
      .map((phase, idx) => {
        const state = this._phaseStates.get(phase.id) || { status: "pending" };
        const status = state.status || "pending";
        const colorClass = this._statusClass(status);
        const isCurrent = this._currentPhaseId === phase.id;
        const icon = phase.icon || "📌";

        return `
          <div class="pv-node ${colorClass} ${isCurrent ? "pv-current" : ""}" data-phase="${phase.id}">
            <div class="pv-node-header">
              <span class="pv-node-icon">${icon}</span>
              <span class="pv-node-name">${this._escape(phase.name || phase.id)}</span>
            </div>
            <div class="pv-node-meta">
              <span class="pv-node-id">${phase.id}</span>
              <span class="pv-node-status">${status}</span>
            </div>
            <div class="pv-node-desc">${this._escape(phase.description || "")}</div>
            <div class="pv-node-threads">${this._threadSummary(phase)}</div>
          </div>
          ${
            idx < phases.length - 1
              ? `<div class="pv-connector"><span class="pv-arrow">➜</span></div>`
              : ""
          }
        `;
      })
      .join("");

    this._canvas.innerHTML = `<div class="pv-flow">${cards}</div>`;
  },

  _statusClass(status) {
    switch (status) {
      case "active":
        return "pv-active";
      case "complete":
        return "pv-complete";
      case "error":
        return "pv-error";
      default:
        return "pv-pending";
    }
  },

  _threadSummary(phase) {
    const threads = [];
    const t = phase.threads || {};
    if (t.main?.enabled !== false) threads.push("Main");
    if (Array.isArray(t.collaboration) && t.collaboration.length) {
      threads.push(`Collab:${t.collaboration.length}`);
    }
    if (Array.isArray(t.team) && t.team.length) {
      threads.push(`Team:${t.team.length}`);
    }
    if (threads.length === 0) return "";
    return `<span class="pv-thread-pill">${threads.join(" · ")}</span>`;
  },

  show() {
    this._isVisible = true;
    if (this._container) this._container.style.display = "flex";
  },

  hide() {
    this._isVisible = false;
    if (this._container) this._container.style.display = "none";
  },

  toggle() {
    if (this._isVisible) this.hide();
    else this.show();
  },

  reset() {
    this._loadPhases();
    this.render();
  },

  isInitialized() {
    return this._initialized;
  },

  _escape(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * CSS for the visualizer
   */
  getStyles() {
    return `
      .council-pipeline-visualizer {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--council-bg, #1a1a2e);
        border-radius: 8px;
        border: 1px solid var(--council-border, #0f3460);
        overflow: hidden;
      }
      .pv-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: var(--council-header-bg, #16213e);
        border-bottom: 1px solid var(--council-border, #0f3460);
      }
      .pv-title {
        color: var(--council-text, #e8e8e8);
        font-weight: 600;
      }
      .pv-legend {
        display: flex;
        gap: 10px;
        align-items: center;
        color: var(--council-text-muted, #a0a0a0);
        font-size: 12px;
      }
      .pv-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 4px;
      }
      .pv-pending { background: #6c757d; }
      .pv-active { background: #4a9eff; }
      .pv-complete { background: #4caf50; }
      .pv-error { background: #f44336; }
      .pv-canvas {
        flex: 1;
        overflow: auto;
        padding: 12px;
      }
      .pv-flow {
        display: flex;
        align-items: stretch;
        gap: 8px;
      }
      .pv-node {
        min-width: 180px;
        max-width: 240px;
        background: var(--council-bg-light, #1e2a4a);
        border: 1px solid var(--council-border, #0f3460);
        border-radius: 6px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: relative;
      }
      .pv-node.pv-pending { box-shadow: none; }
      .pv-node.pv-active { box-shadow: 0 0 8px rgba(74, 158, 255, 0.3); border-color: #4a9eff; }
      .pv-node.pv-complete { border-color: #4caf50; }
      .pv-node.pv-error { border-color: #f44336; }
      .pv-node.pv-current::after {
        content: "";
        position: absolute;
        inset: -2px;
        border: 1px dashed #4a9eff;
        border-radius: 8px;
        pointer-events: none;
      }
      .pv-node-header {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--council-text, #e8e8e8);
        font-weight: 600;
      }
      .pv-node-icon { font-size: 16px; }
      .pv-node-meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--council-text-muted, #a0a0a0);
      }
      .pv-node-desc {
        font-size: 12px;
        color: var(--council-text-muted, #a0a0a0);
        min-height: 32px;
        white-space: pre-wrap;
      }
      .pv-node-threads {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .pv-thread-pill {
        background: var(--council-border, #0f3460);
        color: var(--council-text, #e8e8e8);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
      }
      .pv-connector {
        align-self: center;
        color: var(--council-text-muted, #a0a0a0);
        font-size: 16px;
        min-width: 18px;
        text-align: center;
      }
      .pv-arrow { opacity: 0.7; }
      .pv-empty {
        text-align: center;
        color: var(--council-text-muted, #a0a0a0);
        padding: 20px;
      }
      .pv-pulse {
        animation: pvPulse 0.5s ease;
      }
      @keyframes pvPulse {
        0% { box-shadow: 0 0 0 0 rgba(74, 158, 255, 0.4); }
        100% { box-shadow: 0 0 0 12px rgba(74, 158, 255, 0); }
      }
      /* Scrollbar styling */
      .pv-canvas::-webkit-scrollbar { height: 8px; }
      .pv-canvas::-webkit-scrollbar-track { background: var(--council-bg, #1a1a2e); }
      .pv-canvas::-webkit-scrollbar-thumb { background: var(--council-border, #0f3460); border-radius: 4px; }
      .pv-canvas::-webkit-scrollbar-thumb:hover { background: var(--council-accent, #4a9eff); }
    `;
  },
};

// Export
if (typeof window !== "undefined") {
  window.PipelineVisualizer = PipelineVisualizer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PipelineVisualizer;
}
