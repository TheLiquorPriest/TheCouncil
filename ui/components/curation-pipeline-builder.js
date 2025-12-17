/**
 * TheCouncil - Curation Pipeline Builder Component
 *
 * A comprehensive component for building and managing curation pipelines:
 * - CRUD Pipeline Builder (Create, Read, Update, Delete operations on stores)
 * - RAG Pipeline Builder (Retrieval-Augmented Generation pipelines)
 * - Step-based pipeline construction with drag-and-drop ordering
 * - Input/output mapping between steps
 * - Agent/position assignment per step
 * - Pipeline testing interface
 * - Import/export functionality
 *
 * @version 2.0.0
 */

const CurationPipelineBuilder = {
  // ===== VERSION =====
  VERSION: "2.0.0",

  // ===== CONSTANTS =====

  /**
   * Pipeline types
   */
  PipelineType: {
    CRUD: "crud",
    RAG: "rag",
  },

  /**
   * CRUD operations
   */
  CRUDOperation: {
    CREATE: "create",
    READ: "read",
    UPDATE: "update",
    DELETE: "delete",
  },

  /**
   * RAG search methods
   */
  RAGSearchMethod: {
    KEYWORD: "keyword",
    SEMANTIC: "semantic",
    HYBRID: "hybrid",
  },

  /**
   * Step input sources
   */
  StepInputSource: {
    PIPELINE_INPUT: "pipeline_input",
    PREVIOUS_STEP: "previous_step",
    STORE_DATA: "store_data",
    STEP_PROMPT: "step_prompt",
    CUSTOM: "custom",
  },

  /**
   * Step output targets
   */
  StepOutputTarget: {
    NEXT_STEP: "next_step",
    STORE: "store",
    PIPELINE_OUTPUT: "pipeline_output",
    VARIABLE: "variable",
  },

  /**
   * Default pipeline templates
   */
  CRUD_TEMPLATES: {
    create_character: {
      name: "Create Character Sheet",
      description: "Extract and create a character entry from conversation",
      operation: "create",
      storeId: "characterSheets",
      steps: [
        {
          id: "extract",
          name: "Extract Information",
          agentRole: "data_extractor",
          promptTemplate:
            "Extract character information from the following:\n{{input}}\n\nReturn JSON with: name, description, personality, appearance, background",
          inputSource: "pipeline_input",
          outputTarget: "next_step",
        },
        {
          id: "validate",
          name: "Validate & Format",
          agentRole: "data_validator",
          promptTemplate:
            "Validate and format this character data:\n{{input}}\n\nEnsure all required fields are present and properly formatted.",
          inputSource: "previous_step",
          outputTarget: "store",
        },
      ],
    },
    update_scene: {
      name: "Update Current Scene",
      description: "Update the current scene based on recent events",
      operation: "update",
      storeId: "scenes",
      steps: [
        {
          id: "analyze",
          name: "Analyze Changes",
          agentRole: "analyst",
          promptTemplate:
            "Analyze recent events and determine scene changes:\n{{input}}\n\nCurrent scene: {{context.currentScene}}",
          inputSource: "pipeline_input",
          outputTarget: "next_step",
        },
        {
          id: "update",
          name: "Apply Updates",
          agentRole: "data_validator",
          promptTemplate:
            "Apply these changes to the scene:\n{{input}}\n\nReturn the updated scene object.",
          inputSource: "previous_step",
          outputTarget: "store",
        },
      ],
    },
  },

  RAG_TEMPLATES: {
    character_lookup: {
      name: "Character Lookup",
      description: "Find characters matching a query",
      targetStores: ["characterSheets", "characterDevelopment"],
      searchMethod: "keyword",
      searchFields: ["name", "description", "personality", "background"],
      maxResults: 5,
      minScore: 0.3,
      queryTemplate: "Find characters matching: {{query}}",
    },
    scene_context: {
      name: "Scene Context Retrieval",
      description: "Retrieve relevant scene information",
      targetStores: ["scenes", "currentScene"],
      searchMethod: "keyword",
      searchFields: ["summary", "location", "characters", "mood"],
      maxResults: 3,
      minScore: 0.2,
      queryTemplate: "Find scenes relevant to: {{query}}",
    },
    plot_threads: {
      name: "Active Plot Threads",
      description: "Find active plot threads related to query",
      targetStores: ["plotThreads"],
      searchMethod: "keyword",
      searchFields: ["name", "description", "relatedCharacters"],
      maxResults: 5,
      minScore: 0.25,
      queryTemplate: "Find plot threads involving: {{query}}",
    },
  },

  // ===== STATE =====

  /**
   * Reference to CurationSystem
   * @type {Object|null}
   */
  _curationSystem: null,

  /**
   * Reference to PipelineBuilderSystem
   * @type {Object|null}
   */
  _pipelineBuilderSystem: null,

  /**
   * Current pipeline being edited
   * @type {Object|null}
   */
  _currentPipeline: null,

  /**
   * Current pipeline type
   * @type {string|null}
   */
  _currentType: null,

  /**
   * Logger reference
   * @type {Object|null}
   */
  _logger: null,

  /**
   * Registered instances
   * @type {Map<string, Object>}
   */
  _instances: new Map(),

  /**
   * Drag state for step reordering
   * @type {Object|null}
   */
  _dragState: null,

  /**
   * Event listeners for cleanup
   * @type {Array<Function>}
   */
  _cleanupFns: [],

  // ===== INITIALIZATION =====

  /**
   * Initialize the pipeline builder
   * @param {Object} options - Configuration options
   * @returns {CurationPipelineBuilder}
   */
  init(options = {}) {
    this._curationSystem = options.curationSystem || window.CurationSystem;
    this._pipelineBuilderSystem = options.pipelineBuilderSystem || window.PipelineBuilderSystem;
    this._logger = options.logger || console;

    this._log("info", "CurationPipelineBuilder initialized", {
      version: this.VERSION,
    });

    return this;
  },

  /**
   * Destroy the builder and clean up
   */
  destroy() {
    // Clean up all instances
    this._instances.forEach((instance, id) => {
      this.destroyInstance(id);
    });
    this._instances.clear();

    // Run cleanup functions
    this._cleanupFns.forEach((fn) => fn());
    this._cleanupFns = [];

    this._currentPipeline = null;
    this._currentType = null;
    this._dragState = null;
  },

  // ===== INSTANCE MANAGEMENT =====

  /**
   * Create a new builder instance in a container
   * @param {string} containerId - Container element ID
   * @param {Object} options - Instance options
   * @returns {Object} Instance reference
   */
  createInstance(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      this._log("error", `Container not found: ${containerId}`);
      return null;
    }

    const instanceId = options.instanceId || `cpb-${Date.now()}`;
    const instance = {
      id: instanceId,
      container,
      type: options.type || this.PipelineType.CRUD,
      pipeline: options.pipeline || null,
      mode: options.mode || "list", // 'list' | 'edit' | 'test'
      onChange: options.onChange || null,
      onSave: options.onSave || null,
      onTest: options.onTest || null,
      _promptBuilderInstances: new Map(), // Map<stepIndex, PromptBuilder instance>
    };

    this._instances.set(instanceId, instance);
    this._renderInstance(instance);

    return instance;
  },

  /**
   * Destroy an instance
   * @param {string} instanceId - Instance ID
   */
  destroyInstance(instanceId) {
    const instance = this._instances.get(instanceId);
    if (instance) {
      // Clean up PromptBuilder instances
      if (instance._promptBuilderInstances) {
        instance._promptBuilderInstances.forEach((pbInstance) => {
          if (pbInstance.destroy) {
            pbInstance.destroy();
          }
        });
        instance._promptBuilderInstances.clear();
      }
      instance.container.innerHTML = "";
      this._instances.delete(instanceId);
    }
  },

  /**
   * Get an instance by ID
   * @param {string} instanceId - Instance ID
   * @returns {Object|null}
   */
  getInstance(instanceId) {
    return this._instances.get(instanceId) || null;
  },

  // ===== RENDERING =====

  /**
   * Render an instance
   * @param {Object} instance - Instance to render
   */
  _renderInstance(instance) {
    const { container, type, mode } = instance;

    container.innerHTML = `
      <div class="cpb-wrapper" data-instance="${instance.id}">
        <div class="cpb-header">
          <div class="cpb-type-tabs">
            <button class="cpb-tab ${type === "crud" ? "cpb-tab-active" : ""}"
                    data-type="crud">
              ⚙️ CRUD Pipelines
            </button>
            <button class="cpb-tab ${type === "rag" ? "cpb-tab-active" : ""}"
                    data-type="rag">
              🔍 RAG Pipelines
            </button>
          </div>
          <div class="cpb-actions">
            ${
              mode === "edit"
                ? `
              <button class="cpb-btn cpb-btn-secondary" data-action="back">
                ← Back to List
              </button>
            `
                : `
              <button class="cpb-btn cpb-btn-primary" data-action="new">
                + New Pipeline
              </button>
            `
            }
          </div>
        </div>
        <div class="cpb-content">
          ${this._renderContent(instance)}
        </div>
      </div>
    `;

    this._bindInstanceEvents(instance);
    this._injectStyles();
  },

  /**
   * Render content based on mode
   * @param {Object} instance - Instance
   * @returns {string} HTML content
   */
  _renderContent(instance) {
    const { type, mode, pipeline } = instance;

    if (mode === "list") {
      return type === "crud"
        ? this._renderCRUDList(instance)
        : this._renderRAGList(instance);
    } else if (mode === "edit") {
      return type === "crud"
        ? this._renderCRUDEditor(instance, pipeline)
        : this._renderRAGEditor(instance, pipeline);
    } else if (mode === "test") {
      return this._renderTestInterface(instance, pipeline);
    }

    return '<div class="cpb-empty">Select a mode</div>';
  },

  /**
   * Render CRUD pipeline list
   * @param {Object} instance - Instance
   * @returns {string} HTML
   */
  _renderCRUDList(instance) {
    const pipelines = this._curationSystem?.getAllCRUDPipelines() || [];

    return `
      <div class="cpb-list">
        <div class="cpb-list-header">
          <h3>CRUD Pipelines</h3>
          <span class="cpb-count">${pipelines.length} pipeline${pipelines.length !== 1 ? "s" : ""}</span>
        </div>

        ${
          pipelines.length > 0
            ? `
          <div class="cpb-list-items">
            ${pipelines.map((p) => this._renderPipelineCard(p, "crud")).join("")}
          </div>
        `
            : `
          <div class="cpb-empty-state">
            <div class="cpb-empty-icon">⚙️</div>
            <div class="cpb-empty-text">No CRUD pipelines defined</div>
            <div class="cpb-empty-hint">
              CRUD pipelines automate data management operations on your curation stores.
            </div>
            <button class="cpb-btn cpb-btn-primary" data-action="new">
              Create Your First Pipeline
            </button>
          </div>
        `
        }

        <div class="cpb-templates-section">
          <h4>📋 Quick Start Templates</h4>
          <div class="cpb-templates-grid">
            ${Object.entries(this.CRUD_TEMPLATES)
              .map(
                ([key, template]) => `
              <div class="cpb-template-card" data-template="${key}" data-type="crud">
                <div class="cpb-template-name">${this._escapeHtml(template.name)}</div>
                <div class="cpb-template-desc">${this._escapeHtml(template.description)}</div>
                <div class="cpb-template-meta">
                  <span class="cpb-template-op">${template.operation.toUpperCase()}</span>
                  <span class="cpb-template-store">${template.storeId}</span>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render RAG pipeline list
   * @param {Object} instance - Instance
   * @returns {string} HTML
   */
  _renderRAGList(instance) {
    const pipelines = this._curationSystem?.getAllRAGPipelines() || [];

    return `
      <div class="cpb-list">
        <div class="cpb-list-header">
          <h3>RAG Pipelines</h3>
          <span class="cpb-count">${pipelines.length} pipeline${pipelines.length !== 1 ? "s" : ""}</span>
        </div>

        ${
          pipelines.length > 0
            ? `
          <div class="cpb-list-items">
            ${pipelines.map((p) => this._renderPipelineCard(p, "rag")).join("")}
          </div>
        `
            : `
          <div class="cpb-empty-state">
            <div class="cpb-empty-icon">🔍</div>
            <div class="cpb-empty-text">No RAG pipelines defined</div>
            <div class="cpb-empty-hint">
              RAG pipelines retrieve relevant information from your curation stores to enhance responses.
            </div>
            <button class="cpb-btn cpb-btn-primary" data-action="new">
              Create Your First Pipeline
            </button>
          </div>
        `
        }

        <div class="cpb-templates-section">
          <h4>📋 Quick Start Templates</h4>
          <div class="cpb-templates-grid">
            ${Object.entries(this.RAG_TEMPLATES)
              .map(
                ([key, template]) => `
              <div class="cpb-template-card" data-template="${key}" data-type="rag">
                <div class="cpb-template-name">${this._escapeHtml(template.name)}</div>
                <div class="cpb-template-desc">${this._escapeHtml(template.description)}</div>
                <div class="cpb-template-meta">
                  <span class="cpb-template-method">${template.searchMethod}</span>
                  <span class="cpb-template-stores">${template.targetStores.length} stores</span>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render a pipeline card
   * @param {Object} pipeline - Pipeline data
   * @param {string} type - Pipeline type
   * @returns {string} HTML
   */
  _renderPipelineCard(pipeline, type) {
    const isCRUD = type === "crud";

    return `
      <div class="cpb-pipeline-card" data-pipeline-id="${pipeline.id}" data-type="${type}">
        <div class="cpb-pipeline-info">
          <div class="cpb-pipeline-name">${this._escapeHtml(pipeline.name)}</div>
          <div class="cpb-pipeline-desc">${this._escapeHtml(pipeline.description || "No description")}</div>
          ${
            isCRUD
              ? `
            <div class="cpb-pipeline-meta">
              <span class="cpb-meta-badge cpb-op-${pipeline.operation || 'crud'}">${(pipeline.operation || 'crud').toUpperCase()}</span>
              <span class="cpb-meta-store">📁 ${pipeline.storeId}</span>
              <span class="cpb-meta-steps">📊 ${pipeline.actions?.length || pipeline.steps?.length || 0} steps</span>
            </div>
          `
              : `
            <div class="cpb-pipeline-meta">
              <span class="cpb-meta-badge">${pipeline.searchMethod || "keyword"}</span>
              <span class="cpb-meta-stores">🗃️ ${pipeline.targetStores?.join(", ") || "All"}</span>
              <span class="cpb-meta-results">Max: ${pipeline.maxResults || 5}</span>
            </div>
          `
          }
        </div>
        <div class="cpb-pipeline-actions">
          <button class="cpb-btn cpb-btn-sm" data-action="edit" data-id="${pipeline.id}">
            ✏️ Edit
          </button>
          <button class="cpb-btn cpb-btn-sm" data-action="test" data-id="${pipeline.id}">
            ▶️ Test
          </button>
          <button class="cpb-btn cpb-btn-sm cpb-btn-danger" data-action="delete" data-id="${pipeline.id}">
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render CRUD pipeline editor
   * @param {Object} instance - Instance
   * @param {Object} pipeline - Pipeline to edit (null for new)
   * @returns {string} HTML
   */
  _renderCRUDEditor(instance, pipeline) {
    const isNew = !pipeline || !pipeline.id;
    const stores = this._curationSystem?.getAllStoreSchemas() || [];
    const agents = this._getAvailableAgents();

    // Default pipeline structure
    const p = pipeline || {
      id: "",
      name: "",
      description: "",
      storeId: stores[0]?.id || "",
      operation: "create",
      steps: [],
      inputSchema: {},
      outputSchema: {},
    };

    return `
      <div class="cpb-editor cpb-crud-editor">
        <div class="cpb-editor-header">
          <h3>${isNew ? "Create New CRUD Pipeline" : "Edit CRUD Pipeline"}</h3>
        </div>

        <div class="cpb-editor-form">
          <!-- Basic Info -->
          <div class="cpb-form-section">
            <h4>📝 Basic Information</h4>
            <div class="cpb-form-row">
              <div class="cpb-form-group">
                <label>Pipeline Name</label>
                <input type="text" class="cpb-input" id="cpb-name"
                       value="${this._escapeHtml(p.name)}"
                       placeholder="e.g., Create Character Sheet">
              </div>
              <div class="cpb-form-group">
                <label>Pipeline ID</label>
                <input type="text" class="cpb-input" id="cpb-id"
                       value="${this._escapeHtml(p.id)}"
                       placeholder="e.g., create_character"
                       ${!isNew ? "readonly" : ""}>
              </div>
            </div>
            <div class="cpb-form-group">
              <label>Description</label>
              <textarea class="cpb-textarea" id="cpb-description" rows="2"
                        placeholder="Describe what this pipeline does...">${this._escapeHtml(p.description || "")}</textarea>
            </div>
          </div>

          <!-- Target Configuration -->
          <div class="cpb-form-section">
            <h4>🎯 Target Configuration</h4>
            <div class="cpb-form-row">
              <div class="cpb-form-group">
                <label>Target Store</label>
                <select class="cpb-select" id="cpb-store">
                  ${stores
                    .map(
                      (s) => `
                    <option value="${s.id}" ${s.id === p.storeId ? "selected" : ""}>
                      ${s.icon || "📁"} ${s.name}
                    </option>
                  `,
                    )
                    .join("")}
                </select>
              </div>
              <div class="cpb-form-group">
                <label>Operation</label>
                <select class="cpb-select" id="cpb-operation">
                  <option value="create" ${p.operation === "create" ? "selected" : ""}>CREATE - Add new entries</option>
                  <option value="read" ${p.operation === "read" ? "selected" : ""}>READ - Query entries</option>
                  <option value="update" ${p.operation === "update" ? "selected" : ""}>UPDATE - Modify entries</option>
                  <option value="delete" ${p.operation === "delete" ? "selected" : ""}>DELETE - Remove entries</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Pipeline Steps -->
          <div class="cpb-form-section">
            <h4>📊 Pipeline Steps</h4>
            <div class="cpb-steps-container" id="cpb-steps">
              ${this._renderSteps(p.steps || p.actions || [], agents)}
            </div>
            <button class="cpb-btn cpb-btn-secondary cpb-add-step" data-action="add-step">
              + Add Step
            </button>
          </div>

          <!-- Input/Output Schema -->
          <div class="cpb-form-section cpb-schema-section">
            <h4>📐 Schemas</h4>
            <div class="cpb-form-row">
              <div class="cpb-form-group">
                <label>Input Schema (JSON)</label>
                <textarea class="cpb-textarea cpb-code" id="cpb-input-schema" rows="4"
                          placeholder='{"userRequest": "string", "context": "string"}'>${JSON.stringify(p.inputSchema || {}, null, 2)}</textarea>
              </div>
              <div class="cpb-form-group">
                <label>Output Schema (JSON)</label>
                <textarea class="cpb-textarea cpb-code" id="cpb-output-schema" rows="4"
                          placeholder="Auto-generated from target store schema">${JSON.stringify(p.outputSchema || {}, null, 2)}</textarea>
                <button class="cpb-btn cpb-btn-sm cpb-btn-link" data-action="auto-schema">
                  Generate from Store
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="cpb-editor-footer">
          <button class="cpb-btn cpb-btn-secondary" data-action="cancel">
            Cancel
          </button>
          <button class="cpb-btn cpb-btn-secondary" data-action="test-pipeline">
            ▶️ Test Pipeline
          </button>
          <button class="cpb-btn cpb-btn-primary" data-action="save">
            💾 Save Pipeline
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render RAG pipeline editor
   * @param {Object} instance - Instance
   * @param {Object} pipeline - Pipeline to edit (null for new)
   * @returns {string} HTML
   */
  _renderRAGEditor(instance, pipeline) {
    const isNew = !pipeline || !pipeline.id;
    const stores = this._curationSystem?.getAllStoreSchemas() || [];

    // Default pipeline structure
    const p = pipeline || {
      id: "",
      name: "",
      description: "",
      targetStores: [],
      searchMethod: "keyword",
      searchFields: [],
      maxResults: 5,
      minScore: 0.3,
      queryTemplate: "{{query}}",
      preProcessQuery: {
        extractEntities: false,
        expandSynonyms: false,
        useAgent: false,
        agentId: null,
      },
      postProcess: {
        format: "summary",
        useAgent: false,
        agentId: null,
      },
      triggers: {
        fromPipeline: true,
        manual: true,
        autoOnNewEntry: false,
      },
    };

    return `
      <div class="cpb-editor cpb-rag-editor">
        <div class="cpb-editor-header">
          <h3>${isNew ? "Create New RAG Pipeline" : "Edit RAG Pipeline"}</h3>
        </div>

        <div class="cpb-editor-form">
          <!-- Basic Info -->
          <div class="cpb-form-section">
            <h4>📝 Basic Information</h4>
            <div class="cpb-form-row">
              <div class="cpb-form-group">
                <label>Pipeline Name</label>
                <input type="text" class="cpb-input" id="cpb-rag-name"
                       value="${this._escapeHtml(p.name)}"
                       placeholder="e.g., Character Lookup">
              </div>
              <div class="cpb-form-group">
                <label>Pipeline ID</label>
                <input type="text" class="cpb-input" id="cpb-rag-id"
                       value="${this._escapeHtml(p.id)}"
                       placeholder="e.g., character_lookup"
                       ${!isNew ? "readonly" : ""}>
              </div>
            </div>
            <div class="cpb-form-group">
              <label>Description</label>
              <textarea class="cpb-textarea" id="cpb-rag-description" rows="2"
                        placeholder="Describe what this RAG pipeline retrieves...">${this._escapeHtml(p.description || "")}</textarea>
            </div>
          </div>

          <!-- Target Stores -->
          <div class="cpb-form-section">
            <h4>🗃️ Target Stores</h4>
            <div class="cpb-stores-grid">
              ${stores
                .map(
                  (s) => `
                <label class="cpb-store-checkbox">
                  <input type="checkbox" name="cpb-target-store" value="${s.id}"
                         ${(p.targetStores || []).includes(s.id) ? "checked" : ""}>
                  <span class="cpb-store-label">
                    <span class="cpb-store-icon">${s.icon || "📁"}</span>
                    <span class="cpb-store-name">${s.name}</span>
                  </span>
                </label>
              `,
                )
                .join("")}
            </div>
          </div>

          <!-- Search Configuration -->
          <div class="cpb-form-section">
            <h4>🔍 Search Configuration</h4>
            <div class="cpb-form-row">
              <div class="cpb-form-group">
                <label>Search Method</label>
                <div class="cpb-radio-group">
                  <label class="cpb-radio">
                    <input type="radio" name="cpb-search-method" value="keyword"
                           ${p.searchMethod === "keyword" ? "checked" : ""}>
                    <span>Keyword Search</span>
                  </label>
                  <label class="cpb-radio">
                    <input type="radio" name="cpb-search-method" value="semantic"
                           ${p.searchMethod === "semantic" ? "checked" : ""}>
                    <span>Semantic Search</span>
                  </label>
                  <label class="cpb-radio">
                    <input type="radio" name="cpb-search-method" value="hybrid"
                           ${p.searchMethod === "hybrid" ? "checked" : ""}>
                    <span>Hybrid</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="cpb-form-row">
              <div class="cpb-form-group">
                <label>Max Results</label>
                <input type="number" class="cpb-input cpb-input-sm" id="cpb-max-results"
                       value="${p.maxResults || 5}" min="1" max="50">
              </div>
              <div class="cpb-form-group">
                <label>Min Score (0-1)</label>
                <input type="number" class="cpb-input cpb-input-sm" id="cpb-min-score"
                       value="${p.minScore || 0.3}" min="0" max="1" step="0.1">
              </div>
            </div>

            <div class="cpb-form-group">
              <label>Fields to Search</label>
              <div class="cpb-fields-selector" id="cpb-search-fields">
                ${this._renderFieldsSelector(p.targetStores || [], p.searchFields || [])}
              </div>
            </div>
          </div>

          <!-- Query Processing -->
          <div class="cpb-form-section">
            <h4>📝 Query Processing</h4>
            <div class="cpb-form-group">
              <label>Query Template</label>
              <textarea class="cpb-textarea" id="cpb-query-template" rows="3"
                        placeholder="Find entries matching: {{query}}">${this._escapeHtml(p.queryTemplate || "{{query}}")}</textarea>
              <div class="cpb-hint">
                Available tokens: <code>{{query}}</code>, <code>{{context}}</code>, <code>{{char}}</code>, <code>{{user}}</code>
              </div>
            </div>

            <div class="cpb-form-group">
              <label>Pre-process Query</label>
              <div class="cpb-checkbox-group">
                <label class="cpb-checkbox">
                  <input type="checkbox" id="cpb-extract-entities"
                         ${p.preProcessQuery?.extractEntities ? "checked" : ""}>
                  <span>Extract entity names</span>
                </label>
                <label class="cpb-checkbox">
                  <input type="checkbox" id="cpb-expand-synonyms"
                         ${p.preProcessQuery?.expandSynonyms ? "checked" : ""}>
                  <span>Expand synonyms</span>
                </label>
                <label class="cpb-checkbox">
                  <input type="checkbox" id="cpb-use-agent-preprocess"
                         ${p.preProcessQuery?.useAgent ? "checked" : ""}>
                  <span>Use agent to reformulate query</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Result Processing -->
          <div class="cpb-form-section">
            <h4>📤 Result Processing</h4>
            <div class="cpb-form-group">
              <label>Result Format</label>
              <div class="cpb-radio-group">
                <label class="cpb-radio">
                  <input type="radio" name="cpb-result-format" value="summary"
                         ${p.postProcess?.format === "summary" ? "checked" : ""}>
                  <span>Summary</span>
                </label>
                <label class="cpb-radio">
                  <input type="radio" name="cpb-result-format" value="full"
                         ${p.postProcess?.format === "full" ? "checked" : ""}>
                  <span>Full Entry</span>
                </label>
                <label class="cpb-radio">
                  <input type="radio" name="cpb-result-format" value="custom"
                         ${p.postProcess?.format === "custom" ? "checked" : ""}>
                  <span>Custom Template</span>
                </label>
              </div>
            </div>
            <div class="cpb-form-group">
              <label class="cpb-checkbox">
                <input type="checkbox" id="cpb-use-agent-postprocess"
                       ${p.postProcess?.useAgent ? "checked" : ""}>
                <span>Post-process results with agent</span>
              </label>
            </div>
          </div>

          <!-- Triggers -->
          <div class="cpb-form-section">
            <h4>⚡ Triggers</h4>
            <div class="cpb-checkbox-group">
              <label class="cpb-checkbox">
                <input type="checkbox" id="cpb-trigger-pipeline"
                       ${p.triggers?.fromPipeline !== false ? "checked" : ""}>
                <span>Can be triggered from Response Pipeline</span>
              </label>
              <label class="cpb-checkbox">
                <input type="checkbox" id="cpb-trigger-manual"
                       ${p.triggers?.manual !== false ? "checked" : ""}>
                <span>Can be triggered manually</span>
              </label>
              <label class="cpb-checkbox">
                <input type="checkbox" id="cpb-trigger-auto"
                       ${p.triggers?.autoOnNewEntry ? "checked" : ""}>
                <span>Auto-trigger on new store entries</span>
              </label>
            </div>
          </div>
        </div>

        <div class="cpb-editor-footer">
          <button class="cpb-btn cpb-btn-secondary" data-action="cancel">
            Cancel
          </button>
          <button class="cpb-btn cpb-btn-secondary" data-action="test-rag">
            ▶️ Test Pipeline
          </button>
          <button class="cpb-btn cpb-btn-primary" data-action="save-rag">
            💾 Save Pipeline
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render pipeline steps
   * @param {Array} steps - Array of step objects
   * @param {Array} agents - Available agents
   * @returns {string} HTML
   */
  _renderSteps(steps, agents) {
    if (!steps || steps.length === 0) {
      return `
        <div class="cpb-steps-empty">
          <div class="cpb-steps-empty-text">No steps defined</div>
          <div class="cpb-steps-empty-hint">Add steps to define the pipeline flow</div>
        </div>
      `;
    }

    return steps
      .map(
        (step, index) => `
      <div class="cpb-step" data-step-index="${index}" draggable="true">
        <div class="cpb-step-header">
          <div class="cpb-step-drag">⋮⋮</div>
          <div class="cpb-step-number">${index + 1}</div>
          <input type="text" class="cpb-step-name" value="${this._escapeHtml(step.name || `Step ${index + 1}`)}"
                 placeholder="Step name">
          <div class="cpb-step-actions">
            <button class="cpb-btn cpb-btn-icon" data-action="collapse-step" data-index="${index}">
              ▼
            </button>
            <button class="cpb-btn cpb-btn-icon cpb-btn-danger" data-action="delete-step" data-index="${index}">
              ×
            </button>
          </div>
        </div>
        <div class="cpb-step-body">
          <div class="cpb-step-row">
            <div class="cpb-form-group">
              <label>Agent/Role</label>
              <select class="cpb-select cpb-step-agent" data-index="${index}">
                <option value="">-- Select Agent --</option>
                ${
                  agents.length > 0
                    ? agents
                        .map(
                          (a) => `
                  <option value="${a.id}" ${this._isAgentSelectedForStep(step, a) ? "selected" : ""}>
                    ${a.type === "curation" ? "🤖 " : "📋 "}${this._escapeHtml(a.name)}${a.type ? ` (${a.type})` : ""}
                  </option>
                `,
                        )
                        .join("")
                    : `
                  <option value="" disabled>No agents available</option>
                `
                }
              </select>
            </div>
            <div class="cpb-form-group">
              <label>Input Source</label>
              <select class="cpb-select cpb-step-input" data-index="${index}">
                <option value="pipeline_input" ${step.inputSource === "pipeline_input" ? "selected" : ""}>Pipeline Input</option>
                <option value="previous_step" ${step.inputSource === "previous_step" ? "selected" : ""}>Previous Step Output</option>
                <option value="store_data" ${step.inputSource === "store_data" ? "selected" : ""}>Store Data</option>
                <option value="step_prompt" ${step.inputSource === "step_prompt" ? "selected" : ""}>Step Prompt</option>
                <option value="custom" ${step.inputSource === "custom" ? "selected" : ""}>Custom</option>
              </select>
            </div>
            <div class="cpb-form-group">
              <label>Output Target</label>
              <select class="cpb-select cpb-step-output" data-index="${index}">
                <option value="next_step" ${step.outputTarget === "next_step" ? "selected" : ""}>Next Step</option>
                <option value="store" ${step.outputTarget === "store" ? "selected" : ""}>Store (Final)</option>
                <option value="pipeline_output" ${step.outputTarget === "pipeline_output" ? "selected" : ""}>Pipeline Output</option>
                <option value="variable" ${step.outputTarget === "variable" ? "selected" : ""}>Variable</option>
              </select>
              <input type="text" class="cpb-input cpb-step-variable-name" data-index="${index}"
                     placeholder="Variable name" value="${this._escapeHtml(step.variableName || "")}"
                     style="margin-top: 8px; ${step.outputTarget === "variable" ? "" : "display: none;"}">
            </div>
          </div>
          <div class="cpb-form-group cpb-step-prompt-container" data-index="${index}">
            <label>Prompt Template</label>
            <div class="cpb-step-prompt-builder" data-index="${index}" data-initial-prompt="${this._escapeHtml(step.promptTemplate || "")}"></div>
          </div>
        </div>
        ${index < steps.length - 1 ? '<div class="cpb-step-connector">↓</div>' : ""}
      </div>
    `,
      )
      .join("");
  },

  /**
   * Render fields selector for RAG
   * @param {Array} targetStores - Selected store IDs
   * @param {Array} selectedFields - Currently selected fields
   * @returns {string} HTML
   */
  _renderFieldsSelector(targetStores, selectedFields) {
    if (!targetStores || targetStores.length === 0) {
      return '<div class="cpb-hint">Select target stores first to see available fields</div>';
    }

    const allFields = new Set();
    targetStores.forEach((storeId) => {
      const schema = this._curationSystem?.getStoreSchema(storeId);
      if (schema && schema.fields) {
        Object.keys(schema.fields).forEach((field) => allFields.add(field));
      }
    });

    if (allFields.size === 0) {
      return '<div class="cpb-hint">No fields found in selected stores</div>';
    }

    return `
      <div class="cpb-fields-grid">
        ${[...allFields]
          .map(
            (field) => `
          <label class="cpb-field-checkbox">
            <input type="checkbox" name="cpb-search-field" value="${field}"
                   ${selectedFields.includes(field) ? "checked" : ""}>
            <span>${field}</span>
          </label>
        `,
          )
          .join("")}
      </div>
    `;
  },

  /**
   * Render test interface
   * @param {Object} instance - Instance
   * @param {Object} pipeline - Pipeline to test
   * @returns {string} HTML
   */
  _renderTestInterface(instance, pipeline) {
    const isCRUD = instance.type === "crud";

    return `
      <div class="cpb-test-interface">
        <div class="cpb-test-header">
          <h3>🧪 Test Pipeline: ${this._escapeHtml(pipeline?.name || "Unnamed")}</h3>
          <button class="cpb-btn cpb-btn-secondary" data-action="back">
            ← Back
          </button>
        </div>

        <div class="cpb-test-body">
          <div class="cpb-test-input-section">
            <h4>📥 Test Input</h4>
            ${
              isCRUD
                ? `
              <textarea class="cpb-textarea cpb-test-input" id="cpb-test-input" rows="6"
                        placeholder="Enter test input (e.g., a description to extract character info from)..."></textarea>
            `
                : `
              <input type="text" class="cpb-input cpb-test-query" id="cpb-test-query"
                     placeholder="Enter search query...">
            `
            }
            <button class="cpb-btn cpb-btn-primary cpb-run-test" data-action="run-test">
              ▶️ Run Test
            </button>
          </div>

          <div class="cpb-test-output-section">
            <h4>📤 Output</h4>
            <div class="cpb-test-output" id="cpb-test-output">
              <div class="cpb-test-placeholder">Run a test to see output here</div>
            </div>
          </div>

          <div class="cpb-test-log-section">
            <h4>📋 Execution Log</h4>
            <div class="cpb-test-log" id="cpb-test-log">
              <div class="cpb-test-placeholder">Execution steps will appear here</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ===== EVENT HANDLING =====

  /**
   * Bind events for an instance
   * @param {Object} instance - Instance
   */
  _bindInstanceEvents(instance) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");
    if (!wrapper) return;

    // Tab switching
    wrapper.querySelectorAll(".cpb-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const type = tab.dataset.type;
        instance.type = type;
        instance.mode = "list";
        instance.pipeline = null;
        this._renderInstance(instance);
      });
    });

    // Action buttons
    wrapper.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      this._handleAction(instance, action, btn.dataset);
    });

    // Template cards
    wrapper.querySelectorAll(".cpb-template-card").forEach((card) => {
      card.addEventListener("click", () => {
        const templateKey = card.dataset.template;
        const type = card.dataset.type;
        this._loadTemplate(instance, type, templateKey);
      });
    });

    // Pipeline cards (edit/test/delete)
    wrapper.querySelectorAll(".cpb-pipeline-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]")) return; // Let action buttons handle themselves
        const pipelineId = card.dataset.pipelineId;
        const type = card.dataset.type;
        this._editPipeline(instance, type, pipelineId);
      });
    });

    // Step drag-and-drop
    this._bindStepDragEvents(instance);

    // Store selection change (for RAG field updates)
    wrapper
      .querySelectorAll('input[name="cpb-target-store"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          this._updateFieldsSelector(instance);
        });
      });

    // Initialize PromptBuilder instances for steps
    this._initializeStepPromptBuilders(instance);

    // Output target change handler (toggle variable name visibility)
    wrapper.querySelectorAll(".cpb-step-output").forEach((select) => {
      select.addEventListener("change", (e) => {
        const index = e.target.dataset.index;
        const variableInput = wrapper.querySelector(
          `.cpb-step-variable-name[data-index="${index}"]`
        );
        if (variableInput) {
          variableInput.style.display =
            e.target.value === "variable" ? "" : "none";
        }
      });
    });
  },

  /**
   * Initialize PromptBuilder instances for each step
   * @param {Object} instance - Instance
   */
  _initializeStepPromptBuilders(instance) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");
    if (!wrapper) return;

    // Clean up existing instances first
    if (instance._promptBuilderInstances) {
      instance._promptBuilderInstances.forEach((pbInstance) => {
        if (pbInstance.destroy) {
          pbInstance.destroy();
        }
      });
      instance._promptBuilderInstances.clear();
    } else {
      instance._promptBuilderInstances = new Map();
    }

    // Initialize PromptBuilder for each step
    const promptBuilderContainers = wrapper.querySelectorAll(
      ".cpb-step-prompt-builder"
    );

    if (!window.PromptBuilder) {
      this._log("warn", "PromptBuilder not available, falling back to textarea");
      // Fallback: Replace with textarea if PromptBuilder is not available
      promptBuilderContainers.forEach((container) => {
        const index = container.dataset.index;
        const initialPrompt = container.dataset.initialPrompt || "";
        container.innerHTML = `
          <textarea class="cpb-textarea cpb-step-prompt-fallback" data-index="${index}" rows="4"
                    placeholder="Enter the prompt for this step...">${this._escapeHtml(initialPrompt)}</textarea>
          <div class="cpb-hint">
            Tokens: <code>{{input}}</code>, <code>{{context}}</code>, <code>{{previousOutput}}</code>, <code>{{store.fieldName}}</code>
          </div>
        `;
      });
      return;
    }

    promptBuilderContainers.forEach((container) => {
      const index = parseInt(container.dataset.index);
      const initialPrompt = container.dataset.initialPrompt || "";

      try {
        const pbInstance = window.PromptBuilder.createInstance({
          initialMode: "custom",
          initialPrompt: initialPrompt,
          onChange: () => {
            // Notify parent of change if needed
            if (instance.onChange) {
              instance.onChange(this._gatherFormData(instance));
            }
          },
        });

        pbInstance.render(container);
        instance._promptBuilderInstances.set(index, pbInstance);
      } catch (error) {
        this._log("error", `Failed to initialize PromptBuilder for step ${index}:`, error);
        // Fallback to textarea
        container.innerHTML = `
          <textarea class="cpb-textarea cpb-step-prompt-fallback" data-index="${index}" rows="4"
                    placeholder="Enter the prompt for this step...">${this._escapeHtml(initialPrompt)}</textarea>
          <div class="cpb-hint">
            Tokens: <code>{{input}}</code>, <code>{{context}}</code>, <code>{{previousOutput}}</code>, <code>{{store.fieldName}}</code>
          </div>
        `;
      }
    });
  },

  /**
   * Bind drag events for step reordering
   * @param {Object} instance - Instance
   */
  _bindStepDragEvents(instance) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");
    const stepsContainer = wrapper?.querySelector("#cpb-steps");
    if (!stepsContainer) return;

    stepsContainer.querySelectorAll(".cpb-step").forEach((step) => {
      step.addEventListener("dragstart", (e) => {
        this._dragState = {
          element: step,
          index: parseInt(step.dataset.stepIndex),
        };
        step.classList.add("cpb-step-dragging");
      });

      step.addEventListener("dragend", () => {
        step.classList.remove("cpb-step-dragging");
        this._dragState = null;
      });

      step.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (this._dragState && this._dragState.element !== step) {
          step.classList.add("cpb-step-dragover");
        }
      });

      step.addEventListener("dragleave", () => {
        step.classList.remove("cpb-step-dragover");
      });

      step.addEventListener("drop", (e) => {
        e.preventDefault();
        step.classList.remove("cpb-step-dragover");
        if (this._dragState) {
          const fromIndex = this._dragState.index;
          const toIndex = parseInt(step.dataset.stepIndex);
          this._reorderSteps(instance, fromIndex, toIndex);
        }
      });
    });
  },

  /**
   * Handle action button clicks
   * @param {Object} instance - Instance
   * @param {string} action - Action name
   * @param {Object} data - Additional data
   */
  _handleAction(instance, action, data) {
    switch (action) {
      case "new":
        this._createNewPipeline(instance);
        break;
      case "back":
        instance.mode = "list";
        instance.pipeline = null;
        this._renderInstance(instance);
        break;
      case "cancel":
        instance.mode = "list";
        instance.pipeline = null;
        this._renderInstance(instance);
        break;
      case "edit":
        this._editPipeline(instance, instance.type, data.id);
        break;
      case "delete":
        this._deletePipeline(instance, instance.type, data.id);
        break;
      case "test":
        this._testPipeline(instance, data.id);
        break;
      case "save":
        this._saveCRUDPipeline(instance);
        break;
      case "save-rag":
        this._saveRAGPipeline(instance);
        break;
      case "test-pipeline":
      case "test-rag":
        this._enterTestMode(instance);
        break;
      case "run-test":
        this._runPipelineTest(instance);
        break;
      case "add-step":
        this._addStep(instance);
        break;
      case "delete-step":
        this._deleteStep(instance, parseInt(data.index));
        break;
      case "collapse-step":
        this._toggleStepCollapse(instance, parseInt(data.index));
        break;
      case "auto-schema":
        this._autoGenerateSchema(instance);
        break;
    }
  },

  // ===== PIPELINE OPERATIONS =====

  /**
   * Create a new pipeline
   * @param {Object} instance - Instance
   */
  _createNewPipeline(instance) {
    instance.mode = "edit";
    instance.pipeline = null;
    this._renderInstance(instance);
  },

  /**
   * Load a template
   * @param {Object} instance - Instance
   * @param {string} type - Pipeline type
   * @param {string} templateKey - Template key
   */
  _loadTemplate(instance, type, templateKey) {
    const templates =
      type === "crud" ? this.CRUD_TEMPLATES : this.RAG_TEMPLATES;
    const template = templates[templateKey];

    if (template) {
      instance.type = type;
      instance.mode = "edit";
      instance.pipeline = {
        ...template,
        id: `${templateKey}_${Date.now()}`,
      };
      this._renderInstance(instance);
    }
  },

  /**
   * Edit an existing pipeline
   * @param {Object} instance - Instance
   * @param {string} type - Pipeline type
   * @param {string} pipelineId - Pipeline ID
   */
  _editPipeline(instance, type, pipelineId) {
    let pipeline;
    if (type === "crud") {
      pipeline = this._curationSystem?.getCRUDPipeline(pipelineId);
    } else {
      pipeline = this._curationSystem?.getRAGPipeline(pipelineId);
    }

    if (pipeline) {
      instance.type = type;
      instance.mode = "edit";
      // Normalize pipeline structure: convert actions to steps and positionId to agentId
      const normalizedPipeline = this._normalizePipelineForUI({ ...pipeline });
      instance.pipeline = normalizedPipeline;
      this._renderInstance(instance);
    }
  },

  /**
   * Normalize pipeline data for UI display
   * Converts 'actions' to 'steps' and 'positionId' to 'agentId'
   * @param {Object} pipeline - Raw pipeline from CurationSystem
   * @returns {Object} Normalized pipeline for UI
   */
  _normalizePipelineForUI(pipeline) {
    // Convert actions array to steps array if needed
    if (pipeline.actions && !pipeline.steps) {
      pipeline.steps = pipeline.actions.map((action, index) => {
        // Resolve the agent ID from the position ID
        // Default pipelines reference positions, but we want the assigned agent
        let resolvedAgentId = action.agentId || "";

        if (!resolvedAgentId && action.positionId) {
          // Try to find the agent assigned to this position
          const assignedAgent = this._resolveAgentForPosition(
            action.positionId,
          );
          resolvedAgentId = assignedAgent?.id || action.positionId;
        }

        return {
          id: action.id || `step_${index}`,
          name: action.name || `Step ${index + 1}`,
          // Use resolved agent ID
          agentId: resolvedAgentId,
          inputSource: action.inputSource || "pipeline_input",
          outputTarget: action.outputTarget || "next_step",
          promptTemplate: action.promptTemplate || "",
          variableName: action.variableName || "",
          // Preserve original fields for reference
          positionId: action.positionId,
          _originalPositionId: action.positionId,
          _originalInputMapping: action.inputMapping,
          _originalOutputMapping: action.outputMapping,
        };
      });
    }
    return pipeline;
  },

  /**
   * Resolve the agent assigned to a position
   * @param {string} positionId - Position ID
   * @returns {Object|null} Agent object or null
   */
  _resolveAgentForPosition(positionId) {
    if (!this._curationSystem) return null;

    // First try to get the agent directly assigned to this position
    if (this._curationSystem.getAgentForPosition) {
      const agent = this._curationSystem.getAgentForPosition(positionId);
      if (agent) return agent;
    }

    // Fallback: search all agents for one with matching positionId
    if (this._curationSystem.getAllCurationAgents) {
      const agents = this._curationSystem.getAllCurationAgents();
      for (const agent of agents) {
        if (agent.positionId === positionId) {
          return agent;
        }
      }
    }

    return null;
  },

  /**
   * Convert UI pipeline back to storage format
   * Converts 'steps' to 'actions' and properly maps agent/position IDs
   * @param {Object} pipeline - UI pipeline data
   * @returns {Object} Pipeline for storage
   */
  _normalizePipelineForStorage(pipeline) {
    if (pipeline.steps) {
      pipeline.actions = pipeline.steps.map((step) => {
        // Resolve the position ID from the selected agent
        let positionId = step._originalPositionId || "";
        let agentId = step.agentId || "";

        // If an agent was selected (e.g., "curation_character_topologist"),
        // we need to find its associated position for pipeline execution
        if (agentId && this._curationSystem?.getCurationAgent) {
          const agent = this._curationSystem.getCurationAgent(agentId);
          if (agent?.positionId) {
            positionId = agent.positionId;
          }
        }

        // If selected value is a position ID directly (no agent prefix),
        // use it as the positionId
        if (agentId && !positionId) {
          // Check if this is a position ID rather than an agent ID
          if (this._curationSystem?.getCurationPosition) {
            const position = this._curationSystem.getCurationPosition(agentId);
            if (position) {
              positionId = agentId;
            }
          }
        }

        return {
          id: step.id,
          name: step.name,
          description: step.description || "",
          // Store positionId for pipeline execution compatibility
          positionId: positionId || agentId || "",
          // Also store agentId for explicit agent reference
          agentId: agentId || "",
          promptTemplate: step.promptTemplate || "",
          inputSource: step.inputSource || "pipeline_input",
          outputTarget: step.outputTarget || "next_step",
          variableName: step.variableName || "",
          inputMapping: step._originalInputMapping || {},
          outputMapping: step._originalOutputMapping || {},
        };
      });
    }
    return pipeline;
  },

  /**
   * Check if an agent should be selected for a step
   * Handles matching by agentId, agentRole, positionId, or agent's positionId
   * @param {Object} step - The pipeline step
   * @param {Object} agent - The agent option
   * @returns {boolean} True if agent should be selected
   */
  _isAgentSelectedForStep(step, agent) {
    // Direct ID match
    if (step.agentId === agent.id) return true;
    if (step.agentRole === agent.id) return true;

    // Position ID match (default pipelines use positionId)
    if (step.positionId) {
      // Check if step's positionId matches agent's id or positionId
      if (step.positionId === agent.id) return true;
      if (step.positionId === agent.positionId) return true;
    }

    return false;
  },

  /**
   * Delete a pipeline
   * @param {Object} instance - Instance
   * @param {string} type - Pipeline type
   * @param {string} pipelineId - Pipeline ID
   */
  _deletePipeline(instance, type, pipelineId) {
    if (!confirm("Are you sure you want to delete this pipeline?")) {
      return;
    }

    // TODO: Implement actual deletion in CurationSystem
    this._log("info", `Deleting ${type} pipeline: ${pipelineId}`);
    this._showToast("Pipeline deleted", "success");
    this._renderInstance(instance);
  },

  /**
   * Enter test mode
   * @param {Object} instance - Instance
   */
  _enterTestMode(instance) {
    // First gather current form data
    const pipeline = this._gatherFormData(instance);
    instance.pipeline = pipeline;
    instance.mode = "test";
    this._renderInstance(instance);
  },

  /**
   * Test a pipeline
   * @param {Object} instance - Instance
   * @param {string} pipelineId - Pipeline ID
   */
  _testPipeline(instance, pipelineId) {
    let pipeline;
    if (instance.type === "crud") {
      pipeline = this._curationSystem?.getCRUDPipeline(pipelineId);
    } else {
      pipeline = this._curationSystem?.getRAGPipeline(pipelineId);
    }

    if (pipeline) {
      instance.pipeline = pipeline;
      instance.mode = "test";
      this._renderInstance(instance);
    }
  },

  /**
   * Run a pipeline test
   * @param {Object} instance - Instance
   */
  async _runPipelineTest(instance) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");
    const outputEl = wrapper.querySelector("#cpb-test-output");
    const logEl = wrapper.querySelector("#cpb-test-log");

    outputEl.innerHTML = '<div class="cpb-test-running">Running test...</div>';
    logEl.innerHTML = "";

    const addLog = (message, type = "info") => {
      const timestamp = new Date().toLocaleTimeString();
      logEl.innerHTML += `
        <div class="cpb-log-entry cpb-log-${type}">
          <span class="cpb-log-time">${timestamp}</span>
          <span class="cpb-log-msg">${this._escapeHtml(message)}</span>
        </div>
      `;
    };

    try {
      addLog("Starting pipeline test...", "info");

      if (instance.type === "crud") {
        const input = wrapper.querySelector("#cpb-test-input")?.value || "";
        addLog(`Input received: ${input.substring(0, 50)}...`, "info");

        // Simulate CRUD pipeline execution
        const pipeline = instance.pipeline;
        const steps = pipeline.steps || pipeline.actions || [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          addLog(`Executing step ${i + 1}: ${step.name}`, "info");
          await this._delay(500); // Simulate processing
          addLog(`Step ${i + 1} completed`, "success");
        }

        outputEl.innerHTML = `
          <div class="cpb-test-result cpb-test-success">
            <div class="cpb-result-title">✅ Test Completed</div>
            <pre class="cpb-result-data">${JSON.stringify(
              {
                status: "success",
                message: "Pipeline executed successfully (simulated)",
              },
              null,
              2,
            )}</pre>
          </div>
        `;
      } else {
        const query = wrapper.querySelector("#cpb-test-query")?.value || "";
        addLog(`Query: "${query}"`, "info");

        // Execute RAG pipeline
        const result = await this._curationSystem?.executeRAG(
          instance.pipeline.id,
          { query },
        );

        addLog(`Found ${result?.count || 0} results`, "success");

        outputEl.innerHTML = `
          <div class="cpb-test-result cpb-test-success">
            <div class="cpb-result-title">✅ RAG Results</div>
            <pre class="cpb-result-data">${JSON.stringify(result, null, 2)}</pre>
          </div>
        `;
      }

      addLog("Test completed successfully", "success");
    } catch (error) {
      addLog(`Error: ${error.message}`, "error");
      outputEl.innerHTML = `
        <div class="cpb-test-result cpb-test-error">
          <div class="cpb-result-title">❌ Test Failed</div>
          <pre class="cpb-result-data">${this._escapeHtml(error.message)}</pre>
        </div>
      `;
    }
  },

  /**
   * Save CRUD pipeline
   * @param {Object} instance - Instance
   */
  _saveCRUDPipeline(instance) {
    let pipeline = this._gatherFormData(instance);
    // Convert to storage format (steps -> actions, agentId -> positionId)
    pipeline = this._normalizePipelineForStorage(pipeline);

    if (!pipeline.id || !pipeline.name) {
      this._showToast("Pipeline ID and name are required", "error");
      return;
    }

    try {
      this._curationSystem?.registerCRUDPipeline(pipeline);
      this._showToast("CRUD pipeline saved successfully", "success");

      if (instance.onSave) {
        instance.onSave(pipeline);
      }

      instance.mode = "list";
      instance.pipeline = null;
      this._renderInstance(instance);
    } catch (error) {
      this._showToast(`Failed to save: ${error.message}`, "error");
    }
  },

  /**
   * Save RAG pipeline
   * @param {Object} instance - Instance
   */
  _saveRAGPipeline(instance) {
    const pipeline = this._gatherRAGFormData(instance);

    if (!pipeline.id || !pipeline.name) {
      this._showToast("Pipeline ID and name are required", "error");
      return;
    }

    try {
      this._curationSystem?.registerRAGPipeline(pipeline);
      this._showToast("RAG pipeline saved successfully", "success");

      if (instance.onSave) {
        instance.onSave(pipeline);
      }

      instance.mode = "list";
      instance.pipeline = null;
      this._renderInstance(instance);
    } catch (error) {
      this._showToast(`Failed to save: ${error.message}`, "error");
    }
  },

  /**
   * Gather CRUD form data
   * @param {Object} instance - Instance
   * @returns {Object} Pipeline data
   */
  _gatherFormData(instance) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");

    const pipeline = {
      id: wrapper.querySelector("#cpb-id")?.value || "",
      name: wrapper.querySelector("#cpb-name")?.value || "",
      description: wrapper.querySelector("#cpb-description")?.value || "",
      storeId: wrapper.querySelector("#cpb-store")?.value || "",
      operation: wrapper.querySelector("#cpb-operation")?.value || "create",
      steps: [],
      inputSchema: {},
      outputSchema: {},
    };

    // Gather steps
    wrapper.querySelectorAll(".cpb-step").forEach((stepEl, index) => {
      const outputTarget = stepEl.querySelector(".cpb-step-output")?.value || "next_step";
      const stepData = {
        id: `step_${index}`,
        name:
          stepEl.querySelector(".cpb-step-name")?.value || `Step ${index + 1}`,
        agentId: stepEl.querySelector(".cpb-step-agent")?.value || "",
        inputSource:
          stepEl.querySelector(".cpb-step-input")?.value || "pipeline_input",
        outputTarget: outputTarget,
        promptTemplate: "",
        variableName: "",
      };

      // Get prompt from PromptBuilder instance if available, otherwise from fallback textarea
      const promptBuilderInstance = instance._promptBuilderInstances?.get(index);
      if (promptBuilderInstance) {
        const promptValue = promptBuilderInstance.getValue();
        stepData.promptTemplate = promptValue?.customPrompt || promptValue?.resolvedPrompt || "";
      } else {
        // Fallback to textarea
        const fallbackTextarea = stepEl.querySelector(".cpb-step-prompt-fallback");
        if (fallbackTextarea) {
          stepData.promptTemplate = fallbackTextarea.value || "";
        }
      }

      // Get variable name if output target is variable
      if (outputTarget === "variable") {
        stepData.variableName = stepEl.querySelector(".cpb-step-variable-name")?.value || "";
      }

      pipeline.steps.push(stepData);
    });

    // Parse schemas
    try {
      const inputSchemaStr = wrapper.querySelector("#cpb-input-schema")?.value;
      if (inputSchemaStr) {
        pipeline.inputSchema = JSON.parse(inputSchemaStr);
      }
    } catch (e) {
      this._log("warn", "Invalid input schema JSON");
    }

    try {
      const outputSchemaStr =
        wrapper.querySelector("#cpb-output-schema")?.value;
      if (outputSchemaStr) {
        pipeline.outputSchema = JSON.parse(outputSchemaStr);
      }
    } catch (e) {
      this._log("warn", "Invalid output schema JSON");
    }

    return pipeline;
  },

  /**
   * Gather RAG form data
   * @param {Object} instance - Instance
   * @returns {Object} Pipeline data
   */
  _gatherRAGFormData(instance) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");

    const targetStores = [];
    wrapper
      .querySelectorAll('input[name="cpb-target-store"]:checked')
      .forEach((cb) => {
        targetStores.push(cb.value);
      });

    const searchFields = [];
    wrapper
      .querySelectorAll('input[name="cpb-search-field"]:checked')
      .forEach((cb) => {
        searchFields.push(cb.value);
      });

    const searchMethod =
      wrapper.querySelector('input[name="cpb-search-method"]:checked')?.value ||
      "keyword";
    const resultFormat =
      wrapper.querySelector('input[name="cpb-result-format"]:checked')?.value ||
      "summary";

    return {
      id: wrapper.querySelector("#cpb-rag-id")?.value || "",
      name: wrapper.querySelector("#cpb-rag-name")?.value || "",
      description: wrapper.querySelector("#cpb-rag-description")?.value || "",
      targetStores,
      searchMethod,
      searchFields,
      maxResults:
        parseInt(wrapper.querySelector("#cpb-max-results")?.value) || 5,
      minScore:
        parseFloat(wrapper.querySelector("#cpb-min-score")?.value) || 0.3,
      queryTemplate:
        wrapper.querySelector("#cpb-query-template")?.value || "{{query}}",
      preProcessQuery: {
        extractEntities:
          wrapper.querySelector("#cpb-extract-entities")?.checked || false,
        expandSynonyms:
          wrapper.querySelector("#cpb-expand-synonyms")?.checked || false,
        useAgent:
          wrapper.querySelector("#cpb-use-agent-preprocess")?.checked || false,
      },
      postProcess: {
        format: resultFormat,
        useAgent:
          wrapper.querySelector("#cpb-use-agent-postprocess")?.checked || false,
      },
      triggers: {
        fromPipeline:
          wrapper.querySelector("#cpb-trigger-pipeline")?.checked !== false,
        manual: wrapper.querySelector("#cpb-trigger-manual")?.checked !== false,
        autoOnNewEntry:
          wrapper.querySelector("#cpb-trigger-auto")?.checked || false,
      },
      canTriggerFromPipeline:
        wrapper.querySelector("#cpb-trigger-pipeline")?.checked !== false,
      canTriggerManually:
        wrapper.querySelector("#cpb-trigger-manual")?.checked !== false,
    };
  },

  // ===== STEP OPERATIONS =====

  /**
   * Add a new step
   * @param {Object} instance - Instance
   */
  _addStep(instance) {
    const pipeline = this._gatherFormData(instance);
    pipeline.steps.push({
      id: `step_${pipeline.steps.length}`,
      name: `Step ${pipeline.steps.length + 1}`,
      agentId: "",
      inputSource:
        pipeline.steps.length === 0 ? "pipeline_input" : "previous_step",
      outputTarget: "next_step",
      promptTemplate: "",
      variableName: "",
    });
    instance.pipeline = pipeline;
    this._renderInstance(instance);
  },

  /**
   * Delete a step
   * @param {Object} instance - Instance
   * @param {number} index - Step index
   */
  _deleteStep(instance, index) {
    const pipeline = this._gatherFormData(instance);
    pipeline.steps.splice(index, 1);
    instance.pipeline = pipeline;
    this._renderInstance(instance);
  },

  /**
   * Reorder steps via drag-and-drop
   * @param {Object} instance - Instance
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   */
  _reorderSteps(instance, fromIndex, toIndex) {
    const pipeline = this._gatherFormData(instance);
    const [removed] = pipeline.steps.splice(fromIndex, 1);
    pipeline.steps.splice(toIndex, 0, removed);
    instance.pipeline = pipeline;
    this._renderInstance(instance);
  },

  /**
   * Toggle step collapse state
   * @param {Object} instance - Instance
   * @param {number} index - Step index
   */
  _toggleStepCollapse(instance, index) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");
    const step = wrapper.querySelector(`.cpb-step[data-step-index="${index}"]`);
    if (step) {
      step.classList.toggle("cpb-step-collapsed");
      const btn = step.querySelector('[data-action="collapse-step"]');
      if (btn) {
        btn.textContent = step.classList.contains("cpb-step-collapsed")
          ? "▶"
          : "▼";
      }
    }
  },

  /**
   * Update fields selector when stores change
   * @param {Object} instance - Instance
   */
  _updateFieldsSelector(instance) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");
    const fieldsContainer = wrapper.querySelector("#cpb-search-fields");
    if (!fieldsContainer) return;

    const targetStores = [];
    wrapper
      .querySelectorAll('input[name="cpb-target-store"]:checked')
      .forEach((cb) => {
        targetStores.push(cb.value);
      });

    const currentFields = [];
    wrapper
      .querySelectorAll('input[name="cpb-search-field"]:checked')
      .forEach((cb) => {
        currentFields.push(cb.value);
      });

    fieldsContainer.innerHTML = this._renderFieldsSelector(
      targetStores,
      currentFields,
    );
  },

  /**
   * Auto-generate output schema from store
   * @param {Object} instance - Instance
   */
  _autoGenerateSchema(instance) {
    const wrapper = instance.container.querySelector(".cpb-wrapper");
    const storeId = wrapper.querySelector("#cpb-store")?.value;
    const outputSchemaEl = wrapper.querySelector("#cpb-output-schema");

    if (!storeId || !outputSchemaEl) return;

    const schema = this._curationSystem?.getStoreSchema(storeId);
    if (schema && schema.fields) {
      const outputSchema = {};
      Object.entries(schema.fields).forEach(([key, field]) => {
        outputSchema[key] = field.type || "string";
      });
      outputSchemaEl.value = JSON.stringify(outputSchema, null, 2);
    }
  },

  /**
   * Get available agents from AgentsSystem
   * @returns {Array} Available agents
   */
  _getAvailableAgents() {
    const agents = [];

    // First, get curation agents from CurationSystem (preferred for curation pipelines)
    if (this._curationSystem?.getAllCurationAgents) {
      const curationAgents = this._curationSystem.getAllCurationAgents();
      for (const agent of curationAgents) {
        agents.push({
          id: agent.id,
          name: agent.name,
          description: agent.description || "",
          type: "curation",
          // Include positionId for matching pipeline action references
          positionId: agent.positionId || null,
        });
      }
    }

    // Also add curation positions as agent roles (fallback)
    // This ensures positions are available even if no agent is assigned
    if (this._curationSystem?.getCurationPositions) {
      const positions = this._curationSystem.getCurationPositions();
      for (const position of positions) {
        // Only add if no agent is assigned to this position
        // Check both id and positionId to avoid duplicates
        const hasAgent = agents.some(
          (a) => a.id === position.id || a.positionId === position.id,
        );
        if (!hasAgent) {
          agents.push({
            id: position.id,
            name: position.name,
            description: position.promptModifiers?.roleDescription || "",
            type: "position",
            positionId: position.id,
          });
        }
      }
    }

    // If we found agents, return them
    if (agents.length > 0) {
      return agents;
    }

    // Return default agent roles if no system available
    return [
      { id: "archivist", name: "Archivist" },
      { id: "story_topologist", name: "Story Topologist" },
      { id: "character_topologist", name: "Character Topologist" },
      { id: "lore_topologist", name: "Lore Topologist" },
      { id: "location_topologist", name: "Location Topologist" },
      { id: "scene_topologist", name: "Scene Topologist" },
    ];
  },

  // ===== UTILITIES =====

  /**
   * Delay helper for async operations
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Escape HTML
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
   * Show a toast notification
   * @param {string} message - Message to show
   * @param {string} type - Type (success, error, info)
   */
  _showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `cpb-toast cpb-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("cpb-toast-show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("cpb-toast-show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {Object} data - Additional data
   */
  _log(level, message, data = {}) {
    const prefix = "[CurationPipelineBuilder]";
    if (this._logger && this._logger[level]) {
      this._logger[level](prefix, message, data);
    } else {
      console[level]?.(prefix, message, data);
    }
  },

  // ===== STYLES =====

  /**
   * Inject component styles
   */
  _injectStyles() {
    if (document.getElementById("cpb-styles")) return;

    const style = document.createElement("style");
    style.id = "cpb-styles";
    style.textContent = `
      /* Wrapper */
      .cpb-wrapper {
        font-family: var(--mainFontFamily, system-ui, sans-serif);
        color: var(--SmartThemeBodyColor, #e0e0e0);
        background: var(--SmartThemeBlurTintColor, rgba(20, 20, 30, 0.9));
        border-radius: 8px;
        overflow: hidden;
      }

      /* Header */
      .cpb-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .cpb-type-tabs {
        display: flex;
        gap: 8px;
      }

      .cpb-tab {
        padding: 8px 16px;
        border: none;
        background: transparent;
        color: var(--SmartThemeBodyColor, #aaa);
        cursor: pointer;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s;
      }

      .cpb-tab:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .cpb-tab-active {
        background: var(--SmartThemeBotMesBlurTintColor, rgba(60, 100, 180, 0.4));
        color: var(--SmartThemeBodyColor, #fff);
      }

      /* Buttons */
      .cpb-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .cpb-btn-primary {
        background: var(--SmartThemeQuoteColor, #4a9eff);
        color: #fff;
      }

      .cpb-btn-primary:hover {
        background: var(--SmartThemeQuoteColor, #3a8eef);
        filter: brightness(1.1);
      }

      .cpb-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--SmartThemeBodyColor, #e0e0e0);
      }

      .cpb-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .cpb-btn-danger {
        background: rgba(220, 60, 60, 0.3);
        color: #ff6b6b;
      }

      .cpb-btn-danger:hover {
        background: rgba(220, 60, 60, 0.5);
      }

      .cpb-btn-sm {
        padding: 4px 10px;
        font-size: 12px;
      }

      .cpb-btn-icon {
        padding: 4px 8px;
        background: transparent;
        color: var(--SmartThemeBodyColor, #aaa);
      }

      .cpb-btn-link {
        background: transparent;
        color: var(--SmartThemeQuoteColor, #4a9eff);
        text-decoration: underline;
        padding: 4px;
      }

      /* Content */
      .cpb-content {
        padding: 16px;
        max-height: 70vh;
        overflow-y: auto;
      }

      /* List View */
      .cpb-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .cpb-list-header h3 {
        margin: 0;
        font-size: 18px;
      }

      .cpb-count {
        color: var(--SmartThemeBodyColor, #888);
        font-size: 14px;
      }

      .cpb-list-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
      }

      /* Pipeline Card */
      .cpb-pipeline-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .cpb-pipeline-card:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--SmartThemeQuoteColor, #4a9eff);
      }

      .cpb-pipeline-info {
        flex: 1;
      }

      .cpb-pipeline-name {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 4px;
      }

      .cpb-pipeline-desc {
        color: var(--SmartThemeBodyColor, #888);
        font-size: 13px;
        margin-bottom: 8px;
      }

      .cpb-pipeline-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
      }

      .cpb-meta-badge {
        padding: 2px 8px;
        background: rgba(100, 100, 255, 0.2);
        border-radius: 4px;
        text-transform: uppercase;
      }

      .cpb-op-create { background: rgba(80, 200, 120, 0.2); color: #50c878; }
      .cpb-op-read { background: rgba(100, 150, 255, 0.2); color: #6496ff; }
      .cpb-op-update { background: rgba(255, 180, 50, 0.2); color: #ffb432; }
      .cpb-op-delete { background: rgba(255, 100, 100, 0.2); color: #ff6464; }

      .cpb-pipeline-actions {
        display: flex;
        gap: 8px;
      }

      /* Empty State */
      .cpb-empty-state {
        text-align: center;
        padding: 40px 20px;
        background: rgba(255, 255, 255, 0.02);
        border: 2px dashed rgba(255, 255, 255, 0.1);
        border-radius: 8px;
      }

      .cpb-empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .cpb-empty-text {
        font-size: 18px;
        margin-bottom: 8px;
      }

      .cpb-empty-hint {
        color: var(--SmartThemeBodyColor, #888);
        font-size: 14px;
        margin-bottom: 16px;
      }

      /* Templates */
      .cpb-templates-section {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .cpb-templates-section h4 {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: var(--SmartThemeBodyColor, #aaa);
      }

      .cpb-templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
      }

      .cpb-template-card {
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .cpb-template-card:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: var(--SmartThemeQuoteColor, #4a9eff);
      }

      .cpb-template-name {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .cpb-template-desc {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #888);
        margin-bottom: 8px;
      }

      .cpb-template-meta {
        display: flex;
        gap: 8px;
        font-size: 11px;
      }

      .cpb-template-op,
      .cpb-template-method {
        padding: 2px 6px;
        background: rgba(100, 100, 255, 0.2);
        border-radius: 3px;
      }

      /* Editor */
      .cpb-editor {
        max-width: 900px;
      }

      .cpb-editor-header {
        margin-bottom: 20px;
      }

      .cpb-editor-header h3 {
        margin: 0;
        font-size: 20px;
      }

      .cpb-form-section {
        margin-bottom: 24px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .cpb-form-section h4 {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: var(--SmartThemeQuoteColor, #4a9eff);
      }

      .cpb-form-row {
        display: flex;
        gap: 16px;
      }

      .cpb-form-group {
        flex: 1;
        margin-bottom: 12px;
      }

      .cpb-form-group label:not(.prompt-builder-mode) {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        color: var(--SmartThemeBodyColor, #aaa);
      }

      .cpb-input,
      .cpb-select,
      .cpb-textarea {
        width: 100%;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        color: var(--SmartThemeBodyColor, #e0e0e0);
        font-size: 14px;
        font-family: inherit;
        box-sizing: border-box;
      }

      .cpb-input:focus,
      .cpb-select:focus,
      .cpb-textarea:focus {
        outline: none;
        border-color: var(--SmartThemeQuoteColor, #4a9eff);
      }

      .cpb-input-sm {
        width: 100px;
      }

      .cpb-textarea {
        resize: vertical;
        min-height: 60px;
      }

      .cpb-code {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
      }

      .cpb-hint {
        margin-top: 6px;
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #666);
      }

      .cpb-hint code {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
      }

      /* Stores Grid */
      .cpb-stores-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 8px;
      }

      .cpb-store-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .cpb-store-checkbox:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .cpb-store-checkbox input:checked + .cpb-store-label {
        color: var(--SmartThemeQuoteColor, #4a9eff);
      }

      .cpb-store-icon {
        font-size: 16px;
      }

      /* Radio & Checkbox Groups */
      .cpb-radio-group,
      .cpb-checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }

      .cpb-radio,
      .cpb-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .cpb-radio input,
      .cpb-checkbox input {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      /* Fields Grid */
      .cpb-fields-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .cpb-field-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }

      .cpb-field-checkbox:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      /* Steps */
      .cpb-steps-container {
        margin-bottom: 16px;
      }

      .cpb-steps-empty {
        text-align: center;
        padding: 30px;
        background: rgba(0, 0, 0, 0.2);
        border: 2px dashed rgba(255, 255, 255, 0.1);
        border-radius: 8px;
      }

      .cpb-steps-empty-text {
        font-size: 14px;
        color: var(--SmartThemeBodyColor, #888);
      }

      .cpb-steps-empty-hint {
        font-size: 12px;
        color: var(--SmartThemeBodyColor, #666);
        margin-top: 4px;
      }

      .cpb-step {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        margin-bottom: 8px;
        overflow: hidden;
      }

      .cpb-step-dragging {
        opacity: 0.5;
        border-style: dashed;
      }

      .cpb-step-dragover {
        border-color: var(--SmartThemeQuoteColor, #4a9eff);
        background: rgba(74, 158, 255, 0.1);
      }

      .cpb-step-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.2);
        cursor: grab;
      }

      .cpb-step-drag {
        color: var(--SmartThemeBodyColor, #666);
        cursor: grab;
      }

      .cpb-step-number {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--SmartThemeQuoteColor, #4a9eff);
        color: #fff;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 600;
      }

      .cpb-step-name {
        flex: 1;
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: var(--SmartThemeBodyColor, #e0e0e0);
        font-size: 14px;
      }

      .cpb-step-actions {
        display: flex;
        gap: 4px;
      }

      .cpb-step-body {
        padding: 16px;
      }

      .cpb-step-collapsed .cpb-step-body {
        display: none;
      }

      .cpb-step-row {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }

      .cpb-step-row .cpb-form-group {
        margin-bottom: 0;
      }

      .cpb-step-connector {
        text-align: center;
        padding: 8px 0;
        color: var(--SmartThemeQuoteColor, #4a9eff);
        font-size: 20px;
      }

      .cpb-add-step {
        width: 100%;
        padding: 12px;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        background: transparent;
      }

      .cpb-add-step:hover {
        border-color: var(--SmartThemeQuoteColor, #4a9eff);
        background: rgba(74, 158, 255, 0.1);
      }

      /* Editor Footer */
      .cpb-editor-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      }

      /* Test Interface */
      .cpb-test-interface {
        max-width: 900px;
      }

      .cpb-test-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .cpb-test-header h3 {
        margin: 0;
      }

      .cpb-test-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .cpb-test-input-section {
        grid-column: 1 / -1;
      }

      .cpb-test-input-section h4,
      .cpb-test-output-section h4,
      .cpb-test-log-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: var(--SmartThemeQuoteColor, #4a9eff);
      }

      .cpb-test-input,
      .cpb-test-query {
        width: 100%;
        margin-bottom: 12px;
      }

      .cpb-test-output,
      .cpb-test-log {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 12px;
        min-height: 200px;
        max-height: 300px;
        overflow-y: auto;
      }

      .cpb-test-placeholder {
        color: var(--SmartThemeBodyColor, #666);
        font-style: italic;
        text-align: center;
        padding: 40px 20px;
      }

      .cpb-test-running {
        text-align: center;
        padding: 40px 20px;
        color: var(--SmartThemeQuoteColor, #4a9eff);
      }

      .cpb-test-result {
        padding: 12px;
        border-radius: 6px;
      }

      .cpb-test-success {
        background: rgba(80, 200, 120, 0.1);
        border: 1px solid rgba(80, 200, 120, 0.3);
      }

      .cpb-test-error {
        background: rgba(220, 60, 60, 0.1);
        border: 1px solid rgba(220, 60, 60, 0.3);
      }

      .cpb-result-title {
        font-weight: 600;
        margin-bottom: 8px;
      }

      .cpb-result-data {
        margin: 0;
        padding: 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        font-family: 'Consolas', monospace;
        font-size: 12px;
        overflow-x: auto;
        white-space: pre-wrap;
      }

      /* Log Entries */
      .cpb-log-entry {
        padding: 6px 10px;
        margin-bottom: 4px;
        border-radius: 4px;
        font-size: 12px;
        display: flex;
        gap: 10px;
      }

      .cpb-log-info {
        background: rgba(100, 150, 255, 0.1);
      }

      .cpb-log-success {
        background: rgba(80, 200, 120, 0.1);
      }

      .cpb-log-error {
        background: rgba(220, 60, 60, 0.1);
        color: #ff6b6b;
      }

      .cpb-log-time {
        color: var(--SmartThemeBodyColor, #666);
        font-family: monospace;
      }

      /* Toast */
      .cpb-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s;
      }

      .cpb-toast-show {
        opacity: 1;
        transform: translateY(0);
      }

      .cpb-toast-success {
        background: rgba(80, 200, 120, 0.9);
      }

      .cpb-toast-error {
        background: rgba(220, 60, 60, 0.9);
      }

      .cpb-toast-info {
        background: rgba(74, 158, 255, 0.9);
      }

      /* PromptBuilder Container in Steps */
      .cpb-step-prompt-container {
        margin-top: 8px;
      }

      .cpb-step-prompt-builder {
        min-height: 150px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
      }

      /* Variable Name Input */
      .cpb-step-variable-name {
        width: 100%;
        margin-top: 8px;
      }

      /* Fallback Textarea */
      .cpb-step-prompt-fallback {
        width: 100%;
        min-height: 100px;
        resize: vertical;
      }
    `;

    document.head.appendChild(style);
  },
};

// Export for browser
if (typeof window !== "undefined") {
  window.CurationPipelineBuilder = CurationPipelineBuilder;
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = CurationPipelineBuilder;
}
