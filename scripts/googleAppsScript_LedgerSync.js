/**
 * ============================================================================
 * University of Calgary Debate Society (UCDS)
 * Financial Ledger - Google Sheets <-> Cloud Firestore Two-Way Sync Script
 * ============================================================================
 * 
 * INSTRUCTIONS FOR GOOGLE SHEETS SETUP:
 * 1. Open your target Google Sheet (or create a new blank one).
 * 2. In the top menu, go to: Extensions > Apps Script.
 * 3. Delete any code in the editor, paste this entire script, and click Save.
 * 4. Configure CONFIG below with your Firebase Project ID (default: "ucds-f5db9").
 * 5. If using service account authorization, generate private key in Firebase Console
 *    or deploy as a Web App (Deploy > New deployment > Web app).
 * 6. Return to your Google Sheet and reload the page.
 * 7. You will see a new top menu item: "🏛️ UCDS Finance".
 * 8. Click "🏛️ UCDS Finance" > "Sync from Firestore (Import)" to load all transactions.
 *    (Google Sheet ONLY updates when prompted to save server and API quota).
 * 
 * COLUMNS ARE MAPPED IN THE EXACT ORDER OF THE UCDS EXECUTIVE FINANCE PAGE:
 * 1. Recipient
 * 2. Sender
 * 3. Email
 * 4. Method
 * 5. Deposit ($ CAD)
 * 6. Withdrawal ($ CAD)
 * 7. Details
 * 8. Date (DD/MM/YYYY)
 * 9. Firestore Document ID (Hidden)
 */

const CONFIG = {
  PROJECT_ID: 'ucds-f5db9',
  COLLECTION: 'Ledger',
  SHEET_NAME: 'Operating Ledger',
  // Optional: Webhook secret key if pinged from UCDS WebApp
  WEBHOOK_SECRET: 'ucds_finance_secure_sync_2026',
};

/**
 * Creates custom menu in Google Sheets on sheet open.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏛️ UCDS Finance')
    .addItem('📥 Sync from Firestore (Import)', 'syncFromFirestore')
    .addItem('📤 Push to Firestore (Export)', 'pushToFirestore')
    .addSeparator()
    .addItem('⚙️ Format Ledger Header & Styles', 'formatSheetHeaders')
    .addToUi();
}

/**
 * Syncs all records from Firestore Ledger collection into the active sheet.
 * Clears old data, writes fresh rows with exact column order, and applies formatting.
 */
