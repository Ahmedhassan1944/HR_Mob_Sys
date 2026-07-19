# Add Batch Number Filter to Documents Center

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The Documents Center page already has filters for:
- Search
- Status
- Department
- Nationality

The backend (`DocumentsCenter.js` `api_getDocumentsCenterData`) already supports filtering by `batch_number`, and it returns `filterOptions.batchNumbers` in the response. Each candidate object returned from the backend includes a `batchNumber` field.

However, the UI does not expose a **Batch Number** filter dropdown. The user wants to filter candidates by their batch number.

---

## Task

Add a Batch Number filter dropdown to the Documents Center filter panel and wire it to the existing filter logic.

### A. Add the Batch Number dropdown to the filter panel

In `Script.html`, find the Documents Center filter panel (around line 3370). The current filter panel looks like this:

```html
    <div class="filter-panel" id="dc-filter-panel">
      <div class="filter-panel__inner">
        <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap;align-items:flex-end;padding:var(--sp-3);">
          <div style="flex:1;min-width:200px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">🔍 Search</label>
            <input type="search" class="form-control form-control--sm" placeholder="Name, HR Code, ID…"
              oninput="Views._dcOnSearchChange(this.value)" id="dc-search" style="width:100%">
          </div>
          <div style="flex:1;min-width:160px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">📋 Status</label>
            <select class="form-control form-control--sm" id="dc-filter-status" onchange="Views._dcApplyFilters()" style="width:100%">
              <option value="">All Statuses</option>
            </select>
          </div>
          <div style="flex:1;min-width:160px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">🏢 Department</label>
            <select class="form-control form-control--sm" id="dc-filter-dept" onchange="Views._dcApplyFilters()" style="width:100%">
              <option value="">All Departments</option>
            </select>
          </div>
          <div style="flex:1;min-width:160px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">🌍 Nationality</label>
            <select class="form-control form-control--sm" id="dc-filter-nat" onchange="Views._dcApplyFilters()" style="width:100%">
              <option value="">All Nationalities</option>
            </select>
          </div>
          <button class="btn btn--outline btn--sm" onclick="Views._dcClearFilters()">✕ Clear</button>
        </div>
      </div>
    </div>
```

Add a new Batch Number `<select>` block immediately after the Nationality block and before the Clear button. Replace the entire filter panel block with this updated version:

```html
    <div class="filter-panel" id="dc-filter-panel">
      <div class="filter-panel__inner">
        <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap;align-items:flex-end;padding:var(--sp-3);">
          <div style="flex:1;min-width:200px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">🔍 Search</label>
            <input type="search" class="form-control form-control--sm" placeholder="Name, HR Code, ID…"
              oninput="Views._dcOnSearchChange(this.value)" id="dc-search" style="width:100%">
          </div>
          <div style="flex:1;min-width:160px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">📋 Status</label>
            <select class="form-control form-control--sm" id="dc-filter-status" onchange="Views._dcApplyFilters()" style="width:100%">
              <option value="">All Statuses</option>
            </select>
          </div>
          <div style="flex:1;min-width:160px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">🏢 Department</label>
            <select class="form-control form-control--sm" id="dc-filter-dept" onchange="Views._dcApplyFilters()" style="width:100%">
              <option value="">All Departments</option>
            </select>
          </div>
          <div style="flex:1;min-width:160px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">🌍 Nationality</label>
            <select class="form-control form-control--sm" id="dc-filter-nat" onchange="Views._dcApplyFilters()" style="width:100%">
              <option value="">All Nationalities</option>
            </select>
          </div>
          <div style="flex:1;min-width:160px;">
            <label style="font-size:.75rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">📦 Batch Number</label>
            <select class="form-control form-control--sm" id="dc-filter-batch" onchange="Views._dcApplyFilters()" style="width:100%">
              <option value="">All Batches</option>
            </select>
          </div>
          <button class="btn btn--outline btn--sm" onclick="Views._dcClearFilters()">✕ Clear</button>
        </div>
      </div>
    </div>
```

### B. Populate the Batch Number dropdown when data loads

In `Script.html`, find `_dcPopulateFilterDropdowns` (around line 3480). It currently populates status, department, and nationality. Add the batch number population:

```javascript
    _dcPopulateFilterDropdowns() {
      const dc = App.state.documentsCenter;
      const opts = dc.filterOptions || {};
      const fill = (id, items) => {
        const el = document.getElementById(id);
        if (!el) return;
        (items || []).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; el.appendChild(o); });
      };
      fill('dc-filter-status', opts.statuses);
      fill('dc-filter-dept', opts.departments);
      fill('dc-filter-nat', opts.nationalities);
      fill('dc-filter-batch', opts.batchNumbers);
    }
```

### C. Apply the Batch Number filter when the user changes it

