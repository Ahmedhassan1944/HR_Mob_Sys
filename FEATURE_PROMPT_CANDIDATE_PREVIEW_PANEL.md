# Prompt: Keyboard Shortcut Candidate Preview Panel

## Context

This is a **Google Apps Script Web App** (single-page, no ES modules).  
All frontend code lives in `Script.html`.  
CSS lives in `Styles.html`.  
No external libraries — plain vanilla JS and inline CSS only.

---

## What to Build

Add a **floating Candidate Preview Panel** to the Dashboard view.  
It is toggled open/closed via the keyboard shortcut **`Ctrl + Shift + P`**.  
It has no dependency on mouse hover. It is a persistent panel, not a tooltip.

---

## Exact Integration Points (do NOT deviate from these names)

These already exist in `Script.html`. Use them as-is:

| What | Exact name |
|---|---|
| Filtered candidates array | `App.state.filteredCandidates` |
| Applies all dashboard filters | `Views._applyDashboardAllFilters()` |
| Renders the candidate table | `Views._renderDashboardTable(candidates)` |
| Selected KPI cards state | `Views._dashboardSelectedCards` (a `Set`) |
| Card click handler | `Views._onKpiCardClick(event, cardEl)` |

---

## Implementation Instructions

### 1 — Add the Panel HTML

Inside the `Views.dashboard(container)` function, after the existing dashboard HTML is injected into the container, append this panel **once** (guard with `if (!document.getElementById('cpp-panel'))`):

```html
<div id="cpp-panel" class="cpp-panel cpp-panel--hidden" role="dialog" aria-label="Candidate Preview Panel">

  <!-- Header -->
  <div class="cpp-header">
    <span class="cpp-title">
      👥 Candidate Preview
      <span id="cpp-count" class="cpp-count-badge">0</span>
    </span>
    <div class="cpp-header-actions">
      <button id="cpp-settings-btn" class="cpp-icon-btn" title="Settings (⚙️)">⚙️</button>
      <button id="cpp-close-btn"    class="cpp-icon-btn" title="Close (Ctrl+Shift+P)">✕</button>
    </div>
  </div>

  <!-- Settings Drawer (collapsed by default) -->
  <div id="cpp-settings-drawer" class="cpp-settings-drawer cpp-settings-drawer--hidden">
    <div class="cpp-settings-row">
      <label>Columns</label>
      <div id="cpp-col-toggles" class="cpp-col-toggles">
        <label><input type="checkbox" data-col="name"   checked> Full Name</label>
        <label><input type="checkbox" data-col="pos"    checked> Position</label>
        <label><input type="checkbox" data-col="code"   checked> HR Code</label>
        <label><input type="checkbox" data-col="type"   checked> Type</label>
        <label><input type="checkbox" data-col="status" checked> Status</label>
      </div>
    </div>
    <div class="cpp-settings-row">
      <label>Row Density</label>
      <select id="cpp-density">
        <option value="normal" selected>Normal</option>
        <option value="compact">Compact</option>
        <option value="comfortable">Comfortable</option>
      </select>
    </div>
    <div class="cpp-settings-row">
      <label>Default Sort</label>
      <select id="cpp-sort-col">
        <option value="name">Full Name</option>
        <option value="pos">Position</option>
        <option value="code">HR Code</option>
        <option value="status">Status</option>
      </select>
      <select id="cpp-sort-dir">
        <option value="asc">A → Z</option>
        <option value="desc">Z → A</option>
      </select>
    </div>
    <div class="cpp-settings-row">
      <label><input type="checkbox" id="cpp-sticky-header" checked> Sticky Header</label>
    </div>
  </div>

  <!-- Table area -->
  <div id="cpp-body" class="cpp-body">
    <table id="cpp-table" class="cpp-table">
      <thead id="cpp-thead"><tr></tr></thead>
      <tbody id="cpp-tbody"></tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="cpp-footer">
    <span class="cpp-hint">Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> to toggle</span>
  </div>

</div>
```

---

### 2 — Add the Controller Object

Add the following object **once** in `Script.html`, at module scope (outside any View function), after the existing `Views` object definition:

