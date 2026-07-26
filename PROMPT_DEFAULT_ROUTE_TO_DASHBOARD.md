# PROMPT: Open Dashboard by Default When the App Loads

## Overview

When the app first loads, it currently navigates to the **Candidates** page.
Change it so it opens the **Dashboard** page instead.

---

## File to Modify

- **`Script.html`** — one line only.
- Do **not** modify any other file.

---

## The Change

In the `initApp` function (near the bottom of `Script.html`, just before the closing `</script>` tag), find this line:

```js
    Router.navigate('candidates');
```

Replace it with:

```js
    Router.navigate('dashboard');
```

### Full context (for locating the line accurately)

```js
  const initApp = () => {
    // ...

    renderTopbar();
    renderSidebar();
    Router.navigate('candidates');   // ← change 'candidates' to 'dashboard'
  };

  document.addEventListener('DOMContentLoaded', initApp);
```

---

## Constraints

- Change **only** this one string — `'candidates'` → `'dashboard'`.
- Do not move, restructure, or rename anything else in `initApp`.
- Do not touch any other file.

---

## Success Criteria

- [ ] Opening the app URL loads the **Dashboard** page immediately.
- [ ] Navigating to other pages via the sidebar still works normally.
- [ ] No console errors on load.
