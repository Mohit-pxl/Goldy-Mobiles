const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const role = req.user.role;
    
    // Admins get admin notifications, customers get their specific ones, staff get staff ones
    const filter = {};
    if (role === 'admin') {
       filter.roleTarget = 'admin';
    } else if (role === 'staff') {
       filter.roleTarget = 'staff';
    } else {
       filter.userId = req.user._id;
       filter.roleTarget = 'customer';
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
      
    return successResponse(res, notifications);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!notif) return errorResponse(res, 'Notification not found', 404);
    return successResponse(res, notif);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
};