In `Script.html`, find `_dcApplyFilters` (around line 3493). It currently reads status, dept, nat, and search. Add a line to read the batch filter and a condition to filter by it:

```javascript
    _dcApplyFilters() {
      const dc = App.state.documentsCenter;
      const status = document.getElementById('dc-filter-status')?.value || '';
      const dept   = document.getElementById('dc-filter-dept')?.value || '';
      const nat    = document.getElementById('dc-filter-nat')?.value || '';
      const batch  = document.getElementById('dc-filter-batch')?.value || '';
      const search = (document.getElementById('dc-search')?.value || '').toLowerCase();

      dc.filteredCandidates = dc.candidates.filter(c => {
        if (status && c.status !== status) return false;
        if (dept   && c.department !== dept) return false;
        if (nat    && c.nationality !== nat) return false;
        if (batch  && c.batchNumber !== batch) return false;
        if (search && !`${c.fullName} ${c.hrCode} ${c.candidateId}`.toLowerCase().includes(search)) return false;
        return true;
      });

      // Clear selections that are no longer visible
      const visibleIds = new Set(dc.filteredCandidates.map(c => c.candidateId));
      dc.selectedIds.forEach(id => { if (!visibleIds.has(id)) dc.selectedIds.delete(id); });

      Views._dcRender();
      Views._dcUpdateSelectionLabel();
      Views._dcUpdateDownloadBtn();
    }
```

### D. Clear the Batch Number filter in `_dcClearFilters`

In `Script.html`, find `_dcClearFilters` (around line 3521). It currently clears status, dept, and nat. Add the batch dropdown to the list:

```javascript
    _dcClearFilters() {
      ['dc-filter-status','dc-filter-dept','dc-filter-nat','dc-filter-batch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.value = '';
          Array.from(el.options).forEach(o => o.selected = (o.value === ''));
        }
      });
      const s = document.getElementById('dc-search');
      if (s) s.value = '';
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
    }
```

### E. Show the active Batch Number filter in the empty state

In `Script.html`, find `_dcRender` and the empty-state block (around line 3555). It currently collects status, dept, nat, and search for the filter message. Add the batch filter:

```javascript
      if (dc.filteredCandidates.length === 0) {
        const activeFilters = [];
        const s = document.getElementById('dc-filter-status')?.value;
        const d = document.getElementById('dc-filter-dept')?.value;
        const n = document.getElementById('dc-filter-nat')?.value;
        const b = document.getElementById('dc-filter-batch')?.value;
        const q = document.getElementById('dc-search')?.value;
        if (s) activeFilters.push('Status: ' + s);
        if (d) activeFilters.push('Department: ' + d);
        if (n) activeFilters.push('Nationality: ' + n);
        if (b) activeFilters.push('Batch: ' + b);
        if (q) activeFilters.push('Search: ' + q);

        const filterMsg = activeFilters.length
          ? `<div style="font-size:.85rem;margin-top:8px;color:var(--text-secondary);">Active filters: ${activeFilters.join(' · ')}</div>`
          : `<div style="font-size:.85rem;margin-top:8px;color:var(--text-secondary);">No active filters. The candidate list from the server is empty.</div>`;

        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">
          <div style="font-weight:600;">No candidates match the current filters.</div>
          ${filterMsg}
          <button class="btn btn--outline btn--sm" onclick="Views._dcClearFilters()" style="margin-top:12px;">Clear all filters</button>
        </td></tr>`;
        return;
      }
```

### F. Optional: Pass the batch filter to the backend on initial load

The current initial load in `_dcLoad` sends empty filters:

```javascript
const filtersJson = JSON.stringify({ status: [], department: [], nationality: [], position: [], search: '' });
```

For now, leave this unchanged because the batch filtering is done client-side. The backend already returns all batch numbers in `filterOptions`, and the client-side filter handles the selection.

If the data volume grows very large, the batch filter can be moved to the server later by changing the initial request to include `batch_number: ''`.

---

## Constraints

- Do **not** modify `DocumentsCenter.js` — the backend already supports batch filtering and returns `batchNumbers` in `filterOptions` and `batchNumber` on each candidate.
- Do **not** change the existing filter behavior for status, department, nationality, or search.
- Do **not** modify any other table or view in the app.
- Keep all existing CSS classes, IDs, and method names unchanged.
- The Batch Number dropdown must behave exactly like the other filter dropdowns.

---

## Output

Produce the updated `Script.html` so that the Documents Center filter panel has a new **"📦 Batch Number"** dropdown.

After the change, the user can:
1. Open the Documents Center.
2. Click the filter panel.
3. Select a batch number from the "📦 Batch Number" dropdown.
4. The table will show only candidates belonging to that batch.
5. The empty state will display the active batch filter if no candidates match.
6. The "Clear" button will reset the batch filter along with all other filters.
