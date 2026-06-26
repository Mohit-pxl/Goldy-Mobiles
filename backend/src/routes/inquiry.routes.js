const router = require('express').Router();
const { optionalAuth, authenticate } = require('../middleware/auth.middleware');
const { createInquiry, listInquiries } = require('../controllers/inquiry.controller');

/**
 * @swagger
 * /inquiries:
 *   post:
 *     summary: Create an inquiry
 *     tags: [Inquiries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Inquiry created
 */
// POST /api/inquiries — Create an inquiry (open to guests, optionalAuth)
router.post('/', optionalAuth, createInquiry);

router.get('/', authenticate, listInquiries);

module.exports = router;
