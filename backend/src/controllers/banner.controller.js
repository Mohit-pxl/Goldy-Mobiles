const Banner = require('../models/Banner');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const listBanners = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.isActive !== 'false') {
       filter.isActive = true;
    }
    const banners = await Banner.find(filter).sort({ order: 1, createdAt: -1 });
    return successResponse(res, banners);
  } catch (error) {
    next(error);
  }
};

const createBanner = async (req, res, next) => {
  try {
    const banner = await Banner.create(req.body);
    return successResponse(res, banner, 201);
  } catch (error) {
    next(error);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return errorResponse(res, 'Banner not found', 404);
    return successResponse(res, { message: 'Banner deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listBanners, createBanner, deleteBanner };
