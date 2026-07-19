# Update Documents Center Table: Remove Department/Nationality, Show Available/Missing Document Names

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The Documents Center table currently has 6 data columns:

```
Candidate | Status | Department | Nationality | Available | Missing | Actions
```

The table currently shows:
- **Available** column = a green number (e.g., `5`)
- **Missing** column = a red/orange number (e.g., `2`)

The requirement is to make the Documents Center table look like the Candidates table's document completeness section:
- **Remove** the `Department` and `Nationality` columns from the table.
- **Available** column should display the **names** of the available documents as green chips.
- **Missing** column should display the **names** of the missing documents as red chips.
- Keep the `Candidate`, `Status`, and `Actions` columns unchanged.

---

## Task

Apply the following changes to `Script.html` only.

### A. Update the table header in the `documentsCenter` template

Find the `<thead>` block inside the Documents Center table (around line 3432). It currently looks like this:

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

Replace it with exactly this:

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

The Department and Nationality `<th>` elements are removed. The remaining columns are now:
- Select checkbox
- Candidate
- Status
- Available
- Missing
- Actions

### B. Update the empty-state row colspan

Find the initial loading row inside `<tbody id="dc-tbody">` (around line 3445):

```html
<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary);">Loading…</td></tr>
```

Change `colspan="8"` to `colspan="6"` because there are now 6 columns:

```html
<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">Loading…</td></tr>
```

### C. Update the empty-state message in `_dcRender`

Find the block inside `_dcRender` where `dc.filteredCandidates.length === 0` (around line 3555). It currently has:

```html
<tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary);">...`;
```

Change `colspan="8"` to `colspan="6"`:

```html
tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">...`;
```

Keep the rest of the message exactly as it is.

### D. Update the table row rendering in `_dcRender`

Find the `_dcRender` method's row template (around line 3583). The current row has:

```html
<td style="padding:10px 12px;font-size:.82rem;">${c.department || '—'}</td>
<td style="padding:10px 12px;font-size:.82rem;">${c.nationality || '—'}</td>
<td style="padding:10px 12px;text-align:center;">
  <span style="color:var(--success);font-weight:700;">${c.availableCount}</span>
</td>
<td style="padding:10px 12px;text-align:center;">
  <span style="color:${c.missingCount > 0 ? 'var(--warning,#f59e0b)' : 'var(--text-tertiary)'};font-weight:700;">${c.missingCount}</span>
</td>
```

Replace those four `<td>` cells with the following two cells that render document-name chips:

```html
<td style="padding:10px 12px;text-align:center;">
  ${c.availableCount > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">${Object.entries(c.docSummary || {}).filter(([,s]) => s === 'Available').map(([type]) => `<span class="doc-chip doc-chip--complete">${escHtml(type)}</span>`).join('')}</div>`
    : '<span style="color:var(--text-muted);font-size:.75rem;">—</span>'}
</td>
<td style="padding:10px 12px;text-align:center;">
  ${c.missingCount > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">${Object.entries(c.docSummary || {}).filter(([,s]) => s === 'Missing').map(([type]) => `<span class="doc-chip doc-chip--missing">${escHtml(type)}</span>`).join('')}</div>`
    : '<span style="color:var(--text-muted);font-size:.75rem;">—</span>'}
</td>
```

This uses the existing CSS classes from the app:
- `doc-chip doc-chip--complete` = green chip for available documents
- `doc-chip doc-chip--missing` = red chip for missing documents

The `escHtml` helper function already exists in the app.

### E. Update the error loading row colspan

In `_dcLoad`, find the error row:

```html
if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--danger);">Error loading candidates: ...`;
```

Change `colspan="8"` to `colspan="6"`:

```html
if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--danger);">Error loading candidates: ...`;
```

---

## Constraints

- Do **not** modify `DocumentsCenter.js` — the backend already returns the correct `docSummary` object.
- Do **not** remove the Department and Nationality filters from the filter panel above the table. Only remove the table columns.
- Do **not** change the column order of the remaining columns.
- Keep all existing CSS classes, IDs, and method names unchanged.
- Do **not** modify any other table in the app (e.g., the Candidates list table).

---

## Output

Produce the updated `Script.html` with the Documents Center table reduced to 6 columns. The Available and Missing columns should display document-name chips using the existing green/red styles.

After the fix, the Documents Center table should look like this:

```
[✓] | Candidate    | Status | Available (green chips) | Missing (red chips) | Actions
```

Each available document name should appear as a green `doc-chip doc-chip--complete`.  
Each missing document name should appear as a red `doc-chip doc-chip--missing`.
