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
  body('identifiers').optional().isArray().withMessage('Identifiers must be an array'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { productId, type, qty, note, identifiers } = req.body;
      const Product = require('../models/Product');
      const ProductItem = require('../models/ProductItem');

      const product = await Product.findById(productId);
      if (!product) return errorResponse(res, 'Product not found.', 404);

      if ((product.trackImei || product.trackSerial) && type === 'in') {
        if (!identifiers || identifiers.length !== qty) {
          return errorResponse(res, `This product requires exactly ${qty} ${product.trackImei ? 'IMEIs' : 'Serial Numbers'}.`, 400);
        }
        
        // Ensure uniqueness before adding
        const existingItems = await ProductItem.find({ code: { $in: identifiers } });
        if (existingItems.length > 0) {
          const dups = existingItems.map(i => i.code).join(', ');
          return errorResponse(res, `Identifiers already exist in system: ${dups}`, 400);
        }
        
        const itemsToInsert = identifiers.map(code => ({
          productId,
          code,
          type: product.trackImei ? 'IMEI' : 'SERIAL',
          status: 'IN_STOCK',
          addedBy: req.user._id
        }));
        await ProductItem.insertMany(itemsToInsert);
      } else if ((product.trackImei || product.trackSerial) && type === 'out') {
        // Need to mark out specifically... this will be tricky for manual out, maybe limit it or require specific identifiers.
        // For now, if manual out, we might require identifiers, but let's just do it for 'in' as requested by the Add Stock screen.
        if (identifiers && identifiers.length === qty) {
          await ProductItem.updateMany({ code: { $in: identifiers } }, { $set: { status: 'RETURNED' } });
        }
      }

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
