# PROMPT: Customizable CSV Export — Column Picker, Column Ordering & Preview

## Overview

Replace the current one-click CSV export buttons with an **Export Configuration Modal** that lets the user:

1. **Choose which columns** to include in the export (tick/untick).
2. **Reorder the columns** by dragging or using Up/Down arrow buttons.
3. **Preview the first 5 rows** of data inside the modal before downloading.
4. **Download** the final CSV once satisfied.

This applies to **two export entry points**:

| Entry point | Function to update | Menu item label |
|---|---|---|
| Dashboard → Export ▾ | `Views._exportDashboardCandidates` | 👥 All Candidates (CSV) |
| Candidates page | `Views._exportCandidates` | 📤 Export button |

Both entry points open the **same modal UI** (`Views._openExportConfigModal`), but they pass **different default column sets** and **different data sources**.

---

## Files to Modify

- **`Script.html`** — all changes live here (frontend only).
- Do **not** modify `Code.js`, `Database.js`, or any other `.js` file.

---

## 1. All Available Columns

Define one master list of all exportable columns. Each entry has:

- `key` — the property name on the candidate object (or a computed key).
- `label` — the human-friendly column header written into the CSV.
- `getValue(c, state)` — function that returns the cell value for candidate `c`.

```js
Views._EXPORT_COLUMNS = [
  {
    key: 'FullName',
    label: 'Full Name',
    getValue: (c) => c.FullName || ''
  },
  {
    key: 'Position',
    label: 'Position',
    getValue: (c) => c.Position || ''
  },
  {
    key: 'Department',
    label: 'Department',
    getValue: (c) => c.Department || ''
  },
  {
    key: 'Nationality',
    label: 'Nationality',
    getValue: (c) => c.Nationality || ''
  },
  {
    key: 'Email',
    label: 'Email',
    getValue: (c) => c.Email || ''
  },
  {
    key: 'Phone',
    label: 'Phone',
    getValue: (c) => c.Phone || ''
  },
  {
    key: 'OfferSalary',
    label: 'Offer Salary',
    getValue: (c) => c.OfferSalary || ''
  },
  {
    key: 'CurrentStatus',
    label: 'Status',
    getValue: (c) => c.CurrentStatus || ''
  },
  {
    key: 'HR_Code',
    label: 'HR Code',
    getValue: (c) => c.HR_Code || ''
  },
  {
    key: 'Recruitment_Type',
    label: 'Recruitment Type',
    getValue: (c) => c.Recruitment_Type || ''
  },
  {
    key: 'Batch_Number',
    label: 'Batch Number',
    getValue: (c) => Views._getBatchValue(c) || ''
  },
  {
    key: 'Notes',
    label: 'Notes',
    getValue: (c) => c.Notes || ''
  },
  {
    key: 'CandidateID',
    label: 'Candidate ID',
    getValue: (c) => c.CandidateID || ''
  },
  {
    key: 'CreatedAt',
    label: 'Created At',
    getValue: (c) => c.CreatedAt || ''
  },
  {
    key: 'UpdatedAt',
    label: 'Updated At',
    getValue: (c) => c.UpdatedAt || ''
  },
  {
    key: 'DocCompleteness',
    label: 'Doc Completeness %',
    getValue: (c, state) => {
      const comp = (state.docCompleteness || {})[c.CandidateID];
      return comp ? comp.pct : '';
    }
  },
  {
    key: 'PresentDocs',
    label: 'Present Documents',
    getValue: (c, state) => {
      const comp = (state.docCompleteness || {})[c.CandidateID];
      return comp ? comp.presentDocs.join('; ') : '';
    }
  },
  {
    key: 'MissingDocs',
    label: 'Missing Documents',
    getValue: (c, state) => {
      const comp = (state.docCompleteness || {})[c.CandidateID];
      return comp ? comp.missingDocs.join('; ') : '';
    }
  }
];
```

