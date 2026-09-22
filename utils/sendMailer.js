const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// Base URL used to build the action-button links inside admin emails.
// IMPORTANT: set BASE_URL in your .env once this is live (e.g. https://crackflow.com).
// If it's left as localhost, the buttons will only work from the same machine as the server.
const BASE_URL = process.env.BASE_URL || 'http://localhost:5500';

function actionLink(order, action) {
  return `${BASE_URL}/orders/action/${order._id}/${order.actionToken}/${action}`;
}

// Shared button styling for the admin action emails
function actionButton(label, href, color) {
  return `
    <a href="${href}" target="_blank" style="display:inline-block; padding:12px 22px; margin:6px 8px 0 0;
      background:${color}; color:#fff; text-decoration:none; font-weight:700; font-size:14px;
      border-radius:8px; font-family:Arial,sans-serif;">
      ${label}
    </a>`;
}

// ── Verification email (unchanged) ──────────────────────────────────────────
async function sendVerificationEmail(toEmail, code) {
  const mailOptions = {
    from: `"Cr@ckFlow" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Email Verification</h2>
        <p>Use the verification code below:</p>
        <h1 style="letter-spacing: 4px; color: #2563eb;">${code}</h1>
        <p>This code will expire in <b>10 minutes</b>.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// ── Order notification email (sent to you when a new order is placed) ────────
// Now includes "Received Payment?" Yes/No action buttons.
// Clicking a button opens a confirmation page first — it does NOT change the
// order immediately, so an email client's link-preview/scanner can't
// accidentally confirm or fail a real order just by visiting the link.
async function sendOrderNotificationEmail(order) {

  // format details object into readable HTML rows
  function formatDetails(details) {
    if (!details || Object.keys(details).length === 0) return '<tr><td colspan="2" style="padding:6px 0; color:#888;">No extra details provided.</td></tr>';
    return Object.entries(details).map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase());
      const val = Array.isArray(value) ? value.join(', ') : value;
      return `
        <tr>
          <td style="padding:6px 12px 6px 0; color:#555; font-weight:600; white-space:nowrap; vertical-align:top;">${label}</td>
          <td style="padding:6px 0; color:#222;">${val || '—'}</td>
        </tr>`;
    }).join('');
  }

  const mailOptions = {
    from : `"Cr@ckFlow Orders" <${process.env.EMAIL_USER}>`,
    to   : process.env.EMAIL_USER, // sends to yourself
    subject: `🛒 New Order — ${order.service} ($${order.price.toFixed(2)}) from ${order.firstName} ${order.lastName}`,
    html : `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:620px; margin:auto; background:#f7f7f7; padding:24px; border-radius:10px;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0b1426,#132040); border-radius:10px; padding:24px 28px; margin-bottom:20px;">
          <h1 style="margin:0; color:#e8c97a; font-size:22px; letter-spacing:0.05em;">Cr@ckFlow</h1>
          <p style="margin:6px 0 0; color:#8a96b0; font-size:13px; letter-spacing:0.05em;">NEW ORDER RECEIVED</p>
        </div>

        <!-- Order summary -->
        <div style="background:#fff; border-radius:10px; padding:20px 24px; margin-bottom:16px; border:1px solid #e5e5e5;">
          <h2 style="margin:0 0 16px; font-size:16px; color:#0b1426;">📦 Order Summary</h2>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600; white-space:nowrap;">Order ID</td>
              <td style="padding:6px 0; color:#222; font-family:monospace;">${order._id}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Service</td>
              <td style="padding:6px 0; color:#222;">${order.service}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Amount</td>
              <td style="padding:6px 0; color:#c9a84c; font-weight:700; font-size:16px;">$${order.price.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Payment Method</td>
              <td style="padding:6px 0; color:#222;">Skrill — sajibroyal57@gmail.com</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Status</td>
              <td style="padding:6px 0;">
                <span style="background:#fff3cd; color:#856404; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:600;">PENDING PAYMENT</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Placed At</td>
              <td style="padding:6px 0; color:#222;">${new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</td>
            </tr>
          </table>
        </div>

        <!-- Customer info -->
        <div style="background:#fff; border-radius:10px; padding:20px 24px; margin-bottom:16px; border:1px solid #e5e5e5;">
          <h2 style="margin:0 0 16px; font-size:16px; color:#0b1426;">👤 Customer Details</h2>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600; white-space:nowrap;">Name</td>
              <td style="padding:6px 0; color:#222;">${order.firstName} ${order.lastName}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Email</td>
              <td style="padding:6px 0;"><a href="mailto:${order.email}" style="color:#2563eb;">${order.email}</a></td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Phone / WhatsApp</td>
              <td style="padding:6px 0; color:#222;">${order.phone || '—'}</td>
            </tr>
          </table>
        </div>

        <!-- Service-specific details -->
        <div style="background:#fff; border-radius:10px; padding:20px 24px; margin-bottom:16px; border:1px solid #e5e5e5;">
          <h2 style="margin:0 0 16px; font-size:16px; color:#0b1426;">📋 Service Details</h2>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            ${formatDetails(order.details)}
          </table>
        </div>

        <!-- Action required -->
        <div style="background:#0b1426; border-radius:10px; padding:20px 24px; margin-bottom:16px;">
          <h2 style="margin:0 0 10px; font-size:16px; color:#e8c97a;">⚡ Have you received the payment?</h2>
          <p style="margin:0 0 4px; font-size:13px; color:#a9b3c9;">
            Clicking a button opens a confirmation page — nothing changes until you confirm there.
          </p>
          ${actionButton('✅ Yes, Payment Received', actionLink(order, 'payment-yes'), '#2e9e5b')}
          ${actionButton('❌ Not Received', actionLink(order, 'payment-no'), '#c0392b')}
        </div>

        <!-- Footer -->
        <p style="text-align:center; color:#aaa; font-size:11px; margin-top:20px;">
          Cr@ckFlow Digital Marketing Agency · crackflw@gmail.com · +880 1753 565232
        </p>

      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// ── Delivery action email (sent to you AFTER payment is confirmed) ───────────
// Contains "Order Delivered?" Yes/No buttons, same confirm-before-mutate pattern.
async function sendDeliveryActionEmail(order) {
  const mailOptions = {
    from : `"Cr@ckFlow Orders" <${process.env.EMAIL_USER}>`,
    to   : process.env.EMAIL_USER,
    subject: `📦 Payment Confirmed — mark delivery for Order ${order._id}`,
    html : `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:620px; margin:auto; background:#f7f7f7; padding:24px; border-radius:10px;">

        <div style="background:linear-gradient(135deg,#0b1426,#132040); border-radius:10px; padding:24px 28px; margin-bottom:20px;">
          <h1 style="margin:0; color:#e8c97a; font-size:22px; letter-spacing:0.05em;">Cr@ckFlow</h1>
          <p style="margin:6px 0 0; color:#8a96b0; font-size:13px; letter-spacing:0.05em;">PAYMENT CONFIRMED — ORDER IN PROGRESS</p>
        </div>

        <div style="background:#fff; border-radius:10px; padding:20px 24px; margin-bottom:16px; border:1px solid #e5e5e5;">
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600; white-space:nowrap;">Order ID</td>
              <td style="padding:6px 0; color:#222; font-family:monospace;">${order._id}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Service</td>
              <td style="padding:6px 0; color:#222;">${order.service}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Customer</td>
              <td style="padding:6px 0; color:#222;">${order.firstName} ${order.lastName} (${order.email})</td>
            </tr>
          </table>
        </div>

        <div style="background:#0b1426; border-radius:10px; padding:20px 24px; margin-bottom:16px;">
          <h2 style="margin:0 0 10px; font-size:16px; color:#e8c97a;">📬 Has this order been delivered?</h2>
          <p style="margin:0 0 4px; font-size:13px; color:#a9b3c9;">
            Clicking a button opens a confirmation page — nothing changes until you confirm there.
          </p>
          ${actionButton('✅ Yes, Delivered', actionLink(order, 'delivered-yes'), '#2e9e5b')}
          ${actionButton('❌ No, Failed', actionLink(order, 'delivered-no'), '#c0392b')}
        </div>

        <p style="text-align:center; color:#aaa; font-size:11px; margin-top:20px;">
          Cr@ckFlow Digital Marketing Agency · crackflw@gmail.com · +880 1753 565232
        </p>

      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// ── Order confirmation email (sent to customer) ───────────────────────────────
async function sendOrderConfirmationEmail(order) {
  const mailOptions = {
    from   : `"Cr@ckFlow" <${process.env.EMAIL_USER}>`,
    to     : order.email,
    subject: `✅ Order Confirmed — ${order.service} | Cr@ckFlow`,
    html   : `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:620px; margin:auto; background:#f7f7f7; padding:24px; border-radius:10px;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0b1426,#132040); border-radius:10px; padding:24px 28px; margin-bottom:20px;">
          <h1 style="margin:0; color:#e8c97a; font-size:22px; letter-spacing:0.05em;">Cr@ckFlow</h1>
          <p style="margin:6px 0 0; color:#8a96b0; font-size:13px; letter-spacing:0.05em;">ORDER CONFIRMATION</p>
        </div>

        <!-- Greeting -->
        <div style="background:#fff; border-radius:10px; padding:20px 24px; margin-bottom:16px; border:1px solid #e5e5e5;">
          <p style="margin:0 0 10px; font-size:15px; color:#222;">Hi <strong>${order.firstName}</strong>,</p>
          <p style="margin:0; font-size:14px; color:#555; line-height:1.7;">
            Thank you for placing an order with <strong>Cr@ckFlow</strong>! Your order has been received and is currently <strong>pending payment confirmation</strong>. Please send your Skrill payment and notify us on WhatsApp with your payment screenshot. You can track your order's live status any time on the <strong>Your Orders</strong> page.
          </p>
        </div>

        <!-- Order summary -->
        <div style="background:#fff; border-radius:10px; padding:20px 24px; margin-bottom:16px; border:1px solid #e5e5e5;">
          <h2 style="margin:0 0 16px; font-size:16px; color:#0b1426;">📦 Your Order Details</h2>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600; white-space:nowrap;">Order ID</td>
              <td style="padding:6px 0; color:#222; font-family:monospace;">${order._id}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Service</td>
              <td style="padding:6px 0; color:#222;">${order.service}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Amount to Pay</td>
              <td style="padding:6px 0; color:#c9a84c; font-weight:700; font-size:16px;">$${order.price.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Status</td>
              <td style="padding:6px 0;">
                <span style="background:#fff3cd; color:#856404; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:600;">PENDING PAYMENT</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0; color:#555; font-weight:600;">Placed At</td>
              <td style="padding:6px 0; color:#222;">${new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</td>
            </tr>
          </table>
        </div>

        <!-- Payment instructions -->
        <div style="background:#fff; border-radius:10px; padding:20px 24px; margin-bottom:16px; border:1px solid #e5e5e5;">
          <h2 style="margin:0 0 16px; font-size:16px; color:#0b1426;">💳 How to Complete Payment</h2>
          <ol style="margin:0; padding-left:1.2rem; font-size:14px; color:#555; line-height:2;">
            <li>Open your <strong>Skrill</strong> account</li>
            <li>Send exactly <strong style="color:#c9a84c;">$${order.price.toFixed(2)}</strong> to:</li>
          </ol>
          <div style="background:#f0f4ff; border:1px solid #c7d7ff; border-radius:8px; padding:12px 16px; text-align:center; margin:12px 0;">
            <span style="font-size:16px; font-weight:700; color:#1a1a2e; letter-spacing:0.03em;">sajibroyal57@gmail.com</span>
          </div>
          <ol start="3" style="margin:0; padding-left:1.2rem; font-size:14px; color:#555; line-height:2;">
            <li>Take a screenshot of the payment</li>
            <li>Send it to us on WhatsApp: <a href="https://wa.me/8801753565232" style="color:#25D366; font-weight:600;">+880 1753 565232</a></li>
            <li>We will confirm your order within <strong>24 hours</strong> ✅</li>
          </ol>
        </div>

        <!-- Contact -->
        <div style="background:#fff8e1; border:1px solid #ffe082; border-radius:10px; padding:16px 20px; font-size:13px; color:#795548; line-height:1.7;">
          <strong>Need help?</strong> Reply to this email or contact us:<br>
          📧 <a href="mailto:crackflw@gmail.com" style="color:#795548;">crackflw@gmail.com</a> &nbsp;|&nbsp;
          💬 <a href="https://wa.me/8801753565232" style="color:#25D366;">WhatsApp</a>
        </div>

        <!-- Footer -->
        <p style="text-align:center; color:#aaa; font-size:11px; margin-top:20px;">
          Cr@ckFlow Digital Marketing Agency · Sylhet, Bangladesh<br>
          Please keep this email as your order reference.
        </p>

      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendVerificationEmail,
  sendOrderNotificationEmail,
  sendDeliveryActionEmail,
  sendOrderConfirmationEmail,
};