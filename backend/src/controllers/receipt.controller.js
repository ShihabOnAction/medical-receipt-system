import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { slugify } from '../utils/formatter.js';
import { logAudit, AUDIT } from '../services/audit.service.js';
import { getSettingsRow } from '../services/settings.service.js';
import { generateReceiptPdf, renderReceiptPreview } from '../services/pdf.service.js';
import {
  createReceipt as createReceiptRecord,
  getReceiptById,
  listReceipts as listReceiptRecords,
  voidReceipt as voidReceiptRecord,
} from '../services/receipt.service.js';

/** Staff may only reach their own receipts; admins may reach all. */
function assertVisible(receipt, user) {
  if (!receipt) throw ApiError.notFound('Receipt not found.');
  if (user.role !== 'ADMIN' && receipt.createdBy !== user.id) {
    throw ApiError.forbidden('This receipt belongs to another user.');
  }
}

/** POST /api/receipts */
export const createReceipt = asyncHandler(async (req, res) => {
  const receipt = await createReceiptRecord({ payload: req.body, userId: req.user.id });

  await logAudit({
    req,
    action: AUDIT.RECEIPT_CREATED,
    entityType: 'receipt',
    entityId: receipt.id,
    metadata: {
      serial: receipt.serialDisplay,
      total: receipt.totalAmount,
      patient: receipt.patientName,
      tests: receipt.items.map((i) => i.testName),
    },
  });

  res.status(201).json({
    success: true,
    data: receipt,
    message: `Receipt ${receipt.serialDisplay} created.`,
  });
});

/** GET /api/receipts */
export const listReceipts = asyncHandler(async (req, res) => {
  const data = await listReceiptRecords({ query: req.validatedQuery, user: req.user });
  res.json({ success: true, data });
});

/** GET /api/receipts/:id */
export const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await getReceiptById(req.params.id);
  assertVisible(receipt, req.user);
  res.json({ success: true, data: receipt });
});

/**
 * GET /api/receipts/:id/pdf?download=1
 * inline by default so the browser's own viewer can print it.
 */
export const getReceiptPdf = asyncHandler(async (req, res) => {
  const settings = await getSettingsRow();
  const receipt = await getReceiptById(req.params.id, { settings });
  assertVisible(receipt, req.user);

  const pdf = await generateReceiptPdf(receipt, { settings });
  const filename = `receipt-${receipt.serialDisplay}-${slugify(receipt.patientName)}.pdf`;
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';

  await logAudit({
    req,
    action: AUDIT.RECEIPT_PDF_GENERATED,
    entityType: 'receipt',
    entityId: receipt.id,
    metadata: { serial: receipt.serialDisplay, mode: disposition },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  res.setHeader('Content-Length', pdf.length);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(pdf);
});

/** GET /api/receipts/:id/html - print preview inside the app */
export const getReceiptHtml = asyncHandler(async (req, res) => {
  const settings = await getSettingsRow();
  const receipt = await getReceiptById(req.params.id, { settings });
  assertVisible(receipt, req.user);

  const html = await renderReceiptPreview(receipt, { settings });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(html);
});

/** POST /api/admin/receipts/:id/void */
export const voidReceipt = asyncHandler(async (req, res) => {
  const receipt = await getReceiptById(req.params.id);
  if (!receipt) throw ApiError.notFound('Receipt not found.');

  await voidReceiptRecord({ id: receipt.id, adminId: req.user.id, reason: req.body.reason });

  await logAudit({
    req,
    action: AUDIT.RECEIPT_VOIDED,
    entityType: 'receipt',
    entityId: receipt.id,
    metadata: { serial: receipt.serialDisplay, reason: req.body.reason, total: receipt.totalAmount },
  });

  const updated = await getReceiptById(receipt.id);
  res.json({ success: true, data: updated, message: `Receipt ${receipt.serialDisplay} cancelled.` });
});
