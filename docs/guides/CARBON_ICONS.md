# Carbon Icons in Zooy

Easy-to-use utilities for working with Carbon Design System icons.

## Browse Available Icons

- [Carbon Design System Icon Library](https://carbondesignsystem.com/guidelines/icons/library/)
- [IBM Design Language UI Icons](https://www.ibm.com/design/language/iconography/ui-icons/library/)

## Usage

### Basic Icon Creation

```javascript
import zooy from 'zooy';

// Create an icon element
const editIcon = await zooy.icons.createIcon('edit', 16);
someElement.appendChild(editIcon);

// Get icon as HTML string
const saveIconHTML = await zooy.icons.getIconSVG('save', 20);
element.innerHTML = saveIconHTML;
```

### For Carbon Web Components

```javascript
import zooy from 'zooy';

// Create icon with slot="icon" for web components
const icon = await zooy.icons.carbonIcon('edit', 16);

// Use in a button
const button = document.createElement('cds-icon-button');
button.appendChild(icon);
```

### Using Icon Constants

```javascript
import zooy from 'zooy';

// Common icons are pre-defined
const { Icons } = zooy.icons;

// Use constants instead of strings
const icon = await zooy.icons.createIcon(Icons.EDIT, 16);
const addIcon = await zooy.icons.carbonIcon(Icons.ADD, 20);
const deleteIcon = await zooy.icons.createIcon(Icons.DELETE, 16);
```

### Available Icon Constants

```javascript
// Actions
Icons.ADD, Icons.EDIT, Icons.DELETE, Icons.SAVE, Icons.CLOSE
Icons.SEARCH, Icons.FILTER, Icons.SETTINGS

// Navigation
Icons.CHEVRON_LEFT, Icons.CHEVRON_RIGHT, Icons.CHEVRON_UP, Icons.CHEVRON_DOWN
Icons.ARROW_LEFT, Icons.ARROW_RIGHT, Icons.MENU

// Status
Icons.CHECKMARK, Icons.ERROR, Icons.WARNING, Icons.INFO

// Files & Folders
Icons.FOLDER, Icons.DOCUMENT, Icons.DOWNLOAD, Icons.UPLOAD

// Common UI
Icons.OVERFLOW_MENU, Icons.VIEW, Icons.VIEW_OFF, Icons.COPY
Icons.LINK, Icons.USER, Icons.NOTIFICATION
```

## Before & After Examples

### Before (verbose SVG)

```html
<cds-icon-button>
  <svg slot="icon"
       focusable="false"
       preserveAspectRatio="xMidYMid meet"
       xmlns="http://www.w3.org/2000/svg"
       fill="currentColor"
       width="16"
       height="16"
       viewBox="0 0 32 32"
       aria-hidden="true">
    <path d="M2 26H30V28H2zM25.4 9c.8-.8.8-2 0-2.8 0 0 0 0 0 0l-3.6-3.6c-.8-.8-2-.8-2.8 0 0 0 0 0 0 0l-15 15V24h6.4L25.4 9zM20.4 4L24 7.6l-3 3L17.4 7 20.4 4zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"></path>
  </svg>
</cds-icon-button>
```

### After (clean and simple)

```javascript
import zooy from 'zooy';

const button = document.createElement('cds-icon-button');
const icon = await zooy.icons.carbonIcon('edit', 16);
button.appendChild(icon);
```

Or even simpler with constants:

```javascript
import zooy from 'zooy';

const button = document.createElement('cds-icon-button');
button.appendChild(await zooy.icons.carbonIcon(zooy.icons.Icons.EDIT, 16));
```

## Advanced Usage

### Custom Attributes

```javascript
import zooy from 'zooy';

// Add custom attributes
const icon = await zooy.icons.createIcon('edit', 16, {
  slot: 'icon',
  class: 'my-custom-icon',
  'data-testid': 'edit-icon',
  style: 'color: red;'
});
```

### Icon Sizes

Carbon icons come in 4 sizes:
- `16` - Default, most common
- `20` - Slightly larger
- `24` - Medium
- `32` - Large

```javascript
const smallIcon = await zooy.icons.createIcon('edit', 16);
const mediumIcon = await zooy.icons.createIcon('edit', 20);
const largeIcon = await zooy.icons.createIcon('edit', 24);
const xlargeIcon = await zooy.icons.createIcon('edit', 32);
```

## In Panel Components

```javascript
class MyPanel extends zooy.Panel {
  async createDom() {
    const container = document.createElement('div');

    // Create button with icon
    const button = document.createElement('cds-icon-button');
    button.appendChild(await zooy.icons.carbonIcon(zooy.icons.Icons.EDIT, 16));

    container.appendChild(button);
    return container;
  }
}
```

## Finding Icon Names

1. Browse the [icon library](https://carbondesignsystem.com/guidelines/icons/library/)
2. Search for what you need (e.g., "edit", "close", "add")
3. The icon name in the library is the name you use in code
4. Most names use kebab-case (e.g., `trash-can`, `chevron--left`)

Examples:
- "Edit" → `'edit'`
- "Trash can" → `'trash-can'`
- "Chevron left" → `'chevron--left'`
- "Overflow menu vertical" → `'overflow-menu--vertical'`
