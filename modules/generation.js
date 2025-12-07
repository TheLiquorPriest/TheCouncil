// modules/generation.js - LLM API Generation System for The Council
// Handles all LLM API calls with multi-endpoint support, queuing, and rate limiting

const CouncilGeneration = {
  // ===== CONFIGURATION =====
  config: {
    defaultTimeout: 120000, // 2 minutes
    delayBetweenCalls: 500,
    maxRetries: 2,
    retryDelay: 1000,
    maxConcurrent: 3,
  },

  // ===== STATE =====
  _queue: [],
  _activeRequests: 0,
  _isProcessingQueue: false,
  _state: null, // Reference to CouncilState

  // ===== INITIALIZATION =====

  /**
   * Initialize the generation module
   */
  init(state = null) {
    this._state =
      state || (typeof window !== "undefined" ? window.CouncilState : null);
    this._queue = [];
    this._activeRequests = 0;
    this._isProcessingQueue = false;
    console.log("[Council Generation] Initialized");
    return this;
  },

  /**
   * Set configuration
   */
  configure(options = {}) {
    this.config = { ...this.config, ...options };
  },

  // ===== MAIN GENERATION INTERFACE =====

  /**
   * Generate a response for an agent
   * This is the primary interface for the pipeline
   */
  async generateForAgent(agentId, agentConfig, prompt, options = {}) {
    console.log(`[Council Generation] generateForAgent called for: ${agentId}`);
    console.log(`[Council Generation] Config:`, {
      useMainApi: agentConfig.useMainApi,
      hasApiEndpoint: !!agentConfig.apiEndpoint,
      hasApiKey: !!agentConfig.apiKey,
      model: agentConfig.model,
    });

    const {
      systemPrompt = agentConfig.systemPrompt || "",
      timeout = this.config.defaultTimeout,
      priority = "normal",
    } = options;

    console.log(
      `[Council Generation] Prompt length: ${prompt?.length || 0}, System prompt length: ${systemPrompt?.length || 0}`,
    );

    const startTime = Date.now();
    let result = null;
    let error = null;
    let tokenEstimate = 0;

    try {
      // Determine which API to use
      if (agentConfig.useMainApi) {
        console.log(`[Council Generation] Using ST main API for ${agentId}`);
        result = await this.generateWithSTApi(prompt, systemPrompt, {
          timeout,
        });
      } else {
        console.log(`[Council Generation] Using custom API for ${agentId}`);
        result = await this.generateWithCustomApi(
          prompt,
          systemPrompt,
          agentConfig,
          { timeout },
        );
      }

      // Estimate tokens (rough: ~4 chars per token)
      tokenEstimate = Math.ceil(
        (prompt.length + systemPrompt.length + (result?.length || 0)) / 4,
      );
      console.log(
        `[Council Generation] ${agentId} generation successful, result length: ${result?.length || 0}`,
      );
    } catch (e) {
      error = e;
      console.error(
        `[Council Generation] Agent ${agentId} generation failed:`,
        e,
      );
      console.error(`[Council Generation] Error details:`, e.message, e.stack);
    }

    const duration = Date.now() - startTime;

    // Record the call in state if available
    if (this._state) {
      this._state.recordAgentCall(
        agentId,
        Math.ceil((prompt.length + systemPrompt.length) / 4),
        Math.ceil((result?.length || 0) / 4),
        duration,
        !error,
      );
    }

    if (error) {
      throw error;
    }

    return result;
  },

  /**
   * Generate using multiple agents in parallel
   */
  async generateParallel(agentTasks, options = {}) {
    const { maxConcurrent = this.config.maxConcurrent } = options;

    // Split into chunks to respect concurrency limit
    const results = [];
    for (let i = 0; i < agentTasks.length; i += maxConcurrent) {
      const chunk = agentTasks.slice(i, i + maxConcurrent);
      const chunkResults = await Promise.allSettled(
        chunk.map((task) =>
          this.generateForAgent(
            task.agentId,
            task.agentConfig,
            task.prompt,
            task.options,
          ),
        ),
      );

      for (const [idx, result] of chunkResults.entries()) {
        results.push({
          agentId: chunk[idx].agentId,
          success: result.status === "fulfilled",
          result: result.status === "fulfilled" ? result.value : null,
          error: result.status === "rejected" ? result.reason : null,
        });
      }

      // Delay between chunks
      if (i + maxConcurrent < agentTasks.length) {
        await this.delay(this.config.delayBetweenCalls);
      }
    }

    return results;
  },

  // ===== SILLYTAVERN API =====

  /**
   * Generate using SillyTavern's main API via slash command
   */
  async generateWithSTApi(prompt, systemPrompt = "", options = {}) {
    console.log(`[Council Generation] generateWithSTApi called`);
    const { timeout = this.config.defaultTimeout } = options;

    const context = this.getSTContext();
    console.log(
      `[Council Generation] ST context obtained, has executeSlashCommands: ${typeof context.executeSlashCommands === "function"}`,
    );

    if (typeof context.executeSlashCommands !== "function") {
      console.error(`[Council Generation] executeSlashCommands not available!`);
      throw new Error("SillyTavern executeSlashCommands not available");
    }

    // Build the full prompt
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    console.log(
      `[Council Generation] Full prompt length: ${fullPrompt.length}`,
    );

    // Escape special characters for slash command
    const escapedPrompt = this.escapeForSlashCommand(fullPrompt);

    // Use /genraw to generate without modifying chat
    const command = `/genraw lock=on "${escapedPrompt}"`;
    console.log(
      `[Council Generation] Executing slash command (length: ${command.length})`,
    );

    try {
      const result = await this.withTimeout(
        context.executeSlashCommands(command),
        timeout,
        "SillyTavern generation timed out",
      );

      console.log(`[Council Generation] ST API returned:`, {
        hasResult: !!result,
        hasPipe: !!result?.pipe,
        resultType: typeof result,
        pipeLength: result?.pipe?.length || 0,
      });

      // Extract result from pipe or direct return
      const extracted =
        result?.pipe || (typeof result === "string" ? result : "") || "";
      console.log(
        `[Council Generation] Extracted result length: ${extracted.length}`,
      );
      return extracted;
    } catch (stError) {
      console.error(`[Council Generation] ST API error:`, stError);
      throw stError;
    }
  },

  /**
   * Generate using SillyTavern's generateQuietPrompt (alternative method)
   */
  async generateWithSTQuiet(prompt, systemPrompt = "", options = {}) {
    const { timeout = this.config.defaultTimeout } = options;

    const context = this.getSTContext();

    if (typeof context.generateQuietPrompt !== "function") {
      // Fall back to slash command method
      return this.generateWithSTApi(prompt, systemPrompt, options);
    }

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const result = await this.withTimeout(
      context.generateQuietPrompt(fullPrompt, false, false),
      timeout,
      "SillyTavern quiet generation timed out",
    );

    return result || "";
  },

  // ===== CUSTOM API ENDPOINTS =====

  /**
   * Generate using a custom API endpoint (OpenRouter, OpenAI compatible, etc.)
   */
  async generateWithCustomApi(prompt, systemPrompt, agentConfig, options = {}) {
    console.log(`[Council Generation] generateWithCustomApi called`);
    const { timeout = this.config.defaultTimeout } = options;

    const {
      apiEndpoint,
      apiKey,
      model,
      temperature = 0.7,
      maxTokens = 1000,
      topP = 1,
      frequencyPenalty = 0,
      presencePenalty = 0,
    } = agentConfig;

    console.log(`[Council Generation] Custom API config:`, {
      endpoint: apiEndpoint,
      hasKey: !!apiKey,
      model: model,
    });

    if (!apiEndpoint) {
      console.error(`[Council Generation] No API endpoint configured`);
      throw new Error("API endpoint is required for custom API");
    }

    if (!apiKey) {
      console.error(`[Council Generation] No API key configured`);
      throw new Error("API key is required for custom API");
    }

    // Build request body (OpenAI-compatible format)
    const requestBody = {
      model: model || "gpt-3.5-turbo",
      messages: this.buildMessages(prompt, systemPrompt),
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    };

    // Add OpenRouter-specific headers if using OpenRouter
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (apiEndpoint.includes("openrouter")) {
      headers["HTTP-Referer"] =
        window?.location?.origin || "https://sillytavern.app";
      headers["X-Title"] = "The Council - SillyTavern Extension";
    }

    const response = await this.withTimeout(
      fetch(apiEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }),
      timeout,
      "Custom API request timed out",
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return this.extractResponseContent(data);
  },

  /**
   * Build messages array for chat completion API
   */
  buildMessages(prompt, systemPrompt = "") {
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content: prompt,
    });

    return messages;
  },

  /**
   * Extract content from various API response formats
   */
  extractResponseContent(data) {
    // OpenAI/OpenRouter format
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    // Alternative: direct content
    if (data.choices?.[0]?.text) {
      return data.choices[0].text;
    }

    // Anthropic format
    if (data.content?.[0]?.text) {
      return data.content[0].text;
    }

    // Fallback
    if (typeof data.response === "string") {
      return data.response;
    }

    if (typeof data.output === "string") {
      return data.output;
    }

    console.warn("[Council Generation] Unknown response format:", data);
    return "";
  },

  // ===== SPECIALIZED GENERATION METHODS =====

  /**
   * Generate with retries
   */
  async generateWithRetry(agentId, agentConfig, prompt, options = {}) {
    const {
      maxRetries = this.config.maxRetries,
      retryDelay = this.config.retryDelay,
    } = options;

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateForAgent(
          agentId,
          agentConfig,
          prompt,
          options,
        );
      } catch (e) {
        lastError = e;
        console.warn(
          `[Council Generation] Attempt ${attempt + 1} failed for ${agentId}:`,
          e.message,
        );

        if (attempt < maxRetries) {
          await this.delay(retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    throw lastError;
  },

  /**
   * Generate a consensus response (multiple agents, synthesized)
   */
  async generateConsensus(agentTasks, synthesizerConfig, prompt, options = {}) {
    // Generate individual responses
    const responses = await this.generateParallel(agentTasks, options);

    // Filter successful responses
    const successfulResponses = responses.filter((r) => r.success);

    if (successfulResponses.length === 0) {
      throw new Error("All agents failed to generate responses");
    }

    // If only one response, return it
    if (successfulResponses.length === 1) {
      return {
        consensus: successfulResponses[0].result,
        individualResponses: responses,
      };
    }

    // Build synthesis prompt
    const synthesisPrompt = `You are synthesizing multiple expert opinions into a consensus.

${prompt}

Here are the individual responses to synthesize:

${successfulResponses.map((r, i) => `### Response ${i + 1} (${r.agentId}):\n${r.result}`).join("\n\n")}

Please synthesize these into a coherent consensus that incorporates the best elements of each response while resolving any contradictions.`;

    // Generate synthesis
    const consensus = await this.generateForAgent(
      "synthesizer",
      synthesizerConfig,
      synthesisPrompt,
      options,
    );

    return {
      consensus,
      individualResponses: responses,
    };
  },

  /**
   * Generate with streaming (if supported)
   */
  async generateStream(agentId, agentConfig, prompt, onChunk, options = {}) {
    const {
      systemPrompt = agentConfig.systemPrompt || "",
      timeout = this.config.defaultTimeout,
    } = options;

    // For custom API, we can try streaming
    if (!agentConfig.useMainApi && agentConfig.apiEndpoint) {
      return this.streamFromCustomApi(
        prompt,
        systemPrompt,
        agentConfig,
        onChunk,
        { timeout },
      );
    }

    // Fallback to non-streaming
    const result = await this.generateForAgent(
      agentId,
      agentConfig,
      prompt,
      options,
    );
    onChunk(result, true);
    return result;
  },

  /**
   * Stream from custom API endpoint
   */
  async streamFromCustomApi(
    prompt,
    systemPrompt,
    agentConfig,
    onChunk,
    options = {},
  ) {
    const { timeout = this.config.defaultTimeout } = options;

    const {
      apiEndpoint,
      apiKey,
      model,
      temperature = 0.7,
      maxTokens = 1000,
    } = agentConfig;

    const requestBody = {
      model: model || "gpt-3.5-turbo",
      messages: this.buildMessages(prompt, systemPrompt),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split("\n")
          .filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              onChunk(content, false);
            }
          } catch (e) {
            // Skip malformed chunks
          }
        }
      }

      onChunk("", true);
      return fullResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // ===== QUEUE MANAGEMENT =====

  /**
   * Add request to queue
   */
  enqueue(task) {
    return new Promise((resolve, reject) => {
      this._queue.push({
        ...task,
        resolve,
        reject,
      });
      this.processQueue();
    });
  },

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this._isProcessingQueue) return;
    this._isProcessingQueue = true;

    while (
      this._queue.length > 0 &&
      this._activeRequests < this.config.maxConcurrent
    ) {
      const task = this._queue.shift();
      this._activeRequests++;

      this.generateForAgent(
        task.agentId,
        task.agentConfig,
        task.prompt,
        task.options,
      )
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this._activeRequests--;
          this.processQueue();
        });

      await this.delay(this.config.delayBetweenCalls);
    }

    this._isProcessingQueue = false;
  },

  // ===== UTILITY METHODS =====

  /**
   * Get SillyTavern context
   */
  getSTContext() {
    if (typeof SillyTavern !== "undefined" && SillyTavern.getContext) {
      return SillyTavern.getContext();
    }
    throw new Error("SillyTavern context not available");
  },

  /**
   * Escape string for slash command
   */
  escapeForSlashCommand(str) {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
  },

  /**
   * Promise with timeout
   */
  withTimeout(promise, ms, errorMsg) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(errorMsg)), ms),
      ),
    ]);
  },

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Estimate tokens for a string
   */
  estimateTokens(text) {
    if (!text) return 0;
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  },

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queued: this._queue.length,
      active: this._activeRequests,
      maxConcurrent: this.config.maxConcurrent,
    };
  },

  /**
   * Clear queue
   */
  clearQueue() {
    for (const task of this._queue) {
      task.reject(new Error("Queue cleared"));
    }
    this._queue = [];
  },
};

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilGeneration = CouncilGeneration;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilGeneration;
}
