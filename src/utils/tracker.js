// Client-side visitor tracker and Google Sheet logger

const DEFAULT_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwdDV-NG1_G_lwtS9wSWn_7XJ8ZS4JCNvbmNuwgptgygBAaM0z2mGbYJzwSIMwNLittkw/exec';
const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || DEFAULT_GOOGLE_SHEET_URL;

const delay = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

// Apps Script Web Apps không trả CORS header ổn định cho POST. JSONP chỉ trả
// trạng thái theo ApplicationId (không trả PII/CV URL) để frontend xác minh.
const fetchApplicationStatus = (applicationId) => new Promise((resolve, reject) => {
  const callbackName = `__sametelStatus_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const script = document.createElement('script');
  const timeoutId = window.setTimeout(() => cleanup(new Error('Quá thời gian kiểm tra hồ sơ.')), 10000);

  const cleanup = (error, result) => {
    window.clearTimeout(timeoutId);
    delete window[callbackName];
    script.remove();
    if (error) reject(error);
    else resolve(result);
  };

  window[callbackName] = (result) => cleanup(null, result);
  script.onerror = () => cleanup(new Error('Không thể kiểm tra trạng thái hồ sơ.'));

  const statusUrl = new URL(GOOGLE_SHEET_URL);
  statusUrl.searchParams.set('type', 'status');
  statusUrl.searchParams.set('applicationId', applicationId);
  statusUrl.searchParams.set('callback', callbackName);
  script.src = statusUrl.toString();
  document.head.appendChild(script);
});

const verifyApplicationSubmission = async (applicationId) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await fetchApplicationStatus(applicationId);
    if (result?.status === 'success' && result.cvUrl) {
      return { applicationId, cvUrl: result.cvUrl };
    }
    if (result?.status === 'failed') {
      throw new Error(result.message || 'Hệ thống chưa thể xử lý hồ sơ. Vui lòng liên hệ bộ phận tuyển dụng.');
    }
    if (attempt < 3) await delay(750);
  }

  throw new Error('Không thể xác nhận hồ sơ đã được lưu. Vui lòng thử lại.');
};

// Generate or retrieve persistent visitor ID
export const getVisitorId = () => {
  const STORAGE_KEY = 'sametel_visitor_id';
  let visitorId = localStorage.getItem(STORAGE_KEY);
  if (!visitorId) {
    visitorId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem(STORAGE_KEY, visitorId);
  }
  return visitorId;
};

// Helper to send data to Google Apps Script Webhook
const postToGoogleSheet = async (payload, options = {}) => {
  const { ignoreErrors = false } = options;
  if (!GOOGLE_SHEET_URL) {
    if (ignoreErrors) return;
    throw new Error('Chưa cấu hình Google Apps Script Web App URL.');
  }

  const dataString = JSON.stringify(payload);

  try {
    // Primary: Standard fetch with text/plain (avoids CORS preflight and 64KB keepalive limit)
    await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: dataString
    });
  } catch (err) {
    if (ignoreErrors) {
      console.debug('Tracking send notice:', err);
      return;
    }
    throw new Error('Không thể tải hồ sơ lên hệ thống. Vui lòng thử lại.', { cause: err });
  }
};

// Helper to format date and time to Vietnam timezone (GMT+7) e.g. "30/08/2026 14:53:46"
export const getVietnamTimestamp = () => {
  try {
    const d = new Date();
    const options = {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return new Intl.DateTimeFormat('en-GB', options).format(d).replace(',', '');
  } catch {
    return new Date().toISOString();
  }
};

// Track Page Visit
export const trackPageView = async () => {
  try {
    const visitorId = getVisitorId();
    const VISIT_COUNT_KEY = 'sametel_visit_count';
    const currentCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, currentCount.toString());

    const FIRST_SEEN_KEY = 'sametel_first_seen';
    let firstSeen = localStorage.getItem(FIRST_SEEN_KEY);
    if (!firstSeen) {
      firstSeen = getVietnamTimestamp();
      localStorage.setItem(FIRST_SEEN_KEY, firstSeen);
    }
    const lastSeen = getVietnamTimestamp();

    const payload = {
      type: 'visitor',
      FirstSeen: firstSeen,
      LastSeen: lastSeen,
      VisitorId: visitorId,
      VisitCount: currentCount,
      Page: window.location.href || '/',
      Referrer: document.referrer || 'Direct / Refresh'
    };

    await postToGoogleSheet(payload, { ignoreErrors: true });
  } catch (err) {
    console.debug('Tracking page view notice:', err);
  }
};

// Convert File object to Base64 string
export const fileToBase64 = (file) => {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = reader.result || '';
        const base64 = typeof result === 'string' ? result.split(',')[1] : '';
        resolve(base64 || '');
      } catch {
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

// Track Form Submission to Guest sheet
export const trackFormSubmission = async (formData) => {
  if (!formData.cvFile) {
    throw new Error('Vui lòng chọn file CV.');
  }

  if (formData.cvFile.size > 10 * 1024 * 1024) {
    throw new Error('Dung lượng file CV tối đa là 10MB.');
  }

  const fileBase64Str = await fileToBase64(formData.cvFile);
  if (!fileBase64Str) {
    throw new Error('Không thể đọc file CV. Vui lòng chọn lại file.');
  }

  const applicationId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const payload = {
    type: 'guest',
    ApplicationId: applicationId,
    Timestamp: getVietnamTimestamp(),
    Name: formData.fullName || '',
    Email: formData.email || '',
    Phone: formData.phone || '',
    Position: formData.position || '',
    Location: formData.location || '',
    fileBase64: fileBase64Str,
    fileName: formData.cvFile.name,
    fileMime: formData.cvFile.type || 'application/pdf',
    Note: formData.coverLetter || '',
    Source: window.location.search || document.referrer || 'Direct',
    PageUrl: window.location.href || 'https://sametel.com.vn/'
  };

  await postToGoogleSheet(payload);
  return verifyApplicationSubmission(applicationId);
};

export const updateApplicationEmailStatus = async (applicationId, emailStatus, errorMessage = '') => {
  await postToGoogleSheet({
    type: 'email_status',
    ApplicationId: applicationId,
    EmailStatus: emailStatus,
    ErrorMessage: errorMessage
  }, { ignoreErrors: true });
};
