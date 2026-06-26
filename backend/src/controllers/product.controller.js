const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const { nanoid } = require('nanoid');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { paginate } = require('../utils/pagination');

/**
 * GET /api/products
 * List products with search, filter, pagination. Staff/admin — includes costPrice based on permission.
 */
const listProducts = async (req, res, next) => {
  try {
    const { search, category, brand, minPrice, maxPrice, isActive, lowStock, summary } = req.query;
    const { skip, limit, buildMeta } = paginate(req.query);

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { barcode: search },
      ];
    }
    if (category) {
      if (mongoose.isValidObjectId(category)) {
        filter.categoryId = category;
      } else {
        filter.category = category;
      }
    }
    if (brand) filter.brand = { $regex: `^${brand}$`, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.sellingPrice = {};
      if (minPrice) filter.sellingPrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.sellingPrice.$lte = parseFloat(maxPrice);
    }
    if (typeof isActive !== 'undefined') {
      filter.isActive = isActive === 'true';
    }
    
    if (lowStock === 'true') {
      filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };
    }

    if (summary === 'true') {
      const [total, lowStockCount, productsList] = await Promise.all([
        Product.countDocuments(filter),
        Product.countDocuments({ ...filter, $expr: { $lte: ["$stock", "$lowStockThreshold"] } }),
        Product.find(filter).select('stock sellingPrice')
      ]);
      const stockValue = productsList.reduce((sum, p) => sum + (p.stock * p.sellingPrice), 0);
      return successResponse(res, { total, lowStock: lowStockCount, stockValue });
    }

    // Determine fields to exclude based on permission
    let selectExclude = '-__v';
    const canViewCost =
      req.user.role === 'admin' ||
      (req.user.permissions && req.user.permissions.canViewCostPrice);
    if (!canViewCost) {
      selectExclude += ' -costPrice';
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(selectExclude)
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    return successResponse(res, products, 200, buildMeta(total));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products
 * Create a new product. Staff/admin only.
 */
const createProduct = [
  body('name').notEmpty().trim().withMessage('Product name is required'),
  body('costPrice').isFloat({ min: 0 }).withMessage('costPrice must be a positive number'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('sellingPrice must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock must be a non-negative integer'),
  body('gstPercent').optional().isFloat({ min: 0 }).withMessage('gstPercent must be non-negative'),
  body('categoryId').optional().isMongoId().withMessage('Invalid categoryId'),
  body('images').optional().isArray().withMessage('images must be an array'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      // Check if barcode already exists
      if (req.body.barcode) {
        const existing = await Product.findOne({ barcode: req.body.barcode });
        if (existing) {
          return errorResponse(
            res,
            `Barcode "${req.body.barcode}" is already assigned to product "${existing.name}".`,
            409
          );
        }
      }

      // Validate categoryId exists
      if (req.body.categoryId) {
        const cat = await Category.findById(req.body.categoryId);
        if (!cat) {
          return errorResponse(res, 'Category not found.', 404);
        }
      }

      const product = await Product.create({
        ...req.body,
        createdBy: req.user._id,
      });

      return successResponse(res, product, 201);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * GET /api/products/:id
 * Get a single product. Strip costPrice based on permission.
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name slug')
      .populate('createdBy', 'name email');

    if (!product) {
      return errorResponse(res, 'Product not found.', 404);
    }

    const productObj = product.toObject();

    // Strip costPrice if user doesn't have permission
    const canViewCost =
      req.user.role === 'admin' ||
      (req.user.permissions && req.user.permissions.canViewCostPrice);
    if (!canViewCost) {
      delete productObj.costPrice;
    }

    return successResponse(res, productObj);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/products/:id
 * Update a product. Staff/admin only.
 */
const updateProduct = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('costPrice must be positive'),
  body('sellingPrice').optional().isFloat({ min: 0 }).withMessage('sellingPrice must be positive'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock must be non-negative'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      // Check price edit permission
      const isPriceUpdate =
        req.body.costPrice !== undefined ||
        req.body.sellingPrice !== undefined ||
        req.body.mrp !== undefined;
      if (isPriceUpdate) {
        const canEditPrice =
          req.user.role === 'admin' ||
          (req.user.permissions && req.user.permissions.canEditPrice);
        if (!canEditPrice) {
          return errorResponse(res, 'You do not have permission to edit prices.', 403);
        }
      }

      // Check barcode uniqueness
      if (req.body.barcode) {
        const existing = await Product.findOne({
          barcode: req.body.barcode,
          _id: { $ne: req.params.id },
        });
        if (existing) {
          return errorResponse(
            res,
            `Barcode "${req.body.barcode}" is already assigned to product "${existing.name}".`,
            409
          );
        }
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate('categoryId', 'name slug');

      if (!product) {
        return errorResponse(res, 'Product not found.', 404);
      }

      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * DELETE /api/products/:id
 * Soft-delete a product (set isActive to false).
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return errorResponse(res, 'Product not found.', 404);
    }

    return successResponse(res, { message: 'Product deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/barcode/:code
 * Lookup product by exact barcode match.
 */
const getProductByBarcode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const product = await Product.findOne({ barcode: code })
      .populate('categoryId', 'name slug');

    if (!product) {
      return errorResponse(
        res,
        `No product found with barcode "${code}". You can add it as a new product.`,
        404
      );
    }

    const productObj = product.toObject();

    // Strip costPrice if user doesn't have permission
    const canViewCost =
      req.user.role === 'admin' ||
      (req.user.permissions && req.user.permissions.canViewCostPrice);
    if (!canViewCost) {
      delete productObj.costPrice;
    }

    return successResponse(res, productObj);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products/:id/generate-barcode
 * Generate an internal barcode for products without a manufacturer barcode.
 */
const generateBarcode = [
  param('id').isMongoId().withMessage('Invalid product ID'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        return errorResponse(res, 'Product not found.', 404);
      }

      if (product.barcode) {
        return errorResponse(
          res,
          `Product already has a barcode: ${product.barcode}`,
          400
        );
      }

      // Generate unique internal barcode with prefix
      const code = `EL-${nanoid(10).toUpperCase()}`;
      product.barcode = code;
      await product.save();

      return successResponse(res, { barcode: code });
    } catch (error) {
      next(error);
    }
  },
];

module.exports = {
  listProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
  generateBarcode,
};
