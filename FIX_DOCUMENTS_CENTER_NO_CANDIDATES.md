# Fix: Documents Center Shows 0 Candidates

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The Documents Center page loads without syntax errors, but shows **0 candidates** and the message *"No candidates match the current filters."* even though the backend returns success.

The root cause is a combination of three issues:

1. **Missing mock data for offline preview** — `GAS._mockData` in `Script.html` has no mock for `api_getDocumentsCenterData`, so local/offline testing returns an empty result.
2. **Silent backend errors** — `api_getDocumentsCenterData` in `DocumentsCenter.js` logs errors but the frontend does not surface them clearly to the user.
3. **The filter panel is hidden by default** and the user may not realize a filter is active.

---

## Task

Apply the following three changes **exactly** to the two files mentioned.

### A. Add mock data for `api_getDocumentsCenterData` in `Script.html`

Inside `GAS._mockData` (after the `api_getDocumentsByCandidate` mock, around line 207), add this exact block:

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

### B. Improve error handling in the frontend `_dcLoad` method in `Script.html`

Replace the current `_dcLoad` method (around line 3395) with this version so the user can see if the backend is failing:

```javascript
async _dcLoad() {
  const dc = App.state.documentsCenter;
  if (dc.loaded) { Views._dcRender(); return; }
  const tbody = document.getElementById('dc-tbody');
  try {
    const filtersJson = JSON.stringify({ status: [], department: [], nationality: [], position: [], search: '' });
    const res = await GAS.call('api_getDocumentsCenterData', filtersJson);
    if (!res || !res.success) {
      throw new Error((res && res.error) || 'No response from server.');
    }
    dc.candidates = res.candidates || [];
    dc.filteredCandidates = [...(res.candidates || [])];
    dc.filterOptions = res.filterOptions || {};
    dc.loaded = true;
    Views._dcPopulateFilterDropdowns();
    Views._dcUpdateStats(res.stats || {});
    Views._dcRender();
  } catch(e) {
    console.error('Documents Center load error:', e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--danger);">Error loading candidates: ${e.message}<br><button class="btn btn--primary btn--sm" onclick="Views._dcLoad()" style="margin-top:12px;">Retry</button></td></tr>`;
    Toast.show('Failed to load Documents Center: ' + e.message, 'error');
  }
},
```

### C. Add execution logging and safer error handling in `DocumentsCenter.js`

At the very top of `api_getDocumentsCenterData`, after the `try {`, add this debug line:

```javascript
Logger.log("api_getDocumentsCenterData called with filtersJson: " + (filtersJson || '{}'));
```

Then, inside the `catch (e)` block, make sure the error is returned with a clear message (it already does this, but ensure it stays exactly as):

```javascript
} catch (e) {
  Logger.log("Error in api_getDocumentsCenterData: " + e.message + "\n" + e.stack);
  return { success: false, error: e.message };
}
```

### D. Keep the filter panel visible by default in `Script.html`

Find the filter panel div (around line 3309):

```html
<div class="filter-panel" id="dc-filter-panel" hidden>
```

Change it to:

```html
<div class="filter-panel" id="dc-filter-panel">
```

This makes the filters visible by default so the user can see that nothing is selected and no filter is accidentally hiding candidates.

---

## Constraints

- Do **NOT** modify any other file.
- Do **NOT** change the backend logic for filtering or document aggregation.
- Do **NOT** remove existing functionality.

---

## Output

Produce the complete updated `Script.html` and `DocumentsCenter.js` with the four changes above applied. After the fix, the Documents Center should show candidates in the mock/offline environment and should display a clear error message if the live backend fails to load data.
