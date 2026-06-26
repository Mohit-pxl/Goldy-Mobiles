const { body, validationResult } = require('express-validator');
const { generatePresignedUploadUrl } = require('../services/s3.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * POST /api/uploads/presign
 * Generates a presigned S3 upload URL. Staff/admin only.
 */
const getPresignedUrl = [
  body('fileType')
    .notEmpty()
    .withMessage('fileType is required')
    .matches(/^image\/(jpeg|png|webp|gif)$/)
    .withMessage('fileType must be a valid image MIME type (jpeg, png, webp, gif)'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed.', 400, errors.array());
      }

      const { fileType } = req.body;
      const result = await generatePresignedUploadUrl(fileType);

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  },
];

module.exports = { getPresignedUrl };
