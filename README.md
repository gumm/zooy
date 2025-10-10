# Zooy

A lightweight, event-driven JavaScript UI framework for building complex, interactive web applications. Zooy provides a component-based architecture with lifecycle management, declarative event handling, and powerful layout primitives.

## Overview

Zooy is a UI framework that emphasizes:
- **Component lifecycle management** - Automatic cleanup of event listeners and resources
- **Event-driven architecture** - Components communicate through a standardized event system
- **Declarative UI patterns** - HTML-driven component initialization and interaction
- **Progressive enhancement** - Works with server-rendered HTML
- **Material Design integration** - Built-in support for Material Design Components

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
- Material Design Component auto-initialization
- Async content population with intervals
- Partial DOM replacement for live updates

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

### 8. Material Design Integration
Automatic MDC component initialization:
```html
<button class="mdc-button">
  <span class="mdc-button__label">Click Me</span>
</button>
<!-- Panel.parseContent() automatically initializes MDC components -->
```

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
│   ├── ui/              # Core UI components
│   │   ├── evt.js       # Event system base class
│   │   ├── component.js # Component base class
│   │   ├── panel.js     # Content panel
│   │   ├── form.js      # Form panel with validation
│   │   ├── view.js      # Panel orchestrator
│   │   ├── conductor.js # Application controller
│   │   ├── split.js     # Resizable layouts
│   │   └── dragger.js   # Drag functionality
│   ├── dom/             # DOM utilities
│   ├── events/          # Event types and utilities
│   ├── uri/             # URI parsing and manipulation
│   └── user/            # User management
├── eslint.config.js     # ESLint configuration
└── package.json         # Project dependencies
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
