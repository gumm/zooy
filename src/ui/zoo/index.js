/**
 * Zooy Semantic Attributes System
 *
 * This module provides semantic attribute utilities for Carbon Design System components.
 * Instead of wrapping Carbon components, we attach event listeners directly to them
 * and use semantic attributes (event, record-id, endpoint) for configuration.
 *
 * Benefits of this approach:
 * - Zero maintenance overhead - Carbon updates don't break our code
 * - Full Carbon API access - Developers use Carbon components directly
 * - Future-proof - No wrapper components to maintain
 * - Simpler codebase - Only event attachment logic
 *
 * Usage in templates:
 *   <cds-button event="save_record" record-id="123" kind="primary">Save</cds-button>
 *   <cds-text-input event="search" placeholder="Search..."></cds-text-input>
 *   <cds-dropdown event="filter_changed" label="Choose option">
 *     <cds-dropdown-item value="1">Option 1</cds-dropdown-item>
 *   </cds-dropdown>
 *
 * Semantic Attributes:
 * - event: Event name to dispatch on interaction
 * - record-id: Record identifier/primary key
 * - endpoint: API endpoint URL
 * - action: Semantic action name
 * - data-*: App-specific custom data
 *
 * The renderers in src/ui/renderers/ handle attaching event listeners to Carbon
 * components and dispatching panel events with the semantic attribute data.
 *
 * @see /home/gumm/Workspace/zooy/src/ui/renderers/ for component renderers
 */

// Export semantic attributes utilities
export * from './attributes.js';
