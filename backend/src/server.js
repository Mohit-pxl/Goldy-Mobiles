require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const cron = require('node-cron');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB and start server ──────────────────────────────────────
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
