/**
 * Component Library Registry
 *
 * A global registry for pluggable UI component libraries (Carbon, Material, etc.).
 * This registry provides a clean separation between library registration (app startup)
 * and library usage (panel rendering).
 *
 * Design Philosophy:
 * - Panels use libraries without needing references to Conductor or View
 * - Registration happens once at app initialization
 * - Each library gets its own isolated import cache
 * - Libraries are identified by simple string names
 *
 * @example
 * // At app startup (once):
 * ComponentLibraryRegistry.register('carbon', {
 *   render: async function(panel, cache) { ... }
 * });
 *
 * // In Panel (many times):
 * if (ComponentLibraryRegistry.has('carbon')) {
 *   const lib = ComponentLibraryRegistry.get('carbon');
 *   await lib.render.call(this, panel, lib.cache);
 * }
 */
export class ComponentLibraryRegistry {
  /**
   * Internal storage for registered component libraries.
   * @type {Map<string, {render: Function, cache: Map, config: Object}>}
   * @private
   */
  static #libraries = new Map();

  /**
   * Registers a pluggable component library.
   *
   * @param {string} name - Library identifier (e.g., 'carbon', 'material')
   * @param {Object} library - Library configuration object
   * @param {Function} library.render - Main render function: async function(panel, cache)
   * @param {Function} [library.dispose] - Optional cleanup function: function(element)
   * @param {Object} [library.config] - Optional library-specific configuration
   *
   * @throws {Error} If library doesn't provide a render function
   *
   * @example
   * ComponentLibraryRegistry.register('carbon', {
   *   render: async function(panel, cache) {
   *     // Scan, load, and attach components
   *   },
   *   dispose: function(element) {
   *     // Optional cleanup logic
   *   },
   *   config: { version: '2.0' }
   * });
   */
  static register(name, library) {
    if (!library.render) {
      throw new Error(`Component library '${name}' must provide a render function`);
    }

    this.#libraries.set(name, {
      ...library, // Preserve all library properties (utils, helpers, etc.)
      dispose: library.dispose || null, // Optional disposal function
      cache: new Map(), // Each library gets its own import cache
      config: library.config || {}
    });

    console.debug(`[ComponentLibraryRegistry] Registered: ${name}`);
  }

  /**
   * Gets a registered component library by name.
   *
   * @param {string} name - Library identifier
   * @returns {Object} Library object with render, cache, config
   * @throws {Error} If library is not registered
   */
  static get(name) {
    if (!this.#libraries.has(name)) {
      const available = Array.from(this.#libraries.keys()).join(', ');
      throw new Error(
        `Component library '${name}' is not registered. Available: ${available || 'none'}`
      );
    }
    return this.#libraries.get(name);
  }

  /**
   * Checks if a component library is registered.
   *
   * @param {string} name - Library identifier
   * @returns {boolean} True if registered
   */
  static has(name) {
    return this.#libraries.has(name);
  }

  /**
   * Gets all registered library names.
   *
   * @returns {string[]} Array of registered library names
   */
  static getRegisteredLibraries() {
    return Array.from(this.#libraries.keys());
  }

  /**
   * Gets cache statistics for all registered component libraries.
   * Useful for debugging and monitoring.
   *
   * @returns {Object} Map of library name → cache stats
   */
  static getCacheStats() {
    const stats = {};
    for (const [name, library] of this.#libraries.entries()) {
      stats[name] = {
        cacheSize: library.cache.size,
        config: library.config
      };
    }
    return stats;
  }

  /**
   * Clears import caches for all component libraries.
   * Useful for development/hot-reload scenarios.
   */
  static clearAllCaches() {
    for (const [name, library] of this.#libraries.entries()) {
      library.cache.clear();
      console.debug(`[ComponentLibraryRegistry] Cleared cache for: ${name}`);
    }
  }

  /**
   * Clears cache for a specific library.
   *
   * @param {string} name - Library identifier
   * @throws {Error} If library is not registered
   */
  static clearCache(name) {
    const library = this.get(name); // Throws if not found
    library.cache.clear();
    console.debug(`[ComponentLibraryRegistry] Cleared cache for: ${name}`);
  }

  /**
   * Unregisters a component library (primarily for testing).
   *
   * @param {string} name - Library identifier
   * @returns {boolean} True if library was unregistered, false if not found
   */
  static unregister(name) {
    return this.#libraries.delete(name);
  }

  /**
   * Unregisters all component libraries (primarily for testing).
   */
  static unregisterAll() {
    this.#libraries.clear();
  }
}
