# Panel Event Handler Migration Guide (v35.1.0+)

## Summary

Starting in **v35.1.0**, panel event handlers have been refactored from "baked-in" View methods to composable, opt-in handler collections. This improves separation of concerns and allows applications to explicitly choose which handlers they need.

## Breaking Changes

### 1. Removed Event Handlers

The following panel event handlers have been **permanently removed** as they were unused:

#### SearchHandlers
- ❌ **`search_by_qdict`** - Query parameter-based search handler

#### QueryParamHandlers
- ❌ **`add_q_dict_kv`** - Add key-value to query parameters
- ❌ **`remove_q_dict_k`** - Remove key from query parameters

#### NavigationHandlers (entire module removed)
- ❌ **`nav_back`** - Browser back navigation handler

**Impact:** If your application uses any of these handlers via `data-zv` attributes in templates, you will need to implement replacement handlers or refactor the functionality.

**Example of removed usage:**
```html
<!-- This will NO LONGER WORK -->
<form data-zv="search_by_qdict" ...>
<button data-zv="add_q_dict_kv" data-zqdictkey="filter" data-zqdictvalue="active">
<button data-zv="nav_back">Back</button>
```

### 2. Handler Architecture Changes

**Before (v35.0.x and earlier):**
All handlers were automatically registered in the base View class. Applications got all handlers whether they used them or not.

**After (v35.1.0+):**
Handlers are organized into composable collections that applications can explicitly register.

#### Available Handler Collections

Located in `zooy/handlers`, exported via `zooy.handlers`:

1. **MdcTreeHandlers** - MDC tree component interactions
   - `toggle_tree`
   - `tree_toggle-children`

2. **SearchHandlers** - Search functionality
   - `search` - Query string construction search
   - `reset_search` - Clear search form

3. **QueryParamHandlers** - Pagination and filtering
   - `paginate` - Handle pagination
   - `list_filter` - Apply list filters

## Migration Path

### Option 1: Continue Using Legacy Handlers (Temporary)

For backwards compatibility, `SearchHandlers` and `QueryParamHandlers` are **temporarily** still imported into the base View class. Your existing code using these handlers will continue to work:

**Still works (for now):**
```html
<form data-zv="search" ...>          <!-- ✅ Still works -->
<button data-zv="reset_search">      <!-- ✅ Still works -->
<button data-zv="paginate">          <!-- ✅ Still works -->
<button data-zv="list_filter">       <!-- ✅ Still works -->
```

⚠️ **This is temporary** and will be removed in a future version.

### Option 2: Explicit Handler Registration (Recommended)

Migrate to explicitly registering the handlers your application needs:

**Step 1:** Import handler collections
```javascript
import zooy from 'zooy';
const {SearchHandlers, QueryParamHandlers, MdcTreeHandlers} = zooy.handlers;
```

**Step 2:** Create a base view with explicit registration
```javascript
class MyBaseView extends zooy.View {
  initPanelEvents() {
    super.initPanelEvents();

    // Register only the handlers you need
    this.addHandlers(SearchHandlers);
    this.addHandlers(QueryParamHandlers);
    this.addHandlers(MdcTreeHandlers);
  }

  addHandlers(handlerCollection) {
    Object.entries(handlerCollection).forEach(([name, fn]) => {
      this.mapPanEv(name, fn.bind(this));
    });
  }
}
```

**Step 3:** Extend from your base view
```javascript
class UserView extends MyBaseView {
  // Automatically gets all registered handlers
}
```

### Option 3: Selective Handler Registration

Register only specific handlers your view needs:

```javascript
class DashboardView extends zooy.View {
  initPanelEvents() {
    super.initPanelEvents();

    // Only register search handlers for this view
    const {SearchHandlers} = zooy.handlers;
    this.addHandlers(SearchHandlers);
  }

  addHandlers(handlerCollection) {
    Object.entries(handlerCollection).forEach(([name, fn]) => {
      this.mapPanEv(name, fn.bind(this));
    });
  }
}
```

