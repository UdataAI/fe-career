/**
 * GOOGLE APPS SCRIPT - SAMETEL TUYỂN DỤNG
 *
 * Guest flow: upload CV to Drive -> append Google Sheet -> return status to browser.
 * MailApp notifies HR after the application is saved. Email failures do not
 * invalidate a saved application.
 * Visitor flow: create/update the Visitors sheet.
 *
 * Script Properties (Project Settings -> Script Properties):
 *   HR_EMAIL = HR recipient address (required)
 *   SPREADSHEET_ID = receiving Google Sheet ID (required for standalone scripts)
 *   CV_FOLDER_NAME = SAMETEL_UngTuyen_CV (optional)
 *
 * Deploy as Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 */

/* global ContentService, PropertiesService, DriveApp, Utilities, LockService,
          SpreadsheetApp, MailApp */

var GUEST_HEADERS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'Position', 'Location',
  'CV_Link', 'Note', 'Source', 'Email_Status', 'Application_ID'
];
var ERROR_HEADERS = ['Timestamp', 'Application_ID', 'Error'];

/**
 * Chạy thủ công hàm này một lần trong Apps Script Editor để Google hiển thị
 * màn hình cấp quyền Drive/Sheet cho tài khoản sở hữu deployment.
 */
// eslint-disable-next-line no-unused-vars
function authorizeServices() {
  var spreadsheet = getSpreadsheet_();

  var folder = getCvFolder_();
  var hrEmail = getHrEmail_();
  var remainingQuota = MailApp.getRemainingDailyQuota();
  var authorizationResult = 'Authorized: Sheet=' + spreadsheet.getName() +
    ', Drive folder=' + folder.getName() + ', HR=' + hrEmail +
    ', Email quota=' + remainingQuota;
  console.log(authorizationResult);
  return authorizationResult;
}

function getSpreadsheet_() {
  var spreadsheetId = String(PropertiesService.getScriptProperties()
    .getProperty('SPREADSHEET_ID') || '').trim();
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Cần thêm SPREADSHEET_ID trong Script Properties: ID của Google Sheet nhận hồ sơ.');
  }
  return spreadsheet;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse_(callback, body) {
  var safeCallback = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(callback || '')
    ? callback
    : 'callback';
  return ContentService.createTextOutput(safeCallback + '(' + JSON.stringify(body) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getOrCreateSheet_(spreadsheet, name, headers, headerColor) {
  var target = spreadsheet.getSheetByName(name);
  if (!target) {
    target = spreadsheet.insertSheet(name);
  }

  if (target.getLastRow() === 0) {
    target.appendRow(headers);
    target.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground(headerColor);
  } else {
    // Bổ sung các cột mới mà không làm mất dữ liệu Sheet hiện có.
    for (var i = 0; i < headers.length; i++) {
      if (!target.getRange(1, i + 1).getValue()) {
        target.getRange(1, i + 1).setValue(headers[i]);
      }
    }
  }

  return target;
}

function getCvFolder_() {
  var properties = PropertiesService.getScriptProperties();
  var folderId = properties.getProperty('CV_FOLDER_ID');
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch {
      properties.deleteProperty('CV_FOLDER_ID');
    }
  }

  var folderName = properties.getProperty('CV_FOLDER_NAME') || 'SAMETEL_UngTuyen_CV';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  properties.setProperty('CV_FOLDER_ID', folder.getId());
  return folder;
}

function safeFileName_(applicationId, originalName) {
  var safeOriginal = String(originalName || 'cv.pdf')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
  return applicationId + '_' + safeOriginal;
}

function hasPdfHeader_(bytes) {
  // PDF header thường nằm đầu file, nhưng tiêu chuẩn vẫn cho phép dữ liệu đứng
  // trước header. Tìm trong 1KB đầu để không từ chối nhầm PDF hợp lệ.
  var limit = Math.min(bytes.length - 4, 1024);
  for (var i = 0; i < limit; i++) {
    if (bytes[i] === 37 && bytes[i + 1] === 80 && bytes[i + 2] === 68 &&
        bytes[i + 3] === 70 && bytes[i + 4] === 45) {
      return true;
    }
  }
  return false;
}

function uploadCv_(data) {
  if (!data.fileBase64 || !data.fileName) {
    throw new Error('CV file is missing');
  }

  var decoded = Utilities.base64Decode(data.fileBase64);
  if (decoded.length > 10 * 1024 * 1024) {
    throw new Error('CV exceeds the 10MB limit');
  }

  // Kiểm tra magic bytes "%PDF-", không chỉ tin MIME/name từ trình duyệt.
  if (decoded.length < 5 || !hasPdfHeader_(decoded)) {
    throw new Error('CV is not a valid PDF file');
  }

  var blob = Utilities.newBlob(
    decoded,
    'application/pdf',
    safeFileName_(data.ApplicationId, data.fileName)
  );
  var driveFile = getCvFolder_().createFile(blob);
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
}

function handleVisitor_(spreadsheet, data) {
  var headers = ['FirstSeen', 'LastSeen', 'VisitorId', 'VisitCount', 'Page', 'Referrer'];
  var visitorSheet = getOrCreateSheet_(spreadsheet, 'Visitors', headers, '#E2E8F0');
  var values = visitorSheet.getDataRange().getValues();
  var foundRow = -1;

  for (var i = 1; i < values.length; i++) {
    if (values[i][2] == data.VisitorId) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    visitorSheet.getRange(foundRow, 2).setValue(data.LastSeen);
    var currentCount = visitorSheet.getRange(foundRow, 4).getValue();
    visitorSheet.getRange(foundRow, 4).setValue((currentCount || 1) + 1);
    if (data.Page) visitorSheet.getRange(foundRow, 5).setValue(data.Page);
    if (data.Referrer) visitorSheet.getRange(foundRow, 6).setValue(data.Referrer);
  } else {
    visitorSheet.appendRow([
      data.FirstSeen || '', data.LastSeen || '', data.VisitorId || '',
      data.VisitCount || 1, data.Page || '/', data.Referrer || 'Direct'
    ]);
  }
}

function handleGuest_(spreadsheet, data) {
  if (!data.ApplicationId) {
    throw new Error('ApplicationId is missing');
  }

  var guestSheet = getOrCreateSheet_(spreadsheet, 'Guest', GUEST_HEADERS, '#DBEAFE');
  var cvUrl = uploadCv_(data);
  var nowVn = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    guestSheet.appendRow([
      data.Timestamp || nowVn,
      data.Name || '',
      data.Email || '',
      "'" + (data.Phone || ''),
      data.Position || '',
      data.Location || '',
      cvUrl,
      data.Note || '',
      data.Source || 'Direct',
      'Ready',
      data.ApplicationId
    ]);
    SpreadsheetApp.flush();
    notifyHrForRow_(guestSheet, guestSheet.getLastRow());
  } finally {
    lock.releaseLock();
  }

  return cvUrl;
}

