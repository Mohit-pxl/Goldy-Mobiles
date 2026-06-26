const router = require('express').Router();
const {
  listCatalogProducts,
  getCatalogProduct,
  listCatalogCategories,
} = require('../controllers/catalog.controller');

// Public routes — no authentication required

/**
 * @swagger
 * /catalog/products:
 *   get:
 *     summary: Browse products
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of catalog products
 */
// GET /api/catalog/products — Browse products
router.get('/products', listCatalogProducts);

/**
 * @swagger
 * /catalog/products/{id}:
 *   get:
 *     summary: Product detail
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
// GET /api/catalog/products/:id — Product detail
router.get('/products/:id', getCatalogProduct);

/**
 * @swagger
 * /catalog/categories:
 *   get:
 *     summary: List categories
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of product categories
 */
// GET /api/catalog/categories — List categories
router.get('/categories', listCatalogCategories);

module.exports = router;
