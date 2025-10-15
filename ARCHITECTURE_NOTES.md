# Zooy Component Library Architecture - Migration Notes

**Date**: 2025-10-16
**Status**: IN PROGRESS - Testing phase

---

## Project Goal: Pluggable Component Library System

### Vision
Transform zooy from an MDC-only framework to a **component-library-agnostic** framework that can support multiple UI component libraries (MDC, Carbon Design System, custom components) simultaneously.

### End Goal
- ✅ Support **multiple component libraries** in the same application
- ✅ **Lazy-load** component libraries on demand (reduce initial bundle size)
- ✅ Allow **selective migration** from MDC to Carbon (or any other library)
- ✅ Maintain **backward compatibility** with existing MDC-based applications
- ✅ Clean separation of concerns (framework vs. component libraries)

---

## What We're Building

### ComponentLibraryRegistry System
**File**: `/home/gumm/Workspace/zooy/src/ui/component-library-registry.js`

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

## Architecture Changes

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

## Key Files and Their Roles

### Core Framework Files

#### `/src/ui/component-library-registry.js`
**Purpose**: Central registry for component libraries

**Exports**:
- `ComponentLibraryRegistry` class (static methods)

**Methods**:
- `register(name, config)` - Register a library
- `get(name)` - Get library configuration
- `has(name)` - Check if library is registered
- `getRegisteredLibraries()` - Get all library names
- `clearCache(name)` - Clear import cache for a library

#### `/src/ui/panel.js`
**Purpose**: Panel component (now library-agnostic)

**Key changes**:
- `parseContent()` now iterates over registered libraries
- No MDC-specific code
- Delegates rendering to ComponentLibraryRegistry

#### `/src/main.js`
**Purpose**: Main zooy export with lazy-loading functions

**Key exports**:
```javascript
export default {
  // Core framework
  EVT, Component, Dragger, Panel, FormPanel, Split, View, Conductor,
  UserManager, UiEventType, domUtils, uriUtils,

  // Component library system
  ComponentLibraryRegistry,
  registerCarbonLibrary,  // async function (dynamic import)
  registerMdcLibrary,     // async function (dynamic import)

  // Carbon utilities (for convenience)
  icons, loadCarbonIcons
};
```

---

### MDC Library Files (Extracted)

#### `/src/ui/mdc/register.js`
**Purpose**: MDC library registration module (lazy-loaded)

**Exports**:
- `registerMdcLibrary()` - Registers MDC with ComponentLibraryRegistry

**What it does**:
```javascript
export function registerMdcLibrary() {
  ComponentLibraryRegistry.register('mdc', {
    render: function(panel, _cache) {
      // All the MDC rendering logic that was in Panel.parseContent()
      renderButtons(panel);
      renderCheckBoxes(panel);
      renderTrees(panel);
      // ... etc
    },
    config: { version: '14.0', description: 'Material Design Components' }
  });

  console.debug('[Zooy] MDC library registered');
}
```

#### `/src/ui/mdc/tree-utils.js`
**Purpose**: MDC tree utilities (extracted from Panel)

**Exports**:
- `listElements(panel)` - Get all MDC list elements
- `attachTreeComponent(list)` - Attach tree behavior
- `handleTreeItemClick(evt)` - Tree interaction handler
- `collapseTreeLeaf(el)` - Collapse tree node
- `getListItemByIndex(list, index)` - Get tree item

**Critical**: These were previously inline in `Panel.parseContent()`. Now separate, reusable module.

#### `/src/ui/mdc/renderers.js` (if exists)
**Purpose**: MDC component rendering functions

Contains functions like:
- `renderButtons(panel)`
- `renderCheckBoxes(panel)`
- `renderDataTables(panel)`
- etc.

---

### Carbon Library Files (New)

#### `/src/ui/carbon/register.js`
**Purpose**: Carbon Design System registration module (lazy-loaded)

**Exports**:
- `registerCarbonLibrary()` - Registers Carbon with ComponentLibraryRegistry

**What it does**:
```javascript
export function registerCarbonLibrary() {
  ComponentLibraryRegistry.register('carbon', {
    render: async function(panel, cache) {
      // Scan for Carbon components, dynamically import them
      await renderCarbonComponents.call(this, panel, cache);
      await loadCarbonIcons();
    },
    dispose: function(element) {
      // Carbon Web Components auto-cleanup via disconnectedCallback()
    },
    config: { version: '2.0', description: 'IBM Carbon Design System Web Components' }
  });

  console.debug('[Zooy] Carbon Design System library registered');
}
```

