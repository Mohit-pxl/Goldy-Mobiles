const Settings = require('../models/Settings');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    return successResponse(res, settings);
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    return successResponse(res, settings);
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings };
