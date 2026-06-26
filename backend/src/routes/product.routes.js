const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const {
  listProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
  generateBarcode,
} = require('../controllers/product.controller');

// All product management routes require staff/admin role
router.use(authenticate, requireRole(['staff', 'admin']));

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Product created
 */
// GET /api/products — List products
router.get('/', listProducts);

// POST /api/products — Create a product
router.post('/', createProduct);

/**
 * @swagger
 * /products/barcode/{code}:
 *   get:
 *     summary: Lookup product by barcode
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
// GET /api/products/barcode/:code — Lookup product by barcode
// Must be BEFORE /:id to avoid treating "barcode" as an ID
router.get('/barcode/:code', getProductByBarcode);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get single product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *   patch:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Soft-delete product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */
// GET /api/products/:id — Get single product
router.get('/:id', getProduct);

// PATCH /api/products/:id — Update product
router.patch('/:id', updateProduct);

// DELETE /api/products/:id — Soft-delete product
router.delete('/:id', deleteProduct);

/**
 * @swagger
 * /products/{id}/generate-barcode:
 *   post:
 *     summary: Generate internal barcode
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Barcode generated
 */
// POST /api/products/:id/generate-barcode — Generate internal barcode
router.post('/:id/generate-barcode', generateBarcode);

module.exports = router;
