const PDFDocument = require('pdfkit');
const Settings = require('../models/Settings');
const path = require('path');
const fs = require('fs');

const generateInvoicePDF = async (invoice, stream) => {
  let settings = await Settings.findOne();
  if (!settings) settings = { shopName: 'Goldy Mobiles', address: {}, bankDetails: {} };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.pipe(stream);

    // Modern formatting
    const fontNormal = 'Helvetica';
    const fontBold = 'Helvetica-Bold';
    const accentColor = '#3b82f6';
    const accentLight = '#eff6ff';
    const blackColor = '#0f172a';
    const grayColor = '#64748b';
    const lightBorder = '#e2e8f0';

    // 1. Paper Frame (rounded)
    doc.lineWidth(1);
    doc.roundedRect(15, 30, 565, 782, 10).strokeColor(lightBorder).stroke();

    // 2. Header Section
    const logoPath = path.join(__dirname, '../../../frontend/assets/logo.png');
    let headerY = 50;

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 35, headerY, { width: 50 });
    }

    // Shop Details
    doc.fillColor(accentColor).fontSize(20).font(fontBold).text(settings.shopName, 95, headerY);
    
    let addr = settings.address;
    let addrStr = `${addr?.street || ''} ${addr?.city || ''} ${addr?.state || ''} ${addr?.pin || ''}`.trim();
    if (!addrStr) addrStr = 'Vijay Nagar, Indore';
    
    doc.fillColor(grayColor).fontSize(10).font(fontNormal);
    doc.text(addrStr, 95, headerY + 24);
    
    const metas = [];
    if (settings.phone) metas.push(`Phone: ${settings.phone}`);
    if (settings.gstNumber) metas.push(`GSTIN: ${settings.gstNumber}`);
    if (settings.panNumber) metas.push(`PAN: ${settings.panNumber}`);
    
    if (metas.length) {
      doc.text(metas.join('    '), 95, headerY + 38);
    }

    // Invoice Info Box
    doc.fillColor(grayColor).fontSize(10).font(fontBold).text('INVOICE NO.', 440, headerY, { width: 120, align: 'right' });
    doc.fillColor(accentColor).fontSize(10).text(invoice.invoiceNumber, 440, headerY + 12, { width: 120, align: 'right' });
    
    doc.fillColor(grayColor).fontSize(10).text('DATE', 440, headerY + 34, { width: 120, align: 'right' });
    doc.fillColor(blackColor).fontSize(11).font(fontNormal).text(
      new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      440, headerY + 46, { width: 120, align: 'right' }
    );

    doc.moveTo(35, 130).lineTo(560, 130).strokeColor(lightBorder).stroke();

    // 3. Bill To
    const custName = invoice.customer?.name || invoice.customerName;
    const custPhone = invoice.customer?.phone || invoice.customerPhone;
    if (custName) {
      doc.fillColor(grayColor).fontSize(9).font(fontBold).text('BILLED TO:', 35, 145);
      doc.fillColor(blackColor).fontSize(12).text(custName, 35, 160);
      if (custPhone) {
         doc.fillColor(grayColor).fontSize(10).font(fontNormal).text(custPhone, 35, 176);
      }
    }

    // 4. Table Header
    const thY = 210;
    doc.roundedRect(35, thY, 525, 25, 4).fillAndStroke(accentLight, lightBorder);
    
    doc.fillColor(blackColor).font(fontBold).fontSize(10);
    const colX = [45, 75, 305, 375, 455, 560];
    
    doc.text('#', colX[0], thY + 7);
    doc.text('Item', colX[1], thY + 7);
    doc.text('Qty', colX[2], thY + 7, { width: 60, align: 'center' });
    doc.text('Rate', colX[3], thY + 7, { width: 70, align: 'right' });
    doc.text('Amount', colX[4], thY + 7, { width: colX[5]-colX[4]-10, align: 'right' });

    // 5. Table Items
    let y = thY + 25;
    doc.font(fontNormal).fontSize(10);
    
    invoice.items.forEach((item, i) => {
      if (y > 600) {
        // page break avoidance (assuming short invoices)
      }
      const qty = item.qty || item.quantity || 1;
      const sub = item.subtotal || item.total || 0;
      const price = item.price || item.unitPrice || 0;
      const gst = item.gstPercent || 18;

      doc.fillColor(blackColor);
      doc.text(i + 1, colX[0], y + 10);
      doc.text(item.name || (item.product ? item.product.name : 'Item'), colX[1], y + 10, { width: 190 });
      doc.fillColor(grayColor).fontSize(8).text(`GST ${gst}%`, colX[1], y + 22);
      
      doc.fillColor(blackColor).fontSize(10);
      doc.text(qty, colX[2], y + 10, { width: 60, align: 'center' });
      doc.text(price.toFixed(2), colX[3], y + 10, { width: 70, align: 'right' });
      doc.font(fontBold).text(sub.toFixed(2), colX[4], y + 10, { width: colX[5]-colX[4]-10, align: 'right' });
      doc.font(fontNormal);

      y += 35;
      doc.moveTo(35, y).lineTo(560, y).strokeColor(lightBorder).stroke();
    });

    // 6. Totals Container
    y += 10;
    doc.font(fontNormal);
    
    const totalsLeft = 335;
    const totalsRight = 455;
    const totalsW = colX[5] - totalsRight - 10;

    doc.fillColor(grayColor).text('Subtotal', totalsLeft, y);
    doc.fillColor(blackColor).text((invoice.subtotal || 0).toFixed(2), totalsRight, y, { width: totalsW, align: 'right' });
    y += 16;

    if ((invoice.discount || 0) > 0) {
      doc.fillColor(grayColor).text('Discount', totalsLeft, y);
      doc.fillColor('#ef4444').text(`-${(invoice.discount || 0).toFixed(2)}`, totalsRight, y, { width: totalsW, align: 'right' });
      y += 16;
    }

    doc.fillColor(grayColor).text('Total Tax (GST)', totalsLeft, y);
    doc.fillColor(blackColor).text((invoice.gstAmount || 0).toFixed(2), totalsRight, y, { width: totalsW, align: 'right' });
    y += 16;

    doc.moveTo(totalsLeft, y).lineTo(560, y).strokeColor(lightBorder).stroke();
    y += 8;

    doc.fillColor(blackColor).font(fontBold).fontSize(12);
    doc.text('Grand Total', totalsLeft, y);
    doc.text((invoice.total || 0).toFixed(2), totalsRight, y, { width: totalsW, align: 'right' });
    y += 20;

    doc.font(fontNormal).fontSize(10);
    if (invoice.paymentStatus === 'unpaid') {
      doc.fillColor(grayColor).text('Partial Amount Paid', totalsLeft, y);
      doc.fillColor(blackColor).text((invoice.paidAmount || 0).toFixed(2), totalsRight, y, { width: totalsW, align: 'right' });
      y += 16;
  
      doc.fillColor('#ef4444').font(fontBold);
      doc.text('Due Balance', totalsLeft, y);
      doc.text((invoice.dueAmount || 0).toFixed(2), totalsRight, y, { width: totalsW, align: 'right' });
      y += 16;
      doc.font(fontNormal);
    } else {
      doc.fillColor(grayColor).text('Amount Paid', totalsLeft, y);
      doc.fillColor(blackColor).text((invoice.total || 0).toFixed(2), totalsRight, y, { width: totalsW, align: 'right' });
      y += 16;
    }

    if (invoice.dueDate) {
       doc.fillColor(grayColor).text('Next Due Date', totalsLeft, y);
       doc.fillColor(blackColor).text(
         new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
         totalsRight, y, { width: totalsW, align: 'right' }
       );
       y += 16;
    }

    // 7. Footer block
    const footerY = y + 20;
    doc.moveTo(35, footerY).lineTo(560, footerY).strokeColor(lightBorder).stroke();

    doc.font(fontBold).fontSize(9).fillColor(grayColor);
    doc.text('NOTES & BANK DETAILS', 35, footerY + 12);
    doc.font(fontNormal).fontSize(9).fillColor(blackColor);
    
    if (settings.bankDetails?.bankName) {
       doc.text(`Bank: ${settings.bankDetails.bankName}`, 35, footerY + 28);
       doc.text(`A/C: ${settings.bankDetails.accountNumber}`, 35, footerY + 40);
       doc.text(`IFSC: ${settings.bankDetails.ifscCode}`, 35, footerY + 52);
    } else {
       doc.text('Thank you for your business!', 35, footerY + 28);
    }

    // Divider
    doc.moveTo(305, footerY + 10).lineTo(305, footerY + 70).strokeColor(lightBorder).stroke();

    doc.font(fontBold).fontSize(9).fillColor(grayColor);
    doc.text('TERMS & CONDITIONS', 325, footerY + 12);
    doc.font(fontNormal).fontSize(8).fillColor(blackColor);
    doc.text(settings.termsAndConditions || '', 325, footerY + 28, { width: 235 });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

module.exports = { generateInvoicePDF };
