import { Router } from 'express';
import { authenticate, requireApproved } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { userListQuerySchema, userStatusSchema, userRoleSchema } from '../validators/schemas.js';
import { idParam } from './common.js';
import * as controller from '../controllers/user.controller.js';

const router = Router();
router.use(authenticate, requireApproved, requireAdmin);

router.get('/', validateQuery(userListQuerySchema), controller.listUsers);
router.get('/options', controller.userOptions);
router.patch('/:id/status', validateParams(idParam), validateBody(userStatusSchema), controller.updateUserStatus);
router.patch('/:id/role', validateParams(idParam), validateBody(userRoleSchema), controller.updateUserRole);

export default router;