function getHrEmail_() {
  var email = String(PropertiesService.getScriptProperties().getProperty('HR_EMAIL') || '').trim();
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) {
    throw new Error('Cần cấu hình HR_EMAIL hợp lệ trong Script Properties.');
  }
  return email;
}

function notifyHrForRow_(sheet, row) {
  var statusCell = sheet.getRange(row, 10);
  var values = sheet.getRange(row, 1, 1, GUEST_HEADERS.length).getValues()[0];
  if (!values[6] || !values[10] || values[9] === 'Sent' || values[9] === 'Sending') return;

  try {
    var recipient = getHrEmail_();
    if (MailApp.getRemainingDailyQuota() < 1) {
      throw new Error('Hết hạn mức gửi mail hôm nay. Chạy retryFailedHrEmails vào ngày tiếp theo.');
    }
    statusCell.setValue('Sending');
    SpreadsheetApp.flush();
    MailApp.sendEmail({
      to: recipient,
      name: 'SAMETEL Tuyển dụng',
      subject: ('[SAMETEL Tuyển dụng] ' + values[4] + ' - ' + values[1]).replace(/[\r\n]/g, ' ').slice(0, 200),
      body: [
        'Mã hồ sơ: ' + values[10],
        'Thời gian: ' + values[0],
        'Họ và tên: ' + values[1],
        'Email: ' + (values[2] || 'Không cung cấp'),
        'Số điện thoại: ' + String(values[3]).replace(/^'/, ''),
        'Vị trí ứng tuyển: ' + values[4],
        'Khu vực làm việc: ' + values[5],
        'CV ứng viên: ' + values[6],
        'Lời nhắn: ' + (values[7] || 'Không có'),
        'Nguồn: ' + values[8]
      ].join('\n')
    });
  } catch (error) {
    console.error('HR notification failed:', error);
    try {
      statusCell.setValue('Failed: ' + String(error.message || error).slice(0, 500));
    } catch (statusError) {
      console.error('Cannot record email failure:', statusError);
    }
    return;
  }

  // Không đổi thành Failed khi đã gửi mail nhưng ghi trạng thái Sent bị lỗi.
  // Giữ Sending để tránh tự gửi trùng trong lần retry.
  try {
    statusCell.setValue('Sent');
  } catch (statusError) {
    console.error('Email sent; cannot record Sent status:', statusError);
  }
}

// Chạy thủ công trong Editor: xử lý tối đa 20 hồ sơ lỗi/chưa gửi mỗi lần,
// chỉ dùng dữ liệu có sẵn trong Sheet, không upload lại CV.
// eslint-disable-next-line no-unused-vars
function retryFailedHrEmails() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSpreadsheet_().getSheetByName('Guest');
    if (!sheet || sheet.getLastRow() < 2) return;
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, GUEST_HEADERS.length).getValues();
    var attempted = 0;
    for (var i = 0; i < rows.length && attempted < 20; i++) {
      var status = String(rows[i][9] || '');
      if (rows[i][6] && rows[i][10] && (status === 'Ready' || status.indexOf('Failed:') === 0)) {
        if (MailApp.getRemainingDailyQuota() < 1) break;
        notifyHrForRow_(sheet, i + 2);
        attempted++;
      }
    }
    console.log('HR email retries attempted: ' + attempted);
  } finally {
    lock.releaseLock();
  }
}