function syncFromFirestore() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Connecting to Firestore Ledger...', 'UCDS Sync', 3);

  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/${CONFIG.COLLECTION}?pageSize=500`;

  let response;
  try {
    // Attempt fetch with OAuth token or public REST access
    const params = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
      },
      muteHttpExceptions: true,
    };
    response = UrlFetchApp.fetch(url, params);
  } catch (err) {
    SpreadsheetApp.getUi().alert('Error connecting to Firestore: ' + err.message);
    return;
  }

  if (response.getResponseCode() !== 200) {
    // Fallback: If OAuth token scope is not configured for GCP, alert instructions
    SpreadsheetApp.getUi().alert(
      'Firestore API returned code ' + response.getResponseCode() + ':\n' + response.getContentText() +
      '\n\nPlease ensure the Google Sheet account has viewer/editor access to GCP Project: ' + CONFIG.PROJECT_ID
    );
    return;
  }

  const data = JSON.parse(response.getContentText());
  const documents = data.documents || [];

  // Define headers in exact order (8 data columns + 1 hidden doc ID)
  const headers = [
    'Recipient',
    'Sender',
    'Email',
    'Method',
    'Deposit ($ CAD)',
    'Withdrawal ($ CAD)',
    'Details',
    'Date (DD/MM/YYYY)',
    'Firestore Document ID' // Hidden tracking column
  ];

  const rows = [];

  documents.forEach(doc => {
    // Skip template documents
    const docId = doc.name.split('/').pop();
    if (docId === '_default' || docId.startsWith('_')) return;

    const fields = doc.fields || {};

    const recipient = fields.recipient?.stringValue || '';
    const sender = fields.sender?.stringValue || '';
    const email = fields.email?.stringValue || '';
    const method = fields.method?.stringValue || 'Other';
    const deposit = fields.amount?.doubleValue ?? fields.amount?.integerValue ?? '';
    const withdrawal = fields.withdrawl?.doubleValue ?? fields.withdrawl?.integerValue ?? fields.withdrawal?.doubleValue ?? '';
    const details = fields.details?.stringValue || '';

    // Format date as DD/MM/YYYY
    let dateStr = '';
    const timeCreated = fields['time-created']?.timestampValue || fields['time-created']?.stringValue;
    if (timeCreated) {
      const d = new Date(timeCreated);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        dateStr = `${day}/${month}/${year}`;
      }
    }

    rows.push([
      recipient,
      sender,
      email,
      method,
      deposit !== '' ? Number(deposit) : '',
      withdrawal !== '' ? Number(withdrawal) : '',
      details,
      dateStr,
      docId
    ]);
  });

  // Sort rows chronologically or by row
  sheet.clear();

  // Set Header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // Format aesthetics matching UCDS Navy brand
  formatSheetHeaders(sheet);

  SpreadsheetApp.getActiveSpreadsheet().toast(`Imported ${rows.length} records successfully!`, 'UCDS Sync Complete', 5);
}

/**
 * Formats the sheet styling with UCDS Navy branding, frozen header, and currency formatting.
 */
function formatSheetHeaders(sheet) {
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  }

  const lastCol = sheet.getLastColumn() || 9;
  const headerRange = sheet.getRange(1, 1, 1, lastCol);

  // Navy background #1C244C, white bold text
  headerRange
    .setBackground('#1C244C')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontFamily('Arial')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  // Format Deposit and Withdrawal columns as currency ($#,##0.00)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 5, sheet.getLastRow() - 1, 2).setNumberFormat('$#,##0.00');
    // Center Align Method (col 4) and Date (col 8)
    sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).setHorizontalAlignment('center');
    sheet.getRange(2, 8, sheet.getLastRow() - 1, 1).setHorizontalAlignment('center');
  }

  // Auto-resize data columns for readability
  for (let c = 1; c <= 8; c++) {
    sheet.autoResizeColumn(c);
  }

  // Hide the document ID column (col 9) to keep sheet clean
  if (lastCol >= 9) {
    sheet.hideColumns(9);
  }
}

/**
 * Pushes updated rows from Google Sheets back into Firestore collection Ledger.
 * Ensures created transactions strictly use the DDMMYYYY-XXX document ID convention.
 */
function pushToFirestore() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Confirm Push to Firestore',
    'Are you sure you want to push current sheet transactions to Cloud Firestore? Any changes will update society records.',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    ui.alert('No data rows found to push.');
    return;
  }

  let count = 0;
  const token = ScriptApp.getOAuthToken();
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/${CONFIG.COLLECTION}`;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const recipient = String(row[0] || '').trim();
    const sender = String(row[1] || '').trim();
    const email = String(row[2] || '').trim();
    const method = String(row[3] || 'Other').trim();
    const deposit = row[4] !== '' && !isNaN(row[4]) ? Number(row[4]) : null;
    const withdrawal = row[5] !== '' && !isNaN(row[5]) ? Number(row[5]) : null;
    const details = String(row[6] || '').trim();
    const dateCell = row[7];
    let docId = String(row[8] || '').trim();

    if (!recipient && !sender) continue;

    // Parse date for created timestamp or generating docId
    let day = '01', month = '01', year = '2026';
    let isoDate = new Date().toISOString();
    if (dateCell instanceof Date) {
      day = String(dateCell.getDate()).padStart(2, '0');
      month = String(dateCell.getMonth() + 1).padStart(2, '0');
      year = String(dateCell.getFullYear());
      isoDate = dateCell.toISOString();
    } else if (typeof dateCell === 'string' && dateCell.includes('/')) {
      const parts = dateCell.split('/');
      if (parts.length === 3) {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = parts[2].trim();
        isoDate = new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
      }
    }

    const fields = {
      recipient: { stringValue: recipient },
      sender: { stringValue: sender },
      email: { stringValue: email },
      method: { stringValue: method },
      details: { stringValue: details },
      'time-updated': { timestampValue: new Date().toISOString() }
    };

    if (deposit !== null && deposit > 0) fields.amount = { doubleValue: deposit };
    if (withdrawal !== null && withdrawal > 0) fields.withdrawl = { doubleValue: withdrawal };

    let url = '';
    let httpMethod = 'patch';

    if (docId) {
      url = `${baseUrl}/${docId}?updateMask.fieldPaths=recipient&updateMask.fieldPaths=sender&updateMask.fieldPaths=email&updateMask.fieldPaths=method&updateMask.fieldPaths=details&updateMask.fieldPaths=time-updated`;
      httpMethod = 'patch';
    } else {
      // Generate strict DDMMYYYY-XXX document ID for new row
      const seqStr = String(r).padStart(3, '0');
      const newDocId = `${day}${month}${year}-${seqStr}`;
      fields['time-created'] = { timestampValue: isoDate };
      url = `${baseUrl}?documentId=${newDocId}`;
      httpMethod = 'post';
    }

    try {
      UrlFetchApp.fetch(url, {
        method: httpMethod,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ fields: fields }),
        muteHttpExceptions: true
      });
      count++;
    } catch (e) {
      Logger.log('Error pushing row ' + r + ': ' + e.message);
    }
  }

  ui.alert(`Successfully pushed ${count} transaction records to Firestore.`);
}

/**
 * Optional Webhook handler if triggered directly via HTTP POST from UCDS WebApp.
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    if (postData.secret !== CONFIG.WEBHOOK_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (postData.action === 'sync') {
      syncFromFirestore();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sync complete' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
