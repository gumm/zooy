import EVT from "./ui/evt.js";
import Component from './ui/component.js';
import Dragger from './ui/dragger.js';
import Panel from './ui/panel.js';
import FormPanel from './ui/form.js';
import Split from './ui/split.js';
import UserManager from './user/usermanager.js';
import View from './ui/view.js';
import {UiEventType} from './events/uieventtype.js';
import Conductor from './ui/conductor.js';
import * as domUtils from './dom/utils.js';
import * as uriUtils from './uri/uri.js';
import * as icons from './ui/carbon/icons-api.js';
import { loadCarbonIcons } from './ui/carbon/icons.js';
import { ComponentLibraryRegistry } from './ui/component-library-registry.js';
import * as handlers from './ui/handlers/index.js';

/**
 * Lazy-loads and registers the Carbon Design System library.
 * Uses dynamic import to avoid bundling Carbon code in main bundle.
 * Carbon code is only loaded when this function is called.
 *
 * @returns {Promise<void>}
 */
async function registerCarbonLibrary() {
  const { registerCarbonLibrary: register } = await import('./ui/carbon/register.js');
  return register();
}

/**
 * Lazy-loads and registers the Material Design Components library.
 * Uses dynamic import to avoid bundling MDC code in main bundle.
 * MDC code (including tree-utils) is only loaded when this function is called.
 *
 * @returns {Promise<void>}
 */
async function registerMdcLibrary() {
  const { registerMdcLibrary: register } = await import('./ui/mdc/register.js');
  return register();
}

// Import Zooy UI components (auto-registers custom elements)
// import './ui/zoo/index.js';

const zooy = {
  EVT,
  Component,
  Dragger,
  Panel,
  FormPanel,
  Split,
  UserManager,
  View,
  Conductor,
  UiEventType,
  domUtils,
  uriUtils,
  icons,
  loadCarbonIcons,
  registerCarbonLibrary,
  registerMdcLibrary,
  ComponentLibraryRegistry,
  handlers,
};

export default zooy;
