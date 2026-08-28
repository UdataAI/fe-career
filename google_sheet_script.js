/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - TỰ ĐỘNG LƯU VISITOR, LƯU CV VÀO DRIVE & GỬI EMAIL KÈM FILE CHO HR
 * =========================================================================
 * Hướng dẫn cài đặt 1 phút:
 * 1. Mở Google Sheet của bạn.
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa hết code cũ trong đó, dán toàn bộ đoạn code này vào.
 * 4. Bấm nút "Triển khai" (Deploy) ở góc trên bên phải -> "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web app).
 * 6. Mục "Người có quyền truy cập" (Who has access): Chọn "Bất kỳ ai" (Anyone).
 * 7. Bấm "Triển khai" (Deploy) và cấp quyền (Review permissions -> Allow).
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
      var fileBlob = null;

      // 1. Tự động lưu file CV vào Google Drive
      if (data.fileBase64 && data.fileName) {
        try {
          var folderName = 'SAMETEL_UngTuyen_CV';
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          
          var decoded = Utilities.base64Decode(data.fileBase64);
          fileBlob = Utilities.newBlob(decoded, data.fileMime || 'application/pdf', data.fileName);
          var file = folder.createFile(fileBlob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          cvUrl = file.getUrl();
        } catch (driveErr) {
          if (!cvUrl) cvUrl = data.fileName || '';
        }
      }

      // 2. Ghi vào Google Sheet
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

      // 3. Tự động gửi Email thông báo chính thức có đính kèm file cho HR
      try {
        var hrEmail = 'hr@sametel.com.vn';
        var subject = '[SAMETEL Tuyển Dụng] Hồ sơ ứng tuyển mới: ' + (data.Position || '') + ' - ' + (data.Name || '');
        var htmlContent = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">'
          + '<h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 0;">HỒ SƠ ỨNG TUYỂN MỚI</h2>'
          + '<table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">'
          + '<tr><td style="padding: 10px 8px; font-weight: bold; width: 150px; color: #475569; border-bottom: 1px solid #f1f5f9;">Họ và tên:</td><td style="padding: 10px 8px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">' + (data.Name || '') + '</td></tr>'
          + '<tr style="background: #f8fafc;"><td style="padding: 10px 8px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Số điện thoại:</td><td style="padding: 10px 8px; color: #0f172a; border-bottom: 1px solid #f1f5f9;"><a href="tel:' + (data.Phone || '') + '" style="color: #2563eb; font-weight: bold;">' + (data.Phone || '') + '</a></td></tr>'
          + '<tr><td style="padding: 10px 8px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Email:</td><td style="padding: 10px 8px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">' + (data.Email || 'Không cung cấp') + '</td></tr>'
          + '<tr style="background: #f8fafc;"><td style="padding: 10px 8px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Vị trí ứng tuyển:</td><td style="padding: 10px 8px; font-weight: bold; color: #1d4ed8; border-bottom: 1px solid #f1f5f9;">' + (data.Position || '') + '</td></tr>'
          + '<tr><td style="padding: 10px 8px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Khu vực làm việc:</td><td style="padding: 10px 8px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">' + (data.Location || '') + '</td></tr>'
          + '<tr style="background: #f8fafc;"><td style="padding: 10px 8px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Tên file CV:</td><td style="padding: 10px 8px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">' + (data.fileName || 'Không có') + '</td></tr>'
          + (cvUrl && cvUrl.startsWith('http') ? '<tr><td style="padding: 10px 8px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Link Google Drive:</td><td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9;"><a href="' + cvUrl + '" style="background: #2563eb; color: #ffffff; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;" target="_blank">📂 Mở xem CV trên Google Drive</a></td></tr>' : '')
          + '<tr style="background: #f8fafc;"><td style="padding: 10px 8px; font-weight: bold; color: #475569;">Lời nhắn:</td><td style="padding: 10px 8px; color: #0f172a;">' + (data.Note || 'Không có') + '</td></tr>'
          + '</table>'
          + '<p style="margin-top: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">📎 File CV của ứng viên đã được đính kèm trực tiếp trong email này và lưu tại thư mục Google Drive của SAMETEL.</p>'
          + '</div>';

        var emailOptions = {
          htmlBody: htmlContent
        };
        if (fileBlob) {
          emailOptions.attachments = [fileBlob];
        }

        MailApp.sendEmail(hrEmail, subject, '', emailOptions);
      } catch (mailErr) {
        // Mail fallback handling
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: 'Guest application saved and emailed',
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
