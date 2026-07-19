# Documents Center — Prompt 2 of 2: Frontend

> Run this AFTER Prompt 1 (Backend) is done and `DocumentsCenter.js` is already created.
> Paste this entire prompt into your AI IDE exactly as-is.

---

## Context

This is a Google Apps Script project. The frontend lives entirely inside `Script.html` (a single large HTML file, ~3300 lines). Styles live in `Styles.html`.

**You must read these files before writing any code:**
- `Script.html` — understand the Router, Views, GAS.call(), Modal.open(), App.setState() patterns
- `Styles.html` — understand existing CSS variables and classes

**Key patterns already in the codebase:**

### Routing
```js
const sidebar_items = [
  { view: 'dashboard', icon: '📊', label: 'Dashboard' },
  { view: 'candidates', icon: '👥', label: 'Candidates', badge: () => ... },
  // ADD HERE
];

const renderView = () => {
  const view = document.getElementById('app-view');
  const { currentView } = App.state;
  if (currentView === 'dashboard') Views.dashboard(view);
  else if (currentView === 'candidates') Views.candidates(view);
  // ADD HERE
};
```

### GAS Server Call Pattern
```js
const res = await GAS.call('api_functionName', arg1, arg2);
if (!res.success) throw new Error(res.error);
// use res.data
```

### Modal Pattern
```js
Modal.open(`
  <div class="modal__header">
    <h2 class="modal__title">Title</h2>
    <button class="modal__close" onclick="Modal.close()">✕</button>
  </div>
  <div class="modal__body">...</div>
  <div class="modal__footer">
    <button class="btn btn--primary" onclick="...">Confirm</button>
    <button class="btn btn--outline" onclick="Modal.close()">Cancel</button>
  </div>
`);
```

### CSS Classes (existing — use these, don't invent new ones)
```
Layout:       .page-header, .page-header__title, .page-header__sub, .page-header__actions
Cards:        .table-card
KPI Cards:    .kpi-card, .kpi-card__label, .kpi-card__value, .kpi-card__icon
Buttons:      .btn, .btn--primary, .btn--outline, .btn--danger, .btn--sm
Filters:      .filter-panel, .filter-panel__inner, .filter-section, .filter-section__label,
              .filter-check-group, .filter-check-item
Table:        .table-responsive, .table-toolbar
```

---

## Task

Make **3 changes** to the existing files. Do NOT rewrite the files from scratch — make surgical insertions and edits.

---

### Change 1 — `Script.html`: Add sidebar entry

Find the `sidebar_items` array. Add this entry after the Candidates entry and before the Calendar entry (or in a logical position):

```js
{ view: 'documents-center', icon: '📁', label: 'Documents Center' },
```

---

### Change 2 — `Script.html`: Add renderView case

Find the `renderView` function. Add:
```js
else if (currentView === 'documents-center') Views.documentsCenter(view);
```
in the correct position (before the final `else` 404 fallback).

---

### Change 3 — `Script.html`: Add the full Documents Center view

Add a new function `Views.documentsCenter` to the `Views` object. Place it after the last existing view function (e.g., after the audit log or calendar view). Here is the complete implementation:

```js
documentsCenter(container) {
  // Initialize local state for this view
  const dc = App.state.documentsCenter = App.state.documentsCenter || {
    candidates: [],
    filteredCandidates: [],
    selectedIds: new Set(),
    filterOptions: {},
    filters: { status: [], department: [], nationality: [], position: [], search: '' },
    loaded: false,
  };

  container.innerHTML = `
<div class="page-header">
  <div>
    <h1 class="page-header__title">📁 Documents Center</h1>
    <p class="page-header__sub">Batch collect · download · preview candidate documents</p>
  </div>
  <div class="page-header__actions">
    <button class="btn btn--outline btn--sm" id="dc-filter-toggle" onclick="Views._dcToggleFilter()">🔽 Filters</button>
    <button class="btn btn--primary" id="dc-download-btn" onclick="Views._dcDownload()" disabled>⬇ Download ZIP</button>
  </div>
