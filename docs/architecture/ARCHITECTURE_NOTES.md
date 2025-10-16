# Zooy Component Library Architecture

## Overview

Zooy is a **component-library-agnostic** UI framework that supports multiple UI component libraries (MDC, Carbon Design System, custom components) simultaneously through a pluggable architecture.

## Goals

- ✅ Support **multiple component libraries** in the same application
- ✅ **Lazy-load** component libraries on demand (reduce initial bundle size)
- ✅ Allow **selective migration** between component libraries
- ✅ Maintain **backward compatibility** with existing applications
- ✅ Clean separation of concerns (framework vs. component libraries)

---

## ComponentLibraryRegistry System

**File**: `src/ui/component-library-registry.js`

A central registry that:
1. Allows component libraries to register themselves
2. Provides lifecycle hooks (render, dispose)
3. Manages import caching for dynamic component loading
4. Enables multiple libraries to coexist without conflict

**API**:
```javascript
// Register a library
ComponentLibraryRegistry.register('library-name', {
  render: async function(panel, cache) { /* ... */ },
  dispose: function(element) { /* ... */ },
  config: { version: '1.0', description: '...' }
});

// Use in Panel
const library = ComponentLibraryRegistry.get('mdc');
await library.render(panelElement, library.cache);
```

---

## Architecture

### Before (MDC-only, tightly coupled)

**Problems**:
- MDC code hardcoded in `Panel.parseContent()`
- Tree utilities mixed into panel logic
- No way to add other component libraries
- Large initial bundle (all MDC code loaded upfront)

```javascript
// OLD: Panel.parseContent() had all MDC logic inline
parseContent() {
  // MDC buttons
  renderButtons(this.getElement());
  // MDC trees
  const listElements = this.getElement().querySelectorAll('.mdc-list');
  // ... hundreds of lines of MDC-specific code
}
```

### After (Pluggable, library-agnostic)

**Benefits**:
- Component libraries are plugins
- Lazy-loaded via dynamic imports
- Panel doesn't know about specific libraries
- Easy to add new libraries (Carbon, Shoelace, etc.)

```javascript
// NEW: Panel.parseContent() delegates to registered libraries
async parseContent() {
  for (const libraryName of ComponentLibraryRegistry.getRegisteredLibraries()) {
    const library = ComponentLibraryRegistry.get(libraryName);
    await library.render(this.getElement(), library.cache);
  }
}
```

---

## Core Files

### Framework Core

#### `src/ui/component-library-registry.js`
Central registry for component libraries.

**Methods**:
- `register(name, config)` - Register a library
- `get(name)` - Get library configuration
- `has(name)` - Check if library is registered
- `getRegisteredLibraries()` - Get all library names
- `clearCache(name)` - Clear import cache for a library

#### `src/ui/panel.js`
Panel component (library-agnostic).

**Key changes**:
- `parseContent()` iterates over registered libraries
- No component library-specific code
- Delegates rendering to ComponentLibraryRegistry

#### `src/main.js`
Main zooy export with lazy-loading functions.

**Exports**:
```javascript
export default {
  // Core framework
  EVT, Component, Dragger, Panel, FormPanel, Split, View, Conductor,
  UserManager, UiEventType, domUtils, uriUtils,

  // Component library system
  ComponentLibraryRegistry,
  registerCarbonLibrary,  // async function (dynamic import)
  registerMdcLibrary,     // async function (dynamic import)

  // Carbon utilities
  icons, loadCarbonIcons
};
```

---

### MDC Library Files

#### `src/ui/mdc/register.js`
MDC library registration module (lazy-loaded).

```javascript
export function registerMdcLibrary() {
  ComponentLibraryRegistry.register('mdc', {
    render: function(panel, _cache) {
      // All the MDC rendering logic
      renderButtons(panel);
      renderCheckBoxes(panel);
      renderTrees(panel);
      // ... etc
    },
    config: { version: '14.0', description: 'Material Design Components' }
  });
}
```

#### `src/ui/mdc/tree-utils.js`
MDC tree utilities (extracted from Panel).

**Exports**:
- `listElements(panel)` - Get all MDC list elements
- `attachTreeComponent(list)` - Attach tree behavior
- `handleTreeItemClick(evt)` - Tree interaction handler
- `collapseTreeLeaf(el)` - Collapse tree node
- `getListItemByIndex(list, index)` - Get tree item

