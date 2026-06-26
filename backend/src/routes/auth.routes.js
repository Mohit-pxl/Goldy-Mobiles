const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { sendOTP, verifyOTP, getMe, updatePushToken, register, login, resetPassword } = require('../controllers/auth.controller');

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP
 *     description: Sends a One-Time Password to the user's email for login/registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
// POST /api/auth/send-otp — Send verification code to email (used for forgot password too)
router.post('/send-otp', sendOTP);
router.post('/forgot-password/send-otp', sendOTP); // alias for clarity in frontend

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register with email and password
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Registered successfully
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged in successfully
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/forgot-password/verify-otp:
 *   post:
 *     summary: Verify OTP for forgot password
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: OTP verified
 */
// Actually, our verifyOTP logs you in. 
// The frontend might expect /forgot-password/verify-otp to just verify, but the resetPassword endpoint handles the actual reset.
// Let's add resetPassword
router.post('/forgot-password/reset', resetPassword);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP
 *     description: Verifies the OTP and returns an authentication token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: Successfully authenticated
 */
// POST /api/auth/verify-otp — Verify code and login/register
router.post('/verify-otp', verifyOTP);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get Current User
 *     description: Returns the currently authenticated user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Unauthorized
 */
// GET /api/auth/me — Get current user (protected)
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /auth/push-token:
 *   patch:
 *     summary: Update Push Token
 *     description: Updates the user's Expo push token for notifications
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pushToken
 *             properties:
 *               pushToken:
 *                 type: string
 *                 example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'
 *     responses:
 *       200:
 *         description: Push token updated successfully
 *       401:
 *         description: Unauthorized
 */
// PATCH /api/auth/push-token — Update Expo push token (protected)
router.patch('/push-token', authenticate, updatePushToken);

module.exports = router;
