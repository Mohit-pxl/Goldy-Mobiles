const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: ['customer', 'staff', 'admin'],
      default: 'customer',
    },
    permissions: {
      canViewCostPrice: { type: Boolean, default: false },
      canEditPrice: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canManageStaff: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
      select: false,
    },
    expoPushToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
