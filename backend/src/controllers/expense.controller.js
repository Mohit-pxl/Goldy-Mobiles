const { body, param, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { paginate } = require('../utils/pagination');

/**
 * GET /api/expenses
 * List expenses with pagination and optional date/category filters.
 */
const listExpenses = async (req, res, next) => {
  try {
    const { skip, limit, buildMeta } = paginate(req.query);
    const { category, startDate, endDate } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('createdBy', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(filter),
    ]);

    return successResponse(res, expenses, 200, buildMeta(total));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/expenses
 * Create a new expense entry.
 */
const createExpense = [
  body('category')
    .isIn(['rent', 'electricity', 'salary', 'transport', 'other'])
    .withMessage('category must be rent, electricity, salary, transport, or other'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('note').optional().trim(),
  body('date').optional().isISO8601().withMessage('date must be a valid ISO date'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const expense = await Expense.create({
        ...req.body,
        createdBy: req.user._id,
      });

      return successResponse(res, expense, 201);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * DELETE /api/expenses/:id
 * Delete an expense entry.
 */
const deleteExpense = [
  param('id').isMongoId().withMessage('Invalid expense ID'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const expense = await Expense.findByIdAndDelete(req.params.id);
      if (!expense) {
        return errorResponse(res, 'Expense not found.', 404);
      }

      return successResponse(res, { message: 'Expense deleted successfully.' });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * GET /api/expenses/summary
 * Expense summary by category for a given range.
 */
const getExpenseSummary = async (req, res, next) => {
  try {
    const { range } = req.query; // 'daily' or 'monthly'
    const now = new Date();
    let startDate;

    if (range === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      // default monthly
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const summary = await Expense.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = summary.reduce((sum, item) => sum + item.total, 0);

    return successResponse(res, {
      range: range || 'monthly',
      startDate,
      categories: summary.map((s) => ({
        category: s._id,
        total: s.total,
        count: s.count,
      })),
      grandTotal,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listExpenses, createExpense, deleteExpense, getExpenseSummary };
