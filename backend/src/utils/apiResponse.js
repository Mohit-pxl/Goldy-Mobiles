/**
 * Standardized API response helpers.
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} statusCode
 * @param {Object} meta - Optional pagination / extra metadata
 */
const successResponse = (res, data, statusCode = 200, meta = undefined) => {
  const response = { success: true, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {Array} errors - Optional validation error details
 */
const errorResponse = (res, message, statusCode = 500, errors = undefined) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = { successResponse, errorResponse };
