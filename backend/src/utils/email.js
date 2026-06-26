const nodemailer = require('nodemailer');

/**
 * Create a reusable transporter.
 * Uses Gmail SMTP with App Password for simplicity.
 * For production, switch to a service like SendGrid, AWS SES, or Mailgun.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/**
 * Generate a 6-digit numeric OTP code.
 * @returns {string} 6-digit code
 */
const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send an OTP email to the user.
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit OTP code
 */
const sendOTPEmail = async (email, code) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Goldy Mobiles" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: `${code} — Your Goldy Mobiles Verification Code`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #141416; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #B8860B 0%, #DAA520 100%); padding: 32px; text-align: center;">
          <h1 style="color: #141416; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px;">GOLDY MOBILES</h1>
          <p style="color: #141416; margin: 8px 0 0; font-size: 14px; opacity: 0.8;">Premium Electronics</p>
        </div>
        <div style="padding: 32px; text-align: center;">
          <p style="color: #A3A39A; font-size: 15px; margin: 0 0 24px;">Enter this verification code to sign in:</p>
          <div style="background: #1A1A1E; border: 1px solid #3D3D3A; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
            <span style="font-size: 36px; font-weight: 700; color: #DAA520; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="color: #7A7A72; font-size: 13px; margin: 0;">This code expires in <strong style="color: #A3A39A;">10 minutes</strong>.</p>
          <p style="color: #5C5C56; font-size: 12px; margin: 16px 0 0;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { generateOTPCode, sendOTPEmail };
