# BUG FIX — Candidate Preview Panel shows "—" in all rows

## Problem

The panel opens correctly and the count badge shows the right number,
but every cell in the table shows "—".

**Root cause:** the `_cellValue()` function uses wrong field names.
It looks for `firstName`, `hrCode`, `candidateType` —
but the actual candidate objects use `FullName`, `CandidateID`, `Recruitment_Type`, `CurrentStatus`.

---

## Fix

Open `Script.html`.  
Find the `CandidatePreviewPanel` IIFE.  
Inside it, find the `_cellValue(c, col)` function.  
Replace it **entirely** with this corrected version:

```js
function _cellValue(c, col) {
  switch (col) {
    case 'name':   return c.FullName         || '—';
    case 'pos':    return c.Position         || '—';
    case 'code':   return c.CandidateID      || '—';
    case 'type':   return c.Recruitment_Type || '—';
    case 'status': return c.CurrentStatus    || '—';
    default:       return '—';
  }
}
```

---

## Scope

That is the **only** change needed.  
Do **not** touch anything else.
