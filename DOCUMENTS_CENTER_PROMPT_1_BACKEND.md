# Documents Center — Prompt 1 of 2: Backend

> Paste this entire prompt into your AI IDE exactly as-is.

---

## Context

This is a Google Apps Script project for an Enterprise HR Mobilization system.

**Existing files you must read before writing any code:**
- `Code.js` — main entry point, see how `api_getDashboardData` is structured
- `Database.js` — see how sheets are accessed (`getCandidates`, sheet column layout)
- `DriveManager.js` — see how `DriveApp.getFolderById` is used

**Key facts from the codebase:**

`tbl_Candidates` columns (0-indexed):
```
0:CandidateID, 1:FullName, 2:Position, 3:Department, 4:Email,
5:Phone, 6:Nationality, 7:OfferSalary, 8:AssignedCoordinatorEmail,
9:CurrentStatus, 10:CreatedAt, 11:UpdatedAt, 12:DriveFolderID,
13:Notes, 14:LocalServerPath, 15:HR_Code, 16:Recruitment_Type, 17:Batch_Number
```

`tbl_Documents` columns (0-indexed):
```
0:DocumentID, 1:CandidateID, 2:DocType, 3:FileName, 4:FileURL,
5:UploadDate, 6:ApprovalStatus, 7:ApprovedBy, 8:VersionNumber, 9:Remarks
```

Valid `DocType` values: `Passport`, `Photo`, `Academic Certificate`, `Medical Examination`, `Medical Analysis`, `Visa`, `CV`, `Offer Letter`, `Employment Contract`, `ID Card`

Valid `CurrentStatus` values: `New Candidate`, `Documents Requested`, `Documents Under Preparing`, `Pending Passport`, `Pending Photo`, `Pending Academic Certificate`, `Pending Medical`, `Booked a medical examination`, `Documents Complete`, `Visa Pending`, `Visa Completed`, `Mobilized`, `Closed`

`appsscript.json` already has scopes for Drive, Sheets, and script execution. **Do NOT change appsscript.json.**

---

## Task

Create a **new file** called `DocumentsCenter.js`.

This file contains the backend API for the Documents Center feature. Follow the exact same coding style and conventions as `Database.js` and `Code.js` — same error handling pattern, same sheet-access pattern, same logging calls.

### Functions to implement:

---

### 1. `api_getDocumentsCenterData(filtersJson)`

**Purpose:** Return all candidates with their document availability summary, filtered by the given criteria.

**Input:** `filtersJson` — a JSON string (parse it inside the function) with optional fields:
```json
{
  "status": ["Visa Completed", "Mobilized"],
  "department": ["Electrical", "Mechanical"],
  "nationality": ["Egyptian", "Sudanese"],
  "position": "",
  "coordinator": "",
  "batch_number": "",
  "search": ""
}
```
All fields are optional. Empty array or empty string = no filter on that field.

**Logic:**
1. Read all rows from `tbl_Candidates` sheet (skip header row).
2. Apply filters: for each filter field, if it has a value, only keep candidates that match. The `search` field does a case-insensitive match against `FullName`, `HR_Code`, `CandidateID`.
3. Read all rows from `tbl_Documents` sheet. Group documents by `CandidateID`.
4. For each filtered candidate, compute a `docSummary` object:
   ```js
   {
     "Passport": "Available" | "Missing",
     "Photo": "Available" | "Missing",
     "Academic Certificate": "Available" | "Missing",
     "Medical Examination": "Available" | "Missing",
     "Medical Analysis": "Available" | "Missing",
     "Visa": "Available" | "Missing",
     "CV": "Available" | "Missing",
     "Offer Letter": "Available" | "Missing",
     "Employment Contract": "Available" | "Missing",
     "ID Card": "Available" | "Missing"
   }
   ```
   A document is "Available" if there is at least one row in `tbl_Documents` for this candidate with that `DocType` and `ApprovalStatus` is `Approved`. Otherwise "Missing".

5. Return a JSON string:
```json
{
  "success": true,
  "candidates": [
    {
      "candidateId": "...",
      "fullName": "...",
      "department": "...",
      "nationality": "...",
      "position": "...",
      "status": "...",
      "hrCode": "...",
      "driveFolderId": "...",
      "batchNumber": "...",
      "docSummary": { ... },
      "availableCount": 7,
      "missingCount": 3
    }
  ],
  "stats": {
    "totalCandidates": 0,
    "totalSelected": 0,
    "totalAvailableDocs": 0,
    "totalMissingDocs": 0
  },
  "filterOptions": {
    "statuses": ["New Candidate", "Documents Requested", ...all 13 statuses...],
    "departments": [...unique departments from sheet...],
    "nationalities": [...unique nationalities from sheet...],
    "positions": [...unique positions from sheet...],
    "coordinators": [...unique coordinator emails from sheet...],
    "batchNumbers": [...unique batch numbers from sheet...]
  }
}
```
The `stats.totalSelected` is always 0 from the server (selection is client-side). `stats.totalAvailableDocs` and `stats.totalMissingDocs` are the sum across ALL returned candidates.

