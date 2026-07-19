# Verify Documents Center Data Accuracy (100% Cross-Check)

> Paste this entire prompt into Google Antigravity IDE exactly as-is.

---

## Problem Description

- The app shows **many documents** per candidate in the Candidates view and on the Dashboard.
- But the Documents Center page shows **most candidates in red / many missing documents**.
- We need a 100% reliable way to verify that the Documents Center data is accurate, and that documents visible in Candidates view and Dashboard are also present in Documents Center.

---

## Root-Cause Hypothesis (Before Verifying)

There are already **three known inconsistencies** in the codebase. Verify these first before assuming the data is wrong:

| View | Counts a document as "Available" if | Required Doc Types | Includes non-required doc types? |
|---|---|---|---|
| **Candidates view** (`Script.html` `_loadCandidateDocuments`) | `ApprovalStatus !== 'Rejected'` (Approved OR Pending Review) | 7 types: Passport, Photo, Academic Certificate, Medical Examination, Medical Analysis, Visa, CV | Ignores Offer Letter, Employment Contract, ID Card |
| **Dashboard** (`Code.js` `api_getDashboardData`) | `ApprovalStatus !== 'Rejected'` (Approved OR Pending Review) | 7 types | Ignores Offer Letter, Employment Contract, ID Card |
| **Documents Center** (`DocumentsCenter.js` `api_getDocumentsCenterData`) | `ApprovalStatus === 'Approved'` ONLY | 10 types: Passport, Photo, Academic Certificate, Medical Examination, Medical Analysis, Visa, CV, Offer Letter, Employment Contract, ID Card | Counts Offer Letter, Employment Contract, ID Card as required |

This means:
- A document with status `Pending Review` will show as **available in Candidates view** and **count in Dashboard**, but show as **missing in Documents Center**.
- Documents of type `Offer Letter`, `Employment Contract`, or `ID Card` will be ignored in Candidates view and Dashboard, but will be counted as **missing in Documents Center**.

This is the most likely reason the Documents Center looks red while the other views show many documents.

---

## Step 1: Add a Debug Verification API (Temporary)

Add a new temporary backend function to `DocumentsCenter.js`. Do **not** change existing behavior yet. This function returns raw data for cross-verification.

### A. Add `api_debugVerifyDocuments()` at the end of `DocumentsCenter.js`

