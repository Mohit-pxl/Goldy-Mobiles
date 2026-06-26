const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const {
  createInvoice,
  listInvoices,
  getInvoice,
  getInvoicePDF,
} = require('../controllers/billing.controller');

// All billing routes require staff/admin role
router.use(authenticate, requireRole(['staff', 'admin']));

/**
 * @swagger
 * /billing/invoices:
 *   post:
 *     summary: Create an invoice
 *     tags: [Billing]
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
 *         description: Invoice created successfully
 */
// POST /api/billing/invoices — Create an invoice
router.post('/invoices', createInvoice);

/**
 * @swagger
 * /billing/invoices:
 *   get:
 *     summary: List invoices
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices
 */
// GET /api/billing/invoices — List invoices
router.get('/invoices', listInvoices);

/**
 * @swagger
 * /billing/invoices/{id}:
 *   get:
 *     summary: Get single invoice
 *     tags: [Billing]
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
 *         description: Invoice details
 */
// GET /api/billing/invoices/:id — Get single invoice
router.get('/invoices/:id', getInvoice);

/**
 * @swagger
 * /billing/invoices/{id}/pdf:
 *   get:
 *     summary: Download invoice PDF
 *     tags: [Billing]
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
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
// GET /api/billing/invoices/:id/pdf — Download invoice PDF
router.get('/invoices/:id/pdf', getInvoicePDF);

module.exports = router;
