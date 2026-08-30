/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - TỰ ĐỘNG TẠO LINK MỞ CV TRỰC TIẾP VÀ LƯU GOOGLE SHEET
 * =========================================================================
 * Hướng dẫn:
 * 1. Mở Google Sheet -> Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Dán toàn bộ code này vào thay thế code cũ.
 * 3. Bấm "Triển khai" (Deploy) -> "Quản lý bản triển khai" (Manage deployments)
 *    -> Bấm biểu tượng cây bút (Chỉnh sửa) -> Chọn "Phiên bản mới" (New version) -> Bấm "Triển khai" (Deploy).
 * =========================================================================
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // ==========================================
    // 1. XỬ LÝ LƯỢT TRUY CẬP (VISITORS)
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
        if (data.Page) {
          visitorSheet.getRange(foundRow, 5).setValue(data.Page);
        }
        if (data.Referrer) {
          visitorSheet.getRange(foundRow, 6).setValue(data.Referrer);
        }
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

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Visitor tracked' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 2. XỬ LÝ ĐIỀN FORM ỨNG TUYỂN (GUEST)
    // ==========================================
    if (data.type === 'guest') {
      var guestSheet = sheet.getSheetByName('Guest');
      if (!guestSheet) {
        guestSheet = sheet.insertSheet('Guest');
        guestSheet.appendRow(['Timestamp', 'Name', 'Email', 'Phone', 'Position', 'Location', 'CV_Link', 'Note', 'Source']);
        guestSheet.getRange('A1:I1').setFontWeight('bold').setBackground('#DBEAFE');
      }

      var cvUrl = data.CV_Link || '';

      // Tự động tạo link xem CV trực tiếp vĩnh viễn (Không cần đăng nhập hay hỏi quyền)
      if (data.fileBase64 && data.fileName) {
        try {
          var decoded = Utilities.base64Decode(data.fileBase64);
          var blob = Utilities.newBlob(decoded, data.fileMime || 'application/pdf', data.fileName);
          
          var uploadPayload = {
            reqtype: 'fileupload',
            fileToUpload: blob
          };
          
          var response = UrlFetchApp.fetch('https://catbox.moe/user/api.php', {
            method: 'post',
            payload: uploadPayload,
            muteHttpExceptions: true
          });
          
          var returnedUrl = response.getContentText();
          if (returnedUrl && returnedUrl.indexOf('http') === 0) {
            cvUrl = returnedUrl.trim();
          }
        } catch (catErr) {
          // Dự phòng nếu không gọi được catbox: dùng Drive
          try {
            var folderName = 'SAMETEL_UngTuyen_CV';
            var folders = DriveApp.getFoldersByName(folderName);
            var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
            var driveFile = folder.createFile(blob);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            cvUrl = driveFile.getUrl();
          } catch (driveErr) {
            if (!cvUrl) cvUrl = data.fileName || '';
          }
        }
      }

      // Ghi thông tin vào Google Sheet (Cột CV_Link chứa link mở trực tiếp file)
      var nowVn = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
      guestSheet.appendRow([
        data.Timestamp || nowVn,
        data.Name || '',
        data.Email || '',
        "'" + (data.Phone || ''), // Dấu ' để giữ nguyên số 0 ở đầu SĐT
        data.Position || '',
        data.Location || '',
        cvUrl,
        data.Note || '',
        data.Source || 'Direct'
      ]);

      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: 'Guest application saved',
        cvUrl: cvUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
