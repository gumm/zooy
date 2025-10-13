# Error Handling Analysis - Zooy Codebase

**Date:** 2025-10-13
**Analysis Scope:** Complete error handling review across JavaScript source files

---

## Executive Summary

The Zooy codebase exhibits multiple inconsistencies in error handling patterns. While some areas demonstrate good practices (Error objects, proper error logging), other areas suffer from silent failures, mixed console logging approaches, and inconsistent Promise rejection patterns.

**Key Findings:**
- Mixed use of Error objects vs strings in Promise.reject()
- Inconsistent error logging (console.log vs console.error)
- Silent error swallowing in catch blocks
- The `genCatchClause` pattern needs review
- Empty catch blocks in production code

---

## 1. Promise.reject() Patterns

### 1.1 Good Practice: Using Error Objects

**Location:** `/home/gumm/Workspace/zooy/src/user/usermanager.js`

```javascript
// Line 61: ✅ GOOD - Using Error object
return Promise.reject(new Error(`${response.url} ${response.status} (${response.statusText})`));

// Line 301: ✅ GOOD - Using Error object
return Promise.reject(new Error(`JWT ${data['non_field_errors']}`));
```

**Why this is good:** Error objects provide stack traces and proper error context for debugging.

---

### 1.2 Bad Practice: Using Plain Strings

**Location:** `/home/gumm/Workspace/zooy/src/user/usermanager.js`

```javascript
// Line 91: ❌ BAD - Plain string
err => Promise.reject(`Could not get JSON from response: ${err}`)

// Line 103: ❌ BAD - Plain string
err => Promise.reject(`Could not get text from response: ${err}`)
```

**Location:** `/home/gumm/Workspace/zooy/src/ui/panel.js`

```javascript
// Line 218: ❌ BAD - Plain string
return Promise.reject('No user');

// Line 298: ❌ BAD - Plain string
return Promise.reject('No user');
```

**Location:** `/home/gumm/Workspace/zooy/src/ui/form.js`

```javascript
// Line 320: ❌ BAD - Plain string
return Promise.reject('No user');

// Line 396: ❌ BAD - Plain string
return Promise.reject('Form has errors');
```

**Impact:** These plain string rejections lose stack trace information and make debugging harder.

**Recommendation:** Convert all string rejections to Error objects:
```javascript
// Before
return Promise.reject('No user');

// After
return Promise.reject(new Error('No user'));
```

---

## 2. catch() Block Patterns

### 2.1 The genCatchClause Pattern

**Location:** `/home/gumm/Workspace/zooy/src/user/usermanager.js` (Lines 236-244)

```javascript
const genCatchClause = (debugString, returnValue = void 0) => err => {
  stopSpin('').then(identity);
  if (err.name === 'AbortError') {
    console.log(debugString, 'ABORTED!');  // ⚠️ Should be console.debug or console.info
  } else {
    console.log(debugString, err);         // ❌ Should be console.error
  }
  return returnValue;
};
```

**Issues:**
1. **Inconsistent logging:** Uses `console.log` for errors instead of `console.error`
2. **Silent error swallowing:** Returns `returnValue` (often `undefined` or `{}`) which masks errors
3. **Used extensively:** Applied to 9+ different fetch operations throughout usermanager.js

**Usage examples:**
```javascript
// Line 378: Returns undefined, swallows error
const catchClause = genCatchClause('Form submit error');

// Line 430: Returns empty object, masks failure
const catchClause = genCatchClause(`fetchJson: ${uri}`, {});

// Line 402: Returns undefined
const catchClause = genCatchClause(`UMan Text GET Fetch: ${uri}`);
```

**Impact:**
- Errors are logged but the calling code continues as if nothing failed
- Makes it difficult to detect and handle network failures properly
- Empty objects or undefined returned can cause unexpected behavior downstream

**Recommendation:**
```javascript
const genCatchClause = (debugString, shouldRethrow = true) => err => {
  stopSpin('').then(identity);

  if (err.name === 'AbortError') {
    console.info(debugString, 'ABORTED');
    return undefined; // Expected behavior for aborts
  } else {
    console.error(debugString, err);
    if (shouldRethrow) {
      throw err; // Allow caller to handle
    }
    return undefined;
  }
};
```

---

### 2.2 Inconsistent Error Handling in panel.js

**Location:** `/home/gumm/Workspace/zooy/src/ui/panel.js` (Lines 210-216)

```javascript
this.onRenderWithTemplateReply(s).catch(err => {
  if (err.message !== Component.compErrors().ALREADY_DISPOSED) {
    console.error('RenderWithTemplate Err:', err);  // ✅ Correct use of console.error
  }
});
```

**Good aspects:**
- Uses `console.error` appropriately
- Filters out expected errors (ALREADY_DISPOSED)
- Error doesn't propagate (intentional in this context)

**But inconsistent with:**

```javascript
// Line 216 & 296: Uses identity function which just returns the error
}).catch(identity);
```

**Issue:** The `catch(identity)` pattern returns the error value, which means:
- The promise resolves with the error as its value (not as a rejection)
- Calling code cannot distinguish between success and failure
- Errors are silently swallowed

---

### 2.3 Empty/Silent Catch Blocks

**Location:** `/home/gumm/Workspace/zooy/src/ui/component.js` (Lines 486-490)

```javascript
try {
  e[e.getAttribute('data-mdc-auto-init')].destroy();
} catch {
  // do nothing...  // ❌ Silent failure
}
```

**Issue:** Empty catch block suppresses all errors without logging. While this might be intentional (cleanup that might fail), it makes debugging difficult.

**Recommendation:**
```javascript
try {
  e[e.getAttribute('data-mdc-auto-init')].destroy();
} catch (error) {
  // Intentionally ignoring cleanup errors during disposal
  console.debug('MDC cleanup error (non-critical):', error);
}
```

---

## 3. try/catch Patterns

### 3.1 Good Example with Logging

**Location:** `/home/gumm/Workspace/zooy/src/ui/mdc/mdc.js` (Lines 465-472)

```javascript
try {
  mdcSelect.selectedIndex = htmSelectField.options.selectedIndex;
} catch (e) {
  console.log("Error:",  // ❌ Should be console.error
    htmSelectField.options.selectedIndex,
    htmSelectField, mdcSelect,
    mdcSelect.selectedIndex, e);
}
```

**Good:** Logs comprehensive debug information
**Bad:** Uses `console.log` instead of `console.error`

**Recommendation:**
```javascript
try {
  mdcSelect.selectedIndex = htmSelectField.options.selectedIndex;
} catch (e) {
  console.error("MDC Select index sync error:", {
    targetIndex: htmSelectField.options.selectedIndex,
    htmSelectField,
    mdcSelect,
    currentIndex: mdcSelect.selectedIndex,
    error: e
  });
}
```

---

## 4. Console Logging Inconsistencies

### 4.1 Error Logging with console.log (INCORRECT)

All instances where errors are logged with `console.log` instead of `console.error`:

| File | Line | Code |
|------|------|------|
| `usermanager.js` | 239 | `console.log(debugString, 'ABORTED!')` |
| `usermanager.js` | 241 | `console.log(debugString, err)` |
| `mdc.js` | 468 | `console.log("Error:", ...)` |
| `dom/utils.js` | 490 | `console.log("loopIndex: ", ...)` |

**Note:** Line 490 in dom/utils.js appears to be debug logging, not error logging.

---

### 4.2 Correct Error Logging with console.error

**Location:** `/home/gumm/Workspace/zooy/src/ui/panel.js` (Line 212)

```javascript
console.error('RenderWithTemplate Err:', err);  // ✅ CORRECT
```

This is the ONLY instance of proper `console.error` usage for errors in the analyzed files.

