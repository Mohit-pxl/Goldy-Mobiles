const PDFDocument = require('pdfkit');

/**
 * Generates a PDF invoice and writes it to the given writable stream.
 * @param {Object} invoice - The populated invoice document
 * @param {import('stream').Writable} stream - Writable stream (e.g. res)
 * @returns {Promise<void>}
 */
const generateInvoicePDF = (invoice, stream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.pipe(stream);

    // --- Header ---
    doc.fontSize(22).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Goldy Mobiles', { align: 'center' })
      .text('Electronics & Mobile Shop', { align: 'center' });
    doc.moveDown(1);

    // --- Invoice Info ---
    const infoTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').text('Invoice Number:', 50, infoTop);
    doc.font('Helvetica').text(invoice.invoiceNumber, 160, infoTop);

    doc.font('Helvetica-Bold').text('Date:', 50, infoTop + 18);
    doc
      .font('Helvetica')
      .text(
        new Date(invoice.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        160,
        infoTop + 18
      );

    doc.font('Helvetica-Bold').text('Payment:', 50, infoTop + 36);
    doc.font('Helvetica').text(invoice.paymentMode.toUpperCase(), 160, infoTop + 36);

    // Customer info on the right
    if (invoice.customerName) {
      doc.font('Helvetica-Bold').text('Customer:', 350, infoTop);
      doc.font('Helvetica').text(invoice.customerName, 420, infoTop);
    }
    if (invoice.customerPhone) {
      doc.font('Helvetica-Bold').text('Phone:', 350, infoTop + 18);
      doc.font('Helvetica').text(invoice.customerPhone, 420, infoTop + 18);
    }

    doc.moveDown(4);

    // --- Items Table ---
    const tableTop = doc.y;
    const col = { num: 50, name: 80, qty: 300, price: 360, gst: 420, total: 480 };

    // Table header
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('#', col.num, tableTop);
    doc.text('Item', col.name, tableTop);
    doc.text('Qty', col.qty, tableTop);
    doc.text('Price', col.price, tableTop);
    doc.text('GST%', col.gst, tableTop);
    doc.text('Total', col.total, tableTop);

    // Header line
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(560, tableTop + 15)
      .stroke();

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let y = tableTop + 22;

    invoice.items.forEach((item, i) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.text(i + 1, col.num, y);
      doc.text(item.name, col.name, y, { width: 210 });
      doc.text(item.quantity.toString(), col.qty, y);
      doc.text(`₹${item.unitPrice.toFixed(2)}`, col.price, y);
      doc.text(`${item.gstPercent || 0}%`, col.gst, y);
      doc.text(`₹${item.total.toFixed(2)}`, col.total, y);
      y += 20;
    });

    // Bottom line
    doc.moveTo(50, y).lineTo(560, y).stroke();
    y += 10;

    // --- Totals ---
    const totalsX = 380;
    doc.font('Helvetica').fontSize(10);

    doc.text('Subtotal:', totalsX, y);
    doc.text(`₹${invoice.subtotal.toFixed(2)}`, col.total, y);
    y += 18;

    if (invoice.discount > 0) {
      doc.text('Discount:', totalsX, y);
      doc.text(`-₹${invoice.discount.toFixed(2)}`, col.total, y);
      y += 18;
    }

    if (invoice.cgst > 0) {
      doc.text('CGST:', totalsX, y);
      doc.text(`₹${invoice.cgst.toFixed(2)}`, col.total, y);
      y += 18;
    }

    if (invoice.sgst > 0) {
      doc.text('SGST:', totalsX, y);
      doc.text(`₹${invoice.sgst.toFixed(2)}`, col.total, y);
      y += 18;
    }

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total:', totalsX, y);
    doc.text(`₹${invoice.totalAmount.toFixed(2)}`, col.total, y);
    y += 22;

    doc.font('Helvetica').fontSize(10);
    doc.text('Paid:', totalsX, y);
    doc.text(`₹${invoice.paidAmount.toFixed(2)}`, col.total, y);
    y += 18;

    if (invoice.dueAmount > 0) {
      doc.fillColor('red').font('Helvetica-Bold');
      doc.text('Due:', totalsX, y);
      doc.text(`₹${invoice.dueAmount.toFixed(2)}`, col.total, y);
      doc.fillColor('black').font('Helvetica');
    }

    // --- Footer ---
    doc
      .fontSize(8)
      .text('Thank you for your business!', 50, 750, { align: 'center', width: 510 });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

module.exports = { generateInvoicePDF };
