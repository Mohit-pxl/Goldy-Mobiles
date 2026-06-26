const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const {
  listExpenses,
  createExpense,
  deleteExpense,
  getExpenseSummary,
} = require('../controllers/expense.controller');

// All expense routes require staff/admin role
router.use(authenticate, requireRole(['staff', 'admin']));

/**
 * @swagger
 * /expenses/summary:
 *   get:
 *     summary: Expense summary
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary of expenses
 */
// GET /api/expenses/summary — Expense summary by category (must be before /:id)
router.get('/summary', getExpenseSummary);

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: List expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expenses
 *   post:
 *     summary: Create an expense
 *     tags: [Expenses]
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
 *         description: Expense created
 */
// GET /api/expenses — List expenses
router.get('/', listExpenses);

// POST /api/expenses — Create an expense
router.post('/', createExpense);

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Expenses]
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
 *         description: Expense deleted
 */
// DELETE /api/expenses/:id — Delete an expense
router.delete('/:id', deleteExpense);

module.exports = router;