</div>

<!-- Stats Row -->
<div id="dc-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--sp-3);margin-bottom:var(--sp-4);">
  <div class="kpi-card"><div class="kpi-card__icon">👥</div><div class="kpi-card__value" id="dc-stat-total">—</div><div class="kpi-card__label">Total Candidates</div></div>
  <div class="kpi-card"><div class="kpi-card__icon">✅</div><div class="kpi-card__value" id="dc-stat-selected">0</div><div class="kpi-card__label">Selected</div></div>
  <div class="kpi-card"><div class="kpi-card__icon">📄</div><div class="kpi-card__value" id="dc-stat-available">—</div><div class="kpi-card__label">Available Docs</div></div>
  <div class="kpi-card"><div class="kpi-card__icon">⚠️</div><div class="kpi-card__value" id="dc-stat-missing">—</div><div class="kpi-card__label">Missing Docs</div></div>
</div>

<!-- Filter Panel -->
<div class="filter-panel" id="dc-filter-panel" hidden>
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

<!-- Document Type Selector -->
<div class="table-card" style="margin-bottom:var(--sp-3);padding:var(--sp-3);">
  <div style="font-size:.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:var(--sp-2);">SELECT DOCUMENT TYPES TO DOWNLOAD</div>
  <div id="dc-doctype-selector" style="display:flex;gap:var(--sp-2);flex-wrap:wrap;">
    ${['Passport','Photo','Academic Certificate','Medical Examination','Medical Analysis','Visa','CV','Offer Letter','Employment Contract','ID Card'].map(t => `
      <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:.82rem;transition:all .15s;" class="dc-doctype-chip">
        <input type="checkbox" class="dc-doctype-check" value="${t}" onchange="Views._dcUpdateDownloadBtn()">
        <span>${t}</span>
      </label>
    `).join('')}
  </div>
  <div style="margin-top:var(--sp-2);display:flex;gap:var(--sp-2);">
    <button class="btn btn--outline btn--sm" onclick="Views._dcSelectAllDocTypes()">Select All</button>
    <button class="btn btn--outline btn--sm" onclick="Views._dcClearDocTypes()">Clear</button>
  </div>
</div>

<!-- Candidates Table -->
<div class="table-card">
  <div class="table-toolbar" style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) var(--sp-3);">
    <div style="display:flex;align-items:center;gap:var(--sp-2);">
      <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:.85rem;">
        <input type="checkbox" id="dc-select-all" onchange="Views._dcToggleSelectAll(this.checked)">
        <span>Select All</span>
      </label>
      <span id="dc-selection-label" style="font-size:.8rem;color:var(--text-secondary);font-weight:600;"></span>
    </div>
    <span id="dc-candidate-count" style="font-size:.8rem;color:var(--text-secondary);"></span>
  </div>
  <div class="table-responsive">
    <table style="width:100%;border-collapse:collapse;font-size:.85rem;" id="dc-table">
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
      <tbody id="dc-tbody">
        <tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary);">Loading…</td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

  // Load data if not already loaded
  Views._dcLoad();
},

// ─── Documents Center Private Methods ───────────────────────────────────────

async _dcLoad() {
  const dc = App.state.documentsCenter;
  if (dc.loaded) { Views._dcRender(); return; }
  try {
    const filtersJson = JSON.stringify({ status: [], department: [], nationality: [], position: [], search: '' });
    const res = await GAS.call('api_getDocumentsCenterData', filtersJson);
    if (!res.success) throw new Error(res.error);
    dc.candidates = res.candidates;
    dc.filteredCandidates = [...res.candidates];
    dc.filterOptions = res.filterOptions;
    dc.loaded = true;
    Views._dcPopulateFilterDropdowns();
    Views._dcUpdateStats(res.stats);
    Views._dcRender();
  } catch(e) {
    const tbody = document.getElementById('dc-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--danger);">Error loading data: ${e.message}</td></tr>`;
  }
},

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
},