```javascript
/**
 * Temporary verification API: returns raw document counts per candidate
 * from three sources for side-by-side comparison.
 */
function api_debugVerifyDocuments() {
  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));

    // 1. Read candidates
    var cSheet = ss.getSheetByName('tbl_Candidates');
    var cData = cSheet.getDataRange().getValues();
    var cHeaders = cData[0];
    var cIdIdx = cHeaders.indexOf('CandidateID');
    var cNameIdx = cHeaders.indexOf('FullName');
    var cStatusIdx = cHeaders.indexOf('CurrentStatus');
    var cFolderIdx = cHeaders.indexOf('DriveFolderID');

    var candidates = [];
    for (var i = 1; i < cData.length; i++) {
      candidates.push({
        candidateId: (cData[i][cIdIdx] || '').toString(),
        fullName: (cData[i][cNameIdx] || '').toString(),
        status: (cData[i][cStatusIdx] || '').toString(),
        driveFolderId: (cData[i][cFolderIdx] || '').toString()
      });
    }

    // 2. Read all documents
    var dSheet = ss.getSheetByName('tbl_Documents');
    var dData = dSheet.getDataRange().getValues();
    var dHeaders = dData[0];
    var dCandIdIdx = dHeaders.indexOf('CandidateID');
    var dTypeIdx = dHeaders.indexOf('DocType');
    var dStatusIdx = dHeaders.indexOf('ApprovalStatus');
    var dUrlIdx = dHeaders.indexOf('FileURL');
    var dNameIdx = dHeaders.indexOf('FileName');

    var docs = [];
    for (var j = 1; j < dData.length; j++) {
      docs.push({
        candidateId: (dData[j][dCandIdIdx] || '').toString(),
        docType: (dData[j][dTypeIdx] || '').toString(),
        approvalStatus: (dData[j][dStatusIdx] || '').toString(),
        fileUrl: (dData[j][dUrlIdx] || '').toString(),
        fileName: (dData[j][dNameIdx] || '').toString()
      });
    }

    // 3. Define the two required-doc sets
    var REQUIRED_DOCS_7 = ['Passport', 'Photo', 'Academic Certificate', 'Medical Examination', 'Medical Analysis', 'Visa', 'CV'];
    var REQUIRED_DOCS_10 = ['Passport', 'Photo', 'Academic Certificate', 'Medical Examination', 'Medical Analysis', 'Visa', 'CV', 'Offer Letter', 'Employment Contract', 'ID Card'];

    // 4. Build per-candidate summary
    var result = candidates.map(function(cand) {
      var candDocs = docs.filter(function(d) { return d.candidateId === cand.candidateId; });

      var approvedTypes = new Set(candDocs.filter(function(d) { return d.approvalStatus === 'Approved'; }).map(function(d) { return d.docType; }));
      var nonRejectedTypes = new Set(candDocs.filter(function(d) { return d.approvalStatus !== 'Rejected'; }).map(function(d) { return d.docType; }));

      var available7_strict = REQUIRED_DOCS_7.filter(function(t) { return approvedTypes.has(t); });
      var missing7_strict = REQUIRED_DOCS_7.filter(function(t) { return !approvedTypes.has(t); });
      var available7_loose = REQUIRED_DOCS_7.filter(function(t) { return nonRejectedTypes.has(t); });
      var missing7_loose = REQUIRED_DOCS_7.filter(function(t) { return !nonRejectedTypes.has(t); });

      var available10_strict = REQUIRED_DOCS_10.filter(function(t) { return approvedTypes.has(t); });
      var missing10_strict = REQUIRED_DOCS_10.filter(function(t) { return !approvedTypes.has(t); });

      var driveChecks = candDocs.filter(function(d) { return d.approvalStatus === 'Approved'; }).map(function(d) {
        var fileId = extractFileId_(d.fileUrl);
        var exists = false;
        var error = '';
        if (fileId) {
          try {
            DriveApp.getFileById(fileId);
            exists = true;
          } catch (e) {
            error = e.message;
          }
        }
        return { type: d.docType, fileId: fileId, exists: exists, error: error, fileName: d.fileName };
      });

      return {
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        status: cand.status,
        driveFolderId: cand.driveFolderId,
        totalDocs: candDocs.length,
        approvedDocs: candDocs.filter(function(d) { return d.approvalStatus === 'Approved'; }).length,
        pendingDocs: candDocs.filter(function(d) { return d.approvalStatus === 'Pending Review'; }).length,
        rejectedDocs: candDocs.filter(function(d) { return d.approvalStatus === 'Rejected'; }).length,
        docs7_strict: { available: available7_strict, missing: missing7_strict },
        docs7_loose: { available: available7_loose, missing: missing7_loose },
        docs10_strict: { available: available10_strict, missing: missing10_strict },
        driveChecks: driveChecks
      };
    });

    return { success: true, candidates: result };

  } catch (e) {
    Logger.log('Error in api_debugVerifyDocuments: ' + e.message + '\n' + e.stack);
    return { success: false, error: e.message };
  }
}
```

### B. Expose it in the main API router in `Script.html`

Find the API router (the mock switch or the real GAS router). In the mock switch block (around line 187) or the real call handler, add:

```javascript
if (fnName === 'api_debugVerifyDocuments') return Views._debugVerifyDocumentsResponse();
```

If the app uses a real `GAS.call()` (not a mock switch), ignore this step — the function will be callable from Google Apps Script directly.

---

## Step 2: Add a Temporary "Verify Documents" Page in the UI

Add a hidden/debug page in `Script.html` to display the verification results. This is temporary and can be removed after confirming data accuracy.

### A. Add a new temporary view method `Views._debugVerify()` in `Script.html`

Add this method near `Views.documentsCenter` (around line 3328):

