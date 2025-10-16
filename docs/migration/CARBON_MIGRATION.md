# Carbon Design System Migration Guide

## Overview

This guide explains how to migrate from Material Design Components (MDC) to IBM Carbon Design System Web Components in Zooy applications.

Zooy includes a two-layer architecture that allows MDC and Carbon to coexist during migration, enabling a gradual, component-by-component transition.

## Installation

### 1. Install Carbon Web Components
```bash
npm install
```

Carbon is included as a dependency in Zooy (`@carbon/web-components@^2.40.1`)

### 2. Two-Layer Architecture
```
zooy/src/ui/
├── zoo/           # Web Component definitions (18 components)
│   ├── button.js
│   ├── text-input.js
│   ├── dropdown.js
│   ├── checkbox.js
│   ├── radio-button.js
│   ├── modal.js
│   ├── icon-button.js
│   ├── icon-toggle.js
│   ├── fab.js
│   ├── data-table.js
│   ├── tabs.js
│   ├── menu.js
│   ├── list.js
│   ├── toggle.js
│   ├── tag.js
│   ├── select.js
│   ├── slider.js
│   └── progress-bar.js
└── renderers/     # Panel integration layer (18 renderers)
    ├── button.js
    ├── text-input.js
    ├── dropdown.js
    ├── checkbox.js
    ├── radio-button.js
    ├── modal.js
    ├── icon-button.js
    ├── icon-toggle.js
    ├── fab.js
    ├── data-table.js
    ├── tabs.js
    ├── menu.js
    ├── list.js
    ├── toggle.js
    ├── tag.js
    ├── select.js
    ├── slider.js
    └── progress-bar.js
```

### 3. Updated Panel.js
- Modified `parseContent()` to initialize Carbon components alongside MDC
- Carbon runs asynchronously and doesn't block MDC
- Both systems can coexist during migration

### 4. Created Test Page in Z2
- Template: `/home/gumm/Workspace/z2/templates/carbon_button_test.html`
- View: `/home/gumm/Workspace/z2/z2/views.py` (`CarbonButtonTestView`)
- URL: `http://localhost:8000/test/carbon-button/`

### 5. Implemented Semantic Attributes System
- Replaced cryptic `data-*` attributes with semantic names
- `data-zv` → `event`
- `data-pk` → `record-id`
- `data-href` → `endpoint`
- See `/home/gumm/Workspace/zooy/src/ui/zoo/attributes.js` for complete vocabulary

## Testing Instructions

### Step 1: Install Dependencies

```bash
# Install Zooy dependencies (including Carbon)
cd /home/gumm/Workspace/zooy
npm install

# Rebuild Zooy
npm run rollup

# Install Z2 dependencies (to get updated Zooy)
cd /home/gumm/Workspace/z2/static/js
npm install
npm run build
```

### Step 2: Start Django Development Server

```bash
cd /home/gumm/Workspace/z2
source .venv/bin/activate
python manage.py runserver
```

### Step 3: Open Test Page

Navigate to: `http://localhost:8000/test/carbon-button/`

### Step 4: What to Test

The test page includes:

1. **Basic Carbon Button** - Click and verify event fires
2. **Different Button Kinds** - Test primary, secondary, tertiary, ghost, danger
3. **Button with Data Attributes** - Verify data-zv, data-pk, data-href all work
4. **Disabled Button** - Should NOT fire events
5. **Legacy MDC Button** - For comparison (should still work)

### Step 5: Verify in Browser Console

Open browser DevTools (F12) and check:

```javascript
// You should see:
[Zooy] Carbon Web Components loaded successfully
Carbon components initialized in panel
[Test] Panel found: Panel {…}

// When clicking buttons:
[Test] Panel event received: {value: 'test_click', data: {…}}
```

### Step 6: Verify Visually

- Carbon buttons should have IBM Carbon Design styling
- Buttons should be interactive (hover, focus, click states)
- Event results should display below each test section
- Result boxes should turn green when events fire

## Available Components

Zooy provides 18 Carbon-wrapped components ready for use:

### Core Input Components
1. **zoo-button** - Standard buttons with various styles
2. **zoo-text-input** - Text input fields with validation
3. **zoo-checkbox** - Checkbox inputs
4. **zoo-radio-button** - Radio button inputs
5. **zoo-dropdown** - Dropdown menus
6. **zoo-select** - Form select inputs

### Action Components
7. **zoo-icon-button** - Icon-only buttons
8. **zoo-icon-toggle** - Toggleable icon buttons
9. **zoo-fab** - Floating action buttons

### Display Components
10. **zoo-data-table** - Complex sortable, selectable tables
11. **zoo-tabs** - Tabbed navigation
12. **zoo-list** - Structured lists
13. **zoo-tag** - Labels and tags (chips)
14. **zoo-progress-bar** - Progress indicators

