const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

/**
 * JWT authentication middleware.
 * Reads the Authorization header, verifies the token, and attaches the full
 * user document (with permissions) to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication required. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token has expired. Please login again.', 401);
      }
      return errorResponse(res, 'Invalid token.', 401);
    }

    const user = await User.findById(decoded.userId).select('-__v');

    if (!user) {
      return errorResponse(res, 'User not found.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account has been deactivated.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Authentication failed.', 500);
  }
};

/**
 * Optional authentication — same as authenticate but does not fail if no token is present.
 * Useful for endpoints that behave differently for logged-in vs guest users.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-__v');

    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Silently continue without authentication
  }
  next();
};

module.exports = { authenticate, optionalAuth };
