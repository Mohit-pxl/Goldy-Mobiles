const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['payable', 'paid'],
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    ledger: {
      type: [ledgerEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