```javascript
    async _debugVerify() {
      const container = document.getElementById('main-content');
      if (!container) return;

      container.innerHTML = `
        <div class="page-header">
          <div class="page-header__title">🔍 Documents Verification</div>
          <p class="page-header__sub">Cross-check Documents Center vs Candidates view vs Dashboard vs Drive</p>
        </div>
        <div class="table-card" style="padding:var(--sp-3);">
          <div id="verify-loading" class="loading-overlay"><div class="spinner spinner--dark"></div>Running verification…</div>
          <div id="verify-results"></div>
        </div>
      `;

      try {
        const res = await GAS.call('api_debugVerifyDocuments');
        if (!res.success) throw new Error(res.error);

        const candidates = res.candidates || [];
        const inconsistencies = [];

        candidates.forEach(c => {
          // 1. Documents Center currently uses 10 types, Approved only
          const dcAvailable = c.docs10_strict.available;
          const dcMissing = c.docs10_strict.missing;

          // 2. Candidates view / Dashboard use 7 types, Approved or Pending Review
          const viewAvailable = c.docs7_loose.available;
          const viewMissing = c.docs7_loose.missing;

          // 3. Drive check: any approved doc marked as missing from Drive is a real data problem
          const brokenDriveFiles = c.driveChecks.filter(d => !d.exists);

          // Report only candidates with issues
          if (dcMissing.length > 0 || viewMissing.length > 0 || brokenDriveFiles.length > 0) {
            inconsistencies.push({
              ...c,
              dcMissing: dcMissing,
              viewMissing: viewMissing,
              brokenDriveFiles: brokenDriveFiles
            });
          }
        });

        const el = document.getElementById('verify-results');
        el.innerHTML = `
          <h3 style="margin-bottom:12px;">Total candidates: ${candidates.length} · With issues: ${inconsistencies.length}</h3>
          <p style="margin-bottom:16px;color:var(--text-secondary);">
            Documents Center (current): 10 doc types, Approved only.<br>
            Candidates view / Dashboard: 7 doc types, Approved or Pending Review.<br>
            Drive: actual file existence check for Approved documents.
          </p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${inconsistencies.map(c => `
              <div style="border:1px solid var(--border);border-radius:var(--radius);padding:12px;">
                <div style="font-weight:700;margin-bottom:8px;">${escHtml(c.fullName)} (${c.candidateId}) — ${c.status}</div>
                <div style="font-size:.85rem;color:var(--text-secondary);margin-bottom:8px;">
                  Total docs: ${c.totalDocs} | Approved: ${c.approvedDocs} | Pending: ${c.pendingDocs} | Rejected: ${c.rejectedDocs}
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <div>
                    <div style="font-weight:600;color:var(--danger);">Missing in Documents Center (10 types, Approved):</div>
                    <div>${c.dcMissing.length ? c.dcMissing.map(d => `<span class="doc-chip doc-chip--missing">${escHtml(d)}</span>`).join(' ') : '<span style="color:var(--success);">None</span>'}</div>
                  </div>
                  <div>
                    <div style="font-weight:600;color:var(--warning);">Missing in Candidates/Dashboard (7 types, Approved or Pending):</div>
                    <div>${c.viewMissing.length ? c.viewMissing.map(d => `<span class="doc-chip doc-chip--missing">${escHtml(d)}</span>`).join(' ') : '<span style="color:var(--success);">None</span>'}</div>
                  </div>
                </div>
                ${c.brokenDriveFiles.length ? `
                  <div style="margin-top:12px;">
                    <div style="font-weight:600;color:var(--danger);">⚠️ Approved files missing on Drive:</div>
                    ${c.brokenDriveFiles.map(f => `
                      <div style="font-size:.8rem;color:var(--danger);">${escHtml(f.type)} — ${escHtml(f.fileName)} — ${f.fileId} — ${escHtml(f.error)}</div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `;
      } catch (e) {
        document.getElementById('verify-results').innerHTML = `<div style="color:var(--danger);">Error: ${e.message}</div>`;
      } finally {
        const loading = document.getElementById('verify-loading');
        if (loading) loading.remove();
      }
    }
```

### B. Add a temporary navigation button to reach the verify page

Near the sidebar navigation (around line 436 in `Script.html`), add:

```html
<li class="nav__item" onclick="Views._debugVerify()"><span class="nav__icon">🔍</span>Verify Docs</li>
```

Wrap it in a comment so it is easy to remove later, or place it at the end of the nav list.

---

## Step 3: Run the Verification

After deploying the code:

1. Open the app and click the new **"Verify Docs"** navigation item.
2. The page will call the backend and show three things for every candidate:
   - **Missing in Documents Center** (10 doc types, Approved only)
   - **Missing in Candidates/Dashboard** (7 doc types, Approved or Pending Review)
   - **Approved files that no longer exist on Drive** (real data corruption)
3. Read the GAS execution logs for the same call:
   - Go to Apps Script → Executions → find the latest `api_debugVerifyDocuments` execution.
   - Download or view the logs.

---

## Step 4: Interpret the Results

### Case A: Many candidates show missing docs in "Documents Center" but NOT in "Candidates/Dashboard"

This confirms the **current rule mismatch**. The data is consistent, but the **definition of "available" differs between views**.

**Fix options (decide with business owner):**

| Option | Change | Impact |
|---|---|---|
| **A1: Align Documents Center to Candidates/Dashboard** | Use 7 doc types and `ApprovalStatus !== 'Rejected'` | Documents Center will turn green and match the other views. Offer Letter / Employment Contract / ID Card will not be tracked here. |
| **A2: Align Candidates/Dashboard to Documents Center** | Use 10 doc types and `ApprovalStatus === 'Approved'` everywhere | Candidates view and Dashboard will turn more red. Pending Review docs will no longer count as complete. |
| **A3: Hybrid approach** | Documents Center shows all 10 doc types but counts `Approved` and `Pending Review` as available | Closest to current user expectation: all uploaded docs are visible, but only Approved are downloadable. |

### Case B: Some candidates have missing docs in BOTH columns

This means the documents really do not exist in `tbl_Documents` for that candidate. Check the Drive folder for that candidate to see if the files were uploaded but not recorded in the sheet.

### Case C: Broken Drive files appear

These are real data errors. The `tbl_Documents` table has a FileURL pointing to a Drive file that no longer exists (deleted, moved, or wrong permissions). These need manual cleanup or re-upload.

### Case D: Documents Center matches Candidates/Dashboard perfectly

Then the data is correct and the issue is purely visual (e.g., CSS chips all appearing red, or the filter panel is too restrictive).

---

## Step 5: After Deciding the Fix, Remove the Temporary Code

1. Delete `api_debugVerifyDocuments()` from `DocumentsCenter.js`.
2. Delete `Views._debugVerify()` from `Script.html`.
3. Remove the temporary "Verify Docs" navigation item.
4. Redeploy and verify the normal Documents Center view.

---

## Alternative: Manual Spreadsheet Verification (No Code Changes)

If you cannot deploy code right now, you can verify manually:

1. Open `tbl_Documents` in the spreadsheet.
2. For one candidate that looks wrong in Documents Center, filter by their `CandidateID`.
3. Count how many rows have `ApprovalStatus = 'Approved'`.
4. Compare those `DocType` values with the list of 10 required types in Documents Center.
5. Compare with the Candidates view: open the candidate and see which document types are listed (uses `ApprovalStatus !== 'Rejected'`).
6. Compare with the Dashboard: check the document KPIs (uses 7 doc types, `ApprovalStatus !== 'Rejected'`).

You will likely see that the Documents Center is stricter, which explains the red color.

---

## Output

After running this verification, you will know with certainty:

1. Whether the Documents Center is consistent with the Candidates view and Dashboard.
2. Whether the issue is a **rule mismatch** or a **real data problem**.
3. Which approved files are actually missing on Drive.
4. Which candidates genuinely have missing documents.

This gives you the facts needed to decide the correct fix instead of guessing.
