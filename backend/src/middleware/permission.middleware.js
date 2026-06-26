const { errorResponse } = require('../utils/apiResponse');

/**
 * Role-based access control middleware factory.
 * @param {string[]} roles - Allowed roles (e.g. ['admin', 'staff'])
 * @returns {Function} Express middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Required role: ${roles.join(' or ')}.`,
        403
      );
    }
    next();
  };
};

/**
 * Fine-grained permission check middleware factory.
 * @param {string} permission - Permission key from user.permissions (e.g. 'canViewReports')
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', 401);
    }

    // Admins always have all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions[permission]) {
      return errorResponse(
        res,
        `Access denied. Missing permission: ${permission}.`,
        403
      );
    }
    next();
  };
};

module.exports = { requireRole, requirePermission };
