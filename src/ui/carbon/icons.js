/**
 * Carbon Icon Loader
 *
 * Automatically loads Carbon icons on the page.
 * Looks for elements with data-carbon-icon attribute and replaces them
 * with actual Carbon SVG icons.
 *
 * Usage in HTML:
 *   <span data-carbon-icon="edit" data-carbon-size="16" slot="icon"></span>
 *
 * This script will replace it with the actual Carbon icon SVG.
 */

import {identity} from "badu";

/**
 * Load all Carbon icons on the page
 */
export async function loadCarbonIcons() {
  // Find all icon placeholders
  const placeholders = document.querySelectorAll('[data-carbon-icon]');

  if (placeholders.length === 0) {
    return;
  }

  // Load each icon
  const promises = Array.from(placeholders).map(async (placeholder) => {
    const iconName = placeholder.getAttribute('data-carbon-icon');
    const size = placeholder.getAttribute('data-carbon-size') || '16';

    if (!iconName) {
      console.warn('[Zooy] Icon placeholder missing data-carbon-icon attribute');
      return;
    }

    try {
      // Dynamically import the icon
      const iconModule = await import(`@carbon/icons/es/${iconName}/${size}.js`);
      const iconData = iconModule.default;

      // Create SVG element
      const svg = createSVGFromIconData(iconData, placeholder);

      // Replace placeholder with SVG
      placeholder.replaceWith(svg);
    } catch (error) {
      console.error(`[Zooy] Failed to load Carbon icon: ${iconName}/${size}`, error);
      // Leave placeholder in place or add error indicator
      placeholder.textContent = `[${iconName}]`;
      placeholder.style.color = 'red';
    }
  });

  await Promise.all(promises);
}

/**
 * Create SVG element from Carbon icon data
 * @param {Object} iconData - Icon data from @carbon/icons
 * @param {Element} placeholder - Original placeholder element
 * @return {SVGElement} SVG element
 */
function createSVGFromIconData(iconData, placeholder) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  // Copy attributes from icon data
  if (iconData.attrs) {
    Object.entries(iconData.attrs).forEach(([key, value]) => {
      svg.setAttribute(key, value);
    });
  }

  // Add standard attributes
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');

  // Copy attributes from placeholder (except data-carbon-*)
  Array.from(placeholder.attributes).forEach(attr => {
    if (!attr.name.startsWith('data-carbon-')) {
      svg.setAttribute(attr.name, attr.value);
    }
  });

  // Add icon content (paths, etc.)
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
 * Auto-load icons when DOM is ready
 * Can be disabled by setting window.zooyAutoLoadIcons = false before this script runs
 */
if (typeof window !== 'undefined' && window.zooyAutoLoadIcons !== false) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCarbonIcons);
  } else {
    loadCarbonIcons().then(identity);
  }
}
