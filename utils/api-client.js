/**
 * TheCouncil - API Client Wrapper
 *
 * Handles LLM API calls with support for:
 * - SillyTavern's current connection
 * - Custom API endpoints
 * - Request queuing and rate limiting
 * - Retry logic
 * - Token estimation
 *
 * @version 2.0.0
 */

const ApiClient = {
  // ===== CONFIGURATION =====

  /**
   * Default configuration
   */
  _config: {
    defaultTimeout: 120000, // 2 minutes
    retryCount: 2,
    retryDelay: 1000,
    delayBetweenCalls: 500,
    maxConcurrent: 3,
  },

  /**
   * Request queue
   */
  _queue: [],

  /**
   * Active request count
   */
  _activeRequests: 0,

  /**
   * Processing queue flag
   */
  _isProcessingQueue: false,

  /**
   * Request statistics
   */
  _stats: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
    totalDuration: 0,
  },

  /**
   * Logger reference
   */
  _logger: null,

  // ===== INITIALIZATION =====

  /**
   * Initialize the API client
   * @param {Object} options - Configuration options
   * @returns {ApiClient}
   */
  init(options = {}) {
    if (options.logger) {
      this._logger = options.logger;
    }

    this.configure(options);
    this._log("info", "API Client initialized");
    return this;
  },

  /**
   * Configure the API client
   * @param {Object} options - Configuration options
   */
  configure(options = {}) {
    if (typeof options.defaultTimeout === "number") {
      this._config.defaultTimeout = options.defaultTimeout;
    }
    if (typeof options.retryCount === "number") {
      this._config.retryCount = options.retryCount;
    }
    if (typeof options.retryDelay === "number") {
      this._config.retryDelay = options.retryDelay;
    }
    if (typeof options.delayBetweenCalls === "number") {
      this._config.delayBetweenCalls = options.delayBetweenCalls;
    }
    if (typeof options.maxConcurrent === "number") {
      this._config.maxConcurrent = options.maxConcurrent;
    }
  },

  // ===== MAIN API METHODS =====

  /**
   * Generate a response using the configured API
   * @param {Object} options - Generation options
   * @param {string} options.systemPrompt - System prompt
   * @param {string} options.userPrompt - User prompt
   * @param {Object} options.apiConfig - API configuration
   * @param {Object} options.generationConfig - Generation parameters
   * @returns {Promise<Object>} Generation result
   */
  async generate(options = {}) {
    const {
      systemPrompt = "",
      userPrompt = "",
      apiConfig = {},
      generationConfig = {},
    } = options;

    const startTime = performance.now();
    this._stats.totalRequests++;

    try {
      let result;

      if (apiConfig.useCurrentConnection !== false && !apiConfig.endpoint) {
        // Use SillyTavern's API
        result = await this._generateWithST(
          systemPrompt,
          userPrompt,
          generationConfig,
        );
      } else {
        // Use custom API endpoint
        result = await this._generateWithCustomApi(
          systemPrompt,
          userPrompt,
          apiConfig,
          generationConfig,
        );
      }

      const duration = performance.now() - startTime;
      this._stats.successfulRequests++;
      this._stats.totalDuration += duration;

      // Estimate tokens if not provided
      const promptTokens =
        result.promptTokens || this._estimateTokens(systemPrompt + userPrompt);
      const responseTokens =
        result.responseTokens || this._estimateTokens(result.content || "");
      this._stats.totalTokens += promptTokens + responseTokens;

      return {
        success: true,
        content: result.content,
        promptTokens,
        responseTokens,
        duration,
        model: result.model || apiConfig.model || "unknown",
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this._stats.failedRequests++;

      this._log("error", "Generation failed:", error.message);

      return {
        success: false,
        error: error.message,
        duration,
      };
    }
  },

  /**
   * Generate with retry logic
   * @param {Object} options - Generation options
   * @param {number} retries - Number of retries (uses config default if not specified)
   * @returns {Promise<Object>} Generation result
   */
  async generateWithRetry(options = {}, retries = null) {
    const maxRetries = retries ?? this._config.retryCount;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this._log("info", `Retry attempt ${attempt}/${maxRetries}`);
        await this._delay(this._config.retryDelay * attempt);
      }

      const result = await this.generate(options);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // Don't retry on certain errors
      if (this._isNonRetryableError(lastError)) {
        break;
      }
    }

    return {
      success: false,
      error: lastError || "Generation failed after retries",
    };
  },

  /**
   * Generate multiple responses in parallel
   * @param {Array<Object>} requests - Array of generation options
   * @returns {Promise<Array<Object>>} Array of results
   */
  async generateParallel(requests = []) {
    if (requests.length === 0) {
      return [];
    }

    // Process in chunks to respect maxConcurrent
    const results = [];
    const chunkSize = this._config.maxConcurrent;

    for (let i = 0; i < requests.length; i += chunkSize) {
      const chunk = requests.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map((request) => this.generateWithRetry(request)),
      );
      results.push(...chunkResults);

      // Delay between chunks
      if (i + chunkSize < requests.length) {
        await this._delay(this._config.delayBetweenCalls);
      }
    }

    return results;
  },

  /**
   * Queue a generation request
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  enqueue(options = {}) {
    return new Promise((resolve, reject) => {
      this._queue.push({
        options,
        resolve,
        reject,
      });

      this._processQueue();
    });
  },

  // ===== INTERNAL API METHODS =====

  /**
   * Generate using SillyTavern's API
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @param {Object} generationConfig - Generation parameters
   * @returns {Promise<Object>} Result
   */
  async _generateWithST(systemPrompt, userPrompt, generationConfig = {}) {
    const context = this._getSTContext();

    if (!context) {
      throw new Error("SillyTavern context not available");
    }

    // Try generateQuietPrompt first (cleaner API)
    if (typeof context.generateQuietPrompt === "function") {
      const fullPrompt = this._buildPromptForST(systemPrompt, userPrompt);
      const result = await context.generateQuietPrompt(
        fullPrompt,
        false,
        false,
      );

      return {
        content: result || "",
        model: this._getCurrentSTModel(),
      };
    }

    // Fallback to executeSlashCommands
    if (typeof context.executeSlashCommands === "function") {
      const escapedPrompt = this._escapeForSlashCommand(
        this._buildPromptForST(systemPrompt, userPrompt),
      );
      const command = `/genraw lock=on ${escapedPrompt}`;

      const result = await context.executeSlashCommands(command, true);

      // Extract result from pipe
      let content = "";
      if (result && result.pipe) {
        content =
          typeof result.pipe === "string" ? result.pipe : String(result.pipe);
      }

      return {
        content,
        model: this._getCurrentSTModel(),
      };
    }

    throw new Error("No suitable ST generation method available");
  },

  /**
   * Generate using custom API endpoint
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @param {Object} apiConfig - API configuration
   * @param {Object} generationConfig - Generation parameters
   * @returns {Promise<Object>} Result
   */
  async _generateWithCustomApi(
    systemPrompt,
    userPrompt,
    apiConfig,
    generationConfig = {},
  ) {
    const endpoint = apiConfig.endpoint;
    const apiKey = apiConfig.apiKey;
    const model = apiConfig.model;

    if (!endpoint) {
      throw new Error("API endpoint is required for custom API");
    }

    // Build messages array
    const messages = this._buildMessages(systemPrompt, userPrompt);

    // Build request body
    const requestBody = {
      model: model || "gpt-4",
      messages,
      temperature: generationConfig.temperature ?? apiConfig.temperature ?? 0.7,
      max_tokens: generationConfig.maxTokens ?? apiConfig.maxTokens ?? 2048,
      top_p: generationConfig.topP ?? apiConfig.topP ?? 1,
      frequency_penalty:
        generationConfig.frequencyPenalty ?? apiConfig.frequencyPenalty ?? 0,
      presence_penalty:
        generationConfig.presencePenalty ?? apiConfig.presencePenalty ?? 0,
    };

    // Add optional parameters
    if (generationConfig.stop) {
      requestBody.stop = generationConfig.stop;
    }

    // Build headers
    const headers = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this._config.defaultTimeout,
    );

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      const content = this._extractResponseContent(data);

      return {
        content,
        model: data.model || model,
        promptTokens: data.usage?.prompt_tokens,
        responseTokens: data.usage?.completion_tokens,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Build messages array for chat completion
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @returns {Array<Object>} Messages array
   */
  _buildMessages(systemPrompt, userPrompt) {
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    if (userPrompt) {
      messages.push({
        role: "user",
        content: userPrompt,
      });
    }

    return messages;
  },

  /**
   * Build prompt for ST's generation methods
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @returns {string} Combined prompt
   */
  _buildPromptForST(systemPrompt, userPrompt) {
    const parts = [];

    if (systemPrompt) {
      parts.push(systemPrompt);
    }

    if (userPrompt) {
      parts.push(userPrompt);
    }

    return parts.join("\n\n");
  },

  /**
   * Extract response content from API response
   * @param {Object} data - API response data
   * @returns {string} Extracted content
   */
  _extractResponseContent(data) {
    // OpenAI format
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
      if (choice.message && choice.message.content) {
        return choice.message.content;
      }
      if (choice.text) {
        return choice.text;
      }
    }

    // Claude format
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c) => c.type === "text");
      if (textContent) {
        return textContent.text;
      }
    }

    // Direct content
    if (typeof data.content === "string") {
      return data.content;
    }

    // Fallback
    if (typeof data.text === "string") {
      return data.text;
    }

    if (typeof data.response === "string") {
      return data.response;
    }

    throw new Error("Could not extract content from API response");
  },

  // ===== QUEUE PROCESSING =====

  /**
   * Process the request queue
   */
  async _processQueue() {
    if (this._isProcessingQueue) {
      return;
    }

    this._isProcessingQueue = true;

    while (
      this._queue.length > 0 &&
      this._activeRequests < this._config.maxConcurrent
    ) {
      const task = this._queue.shift();
      this._activeRequests++;

      // Process task asynchronously
      this._processTask(task).finally(() => {
        this._activeRequests--;
        // Continue processing queue
        if (this._queue.length > 0) {
          this._processQueue();
        }
      });

      // Delay before starting next request
      if (this._queue.length > 0) {
        await this._delay(this._config.delayBetweenCalls);
      }
    }

    this._isProcessingQueue = false;
  },

  /**
   * Process a single queued task
   * @param {Object} task - Task object
   */
  async _processTask(task) {
    try {
      const result = await this.generateWithRetry(task.options);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    }
  },

  // ===== UTILITY METHODS =====

  /**
   * Get SillyTavern context
   * @returns {Object|null} ST context
   */
  _getSTContext() {
    if (typeof SillyTavern !== "undefined" && SillyTavern.getContext) {
      return SillyTavern.getContext();
    }
    return null;
  },

  /**
   * Get current ST model name
   * @returns {string} Model name
   */
  _getCurrentSTModel() {
    try {
      const context = this._getSTContext();
      if (context && context.mainApi) {
        return `ST:${context.mainApi}`;
      }
    } catch (e) {
      // Ignore
    }
    return "ST:unknown";
  },

  /**
   * Escape text for slash command
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  _escapeForSlashCommand(text) {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
  },

  /**
   * Estimate token count for text
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  _estimateTokens(text) {
    if (!text) return 0;
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  },

  /**
   * Check if error is non-retryable
   * @param {string} error - Error message
   * @returns {boolean} True if should not retry
   */
  _isNonRetryableError(error) {
    const nonRetryable = [
      "API key",
      "authentication",
      "unauthorized",
      "forbidden",
      "invalid request",
      "context not available",
    ];

    const lowerError = error.toLowerCase();
    return nonRetryable.some((term) => lowerError.includes(term));
  },

  /**
   * Delay for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    if (this._logger && typeof this._logger[level] === "function") {
      this._logger[level](`[ApiClient] ${message}`, ...args);
    }
  },

  // ===== STATISTICS =====

  /**
   * Get request statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this._stats,
      averageDuration:
        this._stats.successfulRequests > 0
          ? this._stats.totalDuration / this._stats.successfulRequests
          : 0,
      successRate:
        this._stats.totalRequests > 0
          ? this._stats.successfulRequests / this._stats.totalRequests
          : 0,
      queueLength: this._queue.length,
      activeRequests: this._activeRequests,
    };
  },

  /**
   * Reset statistics
   */
  resetStats() {
    this._stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalDuration: 0,
    };
  },

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return {
      queued: this._queue.length,
      active: this._activeRequests,
      maxConcurrent: this._config.maxConcurrent,
    };
  },

  /**
   * Clear the request queue
   */
  clearQueue() {
    const rejected = this._queue.length;
    this._queue.forEach((task) => {
      task.reject(new Error("Queue cleared"));
    });
    this._queue = [];
    this._log("info", `Queue cleared, ${rejected} requests rejected`);
  },
};

// Export for different environments
if (typeof window !== "undefined") {
  window.ApiClient = ApiClient;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ApiClient;
}
