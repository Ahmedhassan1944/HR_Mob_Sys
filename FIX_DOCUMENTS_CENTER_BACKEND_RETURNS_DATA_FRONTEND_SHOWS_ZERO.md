# Fix: Backend returns 54 candidates but Documents Center shows 0

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The GAS execution log shows the backend is working correctly:

```
api_getDocumentsCenterData called with filtersJson: {}
DocumentsCenter: tbl_Candidates row count = 55
DocumentsCenter: filters received = {}
DocumentsCenter: returning 54 candidates
```

But the Documents Center page still shows:

- **Total Candidates: 0**
- **Message:** "No candidates match the current filters."
- **Sub-message:** "No active filters. The candidate list from the server is empty."

This means the frontend is not receiving the candidates array from the backend response. The response object is either malformed, missing the `candidates` property, or not reaching the success handler correctly.

---

## Task

Apply the following diagnostic and defensive fixes to `Script.html` only.

### A. Inspect the actual response in `_dcLoad`

Replace the current `_dcLoad` method (around line 3395) with this version that logs the response and displays a temporary debug notice if the response is missing candidates:

```javascript
async _dcLoad() {
  const dc = App.state.documentsCenter;
  if (dc.loaded) { Views._dcRender(); return; }
  const tbody = document.getElementById('dc-tbody');
  try {
    const filtersJson = JSON.stringify({ status: [], department: [], nationality: [], position: [], search: '' });
    const res = await GAS.call('api_getDocumentsCenterData', filtersJson);

    // DEBUG: remove after fixing
    console.log('[DC] raw response:', res);
    console.log('[DC] response type:', typeof res);
    console.log('[DC] res.success:', res && res.success);
    console.log('[DC] res.candidates count:', res && res.candidates ? res.candidates.length : 'MISSING');

    // Defensive: if the response is a JSON string, parse it
    let fixedRes = res;
    if (typeof res === 'string') {
      try { fixedRes = JSON.parse(res); } catch (e) { throw new Error('Server returned invalid JSON: ' + res); }
    }

    if (!fixedRes || !fixedRes.success) {
      throw new Error((fixedRes && fixedRes.error) || 'No response from server.');
    }

    const list = Array.isArray(fixedRes.candidates) ? fixedRes.candidates : [];

    // Temporary debug notice: show if the server said success but returned no candidates
    if (list.length === 0 && fixedRes.success) {
      console.warn('[DC] Server returned success with 0 candidates. Raw response:', fixedRes);
    }

    dc.candidates = list;
    dc.filteredCandidates = [...list];
    dc.filterOptions = fixedRes.filterOptions || {};
    dc.loaded = true;

    Views._dcPopulateFilterDropdowns();
    Views._dcUpdateStats(fixedRes.stats || {});
    Views._dcRender();
  } catch(e) {
    console.error('Documents Center load error:', e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--danger);">Error loading candidates: ${e.message}<br><button class="btn btn--primary btn--sm" onclick="Views._dcLoad()" style="margin-top:12px;">Retry</button></td></tr>`;
    Toast.show('Failed to load Documents Center: ' + e.message, 'error');
  }
},
```

### B. Add a small debug banner in the Documents Center UI

Find the `documentsCenter(container)` method and insert a temporary debug banner just after the `container.innerHTML = \` line (inside the template, right after the page header). This banner will show whether the view is in live or mock mode:

```html
<!-- Temporary debug banner — remove after fixing -->
<div style="background:#fffbe6;border:1px solid #ffe58f;padding:8px 12px;border-radius:6px;margin-bottom:var(--sp-3);font-size:.8rem;color:#614700;">
  <strong>Debug:</strong> GAS live = <span id="dc-debug-live">?</span> | 
  Candidates loaded = <span id="dc-debug-count">?</span> | 
  Response type = <span id="dc-debug-type">?</span>