---

### 4.3 Unhandled Event Logging

**Location:** `/home/gumm/Workspace/zooy/src/ui/conductor.js` (Line 123)

```javascript
console.log('Unhandled VIEW Event:', e, eventValue, eventData, eView);
```

**Recommendation:** This should use `console.warn` to indicate potential issues:
```javascript
console.warn('Unhandled VIEW Event:', e, eventValue, eventData, eView);
```

---

## 5. Error Message Consistency

### 5.1 Consistent Patterns

Good examples of consistent error messages:

**usermanager.js:**
```javascript
// All fetch operations follow similar pattern
genCatchClause('Form submit error');
genCatchClause(`UMan Text GET Fetch: ${uri}`);
genCatchClause(`fetchJson: ${uri}`, {});
genCatchClause(`fetchAndSplit: ${uri}`);
genCatchClause(`patchJson: ${uri}`);
```

### 5.2 Vague Error Messages

**Location:** Multiple files

```javascript
// Too vague - which user? what context?
return Promise.reject('No user');

// Too vague - which form? what errors?
return Promise.reject('Form has errors');
```

**Recommendation:** Add context:
```javascript
return Promise.reject(new Error(`No UserManager instance available for ${this.constructor.name}`));
return Promise.reject(new Error(`Form validation failed: ${hasErrors.length} error(s) found`));
```

---

## 6. Specific File Analysis

### 6.1 usermanager.js

**Lines analyzed:** 236-244, 378, 392, 408, 420, 437, 453, 469, 485, 501

**Patterns:**
- ✅ Good: Consistent error handling strategy via `genCatchClause`
- ❌ Bad: All errors logged with `console.log` instead of `console.error`
- ❌ Bad: Silent error swallowing (returns undefined or empty objects)
- ⚠️ Warning: String rejections in lines 91, 103 instead of Error objects

**Priority fixes:**
1. Change `console.log` to `console.error` in genCatchClause
2. Consider re-throwing errors instead of returning fallback values
3. Convert string rejections to Error objects

---

### 6.2 panel.js

**Lines analyzed:** 210-218, 296, 298

**Patterns:**
- ✅ Good: One instance of proper `console.error` usage (line 212)
- ❌ Bad: Inconsistent error handling with `catch(identity)`
- ❌ Bad: String rejections without Error objects

**Priority fixes:**
1. Remove `catch(identity)` pattern - either handle errors or propagate them
2. Convert string rejections to Error objects
3. Add context to "No user" errors

---

### 6.3 form.js

**Lines analyzed:** 320, 396

**Patterns:**
- ❌ Bad: String rejections without Error objects
- ⚠️ Warning: "Form has errors" rejection happens silently without logging

**Priority fixes:**
1. Convert string rejections to Error objects
2. Add error logging before rejection in processSubmitReply

---

### 6.4 component.js

**Lines analyzed:** 486-490

**Patterns:**
- ❌ Bad: Empty catch block silently swallows all errors
- ⚠️ Context: This is in the `dispose()` method, so some failures may be expected

**Priority fixes:**
1. Add debug logging to empty catch block
2. Document why errors are being suppressed

---

### 6.5 mdc.js

**Lines analyzed:** 465-472

**Patterns:**
- ✅ Good: Comprehensive error logging with context
- ❌ Bad: Uses `console.log` instead of `console.error`

**Priority fixes:**
1. Change `console.log` to `console.error`

---

### 6.6 view.js & conductor.js

**No error handling issues found.** These files properly throw errors when needed:

```javascript
// conductor.js line 49
if (!this.split_) {
  throw new Error('No SPLIT component available');
}

// view.js line 197
if (!this.split_) {
  throw new Error('No SPLIT component available');
}
```

---

## 7. Recommendations Summary

### High Priority (Critical)

1. **Replace console.log with console.error for all error logging**
   - Files: `usermanager.js` (lines 239, 241), `mdc.js` (line 468)
   - Impact: Proper error visibility in production

