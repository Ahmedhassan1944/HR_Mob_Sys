# Enhancement — Candidate Preview Panel: Resize + Drag + Column Sort

## Context

The Candidate Preview Panel (`CandidatePreviewPanel` IIFE) already exists in `Script.html`.
The panel element is `#cpp-panel` with class `.cpp-panel`.
Only modify `Script.html` and `Styles.html`. Do NOT touch any other file.

---

## Feature 1 — Draggable Panel (move by grabbing the header)

Make the panel movable by dragging its header (`.cpp-header`).

### Implementation inside `CandidatePreviewPanel` IIFE — add this function and call it inside `bindEvents()`:

```js
function _initDrag() {
  const panel  = _panel();
  const handle = panel.querySelector('.cpp-header');
  if (!handle) return;

  let dragging = false, ox = 0, oy = 0;

  handle.style.cursor = 'grab';

  handle.addEventListener('mousedown', e => {
    // Don't drag when clicking buttons inside the header
    if (e.target.closest('button')) return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    handle.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    let x = e.clientX - ox;
    let y = e.clientY - oy;
    // Keep panel inside viewport
    x = Math.max(0, Math.min(x, window.innerWidth  - panel.offsetWidth));
    y = Math.max(0, Math.min(y, window.innerHeight - panel.offsetHeight));
    panel.style.left   = x + 'px';
    panel.style.top    = y + 'px';
    panel.style.right  = 'auto';
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    handle.style.cursor = 'grab';
  });
}
```

Call `_initDrag()` inside `bindEvents()`.

---

## Feature 2 — Resizable Panel (drag any edge or corner)

Add a resize handle at the **bottom-right corner** and allow dragging to resize.

### Add to `bindEvents()` inside `CandidatePreviewPanel`:

```js
function _initResize() {
  const panel  = _panel();
  const handle = document.createElement('div');
  handle.className = 'cpp-resize-handle';
  panel.appendChild(handle);

  let resizing = false, sx = 0, sy = 0, sw = 0, sh = 0;

  handle.addEventListener('mousedown', e => {
    resizing = true;
    sx = e.clientX;
    sy = e.clientY;
    sw = panel.offsetWidth;
    sh = panel.offsetHeight;
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const w = Math.max(400, sw + (e.clientX - sx));
    const h = Math.max(250, sh + (e.clientY - sy));
    panel.style.width  = w + 'px';
    panel.style.height = h + 'px';
  });

  document.addEventListener('mouseup', () => { resizing = false; });
}
```

Call `_initResize()` inside `bindEvents()`.

### Add CSS to `Styles.html`:

```css
.cpp-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 18px;
  height: 18px;
  cursor: se-resize;
  background: linear-gradient(135deg, transparent 50%, #cbd5e1 50%);
  border-bottom-right-radius: 12px;
  z-index: 10;
}
.cpp-resize-handle:hover {
  background: linear-gradient(135deg, transparent 50%, #94a3b8 50%);
}
```

---

## Feature 3 — Clickable Column Headers (Sort A→Z / Z→A / 1→N / N→1)

### Replace the existing `_sortData(data)` and `refresh()` header rendering with this upgraded version:

#### New private sort state (add alongside existing `_sortCol` and `_sortDir`):
The existing `_sortCol` and `_sortDir` variables are already present — keep them.

#### Replace the thead rendering block inside `refresh()`:

Find this block inside `refresh()`:
```js
const theadRow = _thead().querySelector('tr');
theadRow.innerHTML = _cols
  .map(col => `<th class="cpp-th">${COL_LABELS[col]}</th>`)
  .join('');
```

Replace it with:
```js
const theadRow = _thead().querySelector('tr');
theadRow.innerHTML = _cols.map(col => {
  let arrow = '';
  if (col === _sortCol) arrow = _sortDir === 'asc' ? ' ▲' : ' ▼';
  return `<th class="cpp-th cpp-th--sortable" data-col="${col}" title="Click to sort">
    ${COL_LABELS[col]}<span class="cpp-sort-arrow">${arrow}</span>
  </th>`;
}).join('');

// Attach sort click listeners to headers
theadRow.querySelectorAll('.cpp-th--sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (_sortCol === col) {
      _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      _sortCol = col;
      _sortDir = 'asc';
    }
    refresh();
  });
});
```

#### Replace `_sortData(data)` with this smarter version that handles numbers:

```js
function _sortData(data) {
  return [...data].sort((a, b) => {
    const av = _cellValue(a, _sortCol);
    const bv = _cellValue(b, _sortCol);

    // Numeric sort if both values look like numbers
    const an = parseFloat(av.replace(/[^0-9.-]/g, ''));
    const bn = parseFloat(bv.replace(/[^0-9.-]/g, ''));
    if (!isNaN(an) && !isNaN(bn)) {
      return _sortDir === 'asc' ? an - bn : bn - an;
    }

    // Text sort (locale-aware, handles Arabic)
    const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
    return _sortDir === 'asc' ? cmp : -cmp;
  });
}
```

### Add CSS for sortable headers to `Styles.html`:

```css
.cpp-th--sortable {
  cursor: pointer;
  user-select: none;
}
.cpp-th--sortable:hover {
  background: #e2e8f0;
  color: #1e293b;
}
.cpp-sort-arrow {
  font-size: 10px;
  margin-left: 4px;
  color: #3b82f6;
}
```

---

## Summary of all changes

| File | What changes |
|---|---|
| `Script.html` | Add `_initDrag()`, `_initResize()` functions; call both inside `bindEvents()`; replace thead rendering in `refresh()`; replace `_sortData()` |
| `Styles.html` | Add `.cpp-resize-handle`, `.cpp-th--sortable`, `.cpp-sort-arrow` CSS |

**Do NOT modify:** `Code.js`, `Index.html`, `Database.js`, or any other file.

---

## Acceptance Checklist

- [ ] Panel can be dragged by its header to any position on screen
- [ ] Panel stays within viewport bounds while dragging
- [ ] Resize handle appears at bottom-right corner
- [ ] Dragging resize handle changes panel width and height freely
- [ ] Minimum size enforced: 400px wide, 250px tall
- [ ] Clicking a column header sorts that column ascending (▲)
- [ ] Clicking the same header again sorts descending (▼)
- [ ] Clicking a different header resets to ascending on that column
- [ ] Numeric values (IDs, codes) sort numerically (1, 2, 10 — not 1, 10, 2)
- [ ] Text values sort alphabetically with Arabic locale support
- [ ] No new backend calls