function handleEmailStatus_(spreadsheet, data) {
  // Frontend cũ có thể vẫn gửi FormSubmit; không ghi đè kết quả MailApp.
  if (PropertiesService.getScriptProperties().getProperty('HR_EMAIL')) return;
  var guestSheet = spreadsheet.getSheetByName('Guest');
  if (!guestSheet || guestSheet.getLastRow() < 2 || !data.ApplicationId) {
    throw new Error('Application not found');
  }

  var idRange = guestSheet.getRange(2, 11, guestSheet.getLastRow() - 1, 1);
  var match = idRange.createTextFinder(data.ApplicationId).matchEntireCell(true).findNext();
  if (!match) throw new Error('Application not found');

  var status = data.EmailStatus === 'Sent'
    ? 'Sent'
    : 'Failed: ' + String(data.ErrorMessage || 'FormSubmit error').slice(0, 500);
  guestSheet.getRange(match.getRow(), 10).setValue(status);
}

function recordSubmissionError_(spreadsheet, data, error) {
  var errorSheet = getOrCreateSheet_(spreadsheet, 'Submission_Errors', ERROR_HEADERS, '#FEE2E2');
  var nowVn = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
  errorSheet.appendRow([
    nowVn,
    data && data.ApplicationId ? data.ApplicationId : 'unknown',
    error && error.message ? error.message : String(error)
  ]);
}

function findSubmissionError_(spreadsheet, applicationId) {
  var errorSheet = spreadsheet.getSheetByName('Submission_Errors');
  if (!errorSheet || errorSheet.getLastRow() < 2) return '';

  var idRange = errorSheet.getRange(2, 2, errorSheet.getLastRow() - 1, 1);
  var match = idRange.createTextFinder(applicationId).matchEntireCell(true).findNext();
  return match ? String(errorSheet.getRange(match.getRow(), 3).getValue() || '') : '';
}

// eslint-disable-next-line no-unused-vars
function doGet(e) {
  var callback = e && e.parameter ? e.parameter.callback : '';
  try {
    if (!e || !e.parameter || e.parameter.type !== 'status' || !e.parameter.applicationId) {
      return jsonpResponse_(callback, { status: 'ignored' });
    }

    var spreadsheet = getSpreadsheet_();
    var guestSheet = spreadsheet.getSheetByName('Guest');
    if (!guestSheet || guestSheet.getLastRow() < 2) {
      var earlyError = findSubmissionError_(spreadsheet, e.parameter.applicationId);
      return jsonpResponse_(callback, earlyError
        ? { status: 'failed', message: earlyError }
        : { status: 'not_found' });
    }

    var idRange = guestSheet.getRange(2, 11, guestSheet.getLastRow() - 1, 1);
    var match = idRange.createTextFinder(e.parameter.applicationId)
      .matchEntireCell(true)
      .findNext();

    if (!match) {
      var storedError = findSubmissionError_(spreadsheet, e.parameter.applicationId);
      return jsonpResponse_(callback, storedError
        ? { status: 'failed', message: storedError }
        : { status: 'not_found' });
    }

    var emailStatus = String(guestSheet.getRange(match.getRow(), 10).getValue() || 'Pending');
    var cvUrl = guestSheet.getRange(match.getRow(), 7).getValue();
    return jsonpResponse_(callback, {
      status: cvUrl ? 'success' : 'pending',
      emailStatus: emailStatus,
      emailProvider: 'apps-script',
      cvUrl: cvUrl
    });
  } catch (error) {
    console.error(error);
    return jsonpResponse_(callback, { status: 'error' });
  }
}

// eslint-disable-next-line no-unused-vars
function doPost(e) {
  var data = null;
  var spreadsheet = null;
  try {
    data = JSON.parse(e.postData.contents);
    spreadsheet = getSpreadsheet_();

    if (data.type === 'visitor') {
      handleVisitor_(spreadsheet, data);
      return jsonResponse_({ status: 'success' });
    }

    if (data.type === 'email_status') {
      handleEmailStatus_(spreadsheet, data);
      return jsonResponse_({ status: 'success' });
    }

    if (data.type === 'guest') {
      var cvUrl = handleGuest_(spreadsheet, data);
      return jsonResponse_({
        status: 'success',
        message: 'Application saved; HR notification handled separately',
        applicationId: data.ApplicationId,
        cvUrl: cvUrl
      });
    }

    return jsonResponse_({ status: 'ignored' });
  } catch (error) {
    console.error(error);
    try {
      if (spreadsheet) recordSubmissionError_(spreadsheet, data, error);
    } catch (recordError) {
      console.error(recordError);
    }
    return jsonResponse_({ status: 'error', error: error.toString() });
  }
}