Place this definition **once** near the top of the `Views` object, before the individual view functions.

---

## 2. Default Column Sets

Define the default columns for each entry point (keys only, in order):

```js
// Dashboard export defaults
Views._EXPORT_DEFAULTS_DASHBOARD = [
  'FullName', 'Position', 'Notes', 'HR_Code', 'Recruitment_Type', 'Batch_Number'
];

// Candidates page export defaults
Views._EXPORT_DEFAULTS_CANDIDATES = [
  'FullName', 'Position', 'Department', 'CurrentStatus',
  'Email', 'Phone', 'Nationality', 'OfferSalary',
  'CandidateID', 'CreatedAt', 'UpdatedAt',
  'DocCompleteness', 'PresentDocs', 'MissingDocs'
];
```

---

## 3. Modal — `Views._openExportConfigModal(data, defaultKeys, filename)`

### Signature

```js
Views._openExportConfigModal(data, defaultKeys, filename)
```

| Param | Type | Description |
|---|---|---|
| `data` | `Array` | The candidate records to export (already filtered). |
| `defaultKeys` | `Array<string>` | Keys pre-selected when the modal opens. |
| `filename` | `string` | The `.csv` filename used when downloading, e.g. `'HR_Candidates_2026-07-25.csv'`. |

### Behaviour

1. **Open the modal** using the existing `Modal.open(html)` system.
2. **Left panel — Column Picker & Orderer:**
   - Show all columns from `Views._EXPORT_COLUMNS` as a list.
   - Each row has: ☑ checkbox · column label · ▲ Up · ▼ Down buttons.
   - Columns that are in `defaultKeys` start **checked**.
   - The visual order of the list is the export column order.
   - Checking/unchecking a column adds/removes it from the selected set but does **not** remove it from the list — it just dims it.
   - ▲ / ▼ buttons move a row up or down in the list. Clicking ▲ on the first row or ▼ on the last row does nothing.
   - A "Select All" and "Clear All" link at the top of the panel for convenience.
3. **Right panel — Live Preview:**
   - Shows a scrollable HTML table of **up to 5 rows** from `data`, using only the currently selected columns in the current order.
   - The preview **updates in real time** whenever the user checks/unchecks a column or reorders.
   - If no columns are selected, show the message: *"Select at least one column to preview."*
   - If `data` is empty, show: *"No data to preview."*
4. **Footer buttons:**
   - **Download CSV** (primary button) — generates and downloads the CSV, then closes the modal. Disabled when no columns are selected.
   - **Cancel** (outline button) — closes the modal without action.
5. After download, show the existing `Toast.success(...)` message.

---

## 4. Modal HTML Structure

Use the project's existing CSS variables and BEM classes. No external libraries.

```html
<!-- Inside Modal.open(`...`) -->
<div class="modal__header">
  <h3 class="modal__title">📥 Export to CSV</h3>
</div>
<div class="modal__body" style="display:flex;gap:var(--sp-4);min-height:420px;padding:var(--sp-3);">

  <!-- LEFT: Column Picker -->
  <div id="ec-picker" style="width:260px;flex-shrink:0;border-right:1px solid var(--border);padding-right:var(--sp-3);display:flex;flex-direction:column;gap:var(--sp-2);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-1);">
      <span style="font-weight:600;font-size:0.85rem;">Columns</span>
      <span style="font-size:0.75rem;color:var(--text-muted);">
        <a href="#" onclick="Views._ecSelectAll();return false;">All</a> ·
        <a href="#" onclick="Views._ecClearAll();return false;">None</a>
      </span>
    </div>
    <div id="ec-col-list" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;">
      <!-- Rows injected by JS — see below -->
    </div>
  </div>

  <!-- RIGHT: Preview -->
  <div style="flex:1;display:flex;flex-direction:column;gap:var(--sp-2);min-width:0;">
    <span style="font-weight:600;font-size:0.85rem;">Preview <span style="font-weight:400;color:var(--text-muted);">(first 5 rows)</span></span>
    <div id="ec-preview" style="overflow:auto;flex:1;border:1px solid var(--border);border-radius:var(--radius);padding:var(--sp-2);">
      <!-- Table injected by JS -->
    </div>
  </div>

</div>
<div class="modal__footer" style="display:flex;justify-content:flex-end;gap:var(--sp-2);">
  <button class="btn btn--outline" onclick="Modal.close()">Cancel</button>
  <button class="btn btn--primary" id="ec-download-btn" onclick="Views._ecDownload()">📥 Download CSV</button>
</div>
```