---

### Carbon Library Files

#### `src/ui/carbon/register.js`
Carbon Design System registration module (lazy-loaded).

```javascript
export function registerCarbonLibrary() {
  ComponentLibraryRegistry.register('carbon', {
    render: async function(panel, cache) {
      await renderCarbonComponents.call(this, panel, cache);
      await loadCarbonIcons();
    },
    dispose: function(element) {
      // Carbon Web Components auto-cleanup via disconnectedCallback()
    },
    config: { version: '2.0', description: 'IBM Carbon Design System Web Components' }
  });
}
```

#### `src/ui/carbon/renderers.js`
Carbon component dynamic loading.

**Key function**: `renderCarbonComponents(panel, cache)`
- Scans panel for `data-carbon-component` attributes
- Groups by component type
- Dynamically imports only the needed components
- Attaches components to DOM

**Example**:
```javascript
// Finds: <div data-carbon-component="button"></div>
// Imports: import('@carbon/web-components/es/components/button/index.js')
// Caches: So subsequent panels don't re-import
```

#### `src/ui/carbon/icons.js`
Carbon icon sprite management.

**Exports**:
- `loadCarbonIcons()` - Load icon sprite SVG

#### `src/ui/carbon/icons-api.js`
Programmatic icon usage (for JS-generated content).

**Exports**:
- `makeIconElement(name, size)` - Create icon placeholders
- `makeIconElementAsync(name, size)` - Dynamic import icons

---

## Lazy Loading Flow

### Application Startup

1. **App imports zooy** (main bundle)
   ```javascript
   import zooy from 'zooy/main.js';
   ```

2. **App registers libraries** (async, inside entryFunc)
   ```javascript
   const entryFunc = async (user) => {
     await zooy.registerCarbonLibrary();  // Dynamic import
     await zooy.registerMdcLibrary();     // Dynamic import
     // ... rest of app
   };
   ```

3. **Dynamic imports load registration modules**
   ```javascript
   // In zooy/src/main.js
   async function registerMdcLibrary() {
     const { registerMdcLibrary: register } = await import('./ui/mdc/register.js');
     return register();
   }
   ```

4. **Registration modules register with ComponentLibraryRegistry**
   ```javascript
   // In zooy/src/ui/mdc/register.js
   ComponentLibraryRegistry.register('mdc', { render, config });
   ```

### Panel Rendering

1. **Panel enters document**
   ```javascript
   panel.parseContent();
   ```

2. **Panel delegates to all registered libraries**
   ```javascript
   for (const libName of ComponentLibraryRegistry.getRegisteredLibraries()) {
     const lib = ComponentLibraryRegistry.get(libName);
     await lib.render(this.getElement(), lib.cache);
   }
   ```

3. **Each library renders its components**
   - MDC: Initializes MDC components (buttons, trees, etc.)
   - Carbon: Dynamically imports needed components

---

## Bundling Strategy

### Rollup Configuration
**File**: `rollup.config.js`

```javascript
{
  input: 'src/main.js',
  output: {
    dir: '.',
    entryFileNames: 'main.js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    format: 'es',
  },
  // Rollup automatically code-splits dynamic imports
}
```

### Generated Chunks
```
zooy/
├── main.js                         # Main export (small)
└── chunks/
    ├── main-[hash].js              # Core framework code
    ├── register-[hash].js          # MDC registration (large ~240KB)
    ├── register-[hash].js          # Carbon registration (small ~19KB)
    └── [component]-[hash].js       # Individual Carbon components
```

### Bundle Sizes
- **Initial bundle**: Only ~50KB (framework core)
- **MDC loaded**: When `registerMdcLibrary()` called (+240KB)
- **Carbon loaded**: When `registerCarbonLibrary()` called (+19KB)
- **Carbon components**: Loaded individually as panels use them

---

## Migration Strategy: MDC → Carbon

### Phase 1: Coexistence
- Both MDC and Carbon registered
- Existing panels use MDC (no changes needed)
- New panels can use Carbon components

### Phase 2: Selective Replacement
- Replace individual MDC components with Carbon equivalents
- Example: Replace MDC buttons with Carbon buttons in specific panels
- Test thoroughly before moving to next component

