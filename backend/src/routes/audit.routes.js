import { Router } from 'express';
import { authenticate, requireApproved } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validateQuery } from '../middleware/validate.js';
import { auditQuerySchema } from '../validators/schemas.js';
import * as controller from '../controllers/audit.controller.js';

const router = Router();
router.use(authenticate, requireApproved, requireAdmin);
router.get('/', validateQuery(auditQuerySchema), controller.listAuditLogs);

export default router;
