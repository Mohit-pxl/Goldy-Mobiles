const jwt = require('jsonwebtoken');

/**
 * Generates a JWT for the given user.
 * @param {Object} user - Mongoose user document
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY || '30d',
    }
  );
};

module.exports = { generateToken };
