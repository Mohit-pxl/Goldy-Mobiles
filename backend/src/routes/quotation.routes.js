const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const {
  listQuotations,
  createQuotation,
  getQuotation,
  updateQuotation,
  convertToInvoice,
} = require('../controllers/quotation.controller');

// All quotation routes require staff/admin role
router.use(authenticate, requireRole(['staff', 'admin']));

/**
 * @swagger
 * /quotations:
 *   get:
 *     summary: List quotations
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of quotations
 *   post:
 *     summary: Create a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Quotation created
 */
// GET /api/quotations — List quotations
router.get('/', listQuotations);

// POST /api/quotations — Create a quotation
router.post('/', createQuotation);

/**
 * @swagger
 * /quotations/{id}:
 *   get:
 *     summary: Get single quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation details
 *   patch:
 *     summary: Update quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Quotation updated
 */
// GET /api/quotations/:id — Get single quotation
router.get('/:id', getQuotation);

// PATCH /api/quotations/:id — Update quotation
router.patch('/:id', updateQuotation);

/**
 * @swagger
 * /quotations/{id}/convert:
 *   post:
 *     summary: Convert quotation to invoice
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice created from quotation
 */
// POST /api/quotations/:id/convert — Convert quotation to invoice
router.post('/:id/convert', convertToInvoice);

module.exports = router;