```js
const CandidatePreviewPanel = (() => {

  /* ── private state ── */
  let _open      = false;
  let _cols      = ['name','pos','code','type','status'];
  let _density   = 'normal';
  let _sortCol   = 'name';
  let _sortDir   = 'asc';
  let _stickyHdr = true;

  const COL_LABELS = {
    name: 'Full Name', pos: 'Position',
    code: 'HR Code',  type: 'Type', status: 'Status'
  };

  /* ── helpers ── */
  function _panel()  { return document.getElementById('cpp-panel');           }
  function _tbody()  { return document.getElementById('cpp-tbody');           }
  function _thead()  { return document.getElementById('cpp-thead');           }
  function _count()  { return document.getElementById('cpp-count');           }
  function _drawer() { return document.getElementById('cpp-settings-drawer'); }

  function _cellValue(c, col) {
    switch (col) {
      case 'name':   return (c.firstName || '') + ' ' + (c.lastName || '');
      case 'pos':    return c.position || c.jobTitle || '—';
      case 'code':   return c.hrCode   || c.id       || '—';
      case 'type':   return c.candidateType || c.type || '—';
      case 'status': return c.status        || c.currentStatus || '—';
      default:       return '—';
    }
  }

  function _sortData(data) {
    return [...data].sort((a, b) => {
      const av = _cellValue(a, _sortCol).toLowerCase();
      const bv = _cellValue(b, _sortCol).toLowerCase();
      return _sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }

  /* ── render ── */
  function refresh() {
    const panel = _panel();
    if (!panel || !_open) return;

    const candidates = App.state.filteredCandidates || [];
    const sorted     = _sortData(candidates);

    /* count badge */
    const countEl = _count();
    if (countEl) countEl.textContent = sorted.length;

    /* thead */
    const theadRow = _thead().querySelector('tr');
    theadRow.innerHTML = _cols
      .map(col => `<th class="cpp-th">${COL_LABELS[col]}</th>`)
      .join('');

    /* sticky header */
    _thead().style.position = _stickyHdr ? 'sticky' : '';
    _thead().style.top      = _stickyHdr ? '0'      : '';

    /* density */
    const densityPad = { normal: '8px 12px', compact: '4px 8px', comfortable: '14px 16px' };
    document.documentElement.style.setProperty('--cpp-cell-pad', densityPad[_density] || densityPad.normal);

    /* tbody */
    if (sorted.length === 0) {
      _tbody().innerHTML = `<tr><td colspan="${_cols.length}" class="cpp-empty">No candidates match the current filters.</td></tr>`;
      return;
    }

    _tbody().innerHTML = sorted.map(c => {
      const cells = _cols.map(col => `<td class="cpp-td">${_cellValue(c, col)}</td>`).join('');
      return `<tr class="cpp-tr">${cells}</tr>`;
    }).join('');
  }

  /* ── open / close ── */
  function open() {
    const panel = _panel();
    if (!panel) return;
    _open = true;
    panel.classList.remove('cpp-panel--hidden');
    panel.classList.add('cpp-panel--visible');
    refresh();
  }

  function close() {
    const panel = _panel();
    if (!panel) return;
    _open = false;
    panel.classList.remove('cpp-panel--visible');
    panel.classList.add('cpp-panel--hidden');
    /* close settings drawer too */
    const dr = _drawer();
    if (dr) dr.classList.add('cpp-settings-drawer--hidden');
  }

  function toggle() { _open ? close() : open(); }

  /* ── settings drawer ── */
  function _toggleDrawer() {
    const dr = _drawer();
    if (!dr) return;
    dr.classList.toggle('cpp-settings-drawer--hidden');
  }

  function _applySettings() {
    /* read column checkboxes */
    const checks = document.querySelectorAll('#cpp-col-toggles input[type=checkbox]');
    const newCols = [];
    checks.forEach(cb => { if (cb.checked) newCols.push(cb.dataset.col); });
    if (newCols.length > 0) _cols = newCols;

    const densityEl = document.getElementById('cpp-density');
    if (densityEl) _density = densityEl.value;

    const sortColEl = document.getElementById('cpp-sort-col');
    if (sortColEl) _sortCol = sortColEl.value;

    const sortDirEl = document.getElementById('cpp-sort-dir');
    if (sortDirEl) _sortDir = sortDirEl.value;

    const stickyEl = document.getElementById('cpp-sticky-header');
    if (stickyEl) _stickyHdr = stickyEl.checked;

    refresh();
  }

  /* ── bind events (call once after panel is in DOM) ── */
  function bindEvents() {
    const closeBtn    = document.getElementById('cpp-close-btn');
    const settingsBtn = document.getElementById('cpp-settings-btn');

    if (closeBtn)    closeBtn.addEventListener('click', close);
    if (settingsBtn) settingsBtn.addEventListener('click', _toggleDrawer);

    /* apply settings on any change inside the drawer */
    const drawer = _drawer();
    if (drawer) drawer.addEventListener('change', _applySettings);
  }

  /* ── global keyboard shortcut ── */
  function initShortcut() {
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        toggle();
      }
    });
  }

  return { open, close, toggle, refresh, bindEvents, initShortcut };
})();
```

---

### 3 — Hook into the Dashboard Init

Inside `Views.dashboard(container)`, **after** the panel HTML is appended and **only on first mount** (guard with a flag or check `!document.getElementById('cpp-close-btn')`), call:

```js
CandidatePreviewPanel.bindEvents();
```

