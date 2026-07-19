# Fix: Backend logs "returning 54 candidates" but frontend receives `candidates: []`

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The GAS execution log shows:

```
DocumentsCenter: tbl_Candidates row count = 55
DocumentsCenter: filters received = {}
DocumentsCenter: returning 54 candidates
```

But the browser console shows:

```
[DC] Server returned success with 0 candidates. Raw response:
Object { candidates: [], stats: {…}, success: true, filterOptions: {…} }
```

This means the backend execution that the browser triggered is **not the same** as the one in the GAS log, OR the backend is returning an empty `candidates` array despite the internal log showing 54.

The GAS log with `filters received = {}` is most likely from a manual test run in the Apps Script editor where the function was called with no arguments. The browser sends a proper JSON string like `{"status":[],"department":[],"nationality":[],"position":[],"search":""}`.

We need to match the exact browser execution with its GAS log.

---

## Task

Apply the following changes to **both** `DocumentsCenter.js` and `Script.html`.

### A. Add a unique execution ID to the response in `DocumentsCenter.js`

At the top of `api_getDocumentsCenterData`, immediately after `try {`, add:

```javascript
var execId = 'dc-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100000);
Logger.log("DocumentsCenter: execution started [" + execId + "]");
```

Then modify the log lines to include the `execId`:

1. After `var cData = candidatesSheet.getDataRange().getValues();`:
```javascript
Logger.log("[" + execId + "] DocumentsCenter: tbl_Candidates row count = " + cData.length + ", headers = " + JSON.stringify(cData[0]));
```

2. After `var filteredCandidates = [];`:
```javascript
Logger.log("[" + execId + "] DocumentsCenter: filters received = " + (filtersJson || '{}'));
```

3. Before `return result;`:
```javascript
Logger.log("[" + execId + "] DocumentsCenter: finalCandidates.length = " + finalCandidates.length);
Logger.log("[" + execId + "] DocumentsCenter: RESULT candidates.length = " + result.candidates.length);
Logger.log("[" + execId + "] DocumentsCenter: returning result = " + JSON.stringify(result).substring(0, 500));
return result;
```

Also, add `execId` to the returned `result` object so the browser can print it:

```javascript
var result = {
  success: true,
  execId: execId,   // DEBUG: remove after fixing
  candidates: finalCandidates,
  ...
};
```

### B. Log the execution ID in the frontend `_dcLoad` in `Script.html`

Replace the debug block in `_dcLoad` (around the console logs) with:

```javascript
console.log('[DC] raw response:', res);
console.log('[DC] execId:', res && res.execId);
console.log('[DC] res.candidates count:', res && res.candidates ? res.candidates.length : 'MISSING');
```

Then add a visible execution ID to the temporary debug banner so the user can match it with GAS logs:

```html
<!-- Temporary debug banner — remove after fixing -->
<div style="background:#fffbe6;border:1px solid #ffe58f;padding:8px 12px;border-radius:6px;margin-bottom:var(--sp-3);font-size:.8rem;color:#614700;">
  <strong>Debug:</strong> ExecID = <span id="dc-debug-execid">?</span> | 
  Candidates loaded = <span id="dc-debug-count">?</span>
</div>
```

And update the `_dcDebugUpdate` function (or add it if not present) to set the execId:

```javascript
_dcDebugUpdate() {
  const dc = App.state.documentsCenter;
  const count = dc.candidates ? dc.candidates.length : 'undefined';
  document.getElementById('dc-debug-count').textContent = count;
  if (res && res.execId) {
    document.getElementById('dc-debug-execid').textContent = res.execId;
  }
},
```

Call `_dcDebugUpdate()` right after setting `dc.candidates` in the success path of `_dcLoad`.

### C. Make sure the backend filters do not exclude candidates when filtersJson is `{}`

In `api_getDocumentsCenterData`, check the filter parsing at the top:

```javascript
var filters = filtersJson ? JSON.parse(filtersJson) : {};
```

This is correct. But add a safety log to print what `filters` actually contains after parsing:

```javascript
Logger.log("[" + execId + "] DocumentsCenter: parsed filters = " + JSON.stringify(filters));
```

This will show whether the function received an empty object or the expected empty arrays.

---

## How to test after applying

1. Run `clasp push` and `clasp deploy`.
2. Open the web app in a browser.
3. Open the browser console (F12 → Console).
4. Open the Documents Center.
5. Look at the yellow debug banner and copy the **ExecID**.
6. Go to Apps Script → **Executions**.
7. Find the execution with the same ExecID.
8. Compare:
   - If the GAS log for that ExecID shows `finalCandidates.length = 54` and `RESULT candidates.length = 54`, then the backend is returning 54 candidates.
   - If the GAS log for that ExecID shows `RESULT candidates.length = 0`, then the backend is somehow returning an empty array.
   - If the GAS log for that ExecID does not exist, then the browser is running in **mock mode** (`GAS.isLive` is false) and the response is from `GAS._mockData`, which currently returns an empty response.

---

## Most likely root cause

If the GAS log for the browser's ExecID does not exist, the app is in **mock mode** even though it is deployed. This can happen if the `google.script` object is not available when the page loads. This is rare but possible if:
- The page is loaded inside an iframe that does not have `google.script`.
- The web app is loaded with a direct URL to the HTML instead of the published web app URL.

If the browser is in mock mode, fix it by ensuring the page is opened via the published **Web App URL**, not the script editor URL or a raw HTML link.

---

## Constraints

- Do **NOT** remove the rest of the Documents Center UI.
- The debug `execId` field and banner are temporary — remove them after identifying the root cause.
- Do **NOT** change the backend filtering logic unless the logs prove it is wrong.

---

## Output

Produce the updated `Script.html` and `DocumentsCenter.js` with the execution ID tracing. After deploying, the user should be able to match the browser response with the exact GAS execution log.
