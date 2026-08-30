// Client-side visitor tracker and Google Sheet logger

const DEFAULT_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwdDV-NG1_G_lwtS9wSWn_7XJ8ZS4JCNvbmNuwgptgygBAaM0z2mGbYJzwSIMwNLittkw/exec';
const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || DEFAULT_GOOGLE_SHEET_URL;

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
const postToGoogleSheet = async (payload) => {
  if (!GOOGLE_SHEET_URL) return;

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
    console.debug('Tracking send notice:', err);
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
  } catch (e) {
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

    await postToGoogleSheet(payload);
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
      } catch (e) {
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

// Track Form Submission to Guest sheet
export const trackFormSubmission = async (formData, cvUrl = '') => {
  try {
    let fileBase64Str = '';
    if (formData.cvFile && formData.cvFile.size < 12 * 1024 * 1024) {
      try {
        fileBase64Str = await fileToBase64(formData.cvFile);
      } catch (b64Err) {
        console.debug('Base64 conversion notice:', b64Err);
      }
    }

    const payload = {
      type: 'guest',
      Timestamp: getVietnamTimestamp(),
      Name: formData.fullName || '',
      Email: formData.email || '',
      Phone: formData.phone || '',
      Position: formData.position || '',
      Location: formData.location || '',
      Experience: '',
      CV_Link: cvUrl || (formData.cvFile ? formData.cvFile.name : ''),
      fileBase64: fileBase64Str,
      fileName: formData.cvFile ? formData.cvFile.name : '',
      fileMime: formData.cvFile ? (formData.cvFile.type || 'application/pdf') : 'application/pdf',
      Note: formData.coverLetter || '',
      Source: window.location.search || document.referrer || 'Direct'
    };

    await postToGoogleSheet(payload);
  } catch (err) {
    console.debug('Form tracking notice:', err);
  }
};
