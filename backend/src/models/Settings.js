const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: 'Goldy Mobiles' },
    address: { type: String, default: '123 Main St' },
    phone: { type: String, default: '1234567890' },
    email: { type: String, default: 'shop@example.com' },
    gstNumber: { type: String },
    termsAndConditions: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