## Replacing Removed Handlers

If you were using any of the removed handlers, here are migration strategies:

### Replacing `search_by_qdict`

The removed handler used query parameter management. Use the remaining `search` handler or create a custom one:

**Custom replacement:**
```javascript
class MyView extends zooy.View {
  initPanelEvents() {
    super.initPanelEvents();

    this.mapPanEv('search_by_qdict', (eventData, ePanel) => {
      const qString = eventData.formData.q;
      if (qString !== '') {
        ePanel.addToQParams('q', qString);
      } else {
        ePanel.removeFromQParams('q');
      }
      this.user.fetchAndSplit(ePanel.uri, ePanel.abortController.signal).then(
        s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
      );
    });
  }
}
```

### Replacing `add_q_dict_kv` and `remove_q_dict_k`

These were generic query parameter manipulators. Implement specific handlers for your use cases:

```javascript
this.mapPanEv('add_filter', (eventData, ePanel) => {
  ePanel.addToQParams(eventData.filterKey, eventData.filterValue);
  this.user.fetchAndSplit(ePanel.uri, ePanel.abortController.signal).then(
    s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
  );
});

this.mapPanEv('remove_filter', (eventData, ePanel) => {
  ePanel.removeFromQParams(eventData.filterKey);
  this.user.fetchAndSplit(ePanel.uri, ePanel.abortController.signal).then(
    s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
  );
});
```

### Replacing `nav_back`

Use standard browser navigation or create a custom handler:

```javascript
this.mapPanEv('nav_back', (_eventData, _ePanel) => {
  history.back();
});
```

## Framework-Level Events (Always Available)

These events remain built into the base View class:

- `destroy_me` - Remove a panel from the view
- `switch_view` - Navigate to a different view

These do not need to be registered.

## Architecture Benefits

This refactoring provides several benefits:

1. **Explicit Dependencies** - Applications declare which handlers they need
2. **Smaller Bundles** - Only bundle handlers you actually use (once legacy imports removed)
3. **Better Separation** - Framework code vs. application patterns clearly separated
4. **MDC Isolation** - MDC-specific handlers no longer coupled to core View
5. **Easier Testing** - Test only the handlers your application uses
6. **Clear Migration Path** - Gradually adopt new pattern without breaking existing code

## Finding Handler Usage in Templates

Handler usage can be hidden in Django templates via variables and filters:

**Literal usage (easy to find with grep):**
```html
<button data-zv="search">
```

**Variable usage (harder to find):**
```html
<button data-zv="{{ search_handler }}">
<form data-zv="{{ handler|default:'search' }}">
```

**Search strategies:**
```bash
# Find literal handler usage
grep -r 'data-zv="handler_name"' templates/

# Find template variables that might be handlers
grep -r 'data-zv=.*{' templates/

# Find Django default filters
grep -r 'default:.*search\|paginate\|filter' templates/
```

## Timeline

- **v35.1.0** - SearchHandlers and QueryParamHandlers temporarily imported in View (current)
- **v36.0.0** (planned) - Remove temporary imports, require explicit registration
- **v37.0.0** (planned) - Remove MDC handlers entirely (Carbon migration complete)

## Testing Your Migration

After migrating to explicit handler registration:

1. **Verify no console errors** - Check browser console for "NO EVENT MATCH" errors
2. **Test each handler** - Click through all forms, searches, pagination, filters
3. **Check Django templates** - Ensure all `data-zv` attributes have registered handlers
4. **Test MDC components** - If using MDC trees, verify tree handlers work

## Questions?

Contact: Jan Badenhorst <janhendrik.badenhorst@gmail.com>

## Resources

- [Handler Source Code](./src/ui/handlers/)
- [View Architecture](./src/ui/view.js)
- [Example Implementation](../z2/static/js/src/views/viewExtended.js)
