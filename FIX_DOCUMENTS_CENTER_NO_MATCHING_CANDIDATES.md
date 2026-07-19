# Fix: Documents Center Shows "No candidates match the current filters"

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The Documents Center page loads but shows **0 candidates** and the message:

> "No candidates match the current filters."

The filter panel is visible. In the screenshot, the **Status** dropdown is set to "Booked a medical examination" while Department and Nationality are set to "All". Even pressing the ✕ Clear button does not restore the candidates list.

This happens because the frontend filter state is inconsistent and the backend result is not being debugged. The fix requires three changes.

---

## Task

Apply the following changes to the two files.

### A. Reset filters and reload fresh data on every view open in `Script.html`

Replace the `documentsCenter(container)` method's local-state initialization (the block around the `App.state.documentsCenter` assignment) with the version below. This forces a fresh data load and resets any stale filter values every time the user opens the Documents Center.

```javascript
documentsCenter(container) {
  // Always reset filter state and force a fresh load so stale filters never hide candidates
  const dc = App.state.documentsCenter = {
    candidates: [],
    filteredCandidates: [],
    selectedIds: new Set(),
    filterOptions: {},
    filters: { status: [], department: [], nationality: [], position: [], search: '' },
    loaded: false,
  };

  // Reset UI controls to default "All" values before rendering
  const statusEl = document.getElementById('dc-filter-status');
  const deptEl = document.getElementById('dc-filter-dept');
  const natEl = document.getElementById('dc-filter-nat');
  const searchEl = document.getElementById('dc-search');
  if (statusEl) statusEl.value = '';
  if (deptEl) deptEl.value = '';
  if (natEl) natEl.value = '';
  if (searchEl) searchEl.value = '';
```

Keep the rest of `documentsCenter(container)` exactly as it is (the `container.innerHTML = \`...\`` template and the final `Views._dcLoad();` call).

### B. Make `_dcClearFilters` actually reset the dropdowns in `Script.html`

Find the `_dcClearFilters` method (around line 3456) and replace it with this stronger version:

```javascript
_dcClearFilters() {
  ['dc-filter-status','dc-filter-dept','dc-filter-nat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      // Remove any accidentally selected option state
      Array.from(el.options).forEach(o => o.selected = (o.value === ''));
    }
  });
  const s = document.getElementById('dc-search');
  if (s) s.value = '';
  // Reset the filtered list to the full candidate list and re-render
  const dc = App.state.documentsCenter;
  dc.filteredCandidates = [...dc.candidates];
  dc.selectedIds.clear();
  Views._dcRender();
  Views._dcUpdateSelectionLabel();
  Views._dcUpdateDownloadBtn();
  Views._dcUpdateStats({
    totalCandidates: dc.candidates.length,
    totalSelected: 0,
    totalAvailableDocs: dc.candidates.reduce((sum, c) => sum + (c.availableCount || 0), 0),
    totalMissingDocs: dc.candidates.reduce((sum, c) => sum + (c.missingCount || 0), 0)
  });
},
```

### C. Improve the empty state so the user knows why nothing is showing in `Script.html`

Find the `_dcRender` method (around line 3466). Inside it, replace the empty-state block:

```javascript
if (dc.filteredCandidates.length === 0) {
  const activeFilters = [];
  const s = document.getElementById('dc-filter-status')?.value;
  const d = document.getElementById('dc-filter-dept')?.value;
  const n = document.getElementById('dc-filter-nat')?.value;
  const q = document.getElementById('dc-search')?.value;
  if (s) activeFilters.push('Status: ' + s);
  if (d) activeFilters.push('Department: ' + d);
  if (n) activeFilters.push('Nationality: ' + n);
  if (q) activeFilters.push('Search: ' + q);

  const filterMsg = activeFilters.length
    ? `<div style="font-size:.85rem;margin-top:8px;color:var(--text-secondary);">Active filters: ${activeFilters.join(' · ')}</div>`
    : `<div style="font-size:.85rem;margin-top:8px;color:var(--text-secondary);">No active filters. The candidate list from the server is empty.</div>`;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary);">
    <div style="font-weight:600;">No candidates match the current filters.</div>
    ${filterMsg}
    <button class="btn btn--outline btn--sm" onclick="Views._dcClearFilters()" style="margin-top:12px;">Clear all filters</button>
  </td></tr>`;
  return;
}
```

### D. Add backend debug logging in `DocumentsCenter.js`

Inside `api_getDocumentsCenterData`, immediately after the line:

```javascript
var cData = candidatesSheet.getDataRange().getValues();
```

add:

```javascript
Logger.log("DocumentsCenter: tbl_Candidates row count = " + cData.length + ", headers = " + JSON.stringify(cData[0]));
```

Immediately after the line:

```javascript
var filteredCandidates = [];
```

add:

```javascript
Logger.log("DocumentsCenter: filters received = " + (filtersJson || '{}'));
```

Immediately before the final `return result;` statement, add:

```javascript
Logger.log("DocumentsCenter: returning " + finalCandidates.length + " candidates");
```

---

## Constraints

- Do **NOT** modify any other file.
- Do **NOT** change the backend filtering logic.
- Do **NOT** remove existing functionality.
- Keep all existing CSS classes and element IDs unchanged.

---

## Output

Produce the complete updated `Script.html` and `DocumentsCenter.js` with the four changes above. After the fix, opening the Documents Center should:

1. Reset all filters to "All" automatically.
2. Show a clear empty-state message explaining whether filters are active or the server list is empty.
3. Make the Clear button fully restore the candidate list.
4. Log the actual candidate row count and filter values to the GAS execution log.
