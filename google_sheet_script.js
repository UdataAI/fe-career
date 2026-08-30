/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - SAMETEL TUYỂN DỤNG
 * =========================================================================
 * Chức năng:
 * 1. Upload CV lên Catbox Permanent (files.catbox.moe) → Trả link vĩnh viễn
 * 2. Ghi thông tin ứng viên vào Google Sheet tab Guest
 * 3. Ghi lượt truy cập vào Google Sheet tab Visitors
 * =========================================================================
 * Cập nhật:
 * 1. Mở Google Sheet -> Tiện ích mở rộng (Extensions) -> Apps Script
 * 2. Xóa hết code cũ, dán toàn bộ code này vào
 * 3. Deploy -> Manage deployments -> Chỉnh sửa -> New version -> Deploy
 * =========================================================================
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet();

    // ==========================================
    // 1. XỬ LÝ UPLOAD CV (Trả link vĩnh viễn về client)
    // ==========================================
    if (data.type === 'upload_cv') {
      var cvUrl = '';

      if (data.fileBase64 && data.fileName) {
        try {
          var decoded = Utilities.base64Decode(data.fileBase64);
          var blob = Utilities.newBlob(decoded, data.fileMime || 'application/pdf', data.fileName);

          var response = UrlFetchApp.fetch('https://catbox.moe/user/api.php', {
            method: 'post',
            payload: {
              reqtype: 'fileupload',
              fileToUpload: blob
            },
            muteHttpExceptions: true
          });

          var returnedUrl = response.getContentText();
          if (returnedUrl && returnedUrl.indexOf('http') === 0) {
            cvUrl = returnedUrl.trim();
          }
        } catch (catErr) {
          // Dự phòng: Lưu vào Google Drive
          try {
            var decoded2 = Utilities.base64Decode(data.fileBase64);
            var blob2 = Utilities.newBlob(decoded2, data.fileMime || 'application/pdf', data.fileName);
            var folderName = 'SAMETEL_UngTuyen_CV';
            var folders = DriveApp.getFoldersByName(folderName);
            var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
            var driveFile = folder.createFile(blob2);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            cvUrl = driveFile.getUrl();
          } catch (driveErr) {
            cvUrl = data.fileName || '';
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        cvUrl: cvUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 2. XỬ LÝ LƯỢT TRUY CẬP (VISITORS)
    // ==========================================
    if (data.type === 'visitor') {
      var visitorSheet = sheet.getSheetByName('Visitors');
      if (!visitorSheet) {
        visitorSheet = sheet.insertSheet('Visitors');
        visitorSheet.appendRow(['FirstSeen', 'LastSeen', 'VisitorId', 'VisitCount', 'Page', 'Referrer']);
        visitorSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#E2E8F0');
      }

      var visitorId = data.VisitorId;
      var values = visitorSheet.getDataRange().getValues();
      var foundRow = -1;

      for (var i = 1; i < values.length; i++) {
        if (values[i][2] == visitorId) {
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
          data.FirstSeen,
          data.LastSeen,
          data.VisitorId,
          data.VisitCount || 1,
          data.Page || '/',
          data.Referrer || 'Direct'
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 3. XỬ LÝ ĐIỀN FORM ỨNG TUYỂN (GUEST)
    // ==========================================
    if (data.type === 'guest') {
      var guestSheet = sheet.getSheetByName('Guest');
      if (!guestSheet) {
        guestSheet = sheet.insertSheet('Guest');
        guestSheet.appendRow(['Timestamp', 'Name', 'Email', 'Phone', 'Position', 'Location', 'CV_Link', 'Note', 'Source']);
        guestSheet.getRange('A1:I1').setFontWeight('bold').setBackground('#DBEAFE');
      }

      var cvUrl2 = data.CV_Link || '';

      // Nếu client đã có sẵn link vĩnh viễn thì dùng luôn, không cần upload lại
      if (!cvUrl2 || !cvUrl2.startsWith('http')) {
        // Nếu có fileBase64, upload lên Catbox Permanent
        if (data.fileBase64 && data.fileName) {
          try {
            var decoded3 = Utilities.base64Decode(data.fileBase64);
            var blob3 = Utilities.newBlob(decoded3, data.fileMime || 'application/pdf', data.fileName);

            var response3 = UrlFetchApp.fetch('https://catbox.moe/user/api.php', {
              method: 'post',
              payload: {
                reqtype: 'fileupload',
                fileToUpload: blob3
              },
              muteHttpExceptions: true
            });

            var returnedUrl3 = response3.getContentText();
            if (returnedUrl3 && returnedUrl3.indexOf('http') === 0) {
              cvUrl2 = returnedUrl3.trim();
            }
          } catch (catErr3) {
            if (!cvUrl2) cvUrl2 = data.fileName || '';
          }
        }
      }

      var nowVn = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

      guestSheet.appendRow([
        data.Timestamp || nowVn,
        data.Name || '',
        data.Email || '',
        "'" + (data.Phone || ''),
        data.Position || '',
        data.Location || '',
        cvUrl2,
        data.Note || '',
        data.Source || 'Direct'
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Guest application saved',
        cvUrl: cvUrl2
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
