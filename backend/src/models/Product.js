const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    category: {
      type: String,
      trim: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    variant: {
      type: String,
      trim: true,
    },
    availableColors: {
      type: [String],
      default: [],
    },
    trackingType: {
      type: String,
      enum: ['IMEI', 'SERIAL', 'QUANTITY'],
      default: 'QUANTITY',
    },
    specifications: [
      {
        key: String,
        value: String,
      }
    ],
    description: {
      type: String,
      trim: true,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    internalCode: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    gstPercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    trackImei: {
      type: Boolean,
      default: false,
    },
    trackSerial: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for search and filtering
productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ categoryId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ sellingPrice: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ internalCode: 1 });

productSchema.pre('validate', function syncTrackingFlags(next) {
  if (this.trackingType) {
    this.trackImei = this.trackingType === 'IMEI';
    this.trackSerial = this.trackingType === 'SERIAL';
  } else if (this.trackImei) {
    this.trackingType = 'IMEI';
  } else if (this.trackSerial) {
    this.trackingType = 'SERIAL';
  } else {
    this.trackingType = 'QUANTITY';
  }

  if (!this.sku && this.internalCode) this.sku = this.internalCode;
  if (!this.internalCode && this.sku) this.internalCode = this.sku;
  next();
});

module.exports = mongoose.model('Product', productSchema);