### Phase 3: Full Migration
- All panels using Carbon
- Remove MDC registration from apps
- MDC code no longer bundled
- **Result**: Smaller bundle, modern components

---

## API for App Developers

### Registering Libraries
```javascript
import zooy from 'zooy/main.js';

const entryFunc = async (user) => {
  // Register component libraries before rendering
  await zooy.registerMdcLibrary();
  await zooy.registerCarbonLibrary();

  // Now safe to render views/panels
  const view = new MyView();
  view.render();
};
```

### Using MDC Components
```html
<!-- Panel template with MDC components -->
<button class="mdc-button">
  <span class="mdc-button__label">Click Me</span>
</button>

<ul class="mdc-list mdc-tree">
  <li class="mdc-list-item">Item 1</li>
</ul>
```

### Using Carbon Components
```html
<!-- Panel template with Carbon components -->
<div data-carbon-component="button">
  <cds-button>Click Me</cds-button>
</div>

<div data-carbon-component="accordion">
  <cds-accordion>
    <cds-accordion-item title="Section 1">Content</cds-accordion-item>
  </cds-accordion>
</div>
```

**Note**: `data-carbon-component` attribute tells renderer which component to import.

---

## Debugging

### Check registered libraries
```javascript
console.log(zooy.ComponentLibraryRegistry.getRegisteredLibraries());
// Shows: ['carbon', 'mdc']
```

### Check cache stats
```javascript
console.log(zooy.ComponentLibraryRegistry.getCacheStats());
// Shows import cache size for each library
```

### Force cache clear
```javascript
zooy.ComponentLibraryRegistry.clearCache('carbon');
```

---

## Critical Considerations

### Import Caching
Carbon components use dynamic imports with caching to avoid re-importing:

```javascript
const library = ComponentLibraryRegistry.get('carbon');
const cache = library.cache;  // Map of component name → Promise

if (!cache.has('button')) {
  cache.set('button', import('@carbon/web-components/.../button'));
}
await cache.get('button');
```

**Benefit**: Multiple panels with same component don't re-import.

### Dispose/Cleanup
- **MDC**: Components need manual cleanup (event listeners, etc.)
- **Carbon**: Web Components auto-cleanup via `disconnectedCallback()`

Both handled in respective `dispose()` functions.

---

## File Structure

```
zooy/
├── src/
│   ├── main.js                           # Main export + lazy-load functions
│   ├── ui/
│   │   ├── component-library-registry.js # Core registry system
│   │   ├── panel.js                      # Library-agnostic panel
│   │   ├── component.js                  # Base component class
│   │   ├── view.js                       # View class
│   │   ├── split.js                      # Split pane component
│   │   ├── conductor.js                  # App conductor
│   │   ├── mdc/
│   │   │   ├── register.js               # MDC registration (lazy-loaded)
│   │   │   ├── tree-utils.js             # MDC tree utilities
│   │   │   └── renderers.js              # MDC rendering functions
│   │   └── carbon/
│   │       ├── register.js               # Carbon registration (lazy-loaded)
│   │       ├── renderers.js              # Carbon dynamic loading
│   │       ├── icons.js                  # Carbon icon sprites
│   │       └── icons-api.js              # Programmatic icon API
│   ├── dom/
│   │   └── utils.js                      # DOM utilities
│   └── user/
│       └── usermanager.js                # User management
├── chunks/                               # Rollup-generated chunks
│   ├── main-[hash].js                    # Main framework chunk
│   ├── register-[hash].js                # MDC registration chunk
│   ├── register-[hash].js                # Carbon registration chunk
│   └── [component]-[hash].js             # Carbon component chunks
├── main.js                               # Entry point (re-exports chunks/main-*.js)
├── rollup.config.js                      # Build configuration
└── package.json                          # Dependencies and version
```

---

## Future Enhancements

### Potential Improvements
1. **Plugin system**: Allow third-party libraries to register
2. **Conditional loading**: Only load libraries used in current view
3. **Preloading**: Prefetch likely-needed components
4. **SSR support**: Server-side rendering for initial load
5. **Type definitions**: TypeScript support for better DX

### Other Libraries to Consider
- **Shoelace**: Modern, lightweight web components
- **Lit**: Fast, small web component library
- **Custom**: Build zooy-native components
