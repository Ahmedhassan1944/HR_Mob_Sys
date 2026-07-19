// DocumentsCenter.js — Documents Center Backend API

/**
 * Helper to extract Google Drive file ID from a URL.
 */
function extractFileId_(url) {
  if (!url) return null;
  var match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

/**
 * Returns all candidates with their document availability summary, filtered by the given criteria.
 */
function api_getDocumentsCenterData(filtersJson) {
  try {
    Logger.log("api_getDocumentsCenterData called with filtersJson: " + (filtersJson || '{}'));
    var filters = filtersJson ? JSON.parse(filtersJson) : {};
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    
    // 1. Read all rows from tbl_Candidates
    var candidatesSheet = ss.getSheetByName('tbl_Candidates');
    if (!candidatesSheet) throw new Error("Sheet 'tbl_Candidates' not found.");
    var cData = candidatesSheet.getDataRange().getValues();
    if (cData.length < 2) {
      // Empty or headers only
      cData = [cData[0] || []]; 
    }
    var cHeaders = cData[0];
    
    var cIdIdx = cHeaders.indexOf('CandidateID');
    var cNameIdx = cHeaders.indexOf('FullName');
    var cPosIdx = cHeaders.indexOf('Position');
    var cDeptIdx = cHeaders.indexOf('Department');
    var cNatIdx = cHeaders.indexOf('Nationality');
    var cStatusIdx = cHeaders.indexOf('CurrentStatus');
    var cCoordIdx = cHeaders.indexOf('AssignedCoordinatorEmail');
    var cBatchIdx = cHeaders.indexOf('Batch_Number');
    var cFolderIdx = cHeaders.indexOf('DriveFolderID');
    var cHrCodeIdx = cHeaders.indexOf('HR_Code');

    // Parse filters
    var fStatus = filters.status || [];
    var fDept = filters.department || [];
    var fNat = filters.nationality || [];
    var fPos = filters.position || "";
    var fCoord = filters.coordinator || "";
    var fBatch = filters.batch_number || "";
    var fSearch = (filters.search || "").toLowerCase();

    var filteredCandidates = [];
    
    // Collect all filter options while we are at it
    var uniqueDepts = {};
    var uniqueNats = {};
    var uniquePositions = {};
    var uniqueCoords = {};
    var uniqueBatches = {};
    
    for (var i = 1; i < cData.length; i++) {
      var row = cData[i];
      var id = (row[cIdIdx] || "").toString();
      var name = (row[cNameIdx] || "").toString();
      var pos = (row[cPosIdx] || "").toString();
      var dept = (row[cDeptIdx] || "").toString();
      var nat = (row[cNatIdx] || "").toString();
      var status = (row[cStatusIdx] || "").toString();
      var coord = (row[cCoordIdx] || "").toString();
      var batch = (row[cBatchIdx] || "").toString();
      var hrCode = (row[cHrCodeIdx] || "").toString();
      var folderId = (row[cFolderIdx] || "").toString();

      if (dept) uniqueDepts[dept] = true;
      if (nat) uniqueNats[nat] = true;
      if (pos) uniquePositions[pos] = true;
      if (coord) uniqueCoords[coord] = true;
      if (batch) uniqueBatches[batch] = true;

      // Apply filters
      if (fStatus.length > 0 && fStatus.indexOf(status) === -1) continue;
      if (fDept.length > 0 && fDept.indexOf(dept) === -1) continue;
      if (fNat.length > 0 && fNat.indexOf(nat) === -1) continue;
      if (fPos && pos !== fPos) continue;
      if (fCoord && coord !== fCoord) continue;
      if (fBatch && batch !== fBatch) continue;
      
      if (fSearch) {
        if (name.toLowerCase().indexOf(fSearch) === -1 && 
            hrCode.toLowerCase().indexOf(fSearch) === -1 && 
            id.toLowerCase().indexOf(fSearch) === -1) {
          continue;
        }
      }

      filteredCandidates.push({
        candidateId: id,
        fullName: name,
        department: dept,
        nationality: nat,
        position: pos,
        status: status,
        hrCode: hrCode,
        driveFolderId: folderId,
        batchNumber: batch
      });
    }

    // 3. Read all rows from tbl_Documents
    var docsSheet = ss.getSheetByName('tbl_Documents');
    if (!docsSheet) throw new Error("Sheet 'tbl_Documents' not found.");
    var dData = docsSheet.getDataRange().getValues();
    var dHeaders = dData[0];
    
    var dCandIdIdx = dHeaders.indexOf('CandidateID');
    var dTypeIdx = dHeaders.indexOf('DocType');
    var dStatusIdx = dHeaders.indexOf('ApprovalStatus');

    // Group documents by CandidateID
    var approvedDocsByCand = {};
    for (var j = 1; j < dData.length; j++) {
      var dRow = dData[j];
      var cId = (dRow[dCandIdIdx] || "").toString();
      var dType = (dRow[dTypeIdx] || "").toString();
      var dStatus = (dRow[dStatusIdx] || "").toString();
      
      if (dStatus === 'Approved') {
        if (!approvedDocsByCand[cId]) approvedDocsByCand[cId] = {};
        approvedDocsByCand[cId][dType] = true;
      }
    }

    var docTypesList = [
      'Passport', 'Photo', 'Academic Certificate', 'Medical Examination', 
      'Medical Analysis', 'Visa', 'CV', 'Offer Letter', 'Employment Contract', 'ID Card'
    ];
    
    var totalAvailable = 0;
    var totalMissing = 0;
    var finalCandidates = [];

    // 4. Compute docSummary
    for (var k = 0; k < filteredCandidates.length; k++) {
      var cand = filteredCandidates[k];
      var candDocs = approvedDocsByCand[cand.candidateId] || {};
      var docSummary = {};
      var availCount = 0;
      var missCount = 0;
      
      for (var m = 0; m < docTypesList.length; m++) {
        var type = docTypesList[m];
        if (candDocs[type]) {
          docSummary[type] = "Available";
          availCount++;
          totalAvailable++;
        } else {
          docSummary[type] = "Missing";
          missCount++;
          totalMissing++;
        }
      }
      
      cand.docSummary = docSummary;
      cand.availableCount = availCount;
      cand.missingCount = missCount;
      
      finalCandidates.push(cand);
    }

    var allStatuses = [
      "New Candidate", "Documents Requested", "Documents Under Preparing",
      "Pending Passport", "Pending Photo", "Pending Academic Certificate",
      "Pending Medical", "Booked a medical examination", "Documents Complete",
      "Visa Pending", "Visa Completed", "Mobilized", "Closed"
    ];

    var result = {
      success: true,
      candidates: finalCandidates,
      stats: {
        totalCandidates: finalCandidates.length,
        totalSelected: 0,
        totalAvailableDocs: totalAvailable,
        totalMissingDocs: totalMissing
      },
      filterOptions: {
        statuses: allStatuses,
        departments: Object.keys(uniqueDepts).sort(),
        nationalities: Object.keys(uniqueNats).sort(),
        positions: Object.keys(uniquePositions).sort(),
        coordinators: Object.keys(uniqueCoords).sort(),
        batchNumbers: Object.keys(uniqueBatches).sort()
      }
    };
    
    return result;
  } catch (e) {
    Logger.log("Error in api_getDocumentsCenterData: " + e.message + "\n" + e.stack);
    return { success: false, error: e.message };
  }
}

/**
 * Collect the requested document files from Google Drive for the selected candidates 
 * and return a single ZIP file as a base64 string.
 */
function api_batchDownloadZip(candidateIdsJson, docTypesJson) {
  try {
    var candidateIds = JSON.parse(candidateIdsJson || "[]");
    var docTypes = JSON.parse(docTypesJson || "[]");
    
    if (!candidateIds.length || !docTypes.length) {
      throw new Error("Candidate IDs and Document Types must be provided.");
    }

    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    
    // Read Candidates to build map of CandidateID -> FullName
    var cSheet = ss.getSheetByName('tbl_Candidates');
    if (!cSheet) throw new Error("Sheet 'tbl_Candidates' not found.");
    var cData = cSheet.getDataRange().getValues();
    var cHeaders = cData[0];
    var cIdIdx = cHeaders.indexOf('CandidateID');
    var cNameIdx = cHeaders.indexOf('FullName');
    
    var candidateMap = {};
    for (var i = 1; i < cData.length; i++) {
      var id = (cData[i][cIdIdx] || "").toString();
      var name = (cData[i][cNameIdx] || "").toString();
      candidateMap[id] = name;
    }
    
    // Read Documents
    var dSheet = ss.getSheetByName('tbl_Documents');
    if (!dSheet) throw new Error("Sheet 'tbl_Documents' not found.");
    var dData = dSheet.getDataRange().getValues();
    var dHeaders = dData[0];
    
    var dCandIdIdx = dHeaders.indexOf('CandidateID');
    var dTypeIdx = dHeaders.indexOf('DocType');
    var dNameIdx = dHeaders.indexOf('FileName');
    var dUrlIdx = dHeaders.indexOf('FileURL');
    var dStatusIdx = dHeaders.indexOf('ApprovalStatus');
    
    var matchCount = 0;
    var matchedDocs = [];
    
    for (var j = 1; j < dData.length; j++) {
      var row = dData[j];
      var cId = (row[dCandIdIdx] || "").toString();
      var type = (row[dTypeIdx] || "").toString();
      var status = (row[dStatusIdx] || "").toString();
      
      if (candidateIds.indexOf(cId) !== -1 && docTypes.indexOf(type) !== -1 && status === 'Approved') {
        matchedDocs.push({
          candidateId: cId,
          candidateName: candidateMap[cId] || cId,
          docType: type,
          fileName: (row[dNameIdx] || "").toString(),
          fileUrl: (row[dUrlIdx] || "").toString()
        });
        matchCount++;
      }
    }
    
    // Add check: if total matching files exceed 200, return error
    if (matchCount > 200) {
      throw new Error("Too many files selected (" + matchCount + "). Maximum allowed is 200. Please narrow your selection.");
    }
    
    var blobs = [];
    var uniqueCandidatesFound = {};
    
    for (var k = 0; k < matchedDocs.length; k++) {
      var doc = matchedDocs[k];
      var fileId = extractFileId_(doc.fileUrl);
      if (fileId) {
        try {
          var file = DriveApp.getFileById(fileId);
          var blob = file.getBlob();
          // Name the blob as: CandidateName/DocType_FileName
          var safeCandName = doc.candidateName.replace(/[\/\\]/g, "_");
          blob.setName(safeCandName + "/" + doc.docType + "_" + doc.fileName);
          blobs.push(blob);
          uniqueCandidatesFound[doc.candidateId] = true;
        } catch (fileErr) {
          Logger.log("Error getting file " + fileId + ": " + fileErr.message);
        }
      }
    }
    
    if (blobs.length === 0) {
      return { success: false, error: "No files found for the selected candidates and document types." };
    }
    
    var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var zipName = "Documents_" + dateStr + ".zip";
    var zip = Utilities.zip(blobs, zipName);
    var base64 = Utilities.base64Encode(zip.getBytes());
    
    return {
      success: true,
      filename: zipName,
      base64: base64,
      fileCount: blobs.length,
      candidateCount: Object.keys(uniqueCandidatesFound).length
    };
    
  } catch (e) {
    Logger.log("Error in api_batchDownloadZip: " + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Return the information needed to preview a specific document for a candidate.
 */
function api_getDocumentPreviewInfo(candidateId, docType) {
  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    
    // Get candidate name
    var cSheet = ss.getSheetByName('tbl_Candidates');
    var candidateName = candidateId;
    if (cSheet) {
      var cData = cSheet.getDataRange().getValues();
      var cHeaders = cData[0];
      var cIdIdx = cHeaders.indexOf('CandidateID');
      var cNameIdx = cHeaders.indexOf('FullName');
      for (var i = 1; i < cData.length; i++) {
        if (cData[i][cIdIdx] == candidateId) {
          candidateName = cData[i][cNameIdx];
          break;
        }
      }
    }
    
    var dSheet = ss.getSheetByName('tbl_Documents');
    if (!dSheet) throw new Error("Sheet 'tbl_Documents' not found.");
    var dData = dSheet.getDataRange().getValues();
    var dHeaders = dData[0];
    
    var dCandIdIdx = dHeaders.indexOf('CandidateID');
    var dTypeIdx = dHeaders.indexOf('DocType');
    var dStatusIdx = dHeaders.indexOf('ApprovalStatus');
    var dVerIdx = dHeaders.indexOf('VersionNumber');
    var dNameIdx = dHeaders.indexOf('FileName');
    var dUrlIdx = dHeaders.indexOf('FileURL');
    
    var bestRow = null;
    var maxVer = -1;
    
    // Find the most recent approved document (highest VersionNumber or last row)
    for (var j = 1; j < dData.length; j++) {
      var row = dData[j];
      if (row[dCandIdIdx] == candidateId && row[dTypeIdx] == docType && row[dStatusIdx] == 'Approved') {
        var ver = parseInt(row[dVerIdx], 10) || 0;
        if (ver >= maxVer) {
          maxVer = ver;
          bestRow = row;
        }
      }
    }
    
    if (!bestRow) {
      return { success: false, error: "Document not found." };
    }
    
    var fileUrl = bestRow[dUrlIdx];
    var fileName = bestRow[dNameIdx];
    var fileId = extractFileId_(fileUrl);
    
    if (!fileId) {
      throw new Error("Invalid file URL.");
    }
    
    var file = DriveApp.getFileById(fileId);
    var mimeType = file.getMimeType();
    
    return {
      success: true,
      fileUrl: "https://drive.google.com/file/d/" + fileId + "/preview",
      fileName: fileName,
      mimeType: mimeType,
      candidateName: candidateName
    };
    
  } catch (e) {
    Logger.log("Error in api_getDocumentPreviewInfo: " + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Return all unique filter option values for populating the filter dropdowns.
 */
function api_getDocumentsCenterFilterOptions() {
  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    var cSheet = ss.getSheetByName('tbl_Candidates');
    if (!cSheet) throw new Error("Sheet 'tbl_Candidates' not found.");
    
    var cData = cSheet.getDataRange().getValues();
    var cHeaders = cData[0];
    
    var cDeptIdx = cHeaders.indexOf('Department');
    var cNatIdx = cHeaders.indexOf('Nationality');
    var cPosIdx = cHeaders.indexOf('Position');
    var cCoordIdx = cHeaders.indexOf('AssignedCoordinatorEmail');
    var cBatchIdx = cHeaders.indexOf('Batch_Number');
    
    var uniqueDepts = {};
    var uniqueNats = {};
    var uniquePositions = {};
    var uniqueCoords = {};
    var uniqueBatches = {};
    
    for (var i = 1; i < cData.length; i++) {
      var dept = (cData[i][cDeptIdx] || "").toString();
      var nat = (cData[i][cNatIdx] || "").toString();
      var pos = (cData[i][cPosIdx] || "").toString();
      var coord = (cData[i][cCoordIdx] || "").toString();
      var batch = (cData[i][cBatchIdx] || "").toString();
      
      if (dept) uniqueDepts[dept] = true;
      if (nat) uniqueNats[nat] = true;
      if (pos) uniquePositions[pos] = true;
      if (coord) uniqueCoords[coord] = true;
      if (batch) uniqueBatches[batch] = true;
    }
    
    var allStatuses = [
      "New Candidate", "Documents Requested", "Documents Under Preparing",
      "Pending Passport", "Pending Photo", "Pending Academic Certificate",
      "Pending Medical", "Booked a medical examination", "Documents Complete",
      "Visa Pending", "Visa Completed", "Mobilized", "Closed"
    ];
    
    return {
      success: true,
      statuses: allStatuses,
      departments: Object.keys(uniqueDepts).sort(),
      nationalities: Object.keys(uniqueNats).sort(),
      positions: Object.keys(uniquePositions).sort(),
      coordinators: Object.keys(uniqueCoords).sort(),
      batchNumbers: Object.keys(uniqueBatches).sort()
    };
    
  } catch (e) {
    Logger.log("Error in api_getDocumentsCenterFilterOptions: " + e.message);
    return { success: false, error: e.message };
  }
}