**Error handling:** Wrap everything in try/catch. On error return: `JSON.stringify({ success: false, error: e.message })`.

---

### 2. `api_batchDownloadZip(candidateIdsJson, docTypesJson)`

**Purpose:** Collect the requested document files from Google Drive for the selected candidates and return a single ZIP file as a base64 string for the browser to download.

**Inputs:**
- `candidateIdsJson` — JSON string array of candidate IDs, e.g. `'["C001","C002","C003"]'`
- `docTypesJson` — JSON string array of doc types, e.g. `'["Passport","Visa"]'`

**Logic:**
1. Parse both inputs.
2. Read `tbl_Documents`. Filter rows where `CandidateID` is in the requested list AND `DocType` is in the requested list AND `ApprovalStatus` is `Approved`.
3. Read `tbl_Candidates` to build a map of `CandidateID → FullName`.
4. For each matched document row, get `FileURL`. Extract the Google Drive File ID from the URL using this pattern:
   ```js
   function extractFileId_(url) {
     var match = url.match(/[-\w]{25,}/);
     return match ? match[0] : null;
   }
   ```
5. Open each file with `DriveApp.getFileById(fileId)`. Get its blob with `file.getBlob()`.
6. Name the blob as: `CandidateName/DocType_FileName` (use `blob.setName(...)`).
7. Collect all blobs into an array.
8. If no blobs found, return `JSON.stringify({ success: false, error: "No files found for the selected candidates and document types." })`.
9. Create ZIP: `var zip = Utilities.zip(blobs, "Documents.zip")`.
10. Convert to base64: `var base64 = Utilities.base64Encode(zip.getBytes())`.
11. Return:
```json
{
  "success": true,
  "filename": "Documents_2024-01-15.zip",
  "base64": "...",
  "fileCount": 42,
  "candidateCount": 15
}
```
Use today's date in the filename: `Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")`.

**Important:** This function can be slow for large sets. Add a check: if the total matching files exceed 200, return an error asking the user to narrow the selection.

**Error handling:** Wrap in try/catch. Return `{ success: false, error: e.message }` on failure.

---

### 3. `api_getDocumentPreviewInfo(candidateId, docType)`

**Purpose:** Return the information needed to preview a specific document for a candidate.

**Logic:**
1. Read `tbl_Documents`, find the row where `CandidateID === candidateId` AND `DocType === docType` AND `ApprovalStatus === 'Approved'`. Take the most recent one (highest `VersionNumber` or last row).
2. From the row, get `FileURL` and `FileName`.
3. Try to open the file with `DriveApp.getFileById(extractFileId_(FileURL))`.
4. Get the MIME type: `file.getMimeType()`.
5. Return:
```json
{
  "success": true,
  "fileUrl": "https://drive.google.com/file/d/FILE_ID/preview",
  "fileName": "Passport_Ahmed.pdf",
  "mimeType": "application/pdf",
  "candidateName": "Ahmed Hassan"
}
```
Build the preview URL as: `"https://drive.google.com/file/d/" + fileId + "/preview"`

**Error handling:** Return `{ success: false, error: "Document not found." }` if no matching approved document exists.

---

### 4. `api_getDocumentsCenterFilterOptions()`

**Purpose:** Return all unique filter option values for populating the filter dropdowns. No arguments.

**Logic:** Read `tbl_Candidates`, extract unique non-empty values for: `Department`, `Nationality`, `Position`, `AssignedCoordinatorEmail`, `Batch_Number`. Also include the full hardcoded list of statuses.

**Return:**
```json
{
  "success": true,
  "statuses": ["New Candidate", "Documents Requested", "Documents Under Preparing", "Pending Passport", "Pending Photo", "Pending Academic Certificate", "Pending Medical", "Booked a medical examination", "Documents Complete", "Visa Pending", "Visa Completed", "Mobilized", "Closed"],
  "departments": [...],
  "nationalities": [...],
  "positions": [...],
  "coordinators": [...],
  "batchNumbers": [...]
}
```

---

### Helper (private, not exported)

```js
function extractFileId_(url) { ... }  // as described above
```

---

## Style Rules

- Follow the exact same style as `Database.js` — use `Logger.log()` for debug lines, use `SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'))` to open the spreadsheet.
- All public functions start with `api_`.
- All private helpers end with `_`.
- Wrap the entire file in no module system — this is GAS, all functions are global.
- Add a clear file header comment: `// DocumentsCenter.js — Documents Center Backend API`.

---

## Output

Produce only the complete content of `DocumentsCenter.js`. No explanation needed.
