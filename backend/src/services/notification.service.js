const { Expo } = require('expo-server-sdk');
const User = require('../models/User');
const logger = require('../utils/logger');

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

/**
 * Sends an Expo push notification to all admin/staff users with a saved push token.
 * @param {string} title
 * @param {string} body
 * @param {Object} [data] - Optional data payload
 */
const sendToStaff = async (title, body, data = {}) => {
  try {
    const staffUsers = await User.find({
      role: { $in: ['admin', 'staff'] },
      isActive: true,
      expoPushToken: { $exists: true, $ne: null },
    }).select('expoPushToken');

    const messages = staffUsers
      .filter((u) => Expo.isExpoPushToken(u.expoPushToken))
      .map((u) => ({
        to: u.expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        logger.error('Expo push notification chunk error:', error);
      }
    }
  } catch (error) {
    logger.error('Failed to send staff notifications:', error);
  }
};

/**
 * Sends a low-stock alert for a product to all admin/staff users.
 * @param {Object} product - Product document
 */
const sendLowStockAlert = async (product) => {
  await sendToStaff(
    '⚠️ Low Stock Alert',
    `"${product.name}" is low on stock (${product.stock} remaining, threshold: ${product.lowStockThreshold}).`,
    { type: 'low_stock', productId: product._id.toString() }
  );
};

module.exports = { sendToStaff, sendLowStockAlert };
