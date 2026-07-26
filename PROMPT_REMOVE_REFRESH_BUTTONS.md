# PROMPT: Remove Refresh Buttons from Dashboard and Calendar Pages

## Overview

Remove the **🔄 Refresh** button from two pages:

1. **Dashboard** page header
2. **Calendar** page header

No other changes. Do **not** remove or alter any other buttons, functions, or logic.

---

## File to Modify

- **`Script.html`** — only this file.
- Do **not** modify `Code.js`, `Database.js`, or any other file.

---

## Change 1 — Dashboard Refresh Button

### Location

Inside the `dashboard(container)` view, in the `page-header__actions` div (around line 502–508).

### Current code

```html
<div class="page-header__actions">
  <button class="btn btn--outline btn--sm" onclick="Views._refreshDashboard()" aria-label="Refresh dashboard">
    🔄 Refresh
  </button>
  <button class="btn btn--primary btn--sm" onclick="Router.navigate('new-candidate')">
    ＋ New Candidate
  </button>
</div>
```

### Replace with (remove only the Refresh button, keep New Candidate)

```html
<div class="page-header__actions">
  <button class="btn btn--primary btn--sm" onclick="Router.navigate('new-candidate')">
    ＋ New Candidate
  </button>
</div>
```

---

## Change 2 — Calendar Refresh Button

### Location

Inside the `calendar(container)` view, in the `page-header__actions` div (around line 2986–2990).

### Current code

```html
<div class="page-header__actions">
  <button class="btn btn--outline btn--sm" onclick="Router.navigate('calendar')" aria-label="Refresh events">
    🔄 Refresh
  </button>
</div>
```

### Replace with (the actions div is now empty — remove it entirely)

```html
<!-- page-header__actions div removed (was only holding the Refresh button) -->
```

That is: delete the entire `<div class="page-header__actions">…</div>` block from the Calendar page header. The surrounding `page-header` structure remains intact.

---

## Constraints

- Do **not** remove the `Views._refreshDashboard()` function — it may still be called programmatically elsewhere. Only remove the button that calls it.
- Do **not** touch any filter, export, or other button.
- Do **not** modify any `.js` server-side files.
- The rest of the app must be unchanged.

---

## Success Criteria

- [ ] Dashboard page header shows only the **＋ New Candidate** button — no Refresh button.
- [ ] Calendar page header shows no action buttons — no Refresh button.
- [ ] Both pages still load and function normally.
- [ ] No other UI elements are affected.
