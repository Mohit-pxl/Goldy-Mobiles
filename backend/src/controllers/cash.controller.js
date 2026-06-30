const mongoose = require('mongoose');
const CashTransaction = require('../models/CashTransaction');
const { calculateCashInHand, calculateBankBalance } = require('../services/cash.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { paginate } = require('../utils/pagination');

exports.depositToBank = async (req, res) => {
  const { amount, note, bankAccountLabel } = req.body;

  try {
    // Check sufficient cash in hand before allowing deposit
    const cashInHand = await calculateCashInHand();
    if (amount > cashInHand) {
      throw new Error(`Cannot deposit more than available cash (₹${cashInHand})`);
    }

    // Cash leaves the drawer
    await CashTransaction.create({
      type: 'bank_deposit',
      amount: -Math.abs(amount),
      note: note || `Deposited to ${bankAccountLabel || 'bank'}`,
      createdBy: req.user._id
    });

    // Same amount enters the bank side
    await CashTransaction.create({
      type: 'bank_sale',  // reuse bank_sale type for "money entering account"
      amount: Math.abs(amount),
      note: note || `Deposit from cash drawer`,
      createdBy: req.user._id
    });

    res.json({ success: true, message: 'Deposit recorded' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.adjustCash = async (req, res) => {
  const { amount, note } = req.body;
  // amount can be positive (found extra cash) or negative (missing cash)
  try {
    await CashTransaction.create({
      type: 'manual_adjustment',
      amount,
      note: note || 'Manual till adjustment',
      createdBy: req.user._id
    });
    res.json({ success: true, message: 'Adjustment recorded' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const cashInHand = await calculateCashInHand();
    const bankBalance = await calculateBankBalance();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayTx = await CashTransaction.find({
      createdAt: { $gte: startOfToday }
    });

    const todayBreakdown = {
      cashSales: todayTx.filter(t => t.type === 'cash_sale')
                         .reduce((sum, t) => sum + t.amount, 0),
      bankSales: todayTx.filter(t => t.type === 'bank_sale')
                         .reduce((sum, t) => sum + t.amount, 0),
      cashExpenses: Math.abs(todayTx.filter(t => t.type === 'cash_expense')
                         .reduce((sum, t) => sum + t.amount, 0))
    };

    res.json({
      success: true,
      data: { cashInHand, bankBalance, todayBreakdown }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const { skip, limit, buildMeta } = paginate(req.query);

    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const [transactions, total] = await Promise.all([
      CashTransaction.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CashTransaction.countDocuments(filter),
    ]);

    return successResponse(res, transactions, 200, buildMeta(total));
  } catch (error) {
    next(error);
  }
};
