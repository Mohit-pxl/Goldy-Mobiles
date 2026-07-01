const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const User = require('../models/User'); // Assuming customers are also in User if they use the app
const logger = require('../utils/logger');

// Run every day at 9:00 AM
const startDueNotificationsJob = () => {
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running due notifications job...');
    try {
      // Find tomorrow's start and end
      const tomorrowStart = new Date();
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Find unpaid invoices due tomorrow
      const dueInvoices = await Invoice.find({
        paymentStatus: 'unpaid',
        dueAmount: { $gt: 0 },
        dueDate: {
          $gte: tomorrowStart,
          $lte: tomorrowEnd,
        },
      }).populate('customerId');

      for (const invoice of dueInvoices) {
        // Customer Notification
        let customerUserId = null;
        
        // Find if customer exists as a user in the system to send in-app notification
        // The user phone might be mapped to a user account
        if (invoice.customerPhone) {
           const user = await User.findOne({ phone: invoice.customerPhone, role: 'customer' });
           if (user) {
             customerUserId = user._id;
           }
        }

        if (customerUserId) {
          await Notification.create({
            userId: customerUserId,
            title: 'Bill Due Tomorrow',
            message: `Your bill ${invoice.invoiceNumber} for ₹${invoice.dueAmount} is due tomorrow.`,
            roleTarget: 'customer',
            type: 'due_alert',
          });
        }

        // Admin Notification
        await Notification.create({
          title: 'Customer Bill Due Tomorrow',
          message: `Customer ${invoice.customerName} (${invoice.customerPhone}) has a due amount of ₹${invoice.dueAmount} for bill ${invoice.invoiceNumber} due tomorrow.`,
          roleTarget: 'admin',
          type: 'due_alert',
        });
      }
      logger.info(`Due notifications job completed. Sent alerts for ${dueInvoices.length} invoices.`);
    } catch (error) {
      logger.error('Error running due notifications job:', error);
    }
  });
};

module.exports = startDueNotificationsJob;
