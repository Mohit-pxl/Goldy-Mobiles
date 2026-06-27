const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');
const {
  listUsers,
  listStaff,
  updateUserRole,
  deactivateUser,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller');

// Most user management routes require admin role, but viewing users is allowed for staff
router.use(authenticate);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
// GET /api/users — List all users (accessible by staff & admin)
router.get('/', requireRole(['staff', 'admin']), listUsers);

/**
 * @swagger
 * /users/staff:
 *   get:
 *     summary: List staff/admin accounts
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of staff members
 */
// GET /api/users/staff — List staff/admin accounts
router.get('/staff', requireRole(['staff', 'admin']), listStaff);

/**
 * @swagger
 * /users/{id}/role:
 *   patch:
 *     summary: Change user role and permissions
 *     tags: [Users]
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
 *         description: User role updated
 */
// PATCH /api/users/:id/role — Change user role + permissions
router.patch('/:id/role', requireRole(['staff', 'admin']), updateUserRole);

/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user
 *     tags: [Users]
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
 *         description: User deactivated
 */
// PATCH /api/users/:id/deactivate — Deactivate a user
router.patch('/:id/deactivate', requireRole(['staff', 'admin']), deactivateUser);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update a user
 *     tags: [Users]
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
 *         description: User updated
 */
// PATCH /api/users/:id — Update user details
router.patch('/:id', requireRole(['staff', 'admin']), updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
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
 *         description: User deleted
 */
// DELETE /api/users/:id — Delete user
router.delete('/:id', requireRole(['staff', 'admin']), deleteUser); 

module.exports = router;
