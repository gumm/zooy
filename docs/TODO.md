# TODO - Next Steps

Last updated: 2025-10-16

## Current Status

✅ **Completed Today (v35.2.0):**
- Fixed Carbon modal component detection bug
- Implemented proper modal close event handling (destroy_me)
- Added HTML5 form attribute support for buttons outside forms
- Full documentation in CHANGELOG and code comments

## Next Steps

### 1. Remove Debug Logging
**Priority: High** (Before production)

Files to clean up:
- `src/ui/carbon/renderers.js` lines 782-828 (modal init logging)
- `src/ui/carbon/renderers.js` lines 1035, 1037, 1065, 1066, 1081, 1446, 1450, 1453, 1458 (general logging)

Search for: `console.log('[Carbon`

These were added for development/debugging and should be removed or converted to `this.debugMe()` calls.

### 2. Test Coverage
- Test modal close with ESC key
- Test modal close with backdrop click
- Test modal close with close button
- Test form submission from footer buttons
- Test form validation errors display

### 3. Expand Carbon Component Support
Consider adding renderers for:
- `cds-accordion` (forms with collapsible sections)
- `cds-notification` (form success/error messages)
- `cds-loading` (form submission states)
- Additional form inputs (date, file upload, etc.)

### 4. Performance Review
- Check if modal import caching is working correctly
- Review bundle size impact of Carbon components
- Consider lazy loading for rarely-used components

### 5. Carbon Migration Guide
Create `docs/migration/CARBON_MIGRATION.md`:
- Step-by-step guide for migrating MDC forms to Carbon
- Common pitfalls and solutions
- Side-by-side examples (MDC vs Carbon)

## Known Issues

None currently. Modal and form submission working perfectly.

## Questions for Discussion

1. Should we create a base `CarbonWidget` class to reduce boilerplate?
2. Do we want to support MDC and Carbon simultaneously, or full migration?
3. Should form error styling use Carbon's error states?

## Branch Status

- Branch: `documentation_and_refactor`
- Status: Ready to merge to master
- Commits: 3 new commits since last merge
- All tests: Passing
- Working tree: Clean

## Quick Reference

**Key files modified:**
- `src/ui/carbon/renderers.js` - Button and modal handlers
- `CHANGELOG.md` - Release notes

**New patterns implemented:**
- HTML5 `form="form-id"` attribute support
- Modal footer button submission
