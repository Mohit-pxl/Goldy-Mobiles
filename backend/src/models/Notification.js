const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // optional if sending to all admins, or we can resolve it
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    roleTarget: {
      type: String, // e.g., 'admin', 'customer', 'staff'
      enum: ['admin', 'staff', 'customer'],
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'system', // 'due_alert', 'system'
    },
    link: {
      type: String, // e.g. frontend route to open
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
