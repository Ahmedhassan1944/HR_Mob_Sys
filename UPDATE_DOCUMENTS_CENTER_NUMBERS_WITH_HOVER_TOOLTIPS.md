# Documents Center: Revert to Numbers with Hover Tooltips

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The Documents Center table was previously reduced to 6 columns:
- Checkbox | Candidate | Status | Available | Missing | Actions

The idea of showing all document names as chips in the Available and Missing columns was rejected because it makes the table look too crowded and ugly.

The new requirement is to revert to **showing counts as numbers**:
- **Available** column = a green number with the count of available documents.
- **Missing** column = a red number with the count of missing documents.
- When hovering over either number, a tooltip appears showing the **list of document names** that are available or missing.

---

## Task

Update `Script.html` to implement the new design.

### A. Add CSS for the tooltip (in `Styles.html`)

Add the following CSS block to `Styles.html` near the existing Document Chips section (around line 578):

```html
/* ── Document Count Hover Tooltip ─────────────────────────────────── */
.doc-count {
  position: relative;
  display: inline-block;
  font-weight: 700;
  cursor: help;
}

.doc-count--available { color: var(--success); }
.doc-count--missing   { color: var(--danger); }

.doc-count__tooltip {
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-surface, #ffffff);
  color: var(--text-primary, #1a1a1a);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 8px);
  padding: 8px 12px;
  font-size: .75rem;
  font-weight: 500;
  white-space: nowrap;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,.12);
  opacity: 0;
  visibility: hidden;
  transition: opacity .15s, visibility .15s;
  pointer-events: none;
  max-width: 260px;
}

.doc-count__tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: var(--border, #e2e8f0) transparent transparent transparent;
}

.doc-count:hover .doc-count__tooltip {
  opacity: 1;
  visibility: visible;
}

.doc-count__tooltip-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  white-space: normal;
  max-width: 240px;
}

.doc-count__tooltip-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.doc-count__tooltip-item::before {
  content: '•';
  font-weight: 700;
}

.doc-count__tooltip--available .doc-count__tooltip-item::before { color: var(--success); }
.doc-count__tooltip--missing .doc-count__tooltip-item::before   { color: var(--danger); }
```

If the CSS variables `var(--bg-surface)`, `var(--text-primary)`, or `var(--radius)` do not exist in the project, replace them with literal values:
- `--bg-surface` → `#ffffff`
- `--text-primary` → `#1a1a1a`
- `--radius` → `8px`
- `--border` → `#e2e8f0`

### B. Update the Documents Center table row rendering in `_dcRender`

In `Script.html`, find the `_dcRender` method's row template (around line 3583). The current row contains the Available and Missing cells that show numbers (or chips if the previous prompt was applied). Replace the Available and Missing `<td>` cells with the following:

**Current cells (numbers version):**

```html
          <td style="padding:10px 12px;text-align:center;">
            <span style="color:var(--success);font-weight:700;">${c.availableCount}</span>
          </td>
          <td style="padding:10px 12px;text-align:center;">
            <span style="color:${c.missingCount > 0 ? 'var(--warning,#f59e0b)' : 'var(--text-tertiary)'};font-weight:700;">${c.missingCount}</span>
          </td>
```

**Replace them with:**

```html
          <td style="padding:10px 12px;text-align:center;">
            <span class="doc-count doc-count--available">
              ${c.availableCount}
              <span class="doc-count__tooltip doc-count__tooltip--available">
                <span class="doc-count__tooltip-list">
                  ${c.availableCount > 0
                    ? Object.entries(c.docSummary || {}).filter(([,s]) => s === 'Available').map(([type]) => `<span class="doc-count__tooltip-item">${escHtml(type)}</span>`).join('')
                    : '<span class="doc-count__tooltip-item">No available documents</span>'}
                </span>
              </span>
            </span>
          </td>
          <td style="padding:10px 12px;text-align:center;">
            <span class="doc-count doc-count--missing">
              ${c.missingCount}
              <span class="doc-count__tooltip doc-count__tooltip--missing">
                <span class="doc-count__tooltip-list">
                  ${c.missingCount > 0
                    ? Object.entries(c.docSummary || {}).filter(([,s]) => s === 'Missing').map(([type]) => `<span class="doc-count__tooltip-item">${escHtml(type)}</span>`).join('')
                    : '<span class="doc-count__tooltip-item">No missing documents</span>'}
                </span>
              </span>
            </span>
          </td>
```

This keeps the table clean (just two colored numbers) and reveals the document names only on hover.

### C. Make sure the table still has 6 columns

Verify the table header (around line 3432) has exactly these 6 columns:

```html
<thead>
  <tr style="background:var(--surface-alt,#f5f7fa);text-align:left;">
    <th style="padding:10px 12px;width:36px;"></th>
    <th style="padding:10px 12px;">Candidate</th>
    <th style="padding:10px 12px;">Status</th>
    <th style="padding:10px 12px;text-align:center;">📄 Available</th>
    <th style="padding:10px 12px;text-align:center;">⚠️ Missing</th>
    <th style="padding:10px 12px;text-align:center;">Actions</th>
  </tr>
</thead>
```

If the Department and Nationality columns are still present, remove them.

### D. Verify colspan values are 6

Search for `colspan="8"` in the Documents Center section and change all of them to `colspan="6"`:

- Initial loading row: `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">Loading…</td></tr>`
- Empty state in `_dcRender`: `<tr><td colspan="6" ...>`
- Error row in `_dcLoad`: `<tr><td colspan="6" ...>`

### E. Update the Missing number color to red

Make sure the missing count is always **red** (`var(--danger)`) when greater than zero, instead of orange. If it is currently using `var(--warning,#f59e0b)`, replace it with the new CSS class `doc-count--missing` which already sets `color: var(--danger)`.

---

## Constraints

- Do **not** modify `DocumentsCenter.js` — the backend already returns the correct `availableCount`, `missingCount`, and `docSummary`.
- Do **not** change the filter panel above the table. Keep Department and Nationality filters if they exist.
- Do **not** modify any other table in the app.
- Keep all existing CSS classes, IDs, and method names unchanged.
- The tooltip must work on desktop hover. Mobile behavior is optional.

---

## Output

Produce the updated `Script.html` and `Styles.html` so that the Documents Center table looks like this:

```
[✓] | Candidate    | Status | Available (green #) | Missing (red #) | Actions
```

When the user hovers over the green Available number, a tooltip appears listing all available document names.  
When the user hovers over the red Missing number, a tooltip appears listing all missing document names.

The table should be clean, compact, and no longer show document-name chips inline.
