const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const { nanoid } = require('nanoid');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Customer = require('../models/Customer');
const { generateInvoicePDF } = require('../services/invoice.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { paginate } = require('../utils/pagination');

/**
 * POST /api/billing/invoices
 * Create an invoice:
 * - Validate stock for every item
 * - Decrement Product.stock
 * - Write StockMovement (type 'out')
 * - Create Invoice
 */
const createInvoice = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*').custom((item) => {
    const productId = item.productId || (item.product && item.product._id);
    if (!mongoose.isValidObjectId(productId)) {
      throw new Error('Valid productId required for each item');
    }
    return true;
  }),
  body('items.*.qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').optional().isFloat({ min: 0 }),
  body('paymentMode')
    .isIn(['cash', 'upi', 'card', 'credit'])
    .withMessage('paymentMode must be cash, upi, card, or credit'),
  body('paymentStatus').optional().isIn(['paid', 'unpaid']),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be non-negative'),
  body('paidAmount').optional().isFloat({ min: 0 }).withMessage('paidAmount must be non-negative'),
  body('customerId').optional().isMongoId().withMessage('Invalid customerId'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const {
        items: requestItems,
        paymentMode,
        paymentStatus = 'paid',
        discount = 0,
        paidAmount: rawPaidAmount,
        customer,
        customerId: bodyCustomerId,
        customerName: bodyCustomerName,
        customerPhone: bodyCustomerPhone,
      } = req.body;

      const customerId = bodyCustomerId || (customer && customer._id);
      const customerName = bodyCustomerName || (customer && customer.name);
      const customerPhone = bodyCustomerPhone || (customer && customer.phone);

      const invoiceItems = [];
      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      const allRequestedIdentifiers = requestItems.flatMap((item) => item.identifiers || []);
      const duplicateIdentifier = allRequestedIdentifiers.find(
        (code, index) => allRequestedIdentifiers.indexOf(code) !== index
      );
      if (duplicateIdentifier) {
        return errorResponse(res, `Duplicate identifier in invoice: ${duplicateIdentifier}`, 400);
      }

      // Process each item: validate stock, compute totals
      for (const item of requestItems) {
        const productId = item.productId || (item.product && item.product._id);
        const product = await Product.findById(productId);
        if (!product) {
          throw Object.assign(
            new Error(`Product not found: ${productId}`),
            { statusCode: 400 }
          );
        }

        if (product.stock < item.qty) {
          throw Object.assign(
            new Error(
              `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.qty}`
            ),
            { statusCode: 400 }
          );
        }

        const price = item.price !== undefined ? item.price : product.sellingPrice;
        const lineTotal = price * item.qty;
        const gstPercent = product.gstPercent || 0;
        const lineGst = (lineTotal * gstPercent) / 100;
        const lineCgst = lineGst / 2;
        const lineSgst = lineGst / 2;

        subtotal += lineTotal;
        totalCgst += lineCgst;
        totalSgst += lineSgst;

        // Handle identifiers
        const ProductItem = require('../models/ProductItem');
        const trackingType = product.trackingType || (product.trackImei ? 'IMEI' : product.trackSerial ? 'SERIAL' : 'QUANTITY');
        if (trackingType === 'IMEI' || trackingType === 'SERIAL') {
          if (!item.identifiers || item.identifiers.length !== item.qty) {
            throw Object.assign(
              new Error(`Missing or incorrect number of identifiers for "${product.name}". Expected ${item.qty}.`),
              { statusCode: 400 }
            );
          }
          
          // Verify they exist and are in stock
          const existingItems = await ProductItem.find({
            code: { $in: item.identifiers },
            productId: product._id,
            status: 'IN_STOCK',
          });
          
          if (existingItems.length !== item.qty) {
            throw Object.assign(
              new Error(`Some identifiers for "${product.name}" are invalid or not in stock.`),
              { statusCode: 400 }
            );
          }
        }

        invoiceItems.push({
          productId: product._id,
          name: product.name,
          qty: item.qty,
          price,
          gstPercent,
          total: lineTotal + lineGst,
          identifiers: item.identifiers || [],
        });

        // Decrement stock
        product.stock -= item.qty;
        await product.save();

        // Write stock movement
        await StockMovement.create(
          [
            {
              productId: product._id,
              type: 'out',
              quantity: item.qty,
              reason: 'Invoice sale',
              createdBy: req.user._id,
            },
          ]
        );
      }

      const total = subtotal + totalCgst + totalSgst - discount;
      const gstAmount = totalCgst + totalSgst;
      const paidAmount =
        rawPaidAmount !== undefined ? rawPaidAmount : total;
      const dueAmount = Math.max(0, total - paidAmount);

      // Generate invoice number
      const invoiceNumber = `INV-${nanoid(12).toUpperCase()}`;

      // Create invoice
      const [invoice] = await Invoice.create(
        [
          {
            invoiceNumber,
            items: invoiceItems,
            subtotal,
            discount,
            cgst: totalCgst,
            sgst: totalSgst,
            gstAmount,
            total,
            paymentMode,
            paymentStatus,
            paidAmount,
            dueAmount,
            customerId: customerId || undefined,
            customerName,
            customerPhone,
            createdBy: req.user._id,
          },
        ]
      );

      // Update ProductItems to SOLD and set invoiceId
      const allIdentifiers = invoiceItems.flatMap(i => i.identifiers);
      if (allIdentifiers.length > 0) {
        const ProductItem = require('../models/ProductItem');
        const updateResult = await ProductItem.updateMany(
          { code: { $in: allIdentifiers }, status: 'IN_STOCK' },
          { $set: { status: 'SOLD', invoiceId: invoice._id } }
        );
        const modified = updateResult.modifiedCount ?? updateResult.nModified;
        if (modified !== allIdentifiers.length) {
          return errorResponse(res, 'One or more inventory items were already sold before the invoice could be finalized.', 409);
        }
      }

      // Update StockMovement records with the invoice reference
      await StockMovement.updateMany(
        {
          createdBy: req.user._id,
          reason: 'Invoice sale',
          refInvoiceId: { $exists: false },
        },
        { refInvoiceId: invoice._id }
      );

      // Update customer totalDue if there is a dueAmount
      if (customerId && dueAmount > 0) {
        await Customer.findByIdAndUpdate(
          customerId,
          { $inc: { totalDue: dueAmount } }
        );
      }

      return successResponse(res, invoice, 201);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      next(error);
    }
  },
];

