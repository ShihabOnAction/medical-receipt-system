import asyncHandler from '../utils/asyncHandler.js';
import { logAudit, AUDIT } from '../services/audit.service.js';
import { getSettingsRow, updateSettings, toClientSettings, toPublicSettings } from '../services/settings.service.js';

/**
 * GET /api/settings
 *
 * Open to everyone, because the sign-in page has to show the hospital's name,
 * logo and colours before anyone has signed in. Anonymous callers get the
 * branding subset; signed-in users get the full row.
 */
export const getSettings = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  res.json({ success: true, data: req.user ? toClientSettings(row) : toPublicSettings(row) });
});

/** PATCH /api/admin/settings */
export const patchSettings = asyncHandler(async (req, res) => {
  const before = await getSettingsRow({ fresh: true });
  const row = await updateSettings(req.body, req.user.id);

  const changed = Object.keys(req.body).filter((key) => req.body[key] !== undefined);

  await logAudit({
    req,
    action: AUDIT.SETTINGS_UPDATED,
    entityType: 'settings',
    entityId: '1',
    metadata: {
      changed,
      hospitalNameBefore: before.hospital_name,
      hospitalNameAfter: row.hospital_name,
    },
  });

  res.json({ success: true, data: toClientSettings(row), message: 'Settings saved.' });
});
