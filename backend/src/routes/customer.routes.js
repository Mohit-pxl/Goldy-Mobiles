const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const {
  listCustomers,
  createCustomer,
  getCustomer,
  addPayment,
} = require('../controllers/customer.controller');

// All customer/khata routes require staff/admin role
router.use(authenticate, requireRole(['staff', 'admin']));

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: List customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customers
 *   post:
 *     summary: Create a customer
 *     tags: [Customers]
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
 *         description: Customer created
 */
// GET /api/customers — List customers
router.get('/', listCustomers);

// POST /api/customers — Create a customer
router.post('/', createCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get customer details
 *     tags: [Customers]
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
 *         description: Customer details
 */
// GET /api/customers/:id — Get customer
router.get('/:id', getCustomer);

// POST /api/customers/:id/payments — Add Khata payment
router.post('/:id/payments', addPayment);

module.exports = router;
