const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const { getPresignedUrl } = require('../controllers/upload.controller');

/**
 * @swagger
 * /uploads/presign:
 *   post:
 *     summary: Get presigned S3 upload URL
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *               fileType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 */
// POST /api/uploads/presign — Get presigned S3 upload URL (staff/admin)
router.post('/presign', authenticate, requireRole(['staff', 'admin']), getPresignedUrl);

module.exports = router;