_dcApplyFilters() {
  const dc = App.state.documentsCenter;
  const status = document.getElementById('dc-filter-status')?.value || '';
  const dept   = document.getElementById('dc-filter-dept')?.value || '';
  const nat    = document.getElementById('dc-filter-nat')?.value || '';
  const search = (document.getElementById('dc-search')?.value || '').toLowerCase();

  dc.filteredCandidates = dc.candidates.filter(c => {
    if (status && c.status !== status) return false;
    if (dept   && c.department !== dept) return false;
    if (nat    && c.nationality !== nat) return false;
    if (search && !`${c.fullName} ${c.hrCode} ${c.candidateId}`.toLowerCase().includes(search)) return false;
    return true;
  });

  // Clear selections that are no longer visible
  const visibleIds = new Set(dc.filteredCandidates.map(c => c.candidateId));
  dc.selectedIds.forEach(id => { if (!visibleIds.has(id)) dc.selectedIds.delete(id); });

  Views._dcRender();
  Views._dcUpdateSelectionLabel();
  Views._dcUpdateDownloadBtn();
},

_dcOnSearchChange(val) {
  Views._dcApplyFilters();
},

_dcClearFilters() {
  ['dc-filter-status','dc-filter-dept','dc-filter-nat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const s = document.getElementById('dc-search');
  if (s) s.value = '';
  Views._dcApplyFilters();
},

_dcRender() {
  const dc = App.state.documentsCenter;
  const tbody = document.getElementById('dc-tbody');
  const countEl = document.getElementById('dc-candidate-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${dc.filteredCandidates.length} candidates`;

  if (dc.filteredCandidates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary);">No candidates match the current filters.</td></tr>`;
    return;
  }

  const statusColors = {
    'Visa Completed': 'var(--success)', 'Mobilized': 'var(--primary)',
    'Documents Complete': '#6366f1', 'Closed': 'var(--text-tertiary)',
  };

  tbody.innerHTML = dc.filteredCandidates.map(c => {
    const checked = dc.selectedIds.has(c.candidateId) ? 'checked' : '';
    const statusColor = statusColors[c.status] || 'var(--text-secondary)';
    return `<tr style="border-bottom:1px solid var(--border);${checked ? 'background:var(--primary-light,#eff6ff);' : ''}">
      <td style="padding:10px 12px;text-align:center;">
        <input type="checkbox" ${checked} onchange="Views._dcToggleCandidate('${c.candidateId}', this.checked)">
      </td>
      <td style="padding:10px 12px;">
        <div style="font-weight:600;">${c.fullName}</div>
        <div style="font-size:.75rem;color:var(--text-secondary);">${c.hrCode || c.candidateId}</div>
      </td>
      <td style="padding:10px 12px;">
        <span style="font-size:.75rem;font-weight:600;color:${statusColor};white-space:nowrap;">${c.status}</span>
      </td>
      <td style="padding:10px 12px;font-size:.82rem;">${c.department || '—'}</td>
      <td style="padding:10px 12px;font-size:.82rem;">${c.nationality || '—'}</td>
      <td style="padding:10px 12px;text-align:center;">
        <span style="color:var(--success);font-weight:700;">${c.availableCount}</span>
      </td>
      <td style="padding:10px 12px;text-align:center;">
        <span style="color:${c.missingCount > 0 ? 'var(--warning,#f59e0b)' : 'var(--text-tertiary)'};font-weight:700;">${c.missingCount}</span>
      </td>
      <td style="padding:10px 12px;text-align:center;">
        <button class="btn btn--outline btn--sm" onclick="Views._dcPreviewMenu('${c.candidateId}')">👁 Preview</button>
      </td>
    </tr>`;
  }).join('');

  // Sync select-all checkbox
  const allVisible = dc.filteredCandidates.every(c => dc.selectedIds.has(c.candidateId));
  const selectAllCb = document.getElementById('dc-select-all');
  if (selectAllCb) selectAllCb.checked = dc.filteredCandidates.length > 0 && allVisible;
},

_dcToggleCandidate(candidateId, checked) {
  const dc = App.state.documentsCenter;
  checked ? dc.selectedIds.add(candidateId) : dc.selectedIds.delete(candidateId);
  Views._dcUpdateSelectionLabel();
  Views._dcUpdateDownloadBtn();
  // Re-render the row background without full re-render
  Views._dcRender();
},

_dcToggleSelectAll(checked) {
  const dc = App.state.documentsCenter;
  dc.filteredCandidates.forEach(c => checked ? dc.selectedIds.add(c.candidateId) : dc.selectedIds.delete(c.candidateId));
  Views._dcUpdateSelectionLabel();
  Views._dcUpdateDownloadBtn();
  Views._dcRender();
},

_dcUpdateSelectionLabel() {
  const dc = App.state.documentsCenter;
  const el = document.getElementById('dc-selection-label');
  if (!el) return;
  const n = dc.selectedIds.size;
  el.textContent = n > 0 ? `${n} selected` : '';
  const statEl = document.getElementById('dc-stat-selected');
  if (statEl) statEl.textContent = n;
},

_dcUpdateStats(stats) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  if (stats) {
    set('dc-stat-total', stats.totalCandidates || 0);
    set('dc-stat-available', stats.totalAvailableDocs || 0);
    set('dc-stat-missing', stats.totalMissingDocs || 0);
  }
},

