# Strategic Direction & Developer Experience

**Date:** 2025-10-17
**Context:** Architectural review and DX planning for zooy + django-zooy + z2 ecosystem

## Vision Statement

Building an internal framework optimized for Trinity Telecomms' specific use cases:
- **Opinionated** where it helps productivity
- **Sensible defaults** for common cases
- **Escape hatches** for power users
- **Junior-friendly** with clear patterns and excellent error messages

**Key Principle:** We're not building the next React. We're building the best tool for *our* team to build Django-backed applications efficiently.

---

## Why Custom Framework (Not React/Vue/etc.)

### Advantages for Internal Use
1. **Control**: We own the architecture and can adapt to our needs
2. **Integration**: Built specifically for Django server-rendered patterns
3. **No Framework Churn**: Not dependent on external roadmaps
4. **Focused Scope**: Only what we need, not kitchen-sink solutions
5. **Learning Curve**: Juniors learn *our* patterns, applicable across all projects

### Trade-offs We Accept
1. **Maintenance Burden**: We own bugs and features
2. **Hiring Friction**: New devs won't know it (but can learn)
3. **Limited Ecosystem**: No massive plugin library
4. **Tooling Gap**: We build our own devtools/analyzers

**Decision:** For an internal team with clear requirements, these trade-offs are acceptable.

---

## Architectural Strengths (Current)

### 1. Component Lifecycle
```
Create → Render → EnterDocument → Ready → ExitDocument → Dispose
```
- **Explicit and predictable**
- Automatic cleanup prevents memory leaks
- Maps well to mental models
- Easy to debug

### 2. Panel-Based Architecture
Panels fetch their own content from URIs:
- Server logic stays on server (Django templates/views)
- Client code focuses on interaction, not rendering
- Junior-friendly: "This panel shows `/api/devices/123`"
- Easy AJAX updates without complex state management

### 3. EventTarget-Based Events
- Uses native browser API (no custom event system)
- Familiar to all JS developers
- Debuggable in DevTools
- Performant

### 4. ComponentLibraryRegistry Pattern
UI libraries as **swappable renderers**:
- Not locked to MDC or Carbon
- Lazy loading of components
- Per-component cleanup
- Add new libraries without rewriting app code

**Assessment:** These foundational patterns are solid for long-term scaling.

---

## Architectural Gaps to Address

### 1. Form State Management

**Current State:** Forms validated Django-side, but missing:
- Unsaved changes warnings
- Multi-step wizards
- Conditional field display (Field B appears when Field A checked)
- Client-side validation feedback (before server round-trip)

**Recommendation:**
```javascript
class FormPanel extends Panel {
  trackChanges = true;     // Auto-warn on navigation with unsaved changes
  validateOnBlur = true;   // Client-side feedback

  // Hooks for common patterns
  onFieldChange(fieldName, value) { }
  showConditionalFields(conditions) { }
}
```

### 2. Error Handling Patterns

**Current State:** No standardized error handling.

**Needed:**
- Network failure during panel load
- Server returns 403/500
- Form submission fails
- Validation errors

**Recommendation:**
```javascript
panel.onLoadError = (error) => {
  // Default: show friendly error UI
  // Override: custom behavior
};

panel.onSubmitError = (error) => {
  // Default: show form errors
  // Override: custom behavior
};
```

**Key:** One obvious way. Juniors will copy the first pattern they see.

### 3. Inter-Panel Communication

**Scenario:**
- Panel A edits a device
- Panel B shows device list
- How does B know to refresh?

**Recommendation:**
```javascript
// Panel A emits event
this.dispatch('device:updated', {id: 123});

// Panel B listens
this.on('device:updated', (data) => {
  this.refresh(); // Built-in method
});
```

Need clear patterns for:
- Direct panel-to-panel communication
- Global state changes (user logged out, etc.)
- Bulk updates (refresh all panels of type X)

### 4. Loading States

**Current State:** Global spinner (`#the_loader`)

**Modern UX Needs:**
- Skeleton screens
- Inline spinners for panel updates
- Optimistic updates (show change immediately, revert on error)

**Recommendation:**
```javascript
panel.loadingState = 'spinner' | 'skeleton' | 'none';
panel.showOptimistic = true; // Show changes immediately
```

