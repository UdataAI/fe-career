import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const handlerSource = appSource.match(/const handleFormSubmit = (async \(e\) => \{[\s\S]*?\n {2}\});/)[1];
const serverSource = readFileSync(new URL('../google_sheet_script.js', import.meta.url), 'utf8');
const silentConsole = { error() {}, log() {} };

async function submit({ provider, uploadError, emailResponse, emailError } = {}) {
  const result = { success: false, errors: [], emailStatuses: [], requests: 0, leads: 0, uploads: 0 };
  const handler = vm.runInNewContext(`(${handlerSource})`, {
    console: silentConsole, FormData, AbortSignal,
    HR_EMAIL: 'hr@example.com',
    formData: { fullName: 'Test', phone: '0900000000', position: 'Sales', location: 'Hà Nội' },
    validateForm: () => ({}), setFormErrors() {}, setIsSubmitting() {},
    setSubmitError: value => { if (value) result.errors.push(value); },
    setSubmitSuccess: value => { result.success = value; },
    window: { location: { search: '', hostname: 'example.com', href: 'https://example.com/' },
      fbq: () => { result.leads++; } },
    trackFormSubmission: async () => {
      result.uploads++;
      if (uploadError) throw uploadError;
      return { applicationId: 'test-id', cvUrl: 'https://drive.google.com/file/d/test/view', emailProvider: provider };
    },
    updateApplicationEmailStatus: async (...args) => { result.emailStatuses.push(args); },
    fetch: async () => {
      result.requests++;
      if (emailError) throw emailError;
      return emailResponse;
    }
  });
  await handler({ preventDefault() {} });
  return result;
}

test('FormSubmit network failure does not reject a saved application', async () => {
  const result = await submit({ emailError: new TypeError('Failed to fetch') });
  assert.equal(result.success, true);
  assert.equal(result.uploads, 1);
  assert.equal(result.leads, 1);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.emailStatuses, [['test-id', 'Failed', 'Failed to fetch']]);
});

test('FormSubmit timeout and HTTP error remain email-only failures', async () => {
  for (const options of [
    { emailError: new Error('Timed out') },
    { emailResponse: { ok: false, json: async () => ({ message: 'Unavailable' }) } },
    { emailResponse: { ok: true, json: async () => ({}) } }
  ]) {
    const result = await submit(options);
    assert.equal(result.success, true);
    assert.equal(result.emailStatuses[0][1], 'Failed');
  }
});

test('MailApp deployment does not call FormSubmit or overwrite email status', async () => {
  const result = await submit({ provider: 'apps-script' });
  assert.equal(result.success, true);
  assert.equal(result.requests, 0);
  assert.deepEqual(result.emailStatuses, []);
});

test('legacy successful email is recorded and confirmed upload still fires Lead', async () => {
  const result = await submit({ emailResponse: { ok: true, json: async () => ({ success: 'true' }) } });
  assert.equal(result.success, true);
  assert.equal(result.leads, 1);
  assert.deepEqual(result.emailStatuses, [['test-id', 'Sent']]);
});

test('unconfirmed upload does not show success, send mail or fire Lead', async () => {
  const result = await submit({ uploadError: new Error('Storage unavailable') });
  assert.equal(result.success, false);
  assert.deepEqual(result.errors, ['Storage unavailable']);
  assert.equal(result.requests, 0);
  assert.equal(result.leads, 0);
});

function server({ quota = 10, mailError, initialStatus = 'Ready', sentStatusError = false } = {}) {
  const row = ['Now', 'Applicant', '', '0900000000', 'Sales', 'Hà Nội', 'https://drive.google.com/file/d/test/view', '', '', initialStatus, 'test-id'];
  const result = { sent: 0, row };
  const sheet = {
    getLastRow: () => 2,
    getRange: (r, col) => ({
      getValues: () => [row], getValue: () => row[col - 1],
      setValue: value => {
        if (value === 'Sent' && sentStatusError) throw new Error('Sheet write failed');
        row[col - 1] = value;
      },
      createTextFinder: () => ({ matchEntireCell: () => ({ findNext: () => ({ getRow: () => 2 }) }) })
    })
  };
  const context = vm.createContext({
    console: silentConsole,
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => key === 'HR_EMAIL' ? 'hr@example.com' : null }) },
    SpreadsheetApp: { flush() {}, getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) },
    MailApp: { getRemainingDailyQuota: () => quota, sendEmail: () => {
      if (mailError) throw mailError;
      result.sent++;
    } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }
  });
  vm.runInContext(serverSource, context);
  context.jsonpResponse_ = (_callback, body) => body;
  return { context, sheet, result };
}

test('saved application status stays successful when MailApp fails or quota is exhausted', () => {
  for (const options of [{ mailError: new Error('Permission denied') }, { quota: 0 }]) {
    const { context, sheet, result } = server(options);
    context.notifyHrForRow_(sheet, 2);
    assert.match(result.row[9], /^Failed:/);
    const response = context.doGet({ parameter: { type: 'status', applicationId: 'test-id' } });
    assert.equal(response.status, 'success');
    assert.equal(response.emailProvider, 'apps-script');
    assert.equal(response.cvUrl, result.row[6]);
  }
});

test('retry uses saved rows and skips Sent/Sending to prevent duplicate sends', () => {
  for (const initialStatus of ['Ready', 'Failed: Failed to fetch', 'Sent', 'Sending']) {
    const { context, result } = server({ initialStatus });
    context.retryFailedHrEmails();
    assert.equal(result.sent, initialStatus === 'Sent' || initialStatus === 'Sending' ? 0 : 1);
  }
});

test('successful mail with failed Sheet status write is not marked Failed or retried', () => {
  const { context, sheet, result } = server({ sentStatusError: true });
  context.notifyHrForRow_(sheet, 2);
  assert.equal(result.row[9], 'Sending');
  context.retryFailedHrEmails();
  assert.equal(result.sent, 1);
});

test('standalone script uses the configured Sheet for status lookup', () => {
  const { context, sheet } = server();
  context.PropertiesService.getScriptProperties = () => ({ getProperty: key => key === 'SPREADSHEET_ID' ? 'sheet-id' : null });
  context.SpreadsheetApp.getActiveSpreadsheet = () => null;
  context.SpreadsheetApp.openById = id => {
    assert.equal(id, 'sheet-id');
    return { getSheetByName: () => sheet };
  };
  assert.equal(context.doGet({ parameter: { type: 'status', applicationId: 'test-id' } }).status, 'success');
});

test('standalone script without a Sheet ID gives an actionable error', () => {
  const { context } = server();
  context.SpreadsheetApp.getActiveSpreadsheet = () => null;
  assert.throws(() => context.getSpreadsheet_(), /SPREADSHEET_ID/);
});