### Interactive Components
15. **zoo-modal** - Modal dialogs
16. **zoo-menu** - Overflow/context menus
17. **zoo-toggle** - On/off switches
18. **zoo-slider** - Range sliders

## Migration Strategy

### Gradual Component-by-Component Migration

The architecture allows MDC and Carbon to coexist, enabling safe, incremental migration:

1. **Start with Simple Components** - Begin with buttons, text inputs, and checkboxes
2. **Test Thoroughly** - Verify each component works before moving to the next
3. **Update Templates** - Replace MDC markup with zoo components
4. **Verify Integration** - Ensure events, validation, and data flow correctly
5. **Move to Complex Components** - Migrate tables, modals, and tabs last
6. **Remove MDC** - Once all components migrated, remove MDC dependency

### Recommended Migration Order

1. Buttons and icon buttons
2. Text inputs and text areas
3. Checkboxes and radio buttons
4. Dropdowns and selects
5. Toggles and sliders
6. Tags and progress bars
7. Lists and menus
8. Tabs
9. Data tables (most complex)
10. Modals and dialogs

## Security Improvements from Carbon

### Immediate Benefits
1. **No more `eval()` for MDC initialization**
   - Web Components auto-initialize
   - No JavaScript execution from strings

2. **Shadow DOM Encapsulation** (optional)
   - Styles don't leak globally
   - Reduced CSS injection risk

3. **Maintained Security Updates**
   - IBM actively patches vulnerabilities
   - MDC is no longer maintained

### Remaining Security Considerations
These security issues remain in the framework and require separate fixes:

1. **`eval()` in dom/utils.js:174**
   ```javascript
   export const evalScripts = comp => arr => {
     eval(s.text);  // ⚠️ Still a security risk
   }
   ```
   **Solution:** Replace with `<script type="module">` imports

2. **Unsanitized `innerHTML` in dom/utils.js:562**
   ```javascript
   el.innerHTML = v + units;  // ⚠️ XSS risk
   ```
   **Solution:** Use `DOMPurify.sanitize()` or `textContent`

3. **Server-Rendered Scripts Still Execute**
   - Django templates can inject `<script>` tags
   - These still get evaluated via `evalScripts()`
   **Solution:** Implement Content Security Policy

## Troubleshooting

### Carbon components don't appear
- Check browser console for errors
- Verify `npm install` ran successfully
- Check that `initializeCarbonComponents` is being called

### Events not firing
- Check `data-zv` attribute is present
- Verify panel is initialized
- Check browser console for "[Test] Panel found"

### MDC buttons stop working
- Both should work during migration
- Check that MDC imports are still in panel.js
- Verify `window.mdc` is defined

### Bundle size concerns
- Carbon is tree-shakeable
- Only imported components are bundled
- Individual components are ~50KB
- Compare with MDC: ~200KB for full library

## Component Usage Examples

### Basic Button
```html
<zoo-button event="save_user" record-id="123" endpoint="/api/users/123" kind="primary">
  Save User
</zoo-button>
```

### Icon Button
```html
<zoo-icon-button event="delete" record-id="456" kind="danger" label="Delete">
  <svg slot="icon">...</svg>
</zoo-icon-button>
```

### Data Table with Row Events
```html
<zoo-data-table row-click-event="view_record" selection-event="rows_selected">
  <cds-table-head>...</cds-table-head>
  <cds-table-body>
    <cds-table-row event="view_user" record-id="1">
      <cds-table-cell>John Doe</cds-table-cell>
    </cds-table-row>
  </cds-table-body>
</zoo-data-table>
```

### Toggle Switch
```html
<zoo-toggle event="toggle_notifications" record-id="user123" checked>
  Enable Notifications
</zoo-toggle>
```

### Tabs
```html
<zoo-tabs event="tab_changed">
  <cds-tab value="profile" event="show_profile">Profile</cds-tab>
  <cds-tab value="settings" event="show_settings">Settings</cds-tab>
  <cds-tab-panel value="profile">Profile content...</cds-tab-panel>
  <cds-tab-panel value="settings">Settings content...</cds-tab-panel>
</zoo-tabs>
```

## Questions?

Contact: Jan Badenhorst <janhendrik.badenhorst@gmail.com>

## Resources

- [Carbon Web Components Docs](https://web-components.carbondesignsystem.com/)
- [Carbon Design System](https://carbondesignsystem.com/)
- [Carbon Storybook](https://web-components.carbondesignsystem.com/?path=/story/introduction-welcome--welcome)
- [Zooy UI Architecture](../architecture/UI_ARCHITECTURE.md)
- [Carbon Icons Guide](../guides/CARBON_ICONS.md)
- Semantic Attributes: `src/ui/zoo/attributes.js`