</div>
```

Then add this function inside the `Views` object (after `_dcLoad` is fine):

```javascript
_dcDebugUpdate() {
  const dc = App.state.documentsCenter;
  const live = GAS.isLive ? 'YES' : 'NO (mock)';
  const count = dc.candidates ? dc.candidates.length : 'undefined';
  const typeEl = document.getElementById('dc-debug-type');
  document.getElementById('dc-debug-live').textContent = live;
  document.getElementById('dc-debug-count').textContent = count;
  if (typeEl) typeEl.textContent = window.__dcLastResponseType || '?';
},
```

And add this line to the very end of the success path in `_dcLoad`, just before `Views._dcRender();`:

```javascript
window.__dcLastResponseType = typeof res;
Views._dcDebugUpdate();
Views._dcRender();
Views._dcUpdateStats(fixedRes.stats || {});
```

### C. Add mock data for `api_getDocumentsCenterData` (if not already present)

Inside `GAS._mockData`, add this case so the offline/preview version shows candidates instead of an empty list:

```javascript
if (fnName === 'api_getDocumentsCenterData') {
  const filters = args[0] ? JSON.parse(args[0]) : {};
  let list = candidates.map(c => ({
    candidateId: c.CandidateID,
    fullName: c.FullName,
    department: c.Department,
    nationality: c.Nationality,
    position: c.Position,
    status: c.CurrentStatus,
    hrCode: c.CandidateID,
    driveFolderId: c.DriveFolderID || '',
    batchNumber: ''
  }));
  const search = (filters.search || '').toLowerCase();
  if (search) {
    list = list.filter(c =>
      c.fullName.toLowerCase().includes(search) ||
      c.candidateId.toLowerCase().includes(search)
    );
  }
  if (filters.status && filters.status.length) {
    list = list.filter(c => filters.status.includes(c.status));
  }
  if (filters.department && filters.department.length) {
    list = list.filter(c => filters.department.includes(c.department));
  }
  if (filters.nationality && filters.nationality.length) {
    list = list.filter(c => filters.nationality.includes(c.nationality));
  }
  const docSummary = {};
  ['Passport','Photo','Academic Certificate','Medical Examination','Medical Analysis','Visa','CV','Offer Letter','Employment Contract','ID Card'].forEach(t => docSummary[t] = 'Missing');
  list.forEach(c => c.docSummary = { ...docSummary });
  return {
    success: true,
    candidates: list,
    stats: {
      totalCandidates: list.length,
      totalSelected: 0,
      totalAvailableDocs: 0,
      totalMissingDocs: list.length * 10
    },
    filterOptions: {
      statuses: ["New Candidate", "Documents Requested", "Documents Under Preparing", "Pending Passport", "Pending Photo", "Pending Academic Certificate", "Pending Medical", "Booked a medical examination", "Documents Complete", "Visa Pending", "Visa Completed", "Mobilized", "Closed"],
      departments: [...new Set(candidates.map(c => c.Department).filter(Boolean))].sort(),
      nationalities: [...new Set(candidates.map(c => c.Nationality).filter(Boolean))].sort(),
      positions: [...new Set(candidates.map(c => c.Position).filter(Boolean))].sort(),
      coordinators: [],
      batchNumbers: []
    }
  };
}
```

---

## How to test after applying

1. Run `clasp push` and `clasp deploy`.
2. Open the web app in a browser.
3. Open the browser console (F12 → Console).
4. Open the Documents Center.
5. Look for the yellow debug banner and the console logs:
   - `[DC] raw response:` should show an object with `success: true` and `candidates: [...]`
   - `[DC] res.candidates count` should be **54**
   - The debug banner should show **GAS live = YES** and **Candidates loaded = 54**

6. If the console shows the response is a `string`, the fix in step A already handles it by parsing it.
7. If the console shows the response is an object but `candidates` is missing, the backend return type is wrong and the `DocumentsCenter.js` return statements must be checked again (they should not be wrapped in `JSON.stringify()`).

---

## Constraints

- Do **NOT** modify `DocumentsCenter.js` unless the console logs prove the backend is returning a string instead of an object.
- Do **NOT** remove the rest of the Documents Center UI.
- The debug banner and console logs are temporary — remove them once the real issue is identified and fixed.

---

## Output

Produce the updated `Script.html` with the diagnostic changes. After applying and deploying, the user should be able to see in the console exactly what the frontend receives from the server.
