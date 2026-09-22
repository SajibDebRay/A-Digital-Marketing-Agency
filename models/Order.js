// models/Order.js

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // ── Customer info ──
  firstName  : { type: String, required: true },
  lastName   : { type: String, required: true },
  email      : { type: String, required: true },
  phone      : { type: String, default: '' },

  // ── Service info ──
  service    : { type: String, required: true },
  price      : { type: Number, required: true },

  // ── Service-specific details (flexible) ──
  details    : { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Payment info (kept for backward compatibility) ──
  paymentMethod   : { type: String, default: 'Skrill' },
  paymentStatus   : { type: String, default: 'pending' }, // pending | confirmed | cancelled
  skrillReference : { type: String, default: '' },

  // ── Order status (kept for backward compatibility) ──
  status     : { type: String, default: 'new' }, // new | in-progress | completed | cancelled
  notes      : { type: String, default: '' },

  // ── Order stage: drives the "Your Orders" page & email action flow ──
  // pending    -> "Yet to be Confirmed"
  // processing -> "Payment Confirmed, Order Processing"
  // delivered  -> "Order Delivered"
  // failed     -> "Order Failed, contact us to get the refund"
  orderStage : {
    type: String,
    enum: ['pending', 'processing', 'delivered', 'failed'],
    default: 'pending',
  },

  // ── Payment countdown (2-hour default window, set when the order is placed) ──
  paymentDeadline : { type: Date },

  // ── Secure token embedded in the admin action-email links ──
  actionToken : { type: String },

  // ── Locks so each email action can only be actioned once ──
  paymentActionTaken  : { type: Boolean, default: false },
  deliveryActionTaken : { type: Boolean, default: false },

  // ── Timestamps ──
  createdAt  : { type: Date, default: Date.now },
  updatedAt  : { type: Date, default: Date.now },
});

// auto-update updatedAt on save
orderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);