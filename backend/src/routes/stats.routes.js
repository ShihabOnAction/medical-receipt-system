import { Router } from 'express';
import { authenticate, requireApproved } from '../middleware/auth.js';
import * as controller from '../controllers/stats.controller.js';

const router = Router();
router.get('/dashboard', authenticate, requireApproved, controller.dashboard);

export default router;
