# Add Sorting Buttons to Documents Center Table Columns

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The Documents Center table in `Script.html` currently has columns like:

```
Checkbox | Candidate | Status | Department | Nationality | Available | Missing | Actions
```

(The exact column set may vary if previous prompts were applied. This task focuses on the **Status**, **Available**, and **Missing** columns.)

The user wants clickable sorting buttons on the headers of these three columns:
- **Status** — sort A-Z / Z-A
- **Available** — sort by count ascending / descending
- **Missing** — sort by count ascending / descending

Clicking the same header again toggles the sort direction (asc ↔ desc).

---

## Task

Add sorting to the Documents Center table. The sorting should be done on the **currently filtered candidate list** (`dc.filteredCandidates`), so it works together with the search and filter dropdowns.

### A. Add sorting state to the Documents Center state

In `Script.html`, find where `App.state.documentsCenter` is initialized inside `documentsCenter(container)` (around line 3330). It currently looks like this:

```javascript
      const dc = App.state.documentsCenter = {
        candidates: [],
        filteredCandidates: [],
        selectedIds: new Set(),
        filterOptions: {},
        loaded: false
      };
```

Add a `sort` property:

```javascript
      const dc = App.state.documentsCenter = {
        candidates: [],
        filteredCandidates: [],
        selectedIds: new Set(),
        filterOptions: {},
        loaded: false,
        sort: { column: null, direction: 'asc' }
      };
```

### B. Add a sort function `_dcSort`

Add a new method in `Script.html` inside the `Views` object, near the other Documents Center methods (e.g., after `_dcRender` or `_dcClearFilters`):

```javascript
    _dcSort(column) {
      const dc = App.state.documentsCenter;
      if (!dc.sort) dc.sort = { column: null, direction: 'asc' };

      // Toggle direction if same column clicked again
      if (dc.sort.column === column) {
        dc.sort.direction = dc.sort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        dc.sort.column = column;
        dc.sort.direction = 'asc';
      }

      // Sort the filtered list in-place
      dc.filteredCandidates.sort((a, b) => {
        let valA, valB;

        if (column === 'status') {
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
        } else if (column === 'available') {
          valA = a.availableCount || 0;
          valB = b.availableCount || 0;
        } else if (column === 'missing') {
          valA = a.missingCount || 0;
          valB = b.missingCount || 0;
        } else {
          return 0;
        }

        if (valA < valB) return dc.sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return dc.sort.direction === 'asc' ? 1 : -1;
        return 0;
      });

      Views._dcRender();
    }
```

### C. Update the table headers to be clickable

Find the Documents Center table `<thead>` (around line 3432). It currently looks like:

```html
<thead>
  <tr style="background:var(--surface-alt,#f5f7fa);text-align:left;">
    <th style="padding:10px 12px;width:36px;"></th>
    <th style="padding:10px 12px;">Candidate</th>
    <th style="padding:10px 12px;">Status</th>
    <th style="padding:10px 12px;">Department</th>
    <th style="padding:10px 12px;">Nationality</th>
    <th style="padding:10px 12px;text-align:center;">📄 Available</th>
    <th style="padding:10px 12px;text-align:center;">⚠️ Missing</th>
    <th style="padding:10px 12px;text-align:center;">Actions</th>
  </tr>
</thead>
```

Replace the static headers for **Status**, **Available**, and **Missing** with clickable buttons. The Candidate, Department, Nationality, and Actions columns remain unchanged.

```html
<thead>
  <tr style="background:var(--surface-alt,#f5f7fa);text-align:left;">
    <th style="padding:10px 12px;width:36px;"></th>
    <th style="padding:10px 12px;">Candidate</th>
    <th style="padding:10px 12px;cursor:pointer;user-select:none;" onclick="Views._dcSort('status')" id="dc-th-status" title="Sort by Status">
      Status <span class="sort-indicator" id="dc-sort-status"></span>
    </th>
    <th style="padding:10px 12px;">Department</th>
    <th style="padding:10px 12px;">Nationality</th>
    <th style="padding:10px 12px;text-align:center;cursor:pointer;user-select:none;" onclick="Views._dcSort('available')" id="dc-th-available" title="Sort by Available">
      📄 Available <span class="sort-indicator" id="dc-sort-available"></span>
    </th>
    <th style="padding:10px 12px;text-align:center;cursor:pointer;user-select:none;" onclick="Views._dcSort('missing')" id="dc-th-missing" title="Sort by Missing">
      ⚠️ Missing <span class="sort-indicator" id="dc-sort-missing"></span>
    </th>
    <th style="padding:10px 12px;text-align:center;">Actions</th>
  </tr>
</thead>
```

