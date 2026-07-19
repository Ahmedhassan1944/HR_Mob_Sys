# DocumentsCenter.js — Fix: Return Plain Objects Instead of JSON Strings

> Paste this entire prompt into your AI IDE exactly as-is.

---

## Context

`DocumentsCenter.js` was just created. All 4 `api_*` functions currently wrap their
return values with `JSON.stringify(...)`.

The frontend's `GAS.call()` passes the server response directly to the caller without
any JSON parsing. This means the frontend receives a raw **string** instead of an
**object**, causing `res.success`, `res.candidates`, etc. to always be `undefined` and
the entire Documents Center view to fail immediately on load.

The correct pattern used everywhere else in this codebase (see `Code.js`) is to return
a **plain object** directly: `return { success: true, data: ... }`.

---

## Task

Edit **only** `DocumentsCenter.js`.

Apply this single rule to every return statement in the file:

> Remove the `JSON.stringify()` wrapper and return the plain object literal as-is.

### Rule

```js
// BEFORE (wrong)
return JSON.stringify({ success: true, ... });
return JSON.stringify({ success: false, error: e.message });

// AFTER (correct)
return { success: true, ... };
return { success: false, error: e.message };
```

### Locations to fix (every return in the file — 9 occurrences total)

| Function | Return type | Fix |
|---|---|---|
| `api_getDocumentsCenterData` | success return | remove `JSON.stringify` |
| `api_getDocumentsCenterData` | catch return | remove `JSON.stringify` |
| `api_batchDownloadZip` | "no files" early return | remove `JSON.stringify` |
| `api_batchDownloadZip` | success return | remove `JSON.stringify` |
| `api_batchDownloadZip` | catch return | remove `JSON.stringify` |
| `api_getDocumentPreviewInfo` | "not found" early return | remove `JSON.stringify` |
| `api_getDocumentPreviewInfo` | success return | remove `JSON.stringify` |
| `api_getDocumentPreviewInfo` | catch return | remove `JSON.stringify` |
| `api_getDocumentsCenterFilterOptions` | success return | remove `JSON.stringify` |
| `api_getDocumentsCenterFilterOptions` | catch return | remove `JSON.stringify` |

---

## Constraints

- Do **NOT** change any logic, variable names, object structure, or comments.
- Do **NOT** touch any other file.
- Only remove `JSON.stringify(` at the start and the matching `)` at the end of each
  return statement — keep the object literal inside exactly as it is.

---

## Output

Produce the complete updated content of `DocumentsCenter.js` with all `JSON.stringify`
wrappers removed from every return statement.