_dcUpdateDownloadBtn() {
  const dc = App.state.documentsCenter;
  const btn = document.getElementById('dc-download-btn');
  if (!btn) return;
  const hasSelection = dc.selectedIds.size > 0;
  const hasDocTypes = document.querySelectorAll('.dc-doctype-check:checked').length > 0;
  btn.disabled = !(hasSelection && hasDocTypes);
},

_dcSelectAllDocTypes() {
  document.querySelectorAll('.dc-doctype-check').forEach(cb => cb.checked = true);
  document.querySelectorAll('.dc-doctype-chip').forEach(chip => chip.style.borderColor = 'var(--primary)');
  Views._dcUpdateDownloadBtn();
},

_dcClearDocTypes() {
  document.querySelectorAll('.dc-doctype-check').forEach(cb => cb.checked = false);
  document.querySelectorAll('.dc-doctype-chip').forEach(chip => chip.style.borderColor = 'var(--border)');
  Views._dcUpdateDownloadBtn();
},

_dcToggleFilter() {
  const panel = document.getElementById('dc-filter-panel');
  if (panel) panel.hidden = !panel.hidden;
},

async _dcDownload() {
  const dc = App.state.documentsCenter;
  const candidateIds = [...dc.selectedIds];
  const docTypes = [...document.querySelectorAll('.dc-doctype-check:checked')].map(cb => cb.value);

  if (candidateIds.length === 0) { Toast.show('Select at least one candidate.', 'warning'); return; }
  if (docTypes.length === 0)     { Toast.show('Select at least one document type.', 'warning'); return; }

  const btn = document.getElementById('dc-download-btn');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Preparing ZIP…';

  try {
    const res = await GAS.call('api_batchDownloadZip', JSON.stringify(candidateIds), JSON.stringify(docTypes));
    if (!res.success) throw new Error(res.error);

    // Trigger browser download from base64
    const byteChars = atob(res.base64);
    const byteNums  = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
    const byteArr   = new Uint8Array(byteNums);
    const blob      = new Blob([byteArr], { type: 'application/zip' });
    const url       = URL.createObjectURL(blob);
    const a         = document.createElement('a');
    a.href = url; a.download = res.filename; a.click();
    URL.revokeObjectURL(url);

    Toast.show(`✅ Downloaded ${res.fileCount} files for ${res.candidateCount} candidates.`, 'success');
  } catch(e) {
    Toast.show(`Download failed: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
    Views._dcUpdateDownloadBtn();
  }
},

async _dcPreviewMenu(candidateId) {
  const dc = App.state.documentsCenter;
  const candidate = dc.candidates.find(c => c.candidateId === candidateId);
  if (!candidate) return;

  const availableDocs = Object.entries(candidate.docSummary || {})
    .filter(([, status]) => status === 'Available')
    .map(([type]) => type);

  if (availableDocs.length === 0) {
    Modal.open(`
      <div class="modal__header">
        <h2 class="modal__title">📁 ${candidate.fullName}</h2>
        <button class="modal__close" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal__body" style="text-align:center;padding:40px;color:var(--text-secondary);">
        No approved documents available for preview.
      </div>
    `);
    return;
  }

  Modal.open(`
    <div class="modal__header">
      <h2 class="modal__title">📁 ${candidate.fullName} — Select Document</h2>
      <button class="modal__close" onclick="Modal.close()">✕</button>
    </div>
    <div class="modal__body">
      <p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:var(--sp-3);">Choose a document to preview:</p>
      <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
        ${availableDocs.map(type => `
          <button class="btn btn--outline" style="justify-content:flex-start;gap:var(--sp-2);"
            onclick="Modal.close(); Views._dcOpenPreview('${candidateId}', '${type}')">
            📄 ${type}
          </button>
        `).join('')}
      </div>
    </div>
  `);
},

async _dcOpenPreview(candidateId, docType) {
  // Show loading modal immediately
  Modal.open(`
    <div class="modal__header">
      <h2 class="modal__title">👁 Preview — ${docType}</h2>
      <button class="modal__close" onclick="Modal.close()">✕</button>
    </div>
    <div class="modal__body" style="text-align:center;padding:40px;">
      <span style="color:var(--text-secondary);">Loading preview…</span>
    </div>
  `);

  try {
    const res = await GAS.call('api_getDocumentPreviewInfo', candidateId, docType);
    if (!res.success) throw new Error(res.error);

    Modal.open(`
      <div class="modal__header">
        <h2 class="modal__title">👁 ${res.candidateName} — ${docType}</h2>
        <button class="modal__close" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal__body" style="padding:0;">
        <iframe src="${res.fileUrl}" style="width:100%;height:70vh;border:none;display:block;" 
          title="${res.fileName}"></iframe>
      </div>
      <div class="modal__footer">
        <a href="${res.fileUrl.replace('/preview', '/view')}" target="_blank" class="btn btn--outline btn--sm">🔗 Open in Drive</a>
        <button class="btn btn--outline" onclick="Modal.close()">Close</button>
      </div>
    `);
  } catch(e) {
    Modal.open(`
      <div class="modal__header">
        <h2 class="modal__title">Preview Error</h2>
        <button class="modal__close" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal__body" style="text-align:center;padding:40px;color:var(--danger);">
        ${e.message}
      </div>
    `);
  }
},
```

---

### Change 4 (Optional) — `Styles.html`: Chip hover style

Find a good location in `Styles.html` and add this small style block to make document type chips interactive:

```css
/* Documents Center — doctype chips */
.dc-doctype-chip:hover {
  border-color: var(--primary) !important;
  background: var(--primary-light, #eff6ff);
}
.dc-doctype-chip input:checked ~ span {
  color: var(--primary);
  font-weight: 600;
}
```

---

## Validation Checklist

After making all changes, verify:
- [ ] `sidebar_items` contains `{ view: 'documents-center', ... }`
- [ ] `renderView` handles `'documents-center'`
- [ ] `Views.documentsCenter` function exists and is complete
- [ ] All `Views._dc*` helper methods are added to the `Views` object
- [ ] No syntax errors (check for missing commas between object methods)
- [ ] No duplicate method names

---

## What This Delivers

✅ Stats cards (Total, Selected, Available Docs, Missing Docs)
✅ Collapsible filter panel (Status, Department, Nationality, Search)
✅ Document type selector chips
✅ Candidates table with checkboxes + Select All
✅ Batch ZIP download with progress feedback
✅ Document preview in iframe modal (PDF & images via Google Drive /preview)
✅ Consistent design with existing app