### Each column row in `#ec-col-list`:

```html
<div class="ec-row" data-key="FullName" style="display:flex;align-items:center;gap:var(--sp-1);padding:4px 6px;border-radius:var(--radius);background:var(--surface);">
  <input type="checkbox" id="ec-chk-FullName" checked onchange="Views._ecToggle('FullName')">
  <label for="ec-chk-FullName" style="flex:1;font-size:0.85rem;cursor:pointer;">Full Name</label>
  <button class="btn btn--ghost btn--sm" style="padding:2px 6px;" onclick="Views._ecMove('FullName',-1)" title="Move up">▲</button>
  <button class="btn btn--ghost btn--sm" style="padding:2px 6px;" onclick="Views._ecMove('FullName',1)" title="Move down">▼</button>
</div>
```

Rows that are **unchecked** should be visually dimmed:

```js
// when unchecked, add: style="opacity:0.45"
// when checked, opacity is 1
```

---

## 5. JS State & Helper Functions

Use a module-level state object attached to `Views`:

```js
Views._ecState = {
  data: [],          // the candidate records
  filename: '',      // download filename
  order: [],         // array of column keys in current order (all columns, checked or not)
  checked: new Set() // keys that are currently selected
};
```

### `Views._ecRender()` — rebuild the picker list and refresh the preview

Called once on open, and after every toggle/move. It:
1. Clears `#ec-col-list` and rebuilds rows from `Views._ecState.order`, marking each checked/unchecked.
2. Calls `Views._ecRefreshPreview()`.
3. Enables/disables the Download button based on whether `Views._ecState.checked.size > 0`.

### `Views._ecToggle(key)` — check/uncheck a column

```js
Views._ecToggle = function(key) {
  if (Views._ecState.checked.has(key)) {
    Views._ecState.checked.delete(key);
  } else {
    Views._ecState.checked.add(key);
  }
  Views._ecRender();
};
```

### `Views._ecMove(key, direction)` — move column up (-1) or down (+1)

```js
Views._ecMove = function(key, direction) {
  const order = Views._ecState.order;
  const idx = order.indexOf(key);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= order.length) return;
  // swap
  const tmp = order[idx];
  order[idx] = order[newIdx];
  order[newIdx] = tmp;
  Views._ecRender();
};
```

### `Views._ecSelectAll()` / `Views._ecClearAll()`

```js
Views._ecSelectAll = function() {
  Views._ecState.order.forEach(k => Views._ecState.checked.add(k));
  Views._ecRender();
};
Views._ecClearAll = function() {
  Views._ecState.checked.clear();
  Views._ecRender();
};
```

### `Views._ecRefreshPreview()` — rebuild the preview table

