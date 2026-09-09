import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { registerLimiter } from '../middleware/rateLimit.js';
import { registerSchema, updateProfileSchema } from '../validators/schemas.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', registerLimiter, validateBody(registerSchema), controller.register);
router.get('/me', authenticate, controller.me);
router.patch('/me', authenticate, validateBody(updateProfileSchema), controller.updateMyProfile);
router.post('/session', authenticate, controller.touchSession);

export default router;
