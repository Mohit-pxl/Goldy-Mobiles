const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getNotifications, markAsRead } = require('../controllers/notification.controller');

// All notification routes require authentication
router.use(authenticate);

// GET /api/notifications
router.get('/', getNotifications);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', markAsRead);

module.exports = router;
