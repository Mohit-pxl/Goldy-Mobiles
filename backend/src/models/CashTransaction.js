const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['cash_sale', 'bank_sale', 'cash_expense', 'bank_deposit', 'manual_adjustment'],
    required: true
  },
  amount: { type: Number, required: true },
  refInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  refExpenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
