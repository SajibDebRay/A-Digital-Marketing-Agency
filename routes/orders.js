// routes/orders.js

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const Order   = require('../models/Order');
const {
  sendOrderNotificationEmail,
  sendDeliveryActionEmail,
  sendOrderConfirmationEmail,
} = require('../utils/sendMailer');

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const VALID_ACTIONS = ['payment-yes', 'payment-no', 'delivered-yes', 'delivered-no'];

// ── POST /orders/place ────────────────────────────────────────────────────────
router.post('/place', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Not logged in.' });
  }

  try {
    const {
      firstName, lastName, email, phone,
      service, price, details, skrillReference
    } = req.body;

    if (!firstName || !lastName || !email || !service || !price) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const order = new Order({
      firstName,
      lastName,
      email,
      phone           : phone || '',
      service,
      price           : parseFloat(price),
      details         : details || {},
      skrillReference : skrillReference || '',
      paymentMethod   : 'Skrill',
      paymentStatus   : 'pending',
      status          : 'new',
      orderStage      : 'pending',
      paymentDeadline : new Date(Date.now() + TWO_HOURS_MS),
      actionToken     : crypto.randomBytes(24).toString('hex'),
    });

    await order.save();

    // ── Send order notification email to you (includes payment-received buttons) ──
    console.log('📧 Attempting to send emails for order:', order._id);
    console.log('📧 Admin email target:', process.env.EMAIL_USER);
    console.log('📧 Customer email target:', order.email);
    try {
      await sendOrderNotificationEmail(order);
      console.log(`✅ Order notification email sent for order ${order._id}`);
    } catch (mailErr) {
      console.error('⚠️ Admin email failed:', mailErr);
    }

    // ── Send order confirmation email to customer ──
    try {
      await sendOrderConfirmationEmail(order);
      console.log(`✅ Order confirmation email sent to ${order.email}`);
    } catch (mailErr) {
      console.error('⚠️ Customer email failed:', mailErr.message);
    }

    return res.json({
      success : true,
      orderId : order._id,
      message : 'Order placed successfully.',
    });

  } catch (err) {
    console.error('Order error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── GET /orders/mine ──────────────────────────────────────────────────────────
router.get('/mine', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Not logged in.' });
  }
  try {
    const User   = require('../models/User');
    const user   = await User.findById(req.session.userId).select('email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const orders = await Order.find({ email: user.email })
      .select('-actionToken')
      .sort({ createdAt: -1 });

    return res.json({ success: true, orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL ACTION FLOW
// GET  renders a confirmation page — it never mutates data on its own, so a
//      mail client's link scanner/preview fetch can't silently trigger it.
// POST performs the actual state change, once the admin clicks "Confirm".
// ─────────────────────────────────────────────────────────────────────────────

function page(title, bodyHtml) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Cr@ckFlow</title>
    <style>
      body { margin:0; font-family:'Segoe UI',Arial,sans-serif; background:#0b1426;
             min-height:100vh; display:flex; align-items:center; justify-content:center; }
      .card { background:#fff; border-radius:14px; padding:36px 32px; max-width:440px;
              width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.35); }
      .brand { color:#c9a84c; font-weight:700; font-size:14px; letter-spacing:0.08em;
               text-transform:uppercase; margin-bottom:14px; }
      h1 { font-size:19px; color:#0b1426; margin:0 0 10px; }
      p  { font-size:14px; color:#555; line-height:1.6; margin:0 0 20px; }
      .row td { padding:6px 10px 6px 0; font-size:13px; text-align:left; }
      .row td:first-child { color:#888; font-weight:600; white-space:nowrap; }
      .row td:last-child { color:#222; }
      table { margin:0 auto 20px; }
      .btn { display:inline-block; padding:12px 24px; border-radius:8px; font-weight:700;
             font-size:14px; text-decoration:none; border:none; cursor:pointer; margin:4px; }
      .btn-yes { background:#2e9e5b; color:#fff; }
      .btn-no  { background:#c0392b; color:#fff; }
      .btn-ok  { background:#0b1426; color:#e8c97a; }
      .note { font-size:12px; color:#999; margin-top:16px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">Cr@ckFlow</div>
      ${bodyHtml}
    </div>
  </body>
  </html>`;
}

async function loadOrderForAction(req, res) {
  const { id, token, action } = req.params;
  if (!VALID_ACTIONS.includes(action)) {
    res.status(400).send(page('Invalid link', '<h1>Invalid action</h1><p>This link is not recognized.</p>'));
    return null;
  }
  const order = await Order.findById(id).catch(() => null);
  if (!order || order.actionToken !== token) {
    res.status(404).send(page('Link not found', '<h1>Link expired or invalid</h1><p>We could not match this order and token.</p>'));
    return null;
  }
  return order;
}

// GET — confirmation screen, no mutation
router.get('/action/:id/:token/:action', async (req, res) => {
  const order = await loadOrderForAction(req, res);
  if (!order) return;

  const { action } = req.params;
  const isPaymentAction  = action === 'payment-yes' || action === 'payment-no';
  const isDeliveryAction = action === 'delivered-yes' || action === 'delivered-no';

  if (isPaymentAction && order.paymentActionTaken) {
    return res.send(page('Already recorded', `
      <h1>Already recorded</h1>
      <p>This order's payment status was already set to
        <strong>${order.orderStage === 'processing' ? 'Received' : 'Not received'}</strong>.
        No further action is needed.</p>
    `));
  }

  if (isDeliveryAction) {
    if (!order.paymentActionTaken || order.orderStage === 'pending') {
      return res.send(page('Payment not confirmed', `
        <h1>Payment not confirmed yet</h1>
        <p>You need to confirm the payment for this order before marking delivery.</p>
      `));
    }
    if (order.deliveryActionTaken) {
      return res.send(page('Already recorded', `
        <h1>Already recorded</h1>
        <p>This order's delivery status was already set to
          <strong>${order.orderStage === 'delivered' ? 'Delivered' : 'Failed'}</strong>.
          No further action is needed.</p>
      `));
    }
  }

  const labels = {
    'payment-yes'   : { h: 'Confirm payment received?', btn: 'Yes, mark payment received', cls: 'btn-yes' },
    'payment-no'    : { h: 'Confirm payment NOT received?', btn: 'Yes, mark not received', cls: 'btn-no' },
    'delivered-yes' : { h: 'Confirm order delivered?', btn: 'Yes, mark delivered', cls: 'btn-yes' },
    'delivered-no'  : { h: 'Confirm order failed?', btn: 'Yes, mark as failed', cls: 'btn-no' },
  };
  const l = labels[action];

  res.send(page('Confirm action', `
    <h1>${l.h}</h1>
    <table class="row">
      <tr><td>Order ID</td><td>${order._id}</td></tr>
      <tr><td>Service</td><td>${order.service}</td></tr>
      <tr><td>Customer</td><td>${order.firstName} ${order.lastName}</td></tr>
      <tr><td>Amount</td><td>$${order.price.toFixed(2)}</td></tr>
    </table>
    <form method="POST" action="/orders/action/${order._id}/${order.actionToken}/${action}">
      <button class="btn ${l.cls}" type="submit">${l.btn}</button>
    </form>
    <p class="note">Nothing has changed yet — this only happens once you click the button above.</p>
  `));
});

// POST — performs the actual mutation
router.post('/action/:id/:token/:action', async (req, res) => {
  const order = await loadOrderForAction(req, res);
  if (!order) return;

  const { action } = req.params;
  const isPaymentAction  = action === 'payment-yes' || action === 'payment-no';
  const isDeliveryAction = action === 'delivered-yes' || action === 'delivered-no';

  if (isPaymentAction && order.paymentActionTaken) {
    return res.send(page('Already recorded', '<h1>Already recorded</h1><p>No further action needed.</p>'));
  }
  if (isDeliveryAction && (!order.paymentActionTaken || order.deliveryActionTaken)) {
    return res.send(page('Not available', '<h1>This action is no longer available.</h1>'));
  }

  try {
    if (action === 'payment-yes') {
      order.orderStage = 'processing';
      order.paymentStatus = 'confirmed';
      order.paymentActionTaken = true;
      await order.save();
      try { await sendDeliveryActionEmail(order); } catch (e) { console.error('⚠️ Delivery action email failed:', e); }
      return res.send(page('Payment confirmed', `
        <h1>✅ Payment marked as received</h1>
        <p>The order is now "Payment Confirmed, Order Processing" on the customer's page.
        A follow-up email with delivery options has been sent to you.</p>
      `));
    }

    if (action === 'payment-no') {
      order.paymentActionTaken = true;
      await order.save();
      return res.send(page('Marked as not received', `
        <h1>Marked as not received</h1>
        <p>The order stays "Yet to be Confirmed". Follow up with the customer directly if needed.</p>
      `));
    }

    if (action === 'delivered-yes') {
      order.orderStage = 'delivered';
      order.status = 'completed';
      order.deliveryActionTaken = true;
      await order.save();
      return res.send(page('Marked delivered', `
        <h1>✅ Order marked as delivered</h1>
        <p>The customer will now see "Order Delivered" and a note to check their email/spam folder.</p>
      `));
    }

    if (action === 'delivered-no') {
      order.orderStage = 'failed';
      order.status = 'cancelled';
      order.deliveryActionTaken = true;
      await order.save();
      return res.send(page('Marked failed', `
        <h1>Order marked as failed</h1>
        <p>The customer will see "Order Failed, contact us to get the refund". Please arrange the refund.</p>
      `));
    }

  } catch (err) {
    console.error('Order action error:', err);
    return res.status(500).send(page('Error', '<h1>Something went wrong</h1><p>Please try again or check the server logs.</p>'));
  }
});

module.exports = router;