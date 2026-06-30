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
  body('items').optional().isArray().withMessage('items must be an array'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { productId, type, qty, note, identifiers, items } = req.body;
      const Product = require('../models/Product');
      const ProductItem = require('../models/ProductItem');

      console.log('[Stock] Received:', { productId, type, qty, itemsCount: items?.length, identifiersCount: identifiers?.length });

      const product = await Product.findById(productId);
      if (!product) return errorResponse(res, 'Product not found.', 404);

      const normalizedTrackingType = product.trackingType || (product.trackImei ? 'IMEI' : product.trackSerial ? 'SERIAL' : 'QUANTITY');
      const isTracked = normalizedTrackingType === 'IMEI' || normalizedTrackingType === 'SERIAL';
      
      console.log('[Stock] Product tracking:', { trackingType: normalizedTrackingType, isTracked, productName: product.name });

      const trackedItems = Array.isArray(items) && items.length > 0
        ? items.map((item) => ({
            code: String(item.code || '').trim(),
            color: item.color ? String(item.color).trim() : undefined,
          }))
        : (identifiers || []).map((code) => ({ code: String(code || '').trim() }));
      const cleanCodes = trackedItems.map((item) => item.code).filter(Boolean);

      if (isTracked && type === 'in') {
        if (cleanCodes.length !== qty) {
          return errorResponse(res, `This product requires exactly ${qty} ${normalizedTrackingType === 'IMEI' ? 'IMEIs' : 'Serial Numbers'}. Got ${cleanCodes.length}.`, 400);
        }

        const duplicateInRequest = cleanCodes.find((code, index) => cleanCodes.indexOf(code) !== index);
        if (duplicateInRequest) {
          return errorResponse(res, `Duplicate identifier in this stock entry: ${duplicateInRequest}`, 400);
        }
        
        // Ensure uniqueness before adding
        const existingItems = await ProductItem.find({ code: { $in: cleanCodes } });
        if (existingItems.length > 0) {
          const dups = existingItems.map(i => i.code).join(', ');
          return errorResponse(res, `Identifiers already exist in system: ${dups}`, 400);
        }
        
        const itemsToInsert = trackedItems.map(item => ({
          productId,
          code: item.code,
          color: item.color,
          type: normalizedTrackingType,
          status: 'IN_STOCK',
          addedBy: req.user._id
        }));
        await ProductItem.insertMany(itemsToInsert);
        console.log(`[Stock] Inserted ${itemsToInsert.length} ProductItem(s) for stock-in:`, cleanCodes);
      } else if (isTracked && type === 'out') {
        if (cleanCodes.length !== qty) {
          return errorResponse(res, `Manual out movements require exactly ${qty} ${normalizedTrackingType === 'IMEI' ? 'IMEIs' : 'Serial Numbers'}.`, 400);
        }
        const availableItems = await ProductItem.find({ productId, code: { $in: cleanCodes }, status: 'IN_STOCK' });
        if (availableItems.length !== qty) {
          return errorResponse(res, 'One or more identifiers are invalid or already sold.', 400);
        }
        await ProductItem.deleteMany(
          { productId, code: { $in: cleanCodes }, status: 'IN_STOCK' }
        );
        console.log(`[Stock] Deleted ${cleanCodes.length} ProductItem(s) from DB for stock-out:`, cleanCodes);
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
