const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { paginate } = require('../utils/pagination');

// Fields to ALWAYS exclude from public catalog responses
const CATALOG_EXCLUDE = '-costPrice -createdBy -__v';

/**
 * GET /api/catalog/products
 * Public product listing with search, category, brand, price filters.
 * NEVER returns costPrice or createdBy.
 */
const listCatalogProducts = async (req, res, next) => {
  try {
    const { search, category, brand, minPrice, maxPrice } = req.query;
    const { skip, limit, buildMeta } = paginate(req.query);

    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
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

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(CATALOG_EXCLUDE)
        .populate('categoryId', 'name slug imageUrl')
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
 * GET /api/catalog/products/:id
 * Public single product. NEVER returns costPrice or createdBy.
 */
const getCatalogProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .select(CATALOG_EXCLUDE)
      .populate('categoryId', 'name slug imageUrl');

    if (!product) {
      return errorResponse(res, 'Product not found.', 404);
    }

    return successResponse(res, product);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/catalog/categories
 * Public list of all categories.
 */
const listCatalogCategories = async (req, res, next) => {
  try {
    const categories = await Category.find()
      .select('-__v')
      .sort({ name: 1 });

    return successResponse(res, categories);
  } catch (error) {
    next(error);
  }
};

module.exports = { listCatalogProducts, getCatalogProduct, listCatalogCategories };
