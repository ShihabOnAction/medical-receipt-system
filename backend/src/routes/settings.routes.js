import { Router } from 'express';
import { authenticate, optionalAuthenticate, requireApproved } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { settingsUpdateSchema } from '../validators/schemas.js';
import * as controller from '../controllers/settings.controller.js';

/** Public read: the sign-in page needs the hospital's branding before login. */
export const settingsRouter = Router();
settingsRouter.get('/', optionalAuthenticate, controller.getSettings);

export const adminSettingsRouter = Router();
adminSettingsRouter.use(authenticate, requireApproved, requireAdmin);
adminSettingsRouter.patch('/', writeLimiter, validateBody(settingsUpdateSchema), controller.patchSettings);

export default settingsRouter;
