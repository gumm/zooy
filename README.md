# Zooy

A lightweight, event-driven JavaScript UI framework for building complex, interactive web applications. Zooy provides a component-based architecture with lifecycle management, declarative event handling, and powerful layout primitives.

## Why "zooy"?

Originally developed for **ThingZoo** (now marketed as **Connect**), an IoT platform designed to manage a "menagerie" of connected devices from around the world.

The UI framework evolved from:
- **zoo-ui** → The UI library for managing things
- **zoo-youeye** → Phonetic play on pronunciation
- **zooy** → Final form

The name reflects the framework's core purpose: orchestrating diverse UI components (panels, views, splits) and managing different component libraries (MDC, Carbon, custom) — just as a zoo manages diverse creatures.

## Overview

Zooy is a UI framework that emphasizes:
- **Component lifecycle management** - Automatic cleanup of event listeners and resources
- **Event-driven architecture** - Components communicate through a standardized event system
- **Declarative UI patterns** - HTML-driven component initialization and interaction
- **Progressive enhancement** - Works with server-rendered HTML
- **Pluggable component libraries** - Support for multiple UI libraries (MDC, Carbon Design System, custom components)
- **Lazy loading** - Dynamic imports reduce initial bundle size

## Architecture

### Core Hierarchy

```
EVT (Event Target)
 └─ Component
     ├─ Panel
     │   └─ FormPanel
     ├─ Dragger
     └─ Split

EVT
 ├─ View
 └─ Conductor

ComponentLibraryRegistry (Static)
 ├─ MDC Library (Material Design Components)
 └─ Carbon Library (IBM Carbon Design System)
```

### Key Concepts

#### **EVT** - Event System Foundation
Base class that extends `EventTarget` with enhanced listener management:
- Automatic listener cleanup on disposal
- Observer pattern for managing component relationships
- Interval tracking with automatic cleanup
- Debug mode for development

#### **Component** - UI Building Block
Base class for all visual components:
- DOM lifecycle management (create, render, enter/exit document)
- Parent-child component hierarchy
- Target-based rendering (components can render into any container)
- Model binding for data association
- Placeholder DOM for async loading states
- Out-of-tree element management (for portals/hoisted elements)

#### **Panel** - Content Container
Specialized component for dynamic content:
- URI-based content fetching and rendering
- Query parameter management
- Server-side HTML template rendering
- Script and module evaluation
- Form interception and AJAX submission
- Component library auto-initialization (pluggable)
- Async content population with intervals
- Partial DOM replacement for live updates

#### **ComponentLibraryRegistry** - Pluggable UI Libraries
Central registry system for component libraries:
- Register multiple UI libraries (MDC, Carbon, custom)
- Lazy-load libraries via dynamic imports
- Automatic component initialization when panels render
- Import caching for performance
- Library-specific lifecycle hooks (render, dispose)
- No library lock-in - use what fits your needs

#### **FormPanel** - Form Management
Enhanced panel for form handling:
- HTML5 constraint validation
- Field-level error display
- Submit interception for AJAX posting
- Server response processing
- Form refresh and replacement
- Success/error callback handling

#### **View** - Panel Orchestrator
Manages multiple panels as a cohesive screen:
- Panel lifecycle management
- Event routing between panels
- Split component integration for layouts
- User context injection
- Browser history recording
- View switching coordination
- Data broadcasting to all panels
- Metadata storage for view state

#### **Conductor** - Application Controller
Top-level orchestrator for the entire application:
- View lifecycle management (one active view at a time)
- Browser history integration (back/forward navigation)
- View constructor registration
- Navigation routing
- User session management
- View transition coordination

#### **Split** - Resizable Layouts
Sophisticated layout component for dividing space:
- Horizontal (EW) and vertical (NS) orientations
- Nested splitting (recursive division)
- Draggable dividers with Dragger components
- Programmatic nest control (open, close, lock, unlock)
- Animated transitions
- State management for each nest
- Event dispatching for layout changes

#### **Dragger** - Drag Functionality
Component for creating draggable elements:
- Constrained movement (X, Y, or both)
- Touch and mouse event support
- Drag start/move/end events with delta tracking
- Lock/unlock state management
- Customizable drag handles

## Key Capabilities

### 1. Component Lifecycle
Components follow a predictable lifecycle:
```javascript
const panel = new Panel('/api/content');
panel.target = document.getElementById('container');
panel.render();  // Creates DOM → Enters document → Fires READY event
// ... use component ...
panel.dispose(); // Exits document → Cleans up listeners → Removes DOM
```