### 5. Accessibility

**Must-haves:**
- Tab order management in split panels
- Focus management after AJAX updates
- ARIA live regions for dynamic content
- Keyboard shortcuts (close modal with Esc, etc.)

**Build into lifecycle now** - hard to retrofit later.

### 6. Developer Debugging

**Current:** `debugMode` on Conductor

**Expand to:**
- Log all panel loads with timing
- Visualize component tree (interactive tree view)
- Track event propagation (which events fired, in what order)
- Detect memory leaks (components not disposed)
- Network inspector (which panels loaded what URIs)

**Make debugging stupidly easy** and juniors will love you.

---

## Developer Experience Principles

### 1. Make the Happy Path Trivial

**Current Setup (from z2):**
```javascript
const c = new zooy.Conductor();
const u = new zooy.UserManager(user);
const s = new zooy.Split();
s.domFunc = () => document.getElementById('root');
s.render();
s.addSplit(undefined, 'EW', size_A, size_C, ...);
s.addSplit(s.getNest('A'), 'NS', ...);
c.user = u;
c.split = s;
c.registerViewConstructor('account', ...);
```

**Ideal for Juniors:**
```javascript
const app = zooy.createApp({
  root: '#root',
  user: userData,
  layout: 'sidebar-main', // Pre-configured layouts
  routes: {
    '/login': LoginView,
    '/account': AccountView
  }
});
app.start();
```

Power users can still instantiate Conductor/Split/UserManager manually, but give juniors **training wheels**.

### 2. Convention Over Configuration

**Django:**
```python
class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = '__all__'
        form_mixin = 'carbon'  # One line → everything wired
```

**JavaScript:**
```javascript
// Convention: panel fetches from /api/{view_name}/{panel_name}/
class DeviceDetailPanel extends zooy.Panel {
  uri = 'device-detail'; // Auto-resolves
}
```

### 3. Error Messages That Teach

**Bad:**
```
Error: Cannot read property 'render' of undefined
```

**Good:**
```
❌ Panel not initialized before render()
💡 Tip: Call panel.createDom() before panel.render()
📖 https://docs.zooy/lifecycle#rendering
🔍 Component: DeviceDetailPanel at src/panels/device.js:42
```

**Another Example:**
```
❌ Memory leak detected: 3 panels not disposed
   - DevicePanel (created 2 min ago)
   - UserPanel (created 45 sec ago)
   - SettingsPanel (created 30 sec ago)
💡 Tip: Call panel.dispose() when removing from DOM
📖 https://docs.zooy/lifecycle#disposal
```

### 4. Code Generation

**CLI Tools:**
```bash
zooy generate view AccountView
zooy generate panel DeviceForm --type=form
zooy generate widget CarbonDatePicker --library=carbon
```

Generates boilerplate with:
- Inline comments explaining each method
- Links to relevant docs
- TODO comments for customization points

### 5. Interactive Documentation

Not just markdown - build a **live playground**:
- Edit zooy code in browser
- See results immediately
- Examples for every component
- Copy button for code snippets

**Host in z2** at `/docs/playground` - dogfood your own framework.

---

## Foundation Checklist

Before expanding scope, lock these down:

### Critical Path
- [ ] **Canonical error handling** - One obvious way for network/server/validation errors
- [ ] **Form state management** - Unsaved changes detection, conditional fields
- [ ] **Panel refresh/invalidation** - When data changes elsewhere
- [ ] **Loading states** - Skeleton, spinner, optimistic updates
- [ ] **Accessibility fundamentals** - Focus management, ARIA, keyboard nav

### Developer Experience
- [ ] **Debug tooling** - Visual component tree, event log, memory leak detection
- [ ] **"Hello World" app** - 5 lines of code, fully functional
- [ ] **Migration guides** - Old patterns → new best practices
- [ ] **Error messages** - Helpful, actionable, with links to docs

### Code Quality
- [ ] **Unit tests** - Core component lifecycle, event system
- [ ] **Integration tests** - Panel loading, form submission, view switching
- [ ] **Visual regression** - Component rendering consistency
- [ ] **Performance benchmarks** - Bundle size, time-to-interactive

