# Zooy UI Architecture

This document explains how Zooy's UI components are structured and how they integrate with the Panel system.

## Directory Structure

```
src/ui/
├── zoo/           # Web Component definitions (pure UI)
├── renderers/     # Panel integration layer
└── mdc/           # Legacy Material Design Components (being phased out)
```

## The Two-Layer Architecture

### Layer 1: Zoo Components (`src/ui/zoo/`)

**Pure Web Components** - Framework-agnostic, reusable UI elements.

```javascript
// src/ui/zoo/button.js
export class ZooButton extends HTMLElement {
  #carbonButton;

  connectedCallback() {
    // Create Carbon button, forward visual attributes
    this.#carbonButton = document.createElement('cds-button');
    // ...
  }

  get carbonElement() {
    return this.#carbonButton;
  }
}
```

**Responsibilities:**
- Define custom HTML elements (`<zoo-button>`, `<zoo-text-input>`, etc.)
- Wrap Carbon Design System Web Components
- Handle visual attributes (kind, size, disabled, etc.)
- Expose public API (getters, setters, methods)
- **No knowledge of Panels or Zooy event system**

**Usage (standalone):**
```html
<zoo-button kind="primary" event="save_user" record-id="123">
  Save User
</zoo-button>
```

### Layer 2: Renderers (`src/ui/renderers/`)

**Panel Integration** - Glue code that connects zoo components to Panels.

```javascript
// src/ui/renderers/button.js
export const renderButtons = function(panel) {
  const zooButtons = [...panel.querySelectorAll('zoo-button')];

  zooButtons.forEach(zooEl => {
    const carbonButton = zooEl.carbonElement;

    this.listen(carbonButton, 'click', e => {
      const attrs = getSemanticAttributes(zooEl);
      // Dispatch to Panel event system
      this.dispatchPanelEvent(attrs.event, attrs);
    });
  });
};
```

**Responsibilities:**
- Find zoo components in a Panel's DOM
- Read semantic attributes (event, record-id, endpoint)
- Attach Panel-managed event listeners
- Dispatch Panel events with event data
- **Bridge between zoo components and Panel system**

**Usage (in Panel):**
```javascript
// src/ui/panel.js
parseContent(panel) {
  // Initialize all zoo components in this panel
  initializeCarbonComponents.call(this, panel);
}
```

## Why Keep Them Separate?

### ✅ Benefits of Separation

1. **Reusability** - Zoo components can be used outside of Panels
   ```html
   <!-- Works without any Panel -->
   <zoo-button>Click Me</zoo-button>
   ```

2. **Testability** - Test components independently of Panel system
   ```javascript
   const btn = document.createElement('zoo-button');
   btn.setAttribute('kind', 'primary');
   // Test without Panel dependency
   ```

3. **Single Responsibility**
   - **Zoo components:** Visual presentation
   - **Renderers:** Panel event integration

4. **Flexibility** - Easy to swap UI libraries
   - Change `zoo/button.js` from Carbon → Bootstrap → Shoelace
   - Renderers stay the same

5. **Clear Dependencies**
   ```
   Panel → Renderers → Zoo Components → Carbon Design System
   ```

### When Would We Merge?

Only if **all** of these become true:
- Zoo components are NEVER used outside Panels
- The separation becomes a maintenance burden
- We're adding no value with the abstraction

Currently, the separation provides clear architectural boundaries.

## Component Lifecycle

### 1. Registration (on app load)
```javascript
// src/ui/zoo/index.js auto-runs
customElements.define('zoo-button', ZooButton);
```

### 2. HTML Parsing (browser automatic)
```html
<!-- Browser sees <zoo-button> and creates ZooButton instance -->
<zoo-button event="save">Save</zoo-button>
```

### 3. Panel Integration (when Panel renders)
```javascript
// src/ui/panel.js
parseContent(panel) {
  // Renderers find zoo components and attach Panel event listeners
  initializeCarbonComponents.call(this, panel);
}
```

### 4. User Interaction
```
User clicks button
  → Carbon button fires 'click'
  → Renderer catches click
  → Reads semantic attributes from zoo-button
  → Dispatches Panel event
  → View/Panel handler processes event
```

## Semantic Attributes

Zoo components use **semantic, self-documenting attributes** instead of cryptic `data-*` attributes.

**Bad (old way):**
```html
<zoo-button data-zv="save_user" data-pk="123" data-href="/api/users/123">
```

**Good (new way):**
```html
<zoo-button event="save_user" record-id="123" endpoint="/api/users/123">
```

**Semantic vocabulary:**
- `event` - Event name to dispatch
- `change-event` - Event on change/blur
- `open-event` / `close-event` - Modal events
- `record-id` - Record identifier
- `endpoint` - API endpoint URL
- `action` - Semantic action name
- `data-*` - App-specific custom data

See `/home/gumm/Workspace/zooy/src/ui/zoo/attributes.js` for complete vocabulary.

## Migration Path

### Current State (Hybrid)
- **New code:** Use `<zoo-button>`, `<zoo-text-input>`, etc.
- **Legacy code:** MDC components (gradually being replaced)

### Migration Steps
1. ✅ Create zoo components wrapping Carbon
2. ✅ Create renderers for Panel integration
3. ✅ Implement semantic attributes
4. 🔄 Update Django templates (in progress)
5. ⏳ Remove MDC dependencies
6. ⏳ Remove legacy MDC renderer code

## Adding New Components

To add a new zoo component (e.g., `zoo-datepicker`):

### 1. Create the Web Component
```javascript
// src/ui/zoo/datepicker.js
import { SEMANTIC_ATTRIBUTES } from './attributes.js';

export class ZooDatepicker extends HTMLElement {
  #carbonDatepicker;

  connectedCallback() {
    this.render();
  }

  render() {
    this.#carbonDatepicker = document.createElement('cds-date-picker');
    // Forward visual attributes...
    this.appendChild(this.#carbonDatepicker);
  }

  get carbonElement() {
    return this.#carbonDatepicker;
  }
}

customElements.define('zoo-datepicker', ZooDatepicker);
```

### 2. Create the Renderer
```javascript
// src/ui/renderers/datepicker.js
import { getSemanticAttributes } from '../zoo/attributes.js';

export const renderDatepickers = function(panel) {
  const zooDatepickers = [...panel.querySelectorAll('zoo-datepicker')];

  zooDatepickers.forEach(zooEl => {
    const carbonDatepicker = zooEl.carbonElement;

    this.listen(carbonDatepicker, 'cds-date-picker-changed', e => {
      const attrs = getSemanticAttributes(zooEl);
      if (attrs.event) {
        this.dispatchPanelEvent(attrs.event, {
          ...attrs,
          value: e.detail.value
        });
      }
    });
  });
};
```

### 3. Register in Index Files
```javascript
// src/ui/zoo/index.js
export { ZooDatepicker } from './datepicker.js';

export const loadCarbonComponents = async () => {
  await import('@carbon/web-components/es/components/date-picker/index.js');
};

// src/ui/renderers/index.js
export const initializeCarbonComponents = async function(panel) {
  await loadCarbonComponents();
  renderDatepickers.call(this, panel);
};
```

### 4. Use in Templates
```html
<zoo-datepicker
  event="date_selected"
  record-id="123"
  label="Select Date">
</zoo-datepicker>
```

## Summary

- **`zoo/`** = Web Components (what they look like)
- **`renderers/`** = Panel integration (how they behave in Panels)
- **Separation** = Clean architecture, testability, reusability
- **Together** = Modern, maintainable UI system
