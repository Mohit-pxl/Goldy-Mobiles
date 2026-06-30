const CashTransaction = require('../models/CashTransaction');

async function calculateCashInHand(session = null) {
  const result = await CashTransaction.aggregate([
    {
      $match: {
        type: { $in: ['cash_sale', 'cash_expense', 'bank_deposit', 'manual_adjustment'] }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).session(session);

  return result[0]?.total || 0;
}

async function calculateBankBalance() {
  const result = await CashTransaction.aggregate([
    { $match: { type: 'bank_sale' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result[0]?.total || 0;
}

module.exports = { calculateCashInHand, calculateBankBalance };
