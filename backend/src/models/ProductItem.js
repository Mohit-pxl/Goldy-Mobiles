const mongoose = require('mongoose');

const productItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['IMEI', 'SERIAL'],
      required: true,
    },
    color: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['IN_STOCK', 'SOLD', 'RETURNED', 'DEFECTIVE'],
      default: 'IN_STOCK',
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productItemSchema.index({ productId: 1, status: 1 });
productItemSchema.index({ code: 1 });
productItemSchema.index({ type: 1, code: 1 });

module.exports = mongoose.model('ProductItem', productItemSchema);
