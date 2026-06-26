const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const { listBanners, createBanner, deleteBanner } = require('../controllers/banner.controller');

router.get('/', listBanners);
router.post('/', authenticate, requireRole(['admin']), createBanner);
router.delete('/:id', authenticate, requireRole(['admin']), deleteBanner);

module.exports = router;
