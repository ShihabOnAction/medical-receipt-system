import { Router } from 'express';
import { authenticate, requireApproved } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { testCreateSchema, testUpdateSchema, testReorderSchema } from '../validators/schemas.js';
import { idParam } from './common.js';
import * as controller from '../controllers/test.controller.js';

/** Read-only catalogue for any approved user. */
export const testRouter = Router();
testRouter.get('/', authenticate, requireApproved, controller.listTests);

/** Everything that changes a price lives behind ADMIN. */
export const adminTestRouter = Router();
adminTestRouter.use(authenticate, requireApproved, requireAdmin);
adminTestRouter.post('/', writeLimiter, validateBody(testCreateSchema), controller.createTest);
adminTestRouter.patch('/reorder', writeLimiter, validateBody(testReorderSchema), controller.reorderTests);
adminTestRouter.patch('/:id', writeLimiter, validateParams(idParam), validateBody(testUpdateSchema), controller.updateTest);
adminTestRouter.delete('/:id', writeLimiter, validateParams(idParam), controller.retireTest);

export default testRouter;
