# PROMPT: Fix Doc Completeness & Missing Docs Columns Stuck on "Loading…"

## Problem

On the **Candidates** page the **Doc Completeness %** and **Missing Documents** columns show
`Loading…` / `…` permanently and never update — unless the user clicks the Candidates nav item
a second time to force a full re-render.

## Root Cause

The flow that should update those columns is:

1. `_loadCandidates()` renders the table immediately (cells show `Loading…`).
2. `_loadAllCompleteness()` runs in the background and fetches doc data for every candidate.
3. When done, it calls `App.setState({ docCompleteness: completeness })` **then**
   `Views._restoreFilterState()`.
4. `_restoreFilterState()` is supposed to call `_filterCandidates()` which re-renders
   the table with the real data.

**The bug is in step 4.** `_restoreFilterState()` reads saved filters from `localStorage`.
If there are **no saved filters** (first visit, or after clearing), it hits this early return:

```js
_restoreFilterState() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem('hr_candidate_filters') || 'null'); } catch (_) { }
  if (!saved) return;   // ← exits here — table is never re-rendered
  // ...
  Views._filterCandidates();   // ← never reached
},
```

Because `_filterCandidates()` is never called, the DOM still shows `Loading…`.  
On machines where saved filters exist, the early return is skipped and it works.  
On the developer's laptop (no saved filters), it always fails.

---

## Fix — change only `_loadAllCompleteness` in `Script.html`

### Current code (around line 1581–1598)

```js
async _loadAllCompleteness(candidates) {
  try {
    const results = await Promise.allSettled(
      candidates.map(c => GAS.call('api_getDocumentsByCandidate', c.CandidateID))
    );
    const completeness = {};
    results.forEach((result, i) => {
      const cand = candidates[i];
      completeness[cand.CandidateID] = (result.status === 'fulfilled' && result.value?.success)
        ? computeCompleteness(result.value.data)
        : { pct: 0, missingDocs: [...REQUIRED_DOCS], presentDocs: [] };
    });
    App.setState({ docCompleteness: completeness });
    // Re-render table now that completeness data is available — restore saved filters first
    Views._restoreFilterState();
  } catch (err) {
    console.error('Completeness batch load error:', err);
  }
},
```

### Replace with

```js
async _loadAllCompleteness(candidates) {
  try {
    const results = await Promise.allSettled(
      candidates.map(c => GAS.call('api_getDocumentsByCandidate', c.CandidateID))
    );
    const completeness = {};
    results.forEach((result, i) => {
      const cand = candidates[i];
      completeness[cand.CandidateID] = (result.status === 'fulfilled' && result.value?.success)
        ? computeCompleteness(result.value.data)
        : { pct: 0, missingDocs: [...REQUIRED_DOCS], presentDocs: [] };
    });
    App.setState({ docCompleteness: completeness });

    // Re-render the candidates table if it is currently visible in the DOM.
    // Always do this unconditionally — _restoreFilterState() exits early when
    // there are no saved filters, leaving the table stuck on "Loading…".
    const tableEl = document.getElementById('candidates-table');
    if (tableEl) {
      let savedFilters = null;
      try { savedFilters = JSON.parse(localStorage.getItem('hr_candidate_filters') || 'null'); } catch (_) {}

      if (savedFilters) {
        // Saved filters exist — let _restoreFilterState handle the re-render
        // (it will call _filterCandidates internally).
        Views._restoreFilterState();
      } else {
        // No saved filters — re-render directly with the current candidate list.
        Views._renderCandidatesTable(
          App.state.filteredCandidates && App.state.filteredCandidates.length
            ? App.state.filteredCandidates
            : App.state.candidates
        );
      }
    }
  } catch (err) {
    console.error('Completeness batch load error:', err);
  }
},
```

---

## Why This Works

| Scenario | Before fix | After fix |
|---|---|---|
| No saved filters in localStorage | `_restoreFilterState()` returns early → table stays on `Loading…` | `tableEl` exists → no saved filters → `_renderCandidatesTable()` called directly ✅ |
| Saved filters exist | `_restoreFilterState()` runs → `_filterCandidates()` → table updates ✅ | Same path taken ✅ |
| User navigated away before completeness finished | `_restoreFilterState()` tries to update non-existent DOM → silent failure | `tableEl` is `null` → block is skipped, no error ✅ |

---

## Files to Modify

- **`Script.html`** — only `_loadAllCompleteness`, exactly as shown above.
- Do **not** modify `_restoreFilterState`, `_filterCandidates`, `_renderCandidatesTable`, or any other function.
- Do **not** modify `Code.js` or any other file.

---

## Constraints

- Do not change `_restoreFilterState()` — it is used by other flows.
- Do not change the existing `Promise.allSettled` logic or the `computeCompleteness` calls.
- The fix must not cause a double-render when saved filters exist.
- Compatible with Apps Script V8 runtime.

---

## Success Criteria

- [ ] On first visit (no saved filters), Doc Completeness % and Missing Documents columns populate automatically without any second click.
- [ ] On subsequent visits (saved filters exist), filters are restored and the table renders correctly as before.
- [ ] Navigating away from Candidates while completeness is still loading causes no console errors.
- [ ] No other page or feature is affected.