### 2. Event-Driven Communication
Components communicate through standardized events:
```javascript
// Panel dispatches event
panel.dispatchPanelEvent('custom_action', { data: 'value' });

// View listens and handles
view.mapPanEv('custom_action', (eventData, panel) => {
  console.log('Panel action:', eventData.data);
});
```

### 3. Declarative HTML Patterns
Zooy enhances HTML with data attributes for interactions:
```html
<!-- Button with custom event -->
<button class="zoo__button" data-zv="save" data-pk="123">Save</button>

<!-- Form with interception -->
<form class="intercept_submit" data-zv="search" data-href="/api/search">
  <input name="q" />
</form>

<!-- Async content loading -->
<div class="zoo_async_html" data-href="/api/widget"></div>

<!-- Toggle class interaction -->
<button class="zoo__toggle_class_driver"
        data-toggle_class_target_id="menu"
        data-toggle_class="open">
  Toggle Menu
</button>
```

### 4. URI-Based Content
Panels can load content from URIs with query parameter management:
```javascript
const panel = new Panel('/api/data?page=1');
panel.addToQParams('filter', 'active');
panel.renderWithTemplate(); // Fetches: /api/data?page=1&filter=active
```

### 5. Form Handling
FormPanel provides validation and AJAX submission:
```javascript
const form = new FormPanel('/api/form');
form.onSubmitSuccess((panel, response) => {
  console.log('Form submitted successfully:', response);
});
form.render();
```

### 6. Resizable Layouts
Split component creates complex, resizable layouts:
```javascript
const split = new Split();
split.render(document.getElementById('app'));

// Create horizontal split: [A | B | C]
split.addSplit(undefined, 'EW', 200, 200);

// Nest A can now be split vertically
split.addSplit(split.getNest('A'), 'NS', 100, 100);
// Results in: [A1 | B | C]
//             [A2 |   |  ]
//             [A3 |   |  ]

// Programmatic control
split.open('A');
split.close('C');
split.toggle('B');
```

### 7. Navigation & History
Conductor manages application navigation with history:
```javascript
const conductor = new Conductor();

// Register view constructors
conductor.registerViewConstructor('dashboard', (pk, data) => {
  return new DashboardView(pk, data);
});

// Switch views (records history)
conductor.switchView(new DashboardView());

// Browser back/forward automatically handled
```

### 8. Component Library Registration
Register UI libraries at application startup:
```javascript
import zooy from 'zooy';

const entryFunc = async (user) => {
  // Register component libraries (lazy-loaded)
  await zooy.registerMdcLibrary();      // Material Design Components
  await zooy.registerCarbonLibrary();   // IBM Carbon Design System

  // Now render your application
  const view = new MyView();
  view.render();
};
```

### 9. Material Design Components
MDC components automatically initialize when panels render:
```html
<button class="mdc-button">
  <span class="mdc-button__label">Click Me</span>
</button>

<ul class="mdc-list mdc-tree">
  <li class="mdc-list-item">Tree Item 1</li>
  <li class="mdc-list-item">Tree Item 2</li>
</ul>
<!-- Panel.parseContent() automatically initializes all MDC components -->
```

### 10. Carbon Design System
Carbon Web Components load dynamically as needed:
```html
<!-- Use data-carbon-component to specify which component to load -->
<div data-carbon-component="button">
  <cds-button>Click Me</cds-button>
</div>

<div data-carbon-component="accordion">
  <cds-accordion>
    <cds-accordion-item title="Section 1">
      Content here
    </cds-accordion-item>
  </cds-accordion>
</div>
<!-- Components are imported dynamically and cached for performance -->
```

## Why Pluggable Component Libraries?

The ComponentLibraryRegistry architecture provides several key benefits:

### 🎯 **No Library Lock-in**
Use MDC, Carbon, or build custom components — zooy doesn't care. Mix and match as needed.

### 📦 **Smaller Initial Bundles**
Component libraries load on-demand via dynamic imports:
- Core framework: ~50KB
- MDC library: +240KB (only if registered)
- Carbon library: +19KB (only if registered)
- Individual Carbon components: Loaded as panels use them

### 🔄 **Gradual Migration**
Migrate from one component library to another incrementally:
1. Register both libraries
2. Existing panels continue using MDC
3. New panels use Carbon
4. Replace components one-by-one
5. Eventually remove MDC registration

### 🧩 **Framework Evolution**
As component libraries evolve (MDC → Material Web Components), zooy's architecture remains stable. Just swap the registration module.

### 🚀 **Performance**
- Import caching prevents duplicate downloads
- Only load components actually used in your app
- Lazy loading reduces time-to-interactive

## Integration Notes

### Carbon Design System Theming

If your application imports `@carbon/styles` for theming (e.g., to customize Carbon component styles), you'll need to handle font path configuration:

**The Issue**: Carbon's default configuration uses Webpack-style paths (`~@ibm/plex`) that don't work with vanilla Sass compilation.

**Solution**: Override the font path when importing Carbon styles in your application's SCSS:

```scss
// In your application's theme file
@use '@carbon/styles' as * with (
  $font-path: '../path/to/node_modules/@ibm/plex'
);
```

**Required Dependencies**: Your application's `package.json` should include:

```json
{
  "dependencies": {
    "@carbon/styles": "^1.x.x",
    "@ibm/plex": "^6.x.x"
  }
}
```

**Path Calculation**: The `$font-path` should be relative from your CSS output location to the font files:
- CSS output: `/static/css/theme.css`
- Font files: `/static/js/node_modules/@ibm/plex/...`
- Correct path: `../js/node_modules/@ibm/plex`

**Note**: Zooy itself only imports Carbon Web Components (JavaScript), not the Carbon styles (CSS). CSS theming is the responsibility of the implementing application, allowing full control over design tokens, typography, and component styling.

### Carbon Icons

**⚠️ Deprecated: Client-side placeholder loading has been removed.**

Zooy previously supported client-side icon placeholder loading (`[data-carbon-icon]`), but this has been removed in favor of server-side rendering for better performance and simplicity.

**For Django applications**: Use [django-zooy](https://github.com/trinity-telecomms/django-zooy) which provides server-side icon rendering:

```django
{% load carbon %}
{% carbon_icon "add" 16 slot="icon" %}
<!-- Renders: <svg xmlns="..."><path d="..."/></svg> -->
```

**Benefits of server-side rendering**:
- ✅ No JavaScript required
- ✅ No network requests
- ✅ No placeholders or flicker
- ✅ Works without JS (progressive enhancement)
- ✅ Instant rendering

**For non-Django applications**: The programmatic icon API (`icons-api.js`) is still available for runtime icon generation if needed:

```javascript
import zooy from 'zooy';

// Create icon programmatically
const iconSvg = await zooy.icons.createIcon('add', 16, { slot: 'icon' });
document.body.appendChild(iconSvg);
```

However, server-side rendering (in templates/build step) is strongly recommended over runtime generation.

## Development

### Prerequisites
- Node.js and npm
- Modern browser with ES6+ support

### Setup
```bash
npm install
```

### Linting
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Pre-commit Hooks
Husky is configured to run linting before each commit, ensuring code quality.

## Code Quality

- **ESLint** - Modern flat config with strict rules
- **JSDoc** - Complete documentation for all core components
- **Type annotations** - Comprehensive JSDoc types for IDE support
- **Pre-commit hooks** - Automatic linting before commits

## Project Structure

```
zooy/
├── src/
│   ├── ui/                          # Core UI components
│   │   ├── evt.js                   # Event system base class
│   │   ├── component.js             # Component base class
│   │   ├── panel.js                 # Content panel (library-agnostic)
│   │   ├── form.js                  # Form panel with validation
│   │   ├── view.js                  # Panel orchestrator
│   │   ├── conductor.js             # Application controller
│   │   ├── split.js                 # Resizable layouts
│   │   ├── dragger.js               # Drag functionality
│   │   ├── component-library-registry.js  # Component library registry
│   │   ├── mdc/                     # Material Design Components
│   │   │   ├── register.js          # MDC registration (lazy-loaded)
│   │   │   └── tree-utils.js        # MDC tree utilities
│   │   └── carbon/                  # IBM Carbon Design System
│   │       ├── register.js          # Carbon registration (lazy-loaded)
│   │       ├── renderers.js         # Dynamic component loading
│   │       └── icons-api.js         # Programmatic icon API
│   ├── dom/                         # DOM utilities
│   ├── events/                      # Event types and utilities
│   ├── uri/                         # URI parsing and manipulation
│   └── user/                        # User management
├── chunks/                          # Rollup-generated chunks
│   ├── main-[hash].js               # Main framework bundle
│   ├── register-[hash].js           # MDC registration chunk (~240KB)
│   └── register-[hash].js           # Carbon registration chunk (~19KB)
├── main.js                          # Entry point (exports from chunks)
├── rollup.config.js                 # Build configuration
├── eslint.config.js                 # ESLint configuration
└── package.json                     # Project dependencies
```

## Contributing

### Code Style
- Use single quotes for strings
- 2-space indentation
- Semicolons required
- Strict equality (===) required
- JSDoc for all public APIs

### Workflow
1. Make changes
2. Run `npm run lint:fix` to auto-fix issues
3. Commit (pre-commit hook runs linting automatically)
4. Submit pull request

## Contributors
- Jan Badenhorst
- Andries Niemandt

## License

[License information to be added]
