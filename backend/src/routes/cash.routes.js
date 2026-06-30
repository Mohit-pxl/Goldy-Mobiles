const router = require('express').Router();
const { depositToBank, adjustCash, getSummary, getTransactions } = require('../controllers/cash.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permission.middleware');

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/transactions', getTransactions);
router.post('/deposit', depositToBank);
router.post('/adjust', requireRole(['admin']), adjustCash);

module.exports = router;
