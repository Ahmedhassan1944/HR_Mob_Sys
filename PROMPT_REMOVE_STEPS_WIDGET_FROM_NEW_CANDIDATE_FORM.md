# PROMPT: Remove the Steps Progress Widget from the New Candidate Form

## Overview

Remove the **three-step progress indicator** (Basic Info → Contract → Send Invite) that appears at the top of the **New Candidate** page. Delete both the HTML block and its dedicated CSS rules. Nothing else should change.

The widget looks like this:

```
① ————————— ② ————————— ③
BASIC INFO    CONTRACT    SEND INVITE
```

---

## Files to Modify

| File | What to remove |
|---|---|
| `Script.html` | The `<!-- Workflow Steps -->` HTML block |
| `Styles.html` | The `/* ── Progress Steps ── */` CSS block |

Do **not** modify `Code.js`, `Database.js`, or any other file.

---

## Change 1 — Remove HTML from `Script.html`

### Location

Inside the `newCandidate(container)` view, between the closing `</div>` of the page header and the opening `<div class="table-card">` (around line 2761–2766).

### Exact block to delete

```html
      <!-- Workflow Steps -->
      <div class="steps" role="list" aria-label="Registration steps">
        <div class="step active" role="listitem"><div class="step__circle">1</div><div class="step__label">Basic Info</div></div>
        <div class="step" role="listitem"><div class="step__circle">2</div><div class="step__label">Contract</div></div>
        <div class="step" role="listitem"><div class="step__circle">3</div><div class="step__label">Send Invite</div></div>
      </div>
```

Delete these 6 lines (comment + div) entirely. The `<div class="table-card">` that follows immediately after becomes the direct next element under the page header.

---

## Change 2 — Remove CSS from `Styles.html`

### Location

Around line 875–918, under the comment `/* ── Progress Steps ── */`.

### Exact block to delete

```css
  /* ── Progress Steps ──────────────────────────── */
  .steps {
    display: flex; align-items: center; gap: 0;
    margin-bottom: var(--sp-4); overflow-x: auto;
  }

  .step {
    display: flex; flex-direction: column; align-items: center;
    gap: var(--sp-1); min-width: 90px; text-align: center;
    position: relative; flex: 1;
  }

  .step:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 14px; left: 50%; width: 100%;
    height: 2px;
    background: var(--border);
    z-index: 0;
  }

  .step.done:not(:last-child)::after,
  .step.active:not(:last-child)::after { background: var(--primary); }

  .step__circle {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--border); color: var(--text-secondary);
    display: grid; place-items: center;
    font-size: .78rem; font-weight: 700;
    position: relative; z-index: 1;
    transition: background var(--ease), color var(--ease);
  }

  .step.active .step__circle { background: var(--primary); color: #fff; }
  .step.done   .step__circle { background: var(--success); color: #fff; }

  .step__label {
    font-size: .72rem; font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase; letter-spacing: .03em;
  }

  .step.active .step__label { color: var(--primary); }
  .step.done   .step__label { color: var(--success); }
```

Delete this entire block (comment through last rule). The `/* ── Document Row ── */` section that follows remains untouched.

---

## Constraints

- Do **not** remove any other element from the New Candidate page (form fields, buttons, toolbar, page header, etc.).
- Do **not** remove any JavaScript — there is no JS logic tied to these steps; they are purely decorative HTML/CSS.
- The classes `.steps`, `.step`, `.step__circle`, `.step__label` are **not used anywhere else** in the app — it is safe to delete all their CSS rules.
- Do **not** modify any server-side `.js` files.

---

## Success Criteria

- [ ] The New Candidate page no longer shows the numbered step indicator.
- [ ] The form (Candidate Information card) appears directly below the page header with no gap or orphaned space.
- [ ] No console errors on the New Candidate page.
- [ ] All other pages are unaffected.
