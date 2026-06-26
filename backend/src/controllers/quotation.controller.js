const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const { nanoid } = require('nanoid');
const Quotation = require('../models/Quotation');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const StockMovement = require('../models/StockMovement');
const Customer = require('../models/Customer');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { paginate } = require('../utils/pagination');

/**
 * GET /api/quotations
 * List quotations with pagination.
 */
const listQuotations = async (req, res, next) => {
  try {
    const { skip, limit, buildMeta } = paginate(req.query);
    const { status, customerId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    const [quotations, total] = await Promise.all([
      Quotation.find(filter)
        .populate('customerId', 'name phone')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Quotation.countDocuments(filter),
    ]);

    return successResponse(res, quotations, 200, buildMeta(total));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/quotations
 * Create a new quotation.
 */
const createQuotation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Valid productId required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('customerId').optional().isMongoId().withMessage('Invalid customerId'),
  body('validTill').optional().isISO8601().withMessage('validTill must be a valid ISO date'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { items: requestItems, customerId, validTill } = req.body;

      const quotationItems = [];
      let subtotal = 0;

      for (const item of requestItems) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return errorResponse(res, `Product not found: ${item.productId}`, 404);
        }

        const unitPrice = item.unitPrice || product.sellingPrice;
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        quotationItems.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          total: lineTotal,
        });
      }

      const quotationNumber = `QT-${nanoid(12).toUpperCase()}`;

      const quotation = await Quotation.create({
        quotationNumber,
        items: quotationItems,
        subtotal,
        customerId: customerId || undefined,
        validTill: validTill ? new Date(validTill) : undefined,
        status: 'draft',
        createdBy: req.user._id,
      });

      return successResponse(res, quotation, 201);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * GET /api/quotations/:id
 * Get a single quotation.
 */
const getQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customerId', 'name phone address')
      .populate('createdBy', 'name email');

    if (!quotation) {
      return errorResponse(res, 'Quotation not found.', 404);
    }

    return successResponse(res, quotation);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/quotations/:id
 * Update a quotation (status, validTill, items, etc.).
 */
const updateQuotation = [
  param('id').isMongoId().withMessage('Invalid quotation ID'),
  body('status')
    .optional()
    .isIn(['draft', 'sent', 'expired'])
    .withMessage('Status must be draft, sent, or expired'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) {
        return errorResponse(res, 'Quotation not found.', 404);
      }

      if (quotation.status === 'converted') {
        return errorResponse(res, 'Cannot update a converted quotation.', 400);
      }

      // Update allowed fields
      const allowedFields = ['status', 'validTill', 'items', 'customerId'];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          quotation[field] = req.body[field];
        }
      }

      // Recalculate subtotal if items changed
      if (req.body.items) {
        quotation.subtotal = quotation.items.reduce((sum, item) => sum + item.total, 0);
      }

      await quotation.save();

      return successResponse(res, quotation);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * POST /api/quotations/:id/convert
 * Convert a quotation into an invoice (reuses billing transaction logic).
 */
const convertToInvoice = [
  param('id').isMongoId().withMessage('Invalid quotation ID'),
  body('paymentMode')
    .isIn(['cash', 'upi', 'card'])
    .withMessage('paymentMode is required'),
  body('discount').optional().isFloat({ min: 0 }),
  body('paidAmount').optional().isFloat({ min: 0 }),

  async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      session.startTransaction();

      const quotation = await Quotation.findById(req.params.id).session(session);
      if (!quotation) {
        await session.abortTransaction();
        session.endSession();
        return errorResponse(res, 'Quotation not found.', 404);
      }

      if (quotation.status === 'converted') {
        await session.abortTransaction();
        session.endSession();
        return errorResponse(res, 'Quotation has already been converted.', 400);
      }

      const { paymentMode, discount = 0, paidAmount: rawPaidAmount } = req.body;

      const invoiceItems = [];
      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;

      // Process each quotation item
      for (const item of quotation.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw Object.assign(
            new Error(`Product not found: ${item.productId}`),
            { statusCode: 400 }
          );
        }

        if (product.stock < item.quantity) {
          throw Object.assign(
            new Error(
              `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
            ),
            { statusCode: 400 }
          );
        }

        const gstPercent = product.gstPercent || 0;
        const lineTotal = item.unitPrice * item.quantity;
        const gstAmount = (lineTotal * gstPercent) / 100;

        subtotal += lineTotal;
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;

        invoiceItems.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstPercent,
          total: lineTotal + gstAmount,
        });

        // Decrement stock
        product.stock -= item.quantity;
        await product.save({ session });

        // Write stock movement
        await StockMovement.create(
          [
            {
              productId: product._id,
              type: 'out',
              quantity: item.quantity,
              reason: `Quotation conversion - ${quotation.quotationNumber}`,
              createdBy: req.user._id,
            },
          ],
          { session }
        );
      }

      const totalAmount = subtotal + totalCgst + totalSgst - discount;
      const paidAmount =
        rawPaidAmount !== undefined ? rawPaidAmount : totalAmount;
      const dueAmount = Math.max(0, totalAmount - paidAmount);

      const invoiceNumber = `INV-${nanoid(12).toUpperCase()}`;

      // Determine customer info
      let customerName, customerPhone;
      if (quotation.customerId) {
        const customer = await Customer.findById(quotation.customerId).session(session);
        if (customer) {
          customerName = customer.name;
          customerPhone = customer.phone;
        }
      }

      const [invoice] = await Invoice.create(
        [
          {
            invoiceNumber,
            items: invoiceItems,
            subtotal,
            discount,
            cgst: totalCgst,
            sgst: totalSgst,
            totalAmount,
            paymentMode,
            paidAmount,
            dueAmount,
            customerId: quotation.customerId,
            customerName,
            customerPhone,
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      // Mark quotation as converted
      quotation.status = 'converted';
      await quotation.save({ session });

      await session.commitTransaction();

      return successResponse(res, { invoice, quotation }, 201);
    } catch (error) {
      await session.abortTransaction();

      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      next(error);
    } finally {
      session.endSession();
    }
  },
];

module.exports = {
  listQuotations,
  createQuotation,
  getQuotation,
  updateQuotation,
  convertToInvoice,
};
