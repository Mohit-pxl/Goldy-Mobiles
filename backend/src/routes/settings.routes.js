const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const { getSettings, updateSettings } = require('../controllers/settings.controller');

router.get('/', getSettings);
router.patch('/', authenticate, requireRole(['admin']), updateSettings);

module.exports = router;