If the Department and Nationality columns have been removed in a previous change, keep the remaining headers in the same order and only add the clickable sorting behavior to Status, Available, and Missing.

### D. Add CSS for the sort indicators

Add the following CSS to `Styles.html` (near the Document Chips section or any existing table CSS):

```html
/* ── Sortable Table Headers ─────────────────────────────────────────── */
.sort-indicator {
  display: inline-block;
  margin-left: 4px;
  font-size: .65rem;
  color: var(--text-tertiary, #94a3b8);
  min-width: 10px;
}

.sort-indicator--asc::after  { content: '▲'; }
.sort-indicator--desc::after { content: '▼'; }

th[onclick*="_dcSort"] {
  transition: background-color .15s;
}

th[onclick*="_dcSort"]:hover {
  background-color: var(--border, #e2e8f0);
}
```

If CSS variables do not exist in the project, use literal colors.

### E. Update sort indicators in `_dcRender`

At the end of `_dcRender` (after the table rows are rendered), add a small block to update the sort indicator symbols on the headers. Find the end of `_dcRender` (around line 3615) and add before the closing `}` of the method:

```javascript
      // Update sort indicator icons
      ['status', 'available', 'missing'].forEach(col => {
        const el = document.getElementById('dc-sort-' + col);
        if (!el) return;
        el.className = 'sort-indicator';
        el.textContent = '';
        if (dc.sort && dc.sort.column === col) {
          el.classList.add(dc.sort.direction === 'asc' ? 'sort-indicator--asc' : 'sort-indicator--desc');
        }
      });
```

### F. Make sure filters re-apply sorting

When the user applies filters or clears filters, the filtered list is rebuilt and the previous sort is lost. To preserve the active sort after filtering, modify `_dcApplyFilters` and `_dcClearFilters` to re-sort after filtering.

In `_dcApplyFilters`, after `dc.filteredCandidates = dc.candidates.filter(...)` and before `Views._dcRender();`, add:

```javascript
      // Re-apply active sort after filtering
      if (dc.sort && dc.sort.column) {
        Views._dcSort(dc.sort.column);
        return; // _dcSort already calls _dcRender
      }
```

Similarly, in `_dcClearFilters`, after `dc.filteredCandidates = [...dc.candidates];`, add:

```javascript
      // Re-apply active sort after clearing filters
      if (dc.sort && dc.sort.column) {
        Views._dcSort(dc.sort.column);
        return; // _dcSort already calls _dcRender
      }
```

---

## Constraints

- Do **not** modify `DocumentsCenter.js` or the backend. Sorting is purely a frontend operation.
- Do **not** change the Candidate, Department, Nationality, or Actions column headers.
- Sorting must be applied to `dc.filteredCandidates` so it works together with the search and filters.
- Clicking the same column header again toggles direction (asc ↔ desc).
- The initial sort indicator is empty. After the first click, it shows ▲ or ▼.
- Keep all existing CSS classes, IDs, and method names unchanged.

---

## Output

Produce the updated `Script.html` and `Styles.html` so that the Documents Center table has clickable headers on the **Status**, **Available**, and **Missing** columns.

After the change:
- Clicking "Status" sorts candidates A-Z, then Z-A on the next click.
- Clicking "Available" sorts by available document count ascending, then descending.
- Clicking "Missing" sorts by missing document count ascending, then descending.
- The active sort direction is shown with an up/down arrow next to the header text.
- Sorting continues to work after applying or clearing filters.