### Documentation
- [ ] **Patterns over APIs** - "How to build CRUD forms" not "Panel constructor args"
- [ ] **Live playground** - Interactive examples
- [ ] **Video walkthroughs** - 5-min "building your first view"
- [ ] **Troubleshooting guide** - Common errors and solutions

---

## Recommended Priorities

### Phase 1: Foundations (Now)
**Goal:** Bulletproof the core architecture

1. **Standardize error handling patterns**
   - Add onLoadError, onSubmitError hooks to Panel
   - Create default error UI components
   - Document the pattern

2. **Form state management**
   - Build FormPanel with trackChanges
   - Add unsaved changes warning
   - Create conditional fields helper

3. **Loading states**
   - Add loadingState config to Panel
   - Create skeleton screen components
   - Document optimistic update pattern

4. **Basic debugging**
   - Enhance debugMode to log component lifecycle
   - Add memory leak detection
   - Create simple component tree viewer

### Phase 2: Developer Experience (Next 1-2 months)
**Goal:** Make it delightful for juniors

1. **zooy.createApp() helper**
   - Pre-configured layouts (sidebar, navbar, etc.)
   - Route mapping
   - Automatic library registration

2. **Better error messages**
   - Add context (component name, file, line)
   - Suggest fixes
   - Link to docs

3. **Code generators**
   - CLI to scaffold views, panels, widgets
   - Templates with inline docs

4. **Live playground**
   - Host in z2 at `/docs/playground`
   - Editable examples for all components

### Phase 3: Maturity (3-6 months)
**Goal:** Production-grade quality

1. **Comprehensive testing**
   - Unit tests for all core classes
   - Integration tests for common flows
   - Visual regression tests

2. **Performance optimization**
   - Bundle size analysis
   - Lazy loading optimization
   - Benchmark against industry standards

3. **Advanced patterns**
   - Websocket integration
   - Real-time updates
   - Offline support

4. **Team training**
   - Internal workshop series
   - Video tutorials
   - Code review guidelines

---

## Success Metrics

### For Developers
- **Time to first view:** New dev builds working view in < 30 min
- **Bug resolution:** Debug common issues in < 5 min with error messages
- **Code consistency:** 90%+ of code follows documented patterns

### For Framework
- **Test coverage:** 80%+ for core classes
- **Performance:** Time-to-interactive < 2s on 3G
- **Bundle size:** < 100KB for base framework (gzipped)

### For Organization
- **Code reuse:** 50%+ of UI code shared across projects
- **Onboarding:** Juniors productive in < 1 week
- **Maintenance:** < 20% of dev time on framework maintenance

---

## Decision Log

### Why Not...

**React/Vue/Angular?**
- We'd be building on their abstractions, not our own
- Framework churn is real (React Hooks, Vue 3 Composition API, etc.)
- Doesn't integrate naturally with Django server-rendered patterns
- For internal team, control > ecosystem

**HTMX + AlpineJS?**
- HTMX is great for simple interactivity
- Doesn't handle complex SPAs well (split panels, view orchestration)
- No component lifecycle management
- Would need to build similar abstractions anyway

**Web Components (Lit/Stencil)?**
- Could be viable for UI components
- Still need application framework (routing, state, lifecycle)
- zooy + Lit for custom components is possible future path

**Conclusion:** For our use case (internal team, Django-centric, complex UIs), custom framework with clear patterns is the right call.

---

## Open Questions

1. **How do we handle real-time updates?** (Websockets, SSE, polling?)
2. **Should we support offline-first?** (Service workers, IndexedDB?)
3. **Mobile strategy?** (Responsive web app or native bridge?)
4. **Charting/data viz?** (Integrate D3? Build abstractions?)
5. **Internationalization?** (i18n strategy for multi-language apps?)

---

## Next Steps

1. **Review this document with team** - Get buy-in on direction
2. **Prioritize Phase 1 tasks** - Create GitHub issues/todos
3. **Start with error handling** - High impact, clear scope
4. **Document as you go** - Every pattern gets an example

---

## Resources

- **Architecture docs:** `/docs/architecture/`
- **Migration guides:** `/docs/migration/`
- **Live demos:** `/docs/demos/`
- **TODO list:** `/docs/TODO.md`

---

**Document maintained by:** Core team
**Last updated:** 2025-10-17
**Next review:** When starting Phase 2