```js
Views._ecRefreshPreview = function() {
  const preview = document.getElementById('ec-preview');
  if (!preview) return;

  const selectedKeys = Views._ecState.order.filter(k => Views._ecState.checked.has(k));

  if (selectedKeys.length === 0) {
    preview.innerHTML = '<p style="color:var(--text-muted);padding:var(--sp-2);">Select at least one column to preview.</p>';
    return;
  }

  const allCols = Views._EXPORT_COLUMNS;
  const colDefs = selectedKeys.map(k => allCols.find(c => c.key === k)).filter(Boolean);
  const rows = (Views._ecState.data || []).slice(0, 5);

  if (rows.length === 0) {
    preview.innerHTML = '<p style="color:var(--text-muted);padding:var(--sp-2);">No data to preview.</p>';
    return;
  }

  const thCells = colDefs.map(col =>
    `<th style="white-space:nowrap;padding:4px 8px;font-size:0.75rem;background:var(--surface);border-bottom:2px solid var(--border);">${escHtml(col.label)}</th>`
  ).join('');

  const bodyRows = rows.map(c => {
    const tds = colDefs.map(col => {
      const val = col.getValue(c, App.state);
      return `<td style="padding:4px 8px;font-size:0.75rem;white-space:nowrap;border-bottom:1px solid var(--border);max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(String(val))}">${escHtml(String(val))}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  preview.innerHTML = `
    <table style="border-collapse:collapse;width:100%;">
      <thead><tr>${thCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>`;
};
```

### `Views._ecDownload()` — build CSV and trigger download

```js
Views._ecDownload = function() {
  const selectedKeys = Views._ecState.order.filter(k => Views._ecState.checked.has(k));
  if (selectedKeys.length === 0) return;

  const allCols = Views._EXPORT_COLUMNS;
  const colDefs = selectedKeys.map(k => allCols.find(c => c.key === k)).filter(Boolean);
  const data = Views._ecState.data;

  const esc = v => '"' + (v || '').toString().replace(/"/g, '""') + '"';
  const headers = colDefs.map(col => esc(col.label)).join(',');
  const bodyRows = data.map(c =>
    colDefs.map(col => esc(col.getValue(c, App.state))).join(',')
  );

  const csv = '\uFEFF' + [headers].concat(bodyRows).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = Views._ecState.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  Modal.close();
  Toast.success('✅ Exported ' + data.length + ' candidates to CSV.');
};
```

---

## 6. Update the Existing Export Entry Points

### 6.1 Dashboard — `_exportDashboardCandidates`

Replace the entire body of `Views._exportDashboardCandidates` with:

```js
_exportDashboardCandidates() {
  const menu = document.getElementById('dash-export-menu');
  if (menu) menu.style.display = 'none';

  if (Views._applyDashboardAllFilters) Views._applyDashboardAllFilters();

  const _all = App.state.candidates || [];
  const _filtered = App.state.filteredCandidates || [];
  const data = (_filtered.length > 0 && _filtered.length < _all.length) ? _filtered : _all;

  if (!data || !data.length) { Toast.warning('No candidates match the applied filters.'); return; }

  const filename = 'HR_Candidates_' + new Date().toISOString().slice(0, 10) + '.csv';
  Views._openExportConfigModal(data, Views._EXPORT_DEFAULTS_DASHBOARD, filename);
},
```

### 6.2 Candidates page — `_exportCandidates`

Replace the entire body of `Views._exportCandidates` with:

```js
_exportCandidates() {
  const _all = App.state.candidates || [];
  const _filtered = App.state.filteredCandidates || [];
  const data = (_filtered.length > 0 && _filtered.length < _all.length) ? _filtered : _all;

  if (!data || !data.length) { Toast.warning('No candidates to export.'); return; }

  const filename = 'HR_Candidates_' + new Date().toISOString().slice(0, 10) + '.csv';
  Views._openExportConfigModal(data, Views._EXPORT_DEFAULTS_CANDIDATES, filename);
},
```

---

## 7. Full `_openExportConfigModal` Implementation

```js
_openExportConfigModal(data, defaultKeys, filename) {
  // Initialise state
  const allKeys = Views._EXPORT_COLUMNS.map(c => c.key);
  Views._ecState = {
    data: data,
    filename: filename,
    // order = defaultKeys first (in order), then the rest
    order: [
      ...defaultKeys.filter(k => allKeys.includes(k)),
      ...allKeys.filter(k => !defaultKeys.includes(k))
    ],
    checked: new Set(defaultKeys.filter(k => allKeys.includes(k)))
  };

  Modal.open(`
    <div class="modal__header">
      <h3 class="modal__title">📥 Export to CSV</h3>
    </div>
    <div class="modal__body" style="display:flex;gap:var(--sp-4);min-height:420px;padding:var(--sp-3);">
      <div id="ec-picker" style="width:270px;flex-shrink:0;border-right:1px solid var(--border);padding-right:var(--sp-3);display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2);">
          <span style="font-weight:600;font-size:0.85rem;">Columns</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">
            <a href="#" onclick="Views._ecSelectAll();return false;" style="color:var(--primary);">All</a>
            &nbsp;·&nbsp;
            <a href="#" onclick="Views._ecClearAll();return false;" style="color:var(--text-muted);">None</a>
          </span>
        </div>
        <div id="ec-col-list" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;"></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:var(--sp-2);min-width:0;">
        <span style="font-weight:600;font-size:0.85rem;">
          Preview
          <span style="font-weight:400;color:var(--text-muted);font-size:0.78rem;">(first 5 rows)</span>
        </span>
        <div id="ec-preview" style="overflow:auto;flex:1;border:1px solid var(--border);border-radius:var(--radius);padding:var(--sp-2);"></div>
      </div>
    </div>
    <div class="modal__footer" style="display:flex;justify-content:flex-end;gap:var(--sp-2);">
      <button class="btn btn--outline" onclick="Modal.close()">Cancel</button>
      <button class="btn btn--primary" id="ec-download-btn" onclick="Views._ecDownload()">📥 Download CSV</button>
    </div>
  `);

  Views._ecRender();
},

_ecRender() {
  const list = document.getElementById('ec-col-list');
  if (!list) return;

  const { order, checked } = Views._ecState;
  const allCols = Views._EXPORT_COLUMNS;

  list.innerHTML = order.map(key => {
    const col = allCols.find(c => c.key === key);
    if (!col) return '';
    const isChecked = checked.has(key);
    return `
      <div class="ec-row" data-key="${key}" style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:var(--radius);background:var(--surface);opacity:${isChecked ? '1' : '0.45'};">
        <input type="checkbox" id="ec-chk-${key}" ${isChecked ? 'checked' : ''} onchange="Views._ecToggle('${key}')" style="flex-shrink:0;">
        <label for="ec-chk-${key}" style="flex:1;font-size:0.83rem;cursor:pointer;user-select:none;">${escHtml(col.label)}</label>
        <button class="btn btn--ghost btn--sm" style="padding:1px 5px;font-size:0.75rem;line-height:1;" onclick="Views._ecMove('${key}',-1)" title="Move up">▲</button>
        <button class="btn btn--ghost btn--sm" style="padding:1px 5px;font-size:0.75rem;line-height:1;" onclick="Views._ecMove('${key}',1)" title="Move down">▼</button>
      </div>`;
  }).join('');

  const dlBtn = document.getElementById('ec-download-btn');
  if (dlBtn) dlBtn.disabled = checked.size === 0;

  Views._ecRefreshPreview();
},

_ecToggle(key) {
  if (Views._ecState.checked.has(key)) {
    Views._ecState.checked.delete(key);
  } else {
    Views._ecState.checked.add(key);
  }
  Views._ecRender();
},

_ecMove(key, direction) {
  const order = Views._ecState.order;
  const idx = order.indexOf(key);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  Views._ecRender();
},

_ecSelectAll() {
  Views._ecState.order.forEach(k => Views._ecState.checked.add(k));
  Views._ecRender();
},

_ecClearAll() {
  Views._ecState.checked.clear();
  Views._ecRender();
},

_ecRefreshPreview() {
  const preview = document.getElementById('ec-preview');
  if (!preview) return;

  const selectedKeys = Views._ecState.order.filter(k => Views._ecState.checked.has(k));
  if (selectedKeys.length === 0) {
    preview.innerHTML = '<p style="color:var(--text-muted);padding:var(--sp-2);font-size:0.83rem;">Select at least one column to preview.</p>';
    return;
  }

  const colDefs = selectedKeys.map(k => Views._EXPORT_COLUMNS.find(c => c.key === k)).filter(Boolean);
  const rows = (Views._ecState.data || []).slice(0, 5);

  if (rows.length === 0) {
    preview.innerHTML = '<p style="color:var(--text-muted);padding:var(--sp-2);font-size:0.83rem;">No data to preview.</p>';
    return;
  }

  const thCells = colDefs.map(col =>
    `<th style="white-space:nowrap;padding:5px 10px;font-size:0.73rem;text-align:left;background:var(--surface);border-bottom:2px solid var(--border);position:sticky;top:0;">${escHtml(col.label)}</th>`
  ).join('');

  const bodyRows = rows.map(c => {
    const tds = colDefs.map(col => {
      const val = String(col.getValue(c, App.state) || '');
      return `<td style="padding:5px 10px;font-size:0.73rem;border-bottom:1px solid var(--border);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(val)}">${escHtml(val)}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  preview.innerHTML = `<table style="border-collapse:collapse;width:100%;"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
},

_ecDownload() {
  const selectedKeys = Views._ecState.order.filter(k => Views._ecState.checked.has(k));
  if (selectedKeys.length === 0) return;

  const colDefs = selectedKeys.map(k => Views._EXPORT_COLUMNS.find(c => c.key === k)).filter(Boolean);
  const data = Views._ecState.data;
  const esc = v => '"' + (v || '').toString().replace(/"/g, '""') + '"';

  const headers = colDefs.map(col => esc(col.label)).join(',');
  const bodyRows = data.map(c =>
    colDefs.map(col => esc(col.getValue(c, App.state))).join(',')
  );

  const csv = '\uFEFF' + [headers].concat(bodyRows).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = Views._ecState.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  Modal.close();
  const isFiltered = data.length < (App.state.candidates || []).length;
  Toast.success(
    isFiltered
      ? '✅ Exported ' + data.length + ' filtered candidates.'
      : '✅ Exported all ' + data.length + ' candidates to CSV.'
  );
},
```

---

## 8. Constraints

- Do **not** modify `Code.js` or any other `.gs` / `.js` server-side file.
- Do **not** add external libraries (no jQuery, no SortableJS, etc.).
- Do **not** change the `_exportDashboardKPI` function — it exports fixed KPI metrics, not candidate rows.
- Do **not** change filter logic (`_applyDashboardAllFilters`, `filteredCandidates`, etc.).
- The code must remain compatible with **Apps Script V8 runtime**.
- Use the existing `Modal.open()` / `Modal.close()` system — do not create a new overlay.
- Use the existing `Toast.success()` / `Toast.warning()` system for feedback.
- Use the existing `escHtml()` helper already defined in `Script.html` for all HTML output.

---

## 9. Success Criteria

After the change:

- [ ] Clicking **Export → All Candidates (CSV)** on the Dashboard opens the Export Config modal (not an immediate download).
- [ ] Clicking **📤 Export** on the Candidates page opens the same modal.
- [ ] Modal shows all 18 columns in the picker list with checkboxes and ▲/▼ buttons.
- [ ] Columns pre-selected match the entry point's default set.
- [ ] Checking/unchecking a column instantly updates the preview table.
- [ ] Moving a column up/down instantly reorders the preview table columns.
- [ ] "All" link selects all 18 columns; "None" deselects all.
- [ ] Download button is disabled when no column is selected.
- [ ] Clicking **Download CSV** downloads a `.csv` with the BOM (`\uFEFF`), correct headers (label names), correct column order, and correct data — then closes the modal.
- [ ] `_exportDashboardKPI` is unchanged.
- [ ] No errors in the Apps Script browser console.
