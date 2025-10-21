/**
 * Carbon Icon Utilities
 *
 * Easy-to-use helpers for working with Carbon Design System icons.
 *
 * Browse all available icons:
 * - https://carbondesignsystem.com/guidelines/icons/library/
 * - https://www.ibm.com/design/language/iconography/ui-icons/library/
 *
 * Usage:
 *   // For web components (returns DOM element)
 *   const iconElement = createIcon('edit', 16);
 *   iconElement.setAttribute('slot', 'icon');
 *
 *   // For HTML strings (returns string)
 *   const iconHTML = getIconSVG('edit', 16, { slot: 'icon' });
 */

/**
 * Dynamically import a Carbon icon
 * @param {string} name - Icon name (e.g., 'edit', 'add', 'close')
 * @param {number} size - Icon size: 16, 20, 24, or 32
 * @return {Promise<Object>} Icon data object
 */
export async function loadIcon(name, size = 16) {
  try {
    const module = await import(`@carbon/icons/es/${name}/${size}.js`);
    return module.default;
  } catch (error) {
    console.error(`[Zooy] Failed to load icon: ${name}/${size}`, error);
    throw new Error(`Icon not found: ${name}/${size}. Check https://carbondesignsystem.com/guidelines/icons/library/`);
  }
}

/**
 * Convert Carbon icon data to SVG element
 * @param {Object} iconData - Icon data from @carbon/icons
 * @param {Object} extraAttrs - Additional attributes to add
 * @return {SVGElement} SVG element
 */
export function iconDataToElement(iconData, extraAttrs = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  // Set default attributes
  const attrs = {
    ...iconData.attrs,
    focusable: 'false',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true',
    ...extraAttrs
  };

  Object.entries(attrs).forEach(([key, value]) => {
    svg.setAttribute(key, value);
  });

  // Add content (paths, etc.)
  if (iconData.content) {
    iconData.content.forEach(item => {
      const elem = document.createElementNS('http://www.w3.org/2000/svg', item.elem);
      if (item.attrs) {
        Object.entries(item.attrs).forEach(([key, value]) => {
          elem.setAttribute(key, value);
        });
      }
      svg.appendChild(elem);
    });
  }

  return svg;
}

/**
 * Create a Carbon icon element (async)
 * @param {string} name - Icon name (e.g., 'edit', 'add', 'close')
 * @param {number} size - Icon size: 16, 20, 24, or 32
 * @param {Object} attrs - Additional attributes (e.g., { slot: 'icon', class: 'my-icon' })
 * @return {Promise<SVGElement>} SVG element
 *
 * @example
 * const editIcon = await createIcon('edit', 16, { slot: 'icon' });
 * button.appendChild(editIcon);
 */
export async function createIcon(name, size = 16, attrs = {}) {
  const iconData = await loadIcon(name, size);
  return iconDataToElement(iconData, attrs);
}

/**
 * Get Carbon icon as HTML string (async)
 * @param {string} name - Icon name (e.g., 'edit', 'add', 'close')
 * @param {number} size - Icon size: 16, 20, 24, or 32
 * @param {Object} attrs - Additional attributes (e.g., { slot: 'icon', class: 'my-icon' })
 * @return {Promise<string>} SVG as HTML string
 *
 * @example
 * const editIconHTML = await getIconSVG('edit', 16, { slot: 'icon' });
 * element.innerHTML = editIconHTML;
 */
export async function getIconSVG(name, size = 16, attrs = {}) {
  const element = await createIcon(name, size, attrs);
  return element.outerHTML;
}

/**
 * Common icons - pre-configured for convenience
 */
export const Icons = {
  // Actions
  ADD: 'add',
  EDIT: 'edit',
  DELETE: 'trash-can',
  SAVE: 'save',
  CLOSE: 'close',
  SEARCH: 'search',
  FILTER: 'filter',
  SETTINGS: 'settings',

  // Navigation
  CHEVRON_LEFT: 'chevron--left',
  CHEVRON_RIGHT: 'chevron--right',
  CHEVRON_UP: 'chevron--up',
  CHEVRON_DOWN: 'chevron--down',
  ARROW_LEFT: 'arrow--left',
  ARROW_RIGHT: 'arrow--right',
  MENU: 'menu',

  // Status
  CHECKMARK: 'checkmark',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'information',

  // Files & Folders
  FOLDER: 'folder',
  DOCUMENT: 'document',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',

  // Common UI
  OVERFLOW_MENU: 'overflow-menu--vertical',
  VIEW: 'view',
  VIEW_OFF: 'view--off',
  COPY: 'copy',
  LINK: 'link',
  USER: 'user',
  NOTIFICATION: 'notification'
};

/**
 * Helper to create icon for Carbon web components
 * @param {string} name - Icon name or Icons constant
 * @param {number} size - Icon size
 * @return {Promise<SVGElement>} SVG element with slot="icon"
 *
 * @example
 * const icon = await carbonIcon(Icons.EDIT, 16);
 * button.appendChild(icon);
 */
export async function carbonIcon(name, size = 16) {
  return createIcon(name, size, { slot: 'icon' });
}
