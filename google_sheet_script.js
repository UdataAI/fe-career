/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - TỰ ĐỘNG LƯU LƯỢT TRUY CẬP (VISITORS) & HỒ SƠ ỨNG TUYỂN (GUEST)
 * =========================================================================
 * Hướng dẫn cài đặt 1 phút:
 * 1. Mở Google Sheet của bạn (hoặc tạo Google Sheet mới).
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa hết code cũ trong đó, dán toàn bộ đoạn code này vào.
 * 4. Bấm nút "Triển khai" (Deploy) ở góc trên bên phải -> "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web app).
 * 6. Mục "Người có quyền truy cập" (Who has access): Chọn "Bất kỳ ai" (Anyone).
 * 7. Bấm "Triển khai" (Deploy) và COPY đường link Web App URL.
 * 8. Dán link đó vào file .env trong dự án: VITE_GOOGLE_SHEET_URL=https://script.google.com/macros/s/.../exec
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

      // Tìm kiếm xem VisitorId đã tồn tại chưa
      for (var i = 1; i < values.length; i++) {
        if (values[i][2] == visitorId) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow > 0) {
        // Cập nhật lại LastSeen, VisitCount, Page và Referrer
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
        // Thêm người truy cập mới
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

      // Tự động lưu file CV vào Google Drive (nếu có Base64)
      if (data.fileBase64 && data.fileName) {
        try {
          var folderName = 'SAMETEL_UngTuyen_CV';
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          
          var decoded = Utilities.base64Decode(data.fileBase64);
          var blob = Utilities.newBlob(decoded, data.fileMime || 'application/pdf', data.fileName);
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          cvUrl = file.getUrl();
        } catch (driveErr) {
          if (!cvUrl) cvUrl = data.fileName || '';
        }
      }

      guestSheet.appendRow([
        data.Timestamp || new Date().toISOString(),
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
