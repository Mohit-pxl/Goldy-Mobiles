const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');

/**
 * Creates a stock movement and updates product stock.
 * Checks low-stock threshold after adjustment and sends notifications if needed.
 *
 * @param {Object} params
 * @param {string} params.productId - Product ObjectId
 * @param {'in'|'out'|'adjustment'} params.type - Movement type
 * @param {number} params.quantity - Positive number; for 'out', stock is decremented
 * @param {string} [params.reason] - Reason for the movement
 * @param {string} [params.refInvoiceId] - Related invoice ID
 * @param {string} params.createdBy - User ID
 * @returns {Promise<Object>} The created StockMovement document
 */
const createStockMovement = async ({
  productId,
  type,
  quantity,
  reason,
  refInvoiceId,
  createdBy,
}) => {
  try {

    // Determine stock change
    let stockDelta;
    if (type === 'in') {
      stockDelta = Math.abs(quantity);
    } else if (type === 'out') {
      stockDelta = -Math.abs(quantity);
    } else {
      // adjustment — quantity can be positive (add) or negative (remove)
      stockDelta = quantity;
    }

    // Update product stock
    const product = await Product.findById(productId);
    if (!product) {
      throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
    }

    const newStock = product.stock + stockDelta;
    if (newStock < 0) {
      throw Object.assign(
        new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${Math.abs(quantity)}`
        ),
        { statusCode: 400 }
      );
    }

    product.stock = newStock;
    await product.save();

    // Create movement record
    const [movement] = await StockMovement.create(
      [
        {
          productId,
          type,
          quantity: Math.abs(quantity),
          reason,
          refInvoiceId,
          createdBy,
        },
      ]
    );

    // Check low-stock threshold (fire-and-forget, outside transaction)
    if (product.stock <= product.lowStockThreshold) {
      notificationService
        .sendLowStockAlert(product)
        .catch((err) => logger.error('Low-stock notification failed:', err));
    }

    return movement;
  } catch (error) {
    throw error;
  }
};

module.exports = { createStockMovement };
