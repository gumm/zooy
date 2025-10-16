# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [35.1.1] - 2025-10-16

### Removed
- Removed unused panel event handlers:
  - `search_by_qdict` from SearchHandlers
  - `add_q_dict_kv` from QueryParamHandlers
  - `remove_q_dict_k` from QueryParamHandlers
  - `nav_back` from NavigationHandlers (entire module removed)

### Added
- Added comprehensive handler migration guide (`docs/migration/HANDLER_MIGRATION.md`)
- Organized documentation into structured `docs/` directory:
  - `docs/architecture/` - Architecture documentation
  - `docs/migration/` - Migration guides
  - `docs/guides/` - Usage guides
- Added standard project files (LICENSE, CHANGELOG.md, CONTRIBUTING.md)

### Changed
- Exported handler collections through public API (`zooy.handlers`)
- Sanitized documentation files for developer use (removed progress tracking)

## [35.1.0] - 2025-10-16

### Changed
- Refactored panel event handlers into composable, opt-in collections
- Extracted MDC-specific handlers into separate modules
- Updated View class to use new handler collection pattern

### Added
- Handler collection system:
  - `MdcTreeHandlers` - MDC tree component handlers
  - `SearchHandlers` - Search and filter handlers
  - `QueryParamHandlers` - URL query parameter handlers
  - `DialogHandlers` - Dialog/modal handlers
  - `FormHandlers` - Form submission handlers
- `addHandlers()` helper method for composing handler collections

## [35.0.0] - 2025

### Added
- Component Library Registry system for pluggable UI libraries
- Carbon Design System integration (IBM Carbon Web Components)
- Lazy-loading support for component libraries
- Dynamic component imports with caching
- Carbon icon sprite management
- Programmatic icon API

### Changed
- Refactored Panel to be component-library-agnostic
- Migrated from MDC-only to multi-library support
- Updated build system for code-splitting (Rollup)
- Improved bundling strategy (reduced initial bundle size)

### Deprecated
- Direct MDC integration (now isolated in `mdc/` modules)
- Tight coupling between Panel and component libraries

## Earlier Versions

Previous versions focused on MDC (Material Design Components) integration
and core framework features. See git history for detailed changes.

---

## Migration Guides

- **Handler Migration**: See `docs/migration/HANDLER_MIGRATION.md` for breaking changes in v35.1.0+
- **Carbon Migration**: See `docs/migration/CARBON_MIGRATION.md` for migrating from MDC to Carbon

## Links

- [Repository](https://github.com/gumm/zooy)
- [Issue Tracker](https://github.com/gumm/zooy/issues)
