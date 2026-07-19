# Fix: Script.html — Unescaped Backticks and Template Interpolations in Documents Center

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Context

The `Script.html` file contains a newly-added **Documents Center** section (lines ~3277–3699). The IDE incorrectly escaped every backtick (`` \` ``) and template interpolation (`\${`) inside that section.

Because the closing backtick of `container.innerHTML = \`...\`;` was escaped as `\`` instead of `` ` ``, the outer template literal is never closed. This causes a JavaScript syntax error (`Unexpected end of input`) and the web app shows a blank page.

The file is a Google Apps Script HTML template, so the fix must be applied to the source file before deploying with `clasp push`.

---

## Task

Edit **only** `Script.html`.

Inside the `documentsCenter` view and all its `_dc*` helper methods (the entire Documents Center block that was just added), remove every backslash that appears before:

1. A backtick character `` ` ``
2. A template interpolation marker `${`

### Rule

```html
<!-- BEFORE (wrong — escaped) -->
container.innerHTML = \`
  ...
\`;

<!-- AFTER (correct — unescaped) -->
container.innerHTML = `
  ...
`;
```

```html
<!-- BEFORE (wrong — escaped interpolation) -->
<td colspan=\"8\">${c.candidateId}</td>
\${['Passport','Photo',...].map(t => \`...\`)}

<!-- AFTER (correct) -->
<td colspan=\"8\">${c.candidateId}</td>
${['Passport','Photo',...].map(t => `...`)}
```

---

## Constraints

- Do **NOT** modify any file except `Script.html`.
- Do **NOT** change any logic, variable names, or HTML structure — only remove the spurious backslashes.
- Do **NOT** remove backslashes that are part of legitimate escaping inside the template content (e.g., `\\` used for CSS or JS strings). Only fix the `\` immediately before a backtick or `${`.

---

## Output

Produce the complete, corrected content of `Script.html` with the Documents Center section fully unescaped.

After the fix, the JavaScript inside the `<script>` tag must parse without syntax errors. There should be no `\` before any backtick or `${` within the Documents Center block.
