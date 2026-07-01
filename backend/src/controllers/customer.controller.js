const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
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
    const userFilter = {};

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
      ];
      userFilter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
      ];
    }

    if (req.query.count === 'true') {
      const customerCount = await Customer.countDocuments(filter);
      const userCount = await User.countDocuments(userFilter);
      return successResponse(res, { count: customerCount + userCount });
    }

    const [customers, users] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).lean(),
      User.find(userFilter).sort({ createdAt: -1 }).lean(),
    ]);

    // Format users to look like customers (remove sensitive info)
    const formattedUsers = users.map(u => ({
      _id: u._id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      totalDue: u.totalDue || 0,
      nextPaymentDate: u.nextPaymentDate,
      createdAt: u.createdAt,
      isUser: true, // flag to identify if needed
    }));

    // Merge and remove duplicates by phone if any
    const all = [...customers, ...formattedUsers].sort((a, b) => b.createdAt - a.createdAt);
    
    // De-duplicate by phone number
    const unique = [];
    const seenPhones = new Set();
    for (const item of all) {
      if (item.phone && seenPhones.has(item.phone)) continue;
      if (item.phone) seenPhones.add(item.phone);
      unique.push(item);
    }

    const paginated = unique.slice(skip, skip + limit);

    return successResponse(res, paginated, 200, buildMeta(unique.length));
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

      const phone = req.body.phone;

      // Check if user or customer already exists with this phone
      let existingCustomer = await Customer.findOne({ phone });
      if (!existingCustomer) {
        existingCustomer = await User.findOne({ phone, role: 'customer' });
      }

      if (existingCustomer) {
        return successResponse(res, existingCustomer, 200);
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

      let customer = await Customer.findById(req.params.id);
      if (!customer) {
        customer = await User.findById(req.params.id);
      }
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
  body('nextPaymentDate').optional().isISO8601().toDate(),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return errorResponse(res, 'Validation failed.', 400, errors.array());

      let customer = await Customer.findById(req.params.id);
      if (!customer) {
        customer = await User.findById(req.params.id);
      }
      if (!customer) return errorResponse(res, 'Customer not found.', 404);

      const amount = Number(req.body.amount);
      const paymentMode = req.body.paymentMode;

      customer.totalDue = (customer.totalDue || 0) - amount;
      
      if (customer.totalDue <= 0) {
        customer.nextPaymentDate = null;
      } else if (req.body.nextPaymentDate) {
        customer.nextPaymentDate = req.body.nextPaymentDate;
      }

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

/**
 * PATCH /api/customers/:id
 * Update customer details (e.g. nextPaymentDate).
 */
const updateCustomer = [
  param('id').isMongoId().withMessage('Invalid customer ID'),
  body('nextPaymentDate').optional().isISO8601().toDate(),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return errorResponse(res, 'Validation failed.', 400, errors.array());

      let customer = await Customer.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );
      if (!customer) {
        customer = await User.findByIdAndUpdate(
          req.params.id,
          { $set: req.body },
          { new: true }
        );
      }
      if (!customer) return errorResponse(res, 'Customer not found.', 404);

      return successResponse(res, customer.toObject());
    } catch (error) {
      next(error);
    }
  }
];

/**
 * DELETE /api/customers/:id
 * Delete a customer (only if they are a Customer, not a User).
 */
const deleteCustomer = [
  param('id').isMongoId().withMessage('Invalid customer ID'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return errorResponse(res, 'Validation failed.', 400, errors.array());

      // Only delete from Customer collection
      const customer = await Customer.findByIdAndDelete(req.params.id);
      if (!customer) {
         // If it's a User, just ignore or return success, we shouldn't delete users from this route
         return successResponse(res, { message: 'Ignored User deletion' });
      }

      return successResponse(res, { message: 'Customer deleted' });
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
  updateCustomer,
  deleteCustomer,
};
