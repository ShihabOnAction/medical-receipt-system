import api from './api.js';

export async function createReceipt(payload) {
  const { data } = await api.post('/receipts', payload);
  return data;
}

export async function listReceipts(params) {
  const { data } = await api.get('/receipts', { params });
  return data.data;
}

export async function getReceipt(id) {
  const { data } = await api.get(`/receipts/${id}`);
  return data.data;
}

export async function voidReceipt(id, reason) {
  const { data } = await api.post(`/admin/receipts/${id}/void`, { reason });
  return data;
}

/** Fetches the PDF as a blob so the auth header can be attached. */
export async function fetchReceiptPdf(id, { download = false } = {}) {
  const response = await api.get(`/receipts/${id}/pdf`, {
    params: download ? { download: '1' } : undefined,
    responseType: 'blob',
  });
  return new Blob([response.data], { type: 'application/pdf' });
}

/** The print-ready HTML, used by the in-app print window. */
export async function fetchReceiptHtml(id) {
  const { data } = await api.get(`/receipts/${id}/html`, { responseType: 'text' });
  return data;
}

export async function downloadReceiptPdf(id, filename) {
  const blob = await fetchReceiptPdf(id, { download: true });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `receipt-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Opens the receipt in a new tab and triggers the browser print dialog. */
export async function printReceipt(id) {
  const html = await fetchReceiptHtml(id);
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) throw new Error('Allow pop-ups for this site to print the receipt.');
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // give the layout a moment before the dialog appears
  setTimeout(() => {
    win.print();
  }, 400);
}
