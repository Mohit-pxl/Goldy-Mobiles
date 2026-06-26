const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * GET /api/reports/sales
 * Sales report for daily or monthly range.
 */
const salesReport = async (req, res, next) => {
  try {
    const { range } = req.query;
    const now = new Date();
    let startDate;

    if (range === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const invoices = await Invoice.find({ createdAt: { $gte: startDate } });

    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalDue = invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
    const totalDiscount = invoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);

    // Payment mode breakdown
    const byPaymentMode = {};
    for (const inv of invoices) {
      if (!byPaymentMode[inv.paymentMode]) {
        byPaymentMode[inv.paymentMode] = { count: 0, total: 0 };
      }
      byPaymentMode[inv.paymentMode].count++;
      byPaymentMode[inv.paymentMode].total += inv.totalAmount;
    }

    return successResponse(res, {
      range: range || 'monthly',
      startDate,
      endDate: now,
      invoiceCount: invoices.length,
      totalSales,
      totalPaid,
      totalDue,
      totalDiscount,
      byPaymentMode,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/low-stock
 * Products below their low-stock threshold.
 */
const lowStockReport = async (req, res, next) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    })
      .select('name brand stock lowStockThreshold barcode')
      .sort({ stock: 1 });

    return successResponse(res, products);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/top-products
 * Top-selling products by quantity sold.
 */
const topProductsReport = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const { range } = req.query;
    const now = new Date();
    let startDate;

    if (range === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const topProducts = await Invoice.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          productName: { $first: '$items.name' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
    ]);

    return successResponse(res, topProducts);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/profit-loss
 * Profit/loss report: sales revenue - COGS - expenses for the period.
 */
const profitLossReport = async (req, res, next) => {
  try {
    const { range } = req.query;
    const now = new Date();
    let startDate;

    if (range === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Calculate revenue and COGS from invoices
    const invoices = await Invoice.find({ createdAt: { $gte: startDate } });

    let totalRevenue = 0;
    let totalCOGS = 0;

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        totalRevenue += item.total;

        // Get cost price for COGS calculation
        const product = await Product.findById(item.productId).select('costPrice');
        if (product) {
          totalCOGS += product.costPrice * item.quantity;
        }
      }
    }

    // Get total expenses
    const expenseResult = await Expense.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
        },
      },
    ]);

    const totalExpenses = expenseResult.length > 0 ? expenseResult[0].totalExpenses : 0;
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    return successResponse(res, {
      range: range || 'monthly',
      startDate,
      endDate: now,
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/sales/export
 * Export sales report as CSV or PDF.
 */
const exportSalesReport = async (req, res, next) => {
  try {
    const { format, range } = req.query;
    const now = new Date();
    let startDate;

    if (range === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const invoices = await Invoice.find({ createdAt: { $gte: startDate } })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // CSV export
      const { Parser } = require('json2csv');
      const fields = [
        { label: 'Invoice #', value: 'invoiceNumber' },
        { label: 'Date', value: (row) => new Date(row.createdAt).toLocaleDateString('en-IN') },
        { label: 'Customer', value: 'customerName' },
        { label: 'Phone', value: 'customerPhone' },
        { label: 'Items', value: (row) => row.items.length },
        { label: 'Subtotal', value: 'subtotal' },
        { label: 'Discount', value: 'discount' },
        { label: 'CGST', value: 'cgst' },
        { label: 'SGST', value: 'sgst' },
        { label: 'Total', value: 'totalAmount' },
        { label: 'Paid', value: 'paidAmount' },
        { label: 'Due', value: 'dueAmount' },
        { label: 'Payment Mode', value: 'paymentMode' },
        { label: 'Created By', value: (row) => row.createdBy?.name || 'N/A' },
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(invoices);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="sales-report-${range || 'monthly'}.csv"`
      );
      return res.send(csv);
    }

    // Default: PDF export
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sales-report-${range || 'monthly'}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(
      `Period: ${startDate.toLocaleDateString('en-IN')} to ${now.toLocaleDateString('en-IN')}`,
      { align: 'center' }
    );
    doc.moveDown(1);

    // Summary
    const totalSales = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalDue = invoices.reduce((s, i) => s + i.dueAmount, 0);

    doc.font('Helvetica-Bold').text(`Total Invoices: ${invoices.length}`);
    doc.text(`Total Sales: ₹${totalSales.toFixed(2)}`);
    doc.text(`Total Paid: ₹${totalPaid.toFixed(2)}`);
    doc.text(`Total Due: ₹${totalDue.toFixed(2)}`);
    doc.moveDown(1);

    // Table header
    const cols = { inv: 50, date: 150, cust: 240, total: 400, paid: 490, due: 570, mode: 650 };
    const tableTop = doc.y;

    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Invoice #', cols.inv, tableTop);
    doc.text('Date', cols.date, tableTop);
    doc.text('Customer', cols.cust, tableTop);
    doc.text('Total', cols.total, tableTop);
    doc.text('Paid', cols.paid, tableTop);
    doc.text('Due', cols.due, tableTop);
    doc.text('Mode', cols.mode, tableTop);

    doc.moveTo(50, tableTop + 12).lineTo(750, tableTop + 12).stroke();

    let y = tableTop + 18;
    doc.font('Helvetica').fontSize(8);

    for (const inv of invoices) {
      if (y > 520) {
        doc.addPage();
        y = 50;
      }

      doc.text(inv.invoiceNumber, cols.inv, y, { width: 95 });
      doc.text(new Date(inv.createdAt).toLocaleDateString('en-IN'), cols.date, y);
      doc.text(inv.customerName || 'Walk-in', cols.cust, y, { width: 150 });
      doc.text(`₹${inv.totalAmount.toFixed(2)}`, cols.total, y);
      doc.text(`₹${inv.paidAmount.toFixed(2)}`, cols.paid, y);
      doc.text(`₹${inv.dueAmount.toFixed(2)}`, cols.due, y);
      doc.text(inv.paymentMode, cols.mode, y);
      y += 15;
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  salesReport,
  lowStockReport,
  topProductsReport,
  profitLossReport,
  exportSalesReport,
};