#### `/src/ui/carbon/renderers.js`
**Purpose**: Carbon component dynamic loading

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

#### `/src/ui/carbon/icons.js`
**Purpose**: Carbon icon sprite management

**Exports**:
- `loadCarbonIcons()` - Load icon sprite SVG

#### `/src/ui/carbon/icons-api.js`
**Purpose**: Programmatic icon usage (for JS-generated content)

**Exports**:
- `makeIconElement(name, size)` - Create icon placeholders
- `makeIconElementAsync(name, size)` - Dynamic import icons

---

## How It Works: Lazy Loading Flow

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
**File**: `/home/gumm/Workspace/zooy/rollup.config.js`

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

### Why This Matters
- **Initial bundle**: Only ~50KB (framework core)
- **MDC loaded**: When `registerMdcLibrary()` called (+240KB)
- **Carbon loaded**: When `registerCarbonLibrary()` called (+19KB)
- **Carbon components**: Loaded individually as panels use them

---

## Migration Strategy: MDC → Carbon

### Phase 1: Coexistence (Current)
- Both MDC and Carbon registered
- Existing panels use MDC (no changes needed)
- New panels can use Carbon components
- **Status**: IN PROGRESS - Testing MDC still works

### Phase 2: Selective Replacement
- Replace individual MDC components with Carbon equivalents
- Example: Replace MDC buttons with Carbon buttons in specific panels
- Test thoroughly before moving to next component

### Phase 3: Full Migration (Future)
- All panels using Carbon
- Remove MDC registration from apps
- MDC code no longer bundled
- **Result**: Smaller bundle, modern components

---

## Current Status & Testing

### What's Done ✅
- ComponentLibraryRegistry implemented
- MDC extracted into register.js + tree-utils.js
- Carbon registration module created
- Dynamic import lazy-loading working
- Production bundle builds successfully

### What's Being Tested 🧪
- **MDC functionality** in production app (z2)
- Tree utilities work correctly
- All MDC components still render/function
- No regressions from architectural changes

### What's Next 📋
1. Verify all MDC components work (trees, buttons, tables, etc.)
2. Test production bundle thoroughly
3. Document Carbon component usage patterns
4. Begin selective Carbon integration in z2
5. Create migration guide for other apps

---

## Critical Considerations

### Tree Utilities (IMPORTANT!)
**Why critical**: Trees are complex, stateful MDC components used heavily in production

**What changed**:
- Moved from `Panel.parseContent()` to `/src/ui/mdc/tree-utils.js`
- Now imported by MDC registration module
- Must be available when panels with trees render

**Potential issues**:
- Tree functions undefined (timing)
- Tree state not preserved
- Expand/collapse broken

### Import Caching
**Why needed**: Carbon components use dynamic imports

**How it works**:
```javascript
const library = ComponentLibraryRegistry.get('carbon');
const cache = library.cache;  // Map of component name → Promise

if (!cache.has('button')) {
  cache.set('button', import('@carbon/web-components/.../button'));
}
await cache.get('button');
```

**Benefit**: Multiple panels with same component don't re-import

### Dispose/Cleanup
**MDC**: Components need manual cleanup (event listeners, etc.)
**Carbon**: Web Components auto-cleanup via `disconnectedCallback()`

Both handled in respective `dispose()` functions.

---

## API for App Developers

### Registering Libraries (in app entry point)
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

### Using MDC Components (unchanged)
```html
<!-- Panel template with MDC components -->
<button class="mdc-button">
  <span class="mdc-button__label">Click Me</span>
</button>

<ul class="mdc-list mdc-tree">
  <li class="mdc-list-item">Item 1</li>
</ul>
```

### Using Carbon Components (new)
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

## Debugging Tips

### Check if libraries are registered
```javascript
console.log(zooy.ComponentLibraryRegistry.getRegisteredLibraries());
// Should show: ['carbon', 'mdc']
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

## File Structure Summary

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
└── package.json                          # Version: managed here
```

---

## Success Criteria

Before considering this migration complete:

- ✅ All existing MDC components work in z2 (production app)
- ✅ Tree utilities function correctly
- ✅ No performance regressions
- ✅ Production bundle size acceptable
- ✅ Development mode and production mode both work
- ✅ Carbon components can be added without breaking MDC
- ✅ Multiple apps can use this architecture
- ✅ Documentation complete

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

---

**Last Updated**: 2025-10-16
**Status**: Testing MDC compatibility after architectural changes
**Next Milestone**: All MDC tests passing, begin Carbon integration
