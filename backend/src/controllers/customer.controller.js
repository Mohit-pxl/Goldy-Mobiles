const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const { nanoid } = require('nanoid');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { paginate } = require('../utils/pagination');

/**
 * GET /api/customers
 * List customers with search and pagination.
 */
const listCustomers = async (req, res, next) => {
  try {
    const { skip, limit, buildMeta } = paginate(req.query);
    const { search } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (req.query.count === 'true') {
      const count = await Customer.countDocuments(filter);
      return successResponse(res, { count });
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(filter),
    ]);

    return successResponse(res, customers, 200, buildMeta(total));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/customers
 * Create a new customer (party).
 */
const createCustomer = [
  body('name').notEmpty().trim().withMessage('Customer name is required'),
  body('phone').notEmpty().trim().withMessage('Phone number is required'),
  body('address').optional().trim(),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const customer = await Customer.create(req.body);
      return successResponse(res, customer, 201);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * GET /api/customers/:id
 * Get customer with balance and recent transaction history.
 */
const getCustomer = [
  param('id').isMongoId().withMessage('Invalid customer ID'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        return errorResponse(res, 'Customer not found.', 404);
      }

      return successResponse(res, customer.toObject());
    } catch (error) {
      next(error);
    }
  },
];


/**
 * POST /api/customers/:id/payments
 * Record a payment for Khata.
 */
const addPayment = [
  param('id').isMongoId().withMessage('Invalid customer ID'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
  body('paymentMode').isIn(['cash', 'upi', 'card']).withMessage('Invalid payment mode'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return errorResponse(res, 'Validation failed.', 400, errors.array());

      const customer = await Customer.findById(req.params.id);
      if (!customer) return errorResponse(res, 'Customer not found.', 404);

      const amount = Number(req.body.amount);
      const paymentMode = req.body.paymentMode;

      customer.totalDue = (customer.totalDue || 0) - amount;
      await customer.save();

      const invoice = await Invoice.create({
        invoiceNumber: `PAY-${nanoid(8).toUpperCase()}`,
        items: [],
        subtotal: 0,
        discount: 0,
        cgst: 0,
        sgst: 0,
        gstAmount: 0,
        total: -amount,
        paymentMode,
        paymentStatus: 'paid',
        paidAmount: amount,
        dueAmount: 0,
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        createdBy: req.user._id,
      });

      return successResponse(res, { customer, invoice }, 201);
    } catch (error) {
      next(error);
    }
  }
];

module.exports = {
  listCustomers,
  createCustomer,
  getCustomer,
  addPayment,
};