/**
 * GET /api/billing/invoices
 * List invoices with pagination.
 */
const listInvoices = async (req, res, next) => {
  try {
    const { skip, limit, buildMeta } = paginate(req.query);

    const filter = {};
    if (req.query.paymentMode) filter.paymentMode = req.query.paymentMode;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    
    // Support ?today=true for dashboard
    if (req.query.today === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: today };
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('customerId', 'name phone address')
        .populate('createdBy', 'name email')
        .populate('items.productId', 'name brand category gstPercent')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(filter),
    ]);

    // If today=true, calculate total sales sum
    if (req.query.today === 'true') {
      const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
      return successResponse(res, { total: totalSales, count: total });
    }

    // Format output to match frontend expectations
    const formatted = invoices.map(inv => {
      const i = inv.toObject();
      i.items = i.items.map(item => {
        const subtotal = item.price * item.qty;
        return {
          ...item,
          subtotal,
          gstAmount: item.total - subtotal,
          product: item.productId,
          productId: undefined
        };
      });
      if (i.customerId) {
        i.customer = i.customerId;
        i.customerId = undefined;
      }
      return i;
    });

    return successResponse(res, formatted, 200, buildMeta(total));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/billing/invoices/:id
 * Get a single invoice.
 */
const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customerId', 'name phone address')
      .populate('createdBy', 'name email')
      .populate('items.productId', 'name brand category gstPercent');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found.', 404);
    }

    const i = invoice.toObject();
    i.items = i.items.map(item => {
      const subtotal = item.price * item.qty;
      return {
        ...item,
        subtotal,
        gstAmount: item.total - subtotal,
        product: item.productId,
        productId: undefined
      };
    });
    if (i.customerId) {
      i.customer = i.customerId;
      i.customerId = undefined;
    }

    return successResponse(res, i);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/billing/invoices/:id/pdf
 * Generate and stream a PDF for the invoice.
 */
const getInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customerId', 'name phone address');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found.', 404);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
    );

    await generateInvoicePDF(invoice, res);
  } catch (error) {
    next(error);
  }
};

module.exports = { createInvoice, listInvoices, getInvoice, getInvoicePDF };
