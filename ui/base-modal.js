/**
 * TheCouncil - Base Modal
 *
 * Factory function for creating consistent modal behavior across all Council modals.
 * Provides standard features:
 * - Open/close animations
 * - Escape key handling
 * - Click-outside-to-close option
 * - Visibility state management
 * - Event emission
 *
 * @version 2.0.0
 */

/**
 * Create a base modal with standard behavior
 * @param {Object} options - Configuration options
 * @param {string} options.name - Modal name/ID
 * @param {string} options.className - CSS class for the modal container (default: 'council-base-modal')
 * @param {boolean} options.closeOnEscape - Close on Escape key (default: true)
 * @param {boolean} options.closeOnBackdrop - Close on backdrop click (default: true)
 * @param {Function} options.onShow - Callback when modal is shown
 * @param {Function} options.onHide - Callback when modal is hidden
 * @param {Function} options.onCreate - Callback when DOM is created
 * @param {Object} options.kernel - Kernel reference (optional)
 * @returns {Object} Modal instance
 */
function createBaseModal(options = {}) {
  const {
    name = "unnamed-modal",
    className = "council-base-modal",
    closeOnEscape = true,
    closeOnBackdrop = true,
    onShow = null,
    onHide = null,
    onCreate = null,
    kernel = null
  } = options;

  // ===== STATE =====

  let _isVisible = false;
  let _container = null;
  let _cleanupFns = [];
  let _logger = kernel?.getModule?.("logger") || null;

  // ===== LOGGING =====

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {...*} args - Arguments
   */
  function _log(level, ...args) {
    if (_logger) {
      _logger.log(level, `[${name}]`, ...args);
    } else if (level !== "debug") {
      const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
      console[method](`[${name}]`, ...args);
    }
  }

  // ===== DOM CREATION =====

  /**
   * Create the modal DOM structure
   * @returns {HTMLElement} Modal container element
   */
  function createDOM() {
    const container = document.createElement("div");
    container.className = `${className} council-modal-base`;
    container.setAttribute("role", "dialog");
    container.setAttribute("aria-modal", "true");
    container.setAttribute("aria-hidden", "true");
    container.style.display = "none";

    // Inject base styles if not present
    _injectBaseStyles();

    // Call onCreate callback to let implementer build content
    if (onCreate && typeof onCreate === "function") {
      const content = onCreate(container);
      if (content) {
        if (typeof content === "string") {
          container.innerHTML = content;
        } else if (content instanceof HTMLElement) {
          container.appendChild(content);
        }
      }
    }

    // Append to body
    document.body.appendChild(container);

    _log("debug", "Modal DOM created");

    return container;
  }

  /**
   * Inject base modal styles
   */
  function _injectBaseStyles() {
    if (document.getElementById("council-base-modal-styles")) return;

    const style = document.createElement("style");
    style.id = "council-base-modal-styles";
    style.textContent = `
      .council-modal-base {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }

      .council-modal-base.visible {
        opacity: 1;
        visibility: visible;
      }

      .council-modal-base[aria-hidden="true"] {
        pointer-events: none;
      }

      .council-modal-base[aria-hidden="false"] {
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle escape key press
   * @param {KeyboardEvent} e - Keyboard event
   */
  function _handleEscapeKey(e) {
    if (closeOnEscape && e.key === "Escape" && _isVisible) {
      e.preventDefault();
      hide();
    }
  }

  /**
   * Handle backdrop click
   * @param {MouseEvent} e - Mouse event
   */
  function _handleBackdropClick(e) {
    if (closeOnBackdrop && e.target === _container && _isVisible) {
      hide();
    }
  }

  // ===== PUBLIC API =====

  /**
   * Show the modal
   * @param {Object} showOptions - Options for showing
   */
  function show(showOptions = {}) {
    if (!_container) {
      _container = createDOM();

      // Bind event listeners
      if (closeOnEscape) {
        document.addEventListener("keydown", _handleEscapeKey);
        _cleanupFns.push(() => document.removeEventListener("keydown", _handleEscapeKey));
      }

      if (closeOnBackdrop) {
        _container.addEventListener("click", _handleBackdropClick);
        _cleanupFns.push(() => _container.removeEventListener("click", _handleBackdropClick));
      }
    }

    _isVisible = true;
    _container.style.display = "block";
    _container.setAttribute("aria-hidden", "false");

    // Trigger animation
    setTimeout(() => {
      _container.classList.add("visible");
    }, 10);

    // Call onShow callback
    if (onShow && typeof onShow === "function") {
      try {
        onShow(showOptions);
      } catch (error) {
        _log("error", "onShow callback error:", error);
      }
    }

    // Emit event if kernel available
    if (kernel) {
      kernel.emit(`${name}:shown`, showOptions);
    }

    _log("debug", "Modal shown");
  }

  /**
   * Hide the modal
   */
  function hide() {
    if (!_isVisible || !_container) return;

    _isVisible = false;
    _container.classList.remove("visible");
    _container.setAttribute("aria-hidden", "true");

    // Wait for animation to complete
    setTimeout(() => {
      if (_container && !_isVisible) {
        _container.style.display = "none";
      }
    }, 200);

    // Call onHide callback
    if (onHide && typeof onHide === "function") {
      try {
        onHide();
      } catch (error) {
        _log("error", "onHide callback error:", error);
      }
    }

    // Emit event if kernel available
    if (kernel) {
      kernel.emit(`${name}:hidden`, {});
    }

    _log("debug", "Modal hidden");
  }

  /**
   * Toggle modal visibility
   * @param {Object} showOptions - Options for showing (if toggling to visible)
   */
  function toggle(showOptions = {}) {
    if (_isVisible) {
      hide();
    } else {
      show(showOptions);
    }
  }

  /**
   * Check if modal is visible
   * @returns {boolean}
   */
  function isVisible() {
    return _isVisible;
  }

  /**
   * Get the modal container element
   * @returns {HTMLElement|null}
   */
  function getContainer() {
    return _container;
  }

  /**
   * Destroy the modal and clean up
   */
  function destroy() {
    // Hide first
    if (_isVisible) {
      hide();
    }

    // Wait for hide animation
    setTimeout(() => {
      // Run cleanup functions
      for (const cleanup of _cleanupFns) {
        try {
          cleanup();
        } catch (e) {
          _log("error", "Cleanup error:", e);
        }
      }
      _cleanupFns = [];

      // Remove DOM element
      if (_container) {
        _container.remove();
        _container = null;
      }

      _log("debug", "Modal destroyed");

      // Emit event if kernel available
      if (kernel) {
        kernel.emit(`${name}:destroyed`, {});
      }
    }, 250);
  }

  /**
   * Update modal content
   * @param {string|HTMLElement} content - New content
   */
  function updateContent(content) {
    if (!_container) {
      _log("warn", "Cannot update content: modal not created");
      return;
    }

    if (typeof content === "string") {
      _container.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      _container.innerHTML = "";
      _container.appendChild(content);
    }

    _log("debug", "Modal content updated");
  }

  /**
   * Add a cleanup function
   * @param {Function} fn - Cleanup function
   */
  function addCleanup(fn) {
    if (typeof fn === "function") {
      _cleanupFns.push(fn);
    }
  }

  // ===== RETURN PUBLIC API =====

  return {
    // Core methods (required for Kernel registration)
    show,
    hide,
    toggle,
    isVisible,

    // Utility methods
    getContainer,
    destroy,
    updateContent,
    addCleanup,

    // Properties
    name,
    get visible() {
      return _isVisible;
    }
  };
}

// ===== EXPORT =====

// Export for different environments
if (typeof window !== "undefined") {
  window.createBaseModal = createBaseModal;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createBaseModal };
}
