import { Router } from 'express';
import { authenticate, requireApproved } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { writeLimiter, pdfLimiter } from '../middleware/rateLimit.js';
import { receiptCreateSchema, receiptListQuerySchema, voidReceiptSchema } from '../validators/schemas.js';
import { idParam } from './common.js';
import * as controller from '../controllers/receipt.controller.js';

export const receiptRouter = Router();
receiptRouter.use(authenticate, requireApproved);

receiptRouter.post('/', writeLimiter, validateBody(receiptCreateSchema), controller.createReceipt);
receiptRouter.get('/', validateQuery(receiptListQuerySchema), controller.listReceipts);
receiptRouter.get('/:id', validateParams(idParam), controller.getReceipt);
receiptRouter.get('/:id/pdf', pdfLimiter, validateParams(idParam), controller.getReceiptPdf);
receiptRouter.get('/:id/html', pdfLimiter, validateParams(idParam), controller.getReceiptHtml);

/** Cancelling is the only way to correct a financial record, admins only. */
export const adminReceiptRouter = Router();
adminReceiptRouter.use(authenticate, requireApproved, requireAdmin);
adminReceiptRouter.post('/:id/void', writeLimiter, validateParams(idParam), validateBody(voidReceiptSchema), controller.voidReceipt);

export default receiptRouter;
