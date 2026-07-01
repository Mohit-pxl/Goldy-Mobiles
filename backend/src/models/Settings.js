const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: 'Goldy Mobiles' },
    address: {
      street: { type: String, default: '123 Main St' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pin: { type: String, default: '' },
    },
    phone: { type: String, default: '1234567890' },
    email: { type: String, default: 'shop@example.com' },
    gstNumber: { type: String },
    panNumber: { type: String },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
    },
    termsAndConditions: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
