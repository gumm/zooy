import EVT from "./ui/evt.js";
import Component from './ui/component.js';
import Dragger from './ui/dragger.js';
import Panel from './ui/panel.js';
import FormPanel from './ui/form.js';
import Split from './ui/split.js';
import UserManager from './user/usermanager.js';
import View, {treeNodeSelect} from './ui/view.js';
import {UiEventType} from './events/uieventtype.js';
import Conductor from './ui/conductor.js';
import * as domUtils from './dom/utils.js';
import * as uriUtils from './uri/uri.js';
import * as icons from './ui/carbon/icons-api.js';
import { loadCarbonIcons } from './ui/carbon/icons.js';

// Import Zooy UI components (auto-registers custom elements)
import './ui/zoo/index.js';

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
  treeNodeSelect,
  domUtils,
  uriUtils,
  icons,
  loadCarbonIcons,
};

export default zooy;
