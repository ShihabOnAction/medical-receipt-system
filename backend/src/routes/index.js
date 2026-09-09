import { Router } from 'express';

import authRoutes from './auth.routes.js';
import statsRoutes from './stats.routes.js';
import userRoutes from './user.routes.js';
import auditRoutes from './audit.routes.js';
import { testRouter, adminTestRouter } from './test.routes.js';
import { receiptRouter, adminReceiptRouter } from './receipt.routes.js';
import { settingsRouter, adminSettingsRouter } from './settings.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/stats', statsRoutes);
router.use('/tests', testRouter);
router.use('/receipts', receiptRouter);
router.use('/settings', settingsRouter);

const admin = Router();
admin.use('/users', userRoutes);
admin.use('/tests', adminTestRouter);
admin.use('/receipts', adminReceiptRouter);
admin.use('/settings', adminSettingsRouter);
admin.use('/audit-logs', auditRoutes);

router.use('/admin', admin);

export default router;
