const { body, validationResult } = require('express-validator');
const Inquiry = require('../models/Inquiry');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * POST /api/inquiries
 * Create a product inquiry. Open to guests; if authenticated, attaches customerUserId.
 */
const createInquiry = [
  body('productId').isMongoId().withMessage('Valid productId is required'),
  body('customerPhone')
    .optional()
    .isMobilePhone()
    .withMessage('customerPhone must be a valid phone number'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { productId, customerPhone } = req.body;

      const inquiry = await Inquiry.create({
        productId,
        customerUserId: req.user ? req.user._id : undefined,
        customerPhone,
      });

      return successResponse(res, inquiry, 201);
    } catch (error) {
      next(error);
    }
  },
];

const listInquiries = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.userId === 'me' && req.user) {
      filter.customerUserId = req.user._id;
    } else if (req.query.userId) {
      filter.customerUserId = req.query.userId;
    }

    const inquiries = await Inquiry.find(filter)
      .populate('productId', 'name brand category sellingPrice')
      .sort({ createdAt: -1 });

    const formatted = inquiries.map(inq => {
      const i = inq.toObject();
      i.product = i.productId;
      i.productId = undefined;
      return i;
    });

    return successResponse(res, formatted);
  } catch (error) {
    next(error);
  }
};

module.exports = { createInquiry, listInquiries };