And **once globally** (e.g., at the bottom of `Views.dashboard` first call, or inside the app init block), call:

```js
CandidatePreviewPanel.initShortcut();
```

Use a module-level boolean flag `let _cppShortcutRegistered = false;` to ensure `initShortcut()` is only called once even if the dashboard view is re-rendered.

---

### 4 — Patch `Views._applyDashboardAllFilters()`

At the **end** of `Views._applyDashboardAllFilters()`, after `App.setState({ filteredCandidates: ... })` is called, add one line:

```js
CandidatePreviewPanel.refresh();
```

This is the only change to existing logic. Do **not** change the filtering algorithm itself.

---

### 5 — Add CSS to `Styles.html`

Add the following block at the end of `Styles.html`:

```css
/* ══════════════════════════════════════════════
   Candidate Preview Panel (CPP)
══════════════════════════════════════════════ */
:root {
  --cpp-cell-pad: 8px 12px;
}

.cpp-panel {
  position: fixed;
  top: 72px;
  right: 24px;
  width: 640px;
  max-width: calc(100vw - 48px);
  height: 480px;
  max-height: calc(100vh - 100px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10);
  display: flex;
  flex-direction: column;
  z-index: 1200;
  overflow: hidden;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.cpp-panel--hidden {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  pointer-events: none;
}

.cpp-panel--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: all;
}

/* Header */
.cpp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.cpp-title {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cpp-count-badge {
  background: #3b82f6;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.cpp-header-actions {
  display: flex;
  gap: 6px;
}

.cpp-icon-btn {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: background 0.12s, color 0.12s;
}
.cpp-icon-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

/* Settings Drawer */
.cpp-settings-drawer {
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 16px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: max-height 0.2s ease, opacity 0.2s ease;
  max-height: 300px;
  overflow: hidden;
}
.cpp-settings-drawer--hidden {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  pointer-events: none;
}

.cpp-settings-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #475569;
  flex-wrap: wrap;
}
.cpp-settings-row label { font-weight: 500; min-width: 80px; }
.cpp-settings-row select {
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  padding: 3px 6px;
  font-size: 12px;
  background: #fff;
}
.cpp-col-toggles {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.cpp-col-toggles label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 400;
  min-width: auto;
  cursor: pointer;
}

/* Body — scrollable */
.cpp-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: auto;
  scroll-behavior: smooth;
}

/* Table */
.cpp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.cpp-thead tr {
  background: #f8fafc;
}

.cpp-th {
  padding: var(--cpp-cell-pad);
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  background: #f8fafc;
  z-index: 1;
}

.cpp-tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
}
.cpp-tr:hover {
  background: #eff6ff;
}

.cpp-td {
  padding: var(--cpp-cell-pad);
  color: #334155;
  vertical-align: middle;
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cpp-empty {
  padding: 32px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

/* Footer */
.cpp-footer {
  padding: 8px 16px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.cpp-hint {
  font-size: 11px;
  color: #94a3b8;
}

.cpp-hint kbd {
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: monospace;
  color: #475569;
}

/* Scrollbar styling */
.cpp-body::-webkit-scrollbar       { width: 6px; height: 6px; }
.cpp-body::-webkit-scrollbar-track { background: #f1f5f9; }
.cpp-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.cpp-body::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
```

---

## Files to Modify

| File | Change |
|---|---|
| `Script.html` | Add `CandidatePreviewPanel` object; add panel HTML injection in `Views.dashboard()`; patch `Views._applyDashboardAllFilters()` |
| `Styles.html` | Append CPP CSS block |

**Do NOT modify:** `Code.js`, `Index.html`, `Database.js`, or any other file.

---

## Constraints

- No external libraries, CDN links, or npm packages.
- No new `google.script.run` calls — the panel reads only from `App.state.filteredCandidates` which is already in memory.
- The panel must not interfere with existing CTRL+Click card multi-select behavior.
- Closing the panel does NOT clear any filter state.
- The shortcut `Ctrl+Shift+P` must call `e.preventDefault()` to avoid triggering browser print-preview (some browsers bind this).
- `initShortcut()` must be registered only once across all dashboard re-renders.

---

## Acceptance Checklist

- [ ] `Ctrl+Shift+P` toggles the panel open/closed
- [ ] Panel shows correct count badge matching `App.state.filteredCandidates.length`
- [ ] Table updates instantly when dashboard filters change (card click, CTRL+card, search, advanced filters)
- [ ] Panel has independent vertical scroll
- [ ] Sticky table header works
- [ ] ✕ button closes panel without clearing filters
- [ ] ⚙️ button toggles the settings drawer
- [ ] Column visibility toggles work
- [ ] Density selector changes row padding
- [ ] Sort settings reorder rows client-side
- [ ] No new backend calls are made when panel opens or refreshes
