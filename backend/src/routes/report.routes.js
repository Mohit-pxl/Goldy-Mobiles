const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/permission.middleware');
const {
  salesReport,
  lowStockReport,
  topProductsReport,
  profitLossReport,
  exportSalesReport,
} = require('../controllers/report.controller');

// All report routes require authentication and canViewReports permission
router.use(authenticate, requireRole(['admin', 'staff']), requirePermission('canViewReports'));

/**
 * @swagger
 * /reports/sales:
 *   get:
 *     summary: Sales summary report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales report data
 */
// GET /api/reports/sales — Sales summary
router.get('/sales', salesReport);

/**
 * @swagger
 * /reports/sales/export:
 *   get:
 *     summary: Export sales report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Exported report file
 */
// GET /api/reports/sales/export — Export sales report (CSV/PDF)
router.get('/sales/export', exportSalesReport);

/**
 * @swagger
 * /reports/low-stock:
 *   get:
 *     summary: Low stock products report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock report data
 */
// GET /api/reports/low-stock — Low stock products
router.get('/low-stock', lowStockReport);

/**
 * @swagger
 * /reports/top-products:
 *   get:
 *     summary: Top selling products report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top products data
 */
// GET /api/reports/top-products — Top selling products
router.get('/top-products', topProductsReport);

/**
 * @swagger
 * /reports/profit-loss:
 *   get:
 *     summary: Profit/loss report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profit and loss data
 */
// GET /api/reports/profit-loss — Profit/loss report
router.get('/profit-loss', profitLossReport);

module.exports = router;
