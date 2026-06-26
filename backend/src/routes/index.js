const router = require('express').Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const uploadRoutes = require('./upload.routes');
const userRoutes = require('./user.routes');
const productRoutes = require('./product.routes');
const billingRoutes = require('./billing.routes');
const customerRoutes = require('./customer.routes');
const expenseRoutes = require('./expense.routes');
const quotationRoutes = require('./quotation.routes');
const reportRoutes = require('./report.routes');
const catalogRoutes = require('./catalog.routes');
const inquiryRoutes = require('./inquiry.routes');
const bannerRoutes = require('./banner.routes');
const settingsRoutes = require('./settings.routes');

// Stock routes (inline since it's simple)
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const { createMovement, getMovements } = require('../controllers/stock.controller');

const stockRouter = require('express').Router();
stockRouter.use(authenticate, requireRole(['staff', 'admin']));
/**
 * @swagger
 * /stock/movement:
 *   post:
 *     summary: Create stock movement
 *     tags: [Stock]
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
 *         description: Stock movement recorded
 */
stockRouter.post('/movement', createMovement);

/**
 * @swagger
 * /stock/movements/{productId}:
 *   get:
 *     summary: Get stock movements for a product
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of stock movements
 */
stockRouter.get('/movements/:productId', getMovements);

// Mount all routes
router.use('/auth', authRoutes);
router.use('/uploads', uploadRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRouter);
router.use('/billing', billingRoutes);
router.use('/customers', customerRoutes);
router.use('/expenses', expenseRoutes);
router.use('/quotations', quotationRoutes);
router.use('/reports', reportRoutes);
router.use('/catalog', catalogRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/banners', bannerRoutes);
router.use('/settings', settingsRoutes);

// Alias for frontend staff requests
const { listStaff } = require('../controllers/user.controller');
router.get('/staff', authenticate, requireRole(['admin']), listStaff);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API Health Check
 *     description: Returns the operational status of the backend API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: '2023-01-01T00:00:00.000Z'
 */
router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

module.exports = router;
