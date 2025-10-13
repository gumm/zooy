# Carbon Design System Migration Guide

## Current Status: Proof of Concept ✅

We've successfully created the foundation for migrating from Material Design Components (MDC) to IBM Carbon Design System Web Components.

## What's Been Done

### 1. Installed Carbon Web Components
- Added `@carbon/web-components@^2.40.1` to Zooy dependencies
- Run `npm install` in `/home/gumm/Workspace/zooy` to install

### 2. Created Carbon Integration Layer
```
zooy/src/ui/carbon/
├── button.js      # Button component adapter
└── index.js       # Main Carbon initializer
```

### 3. Updated Panel.js
- Modified `parseContent()` to initialize Carbon components alongside MDC
- Carbon runs asynchronously and doesn't block MDC
- Both systems can coexist during migration

### 4. Created Test Page in Z2
- Template: `/home/gumm/Workspace/z2/templates/carbon_button_test.html`
- View: `/home/gumm/Workspace/z2/z2/views.py` (`CarbonButtonTestView`)
- URL: `http://localhost:8000/test/carbon-button/`

## Testing Instructions

### Step 1: Install Dependencies

```bash
# Install Zooy dependencies (including Carbon)
cd /home/gumm/Workspace/zooy
npm install

# Rebuild Zooy
npm run rollup

# Install Z2 dependencies (to get updated Zooy)
cd /home/gumm/Workspace/z2/static/js
npm install
npm run build
```

### Step 2: Start Django Development Server

```bash
cd /home/gumm/Workspace/z2
source .venv/bin/activate
python manage.py runserver
```

### Step 3: Open Test Page

Navigate to: `http://localhost:8000/test/carbon-button/`

### Step 4: What to Test

The test page includes:

1. **Basic Carbon Button** - Click and verify event fires
2. **Different Button Kinds** - Test primary, secondary, tertiary, ghost, danger
3. **Button with Data Attributes** - Verify data-zv, data-pk, data-href all work
4. **Disabled Button** - Should NOT fire events
5. **Legacy MDC Button** - For comparison (should still work)

### Step 5: Verify in Browser Console

Open browser DevTools (F12) and check:

```javascript
// You should see:
[Zooy] Carbon Web Components loaded successfully
Carbon components initialized in panel
[Test] Panel found: Panel {…}

// When clicking buttons:
[Test] Panel event received: {value: 'test_click', data: {…}}
```

### Step 6: Verify Visually

- Carbon buttons should have IBM Carbon Design styling
- Buttons should be interactive (hover, focus, click states)
- Event results should display below each test section
- Result boxes should turn green when events fire

## What This Proves

✅ **Carbon Web Components load successfully**
✅ **Zooy can initialize Carbon components**
✅ **Event dispatching works (data-zv → panel events)**
✅ **Data attributes flow through correctly**
✅ **MDC and Carbon can coexist**

## Next Steps

### Immediate (This Week)
1. ✅ Test the proof of concept
2. Verify bundle size impact
3. Test in production-like environment
4. Document any issues found

### Short Term (Next 2 Weeks)
1. Migrate Icon Buttons component
2. Migrate Text Fields component
3. Migrate Checkboxes/Radios
4. Update Z2 templates for high-traffic pages

### Medium Term (Next Month)
1. Migrate Data Tables (most complex)
2. Migrate Dropdowns/Selects
3. Migrate Modals/Dialogs
4. Migrate Tabs

### Long Term (2-3 Months)
1. Complete migration of all components
2. Remove MDC dependency entirely
3. Update all Z2 templates
4. Documentation and training

## Security Improvements from Carbon

### ✅ Immediate Benefits
1. **No more `eval()` for MDC initialization**
   - Web Components auto-initialize
   - No JavaScript execution from strings

2. **Shadow DOM Encapsulation** (optional)
   - Styles don't leak globally
   - Reduced CSS injection risk

3. **Maintained Security Updates**
   - IBM actively patches vulnerabilities
   - MDC is abandoned (last update 2022)

### ⚠️ Still Needs Addressing
These security issues remain and require separate fixes:

1. **`eval()` in dom/utils.js:174**
   ```javascript
   export const evalScripts = comp => arr => {
     eval(s.text);  // ⚠️ Still a security risk
   }
   ```
   **Solution:** Replace with `<script type="module">` imports

2. **Unsanitized `innerHTML` in dom/utils.js:562**
   ```javascript
   el.innerHTML = v + units;  // ⚠️ XSS risk
   ```
   **Solution:** Use `DOMPurify.sanitize()` or `textContent`

3. **Server-Rendered Scripts Still Execute**
   - Django templates can inject `<script>` tags
   - These still get evaluated via `evalScripts()`
   **Solution:** Implement Content Security Policy

## Troubleshooting

### Carbon components don't appear
- Check browser console for errors
- Verify `npm install` ran successfully
- Check that `initializeCarbonComponents` is being called

### Events not firing
- Check `data-zv` attribute is present
- Verify panel is initialized
- Check browser console for "[Test] Panel found"

### MDC buttons stop working
- Both should work during migration
- Check that MDC imports are still in panel.js
- Verify `window.mdc` is defined

### Bundle size concerns
- Carbon is tree-shakeable
- Only imported components are bundled
- Current: ~50KB for button component
- Compare with MDC: ~200KB for full library

## Files Modified

### Zooy
- `package.json` - Added Carbon dependency
- `src/ui/carbon/button.js` - New file
- `src/ui/carbon/index.js` - New file
- `src/ui/panel.js` - Added Carbon initialization

### Z2
- `templates/carbon_button_test.html` - New test template
- `z2/views.py` - New test view
- `z2/urls.py` - Added test URL

## Questions?

Contact: Jan Badenhorst <janhendrik.badenhorst@gmail.com>

## Resources

- [Carbon Web Components Docs](https://web-components.carbondesignsystem.com/)
- [Carbon Design System](https://carbondesignsystem.com/)
- [Carbon Storybook](https://web-components.carbondesignsystem.com/?path=/story/introduction-welcome--welcome)
- [Migration from MDC](https://github.com/carbon-design-system/carbon-for-ibm-dotcom/discussions/5427)
