const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateToken } = require('../utils/generateToken');
const { generateOTPCode, sendOTPEmail } = require('../utils/email');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ── Rate limiting constants ───────────────────────────────────────────────────
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * POST /api/auth/send-otp
 * Send a 6-digit verification code to the provided email address.
 */
const sendOTP = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { email } = req.body;

      // Check if there's a recent OTP that hasn't expired (rate limiting)
      const recentOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });
      if (recentOTP) {
        const secondsSinceCreated = (Date.now() - recentOTP.createdAt.getTime()) / 1000;
        if (secondsSinceCreated < RESEND_COOLDOWN_SECONDS) {
          const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceCreated);
          return errorResponse(
            res,
            `Please wait ${waitSeconds} seconds before requesting a new code.`,
            429
          );
        }
      }

      // Delete any old OTPs for this email
      await OTP.deleteMany({ email });

      // Generate new OTP
      const code = generateOTPCode();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      // FOR LOCAL TESTING: Print the code to the console
      console.log(`\n===========================================`);
      console.log(`[DEVELOPMENT] OTP for ${email}: ${code}`);
      console.log(`===========================================\n`);

      await OTP.create({ email, code, expiresAt });

      let delivery = 'sent';
      const responsePayload = {
        message: 'Verification code sent to your email.',
        expiresInMinutes: OTP_EXPIRY_MINUTES,
        delivery,
      };

      try {
        await sendOTPEmail(email, code);
      } catch (emailErr) {
        console.error('Failed to send OTP email via SMTP:', emailErr.message);
        console.log('You can still use the code printed above to log in.');

        if (process.env.NODE_ENV === 'production') {
          await OTP.deleteMany({ email });
          return errorResponse(
            res,
            'Could not send verification email. Please contact support.',
            502
          );
        }

        responsePayload.delivery = 'dev-fallback';
        responsePayload.message = 'Email delivery failed. Use the development code shown below.';
        responsePayload.devCode = code;
      }

      return successResponse(res, responsePayload);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * POST /api/auth/verify-otp
 * Verify the OTP code and login/register the user.
 */
const verifyOTP = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('code')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('Code must be 6 digits')
    .isNumeric()
    .withMessage('Code must be numeric'),
  body('otp')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must be numeric'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { email } = req.body;
      const code = req.body.code || req.body.otp;

      if (!code) {
        return errorResponse(res, 'Verification code is required.', 400);
      }

      // Find the OTP record
      const otpRecord = await OTP.findOne({ email });

      if (!otpRecord) {
        return errorResponse(res, 'No verification code found. Please request a new one.', 400);
      }

      // Check if expired
      if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteMany({ email });
        return errorResponse(res, 'Verification code has expired. Please request a new one.', 400);
      }

      // Check max attempts
      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        await OTP.deleteMany({ email });
        return errorResponse(
          res,
          'Too many incorrect attempts. Please request a new code.',
          429
        );
      }

      // Verify the code
      if (otpRecord.code !== code) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        const remaining = MAX_OTP_ATTEMPTS - otpRecord.attempts;
        return errorResponse(
          res,
          `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          400
        );
      }

      // Code is correct — delete OTP record
      await OTP.deleteMany({ email });

      // Find or create user
      let user = await User.findOne({ email });

      if (!user) {
        // Create new user with default 'customer' role
        user = await User.create({
          email,
          name: email.split('@')[0],
          role: 'customer',
        });
      }

      if (!user.isActive) {
        return errorResponse(res, 'Account has been deactivated. Contact admin.', 403);
      }

      const token = generateToken(user);

      return successResponse(res, {
        token,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile (role + permissions).
 */
const getMe = async (req, res, next) => {
  try {
    return successResponse(res, {
      _id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      phone: req.user.phone,
      avatarUrl: req.user.avatarUrl,
      role: req.user.role,
      permissions: req.user.permissions,
      isActive: req.user.isActive,
      expoPushToken: req.user.expoPushToken,
      createdAt: req.user.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/auth/push-token
 * Updates the current user's Expo push token.
 */
const updatePushToken = [
  body('expoPushToken').notEmpty().withMessage('expoPushToken is required'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      req.user.expoPushToken = req.body.expoPushToken;
      await req.user.save();

      return successResponse(res, { message: 'Push token updated.' });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * POST /api/auth/register
 * Register a new user with password.
 */
const register = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('phone').optional().trim(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { name, phone, email, password } = req.body;

      let user = await User.findOne({ email });
      if (user) {
        return errorResponse(res, 'Email already in use.', 400);
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = await User.create({
        name,
        phone,
        email,
        password: hashedPassword,
        role: 'customer',
      });

      const token = generateToken(user);

      return successResponse(res, {
        token,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * POST /api/auth/login
 * Login with email and password.
 */
const login = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return errorResponse(res, 'Invalid credentials.', 401);
      }

      if (!user.isActive) {
        return errorResponse(res, 'Account has been deactivated. Contact admin.', 403);
      }

      if (!user.password) {
        return errorResponse(res, 'Please use OTP to login or reset your password.', 401);
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return errorResponse(res, 'Invalid credentials.', 401);
      }

      const token = generateToken(user);

      return successResponse(res, {
        token,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * POST /api/auth/forgot-password/reset
 * Reset password using OTP
 */
const resetPassword = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits').isNumeric(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { email, otp, password } = req.body;

      // Find the OTP record
      const otpRecord = await OTP.findOne({ email });

      if (!otpRecord) {
        return errorResponse(res, 'No verification code found. Please request a new one.', 400);
      }

      if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteMany({ email });
        return errorResponse(res, 'Verification code has expired. Please request a new one.', 400);
      }

      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        await OTP.deleteMany({ email });
        return errorResponse(res, 'Too many incorrect attempts. Please request a new code.', 429);
      }

      if (otpRecord.code !== otp) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        const remaining = MAX_OTP_ATTEMPTS - otpRecord.attempts;
        return errorResponse(res, `Incorrect code. ${remaining} attempts remaining.`, 400);
      }

      await OTP.deleteMany({ email });

      let user = await User.findOne({ email });
      if (!user) {
        return errorResponse(res, 'User not found.', 404);
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();

      return successResponse(res, { message: 'Password reset successfully.' });
    } catch (error) {
      next(error);
    }
  },
];

module.exports = { sendOTP, verifyOTP, getMe, updatePushToken, register, login, resetPassword };
