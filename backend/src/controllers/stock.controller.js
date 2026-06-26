const { body, param, validationResult } = require('express-validator');
const StockMovement = require('../models/StockMovement');
const { createStockMovement } = require('../services/stock.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { paginate } = require('../utils/pagination');

/**
 * POST /api/stock/movement
 * Create a manual stock movement (in/out/adjustment). Staff/admin only.
 */
const createMovement = [
  body('productId').isMongoId().withMessage('Valid productId is required'),
  body('type')
    .isIn(['in', 'out', 'adjustment'])
    .withMessage('type must be in, out, or adjustment'),
  body('qty').isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
  body('note').optional().trim(),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { productId, type, qty, note } = req.body;

      const movement = await createStockMovement({
        productId,
        type,
        quantity: qty,
        reason: note,
        createdBy: req.user._id,
      });

      const m = movement.toObject ? movement.toObject() : movement;
      m.qty = m.quantity; m.quantity = undefined;
      m.note = m.reason; m.reason = undefined;
      m.staff = m.createdBy; m.createdBy = undefined;

      return successResponse(res, m, 201);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode);
      }
      next(error);
    }
  },
];

/**
 * GET /api/stock/movements/:productId
 * List stock movements for a specific product.
 */
const getMovements = [
  param('productId').isMongoId().withMessage('Valid productId is required'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { skip, limit, buildMeta } = paginate(req.query);
      const { productId } = req.params;

      const [movements, total] = await Promise.all([
        StockMovement.find({ productId })
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        StockMovement.countDocuments({ productId }),
      ]);

      const formatted = movements.map(mov => {
        const m = mov.toObject();
        m.qty = m.quantity; m.quantity = undefined;
        m.note = m.reason; m.reason = undefined;
        m.staff = m.createdBy; m.createdBy = undefined;
        return m;
      });

      return successResponse(res, formatted, 200, buildMeta(total));
    } catch (error) {
      next(error);
    }
  },
];

module.exports = { createMovement, getMovements };