2. **Convert all Promise.reject(string) to Promise.reject(new Error(string))**
   - Files: `usermanager.js` (lines 91, 103), `panel.js` (lines 218, 298), `form.js` (lines 320, 396)
   - Impact: Proper stack traces for debugging

3. **Review genCatchClause pattern**
   - File: `usermanager.js` (lines 236-244)
   - Impact: Stop silently swallowing errors

### Medium Priority (Important)

4. **Remove catch(identity) pattern**
   - File: `panel.js` (lines 216, 296)
   - Impact: Proper error propagation

5. **Add logging to empty catch blocks**
   - File: `component.js` (line 488)
   - Impact: Better debugging capability

6. **Improve error message specificity**
   - Add context to vague messages like "No user" and "Form has errors"

### Low Priority (Nice to Have)

7. **Use console.warn for unhandled events**
   - File: `conductor.js` (line 123)

8. **Standardize error message format**
   - Create consistent patterns across the codebase

---

## 8. Proposed Error Handling Standards

### Standard 1: Promise Rejections
```javascript
// ❌ BAD
return Promise.reject('Error message');

// ✅ GOOD
return Promise.reject(new Error('Error message with context'));
```

### Standard 2: Error Logging
```javascript
// ❌ BAD
console.log('Error:', error);

// ✅ GOOD
console.error('Operation failed:', error);

// ✅ ALSO GOOD (for expected/handled errors)
console.warn('Handled error:', error);
console.info('Aborted operation:', reason);
```

### Standard 3: Catch Blocks
```javascript
// ❌ BAD - Silent swallowing
.catch(() => {});

// ❌ BAD - Returns fallback without logging
.catch(() => ({}));

// ✅ GOOD - Log and handle
.catch(error => {
  console.error('Operation failed:', error);
  return fallbackValue;
});

// ✅ GOOD - Log and rethrow
.catch(error => {
  console.error('Operation failed:', error);
  throw error;
});
```

### Standard 4: Try/Catch
```javascript
// ❌ BAD
try {
  riskyOperation();
} catch {}

// ✅ GOOD
try {
  riskyOperation();
} catch (error) {
  console.error('Risky operation failed:', error);
  // Handle or rethrow as appropriate
}
```

---

## 9. Migration Strategy

### Phase 1: Critical Fixes (Immediate)
1. Update all `console.log(error)` to `console.error(error)`
2. Convert string Promise rejections to Error objects
3. Fix genCatchClause to use console.error

### Phase 2: Pattern Improvements (Next Sprint)
1. Review and fix catch(identity) patterns
2. Add logging to empty catch blocks
3. Improve error message specificity

### Phase 3: Standardization (Ongoing)
1. Document error handling standards
2. Add linting rules to enforce standards
3. Review new code for compliance

---

## 10. Testing Recommendations

After implementing fixes:

1. **Test error visibility:**
   - Verify all errors appear in browser console with proper severity
   - Confirm stack traces are available for all errors

2. **Test error propagation:**
   - Verify critical errors still cause operations to fail appropriately
   - Confirm user-facing error messages are meaningful

3. **Test error recovery:**
   - Verify AbortError handling still works correctly
   - Confirm cleanup operations handle errors gracefully

---

## Appendix: Complete Error Pattern Inventory

### Promise.reject() Calls
- Total found: 8
- With Error objects: 2 (25%)
- With strings: 6 (75%)

### .catch() Handlers
- Total found: 13
- With proper error logging: 1 (8%)
- With console.log (incorrect): 9 (69%)
- Silent (identity or empty): 3 (23%)

### try/catch Blocks
- Total found: 2
- With logging: 1 (50%)
- Silent (empty catch): 1 (50%)

### Console Methods Used for Errors
- console.log: 11 instances
- console.error: 1 instance
- Ratio: 11:1 (should be 0:11)

---

**End of Report**
