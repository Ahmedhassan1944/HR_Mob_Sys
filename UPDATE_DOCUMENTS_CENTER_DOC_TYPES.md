# Update Documents Center: Remove 3 document types

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The Documents Center currently shows 10 document types:

```
Passport, Photo, Academic Certificate, Medical Examination, Medical Analysis, Visa, CV, Offer Letter, Employment Contract, ID Card
```

The project only needs **7 document types** in the Documents Center:

```
Passport, Photo, Academic Certificate, Medical Examination, Medical Analysis, CV, Visa
```

Remove these 3 document types from the Documents Center only:

- **Offer Letter**
- **Employment Contract**
- **ID Card**

> Important: Do **not** remove these document types from the general document upload list used elsewhere in the app (e.g., the candidate detail view upload dropdown). Only update the Documents Center-specific lists and logic.

---

## Task

Apply the following changes to the two files.

### A. Update `DocumentsCenter.js` — remove the 3 types from the backend `docTypesList`

Find the `docTypesList` array (around line 131–137). It currently looks like this:

```javascript
var docTypesList = [
  'Passport', 'Photo', 'Academic Certificate', 'Medical Examination', 
  'Medical Analysis', 'Visa', 'CV', 'Offer Letter', 'Employment Contract', 'ID Card'
];
```

Replace it with exactly this 7-item version:

```javascript
var docTypesList = [
  'Passport', 'Photo', 'Academic Certificate', 'Medical Examination', 
  'Medical Analysis', 'Visa', 'CV'
];
```

This affects the `availableCount` / `missingCount` calculations and the `docSummary` returned for each candidate in `api_getDocumentsCenterData`.

### B. Update `Script.html` — remove the 3 types from the Documents Center chips

Find the document type chip selector in the `documentsCenter` view template (around line 3405). It currently looks like this:

```html
${['Passport','Photo','Academic Certificate','Medical Examination','Medical Analysis','Visa','CV','Offer Letter','Employment Contract','ID Card'].map(t => `
  <label ... class="dc-doctype-chip">
    <input type="checkbox" class="dc-doctype-check" value="${t}" onchange="Views._dcUpdateDownloadBtn()">
    <span>${t}</span>
  </label>
`).join('')}
```

Replace the array with exactly this 7-item version:

```html
${['Passport','Photo','Academic Certificate','Medical Examination','Medical Analysis','Visa','CV'].map(t => `
  <label ... class="dc-doctype-chip">
    <input type="checkbox" class="dc-doctype-check" value="${t}" onchange="Views._dcUpdateDownloadBtn()">
    <span>${t}</span>
  </label>
`).join('')}
```

Keep the rest of the HTML template and surrounding logic exactly as it is.

### C. Update `Script.html` — remove the 3 types from the mock data summary

Find the mock data block that builds the default `docSummary` for the Documents Center mock (around line 238). It currently looks like this:

```javascript
['Passport','Photo','Academic Certificate','Medical Examination','Medical Analysis','Visa','CV','Offer Letter','Employment Contract','ID Card'].forEach(t => docSummary[t] = 'Missing');
```

Replace it with exactly this 7-item version:

```javascript
['Passport','Photo','Academic Certificate','Medical Examination','Medical Analysis','Visa','CV'].forEach(t => docSummary[t] = 'Missing');
```

This is the same list that was used in the Documents Center mock. Only update this specific occurrence, not other document type lists in the file.

### D. Remove or update the 3 types from any other Documents Center preview/download lists

Search `Script.html` for the three exact strings: `Offer Letter`, `Employment Contract`, `ID Card` inside the Documents Center block (the section starting with `documentsCenter(container)` and the `_dc*` helper methods).

- If any `_dc*` method renders these document types in a list, modal, or preview, remove them from that list.
- If a candidate's `docSummary` object is rendered in a preview modal, it will already only contain the 7 types because the backend `docTypesList` was updated in step A. No extra change is needed unless there is a hardcoded list in the frontend preview code.

Do **not** change the document type list in other parts of the app (e.g., the candidate upload form at line ~2469, the dashboard filters, or the detail view document type dropdowns). Only modify the Documents Center-specific block.

---

## Constraints

- Do **not** modify `DocumentsCenter.js` logic outside the `docTypesList` array.
- Do **not** remove the 3 document types from the global document upload dropdown used in candidate detail / upload forms.
- Do **not** rename or restructure the existing Documents Center UI — only remove the three checkbox chips and update the backend list.
- Keep all existing CSS classes, IDs, and method names unchanged.

---

## Output

Produce the updated `Script.html` and `DocumentsCenter.js` with the Documents Center document type list reduced to 7 items. After the fix, the Documents Center should only show:

1. Passport
2. Photo
3. Academic Certificate
4. Medical Examination
5. Medical Analysis
6. Visa
7. CV

The Available / Missing counts and the batch download should only consider these 7 document types.
