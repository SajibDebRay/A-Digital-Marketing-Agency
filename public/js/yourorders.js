// public/js/yourorders.js

const REFRESH_INTERVAL_MS = 20000; // re-fetch from server every 20s (catches admin email actions)
const TICK_INTERVAL_MS = 1000;     // update countdowns every second

const loadingState = document.getElementById('loadingState');
const emptyState   = document.getElementById('emptyState');
const loginState   = document.getElementById('loginState');
const ordersGrid   = document.getElementById('ordersGrid');

let orders = [];
let tickHandle = null;

const STATUS_META = {
  pending:    { label: 'Yet to be Confirmed',                 pillClass: 'status-pending' },
  processing: { label: 'Payment Confirmed, Order Processing', pillClass: 'status-processing' },
  delivered:  { label: 'Order Delivered',                     pillClass: 'status-delivered' },
  failed:     { label: 'Order Failed, contact us to get the refund', pillClass: 'status-failed' },
};

function showOnly(el) {
  [loadingState, emptyState, loginState, ordersGrid].forEach(node => {
    node.style.display = (node === el) ? '' : 'none';
  });
}

function formatRemaining(ms) {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function orderCardHtml(order) {
  const meta = STATUS_META[order.orderStage] || STATUS_META.pending;
  const deadline = order.paymentDeadline ? new Date(order.paymentDeadline).getTime() : null;

  let countdownHtml = '';
  if (order.orderStage === 'pending' && deadline) {
    countdownHtml = `
      <div class="order-countdown" data-deadline="${deadline}">
        <span class="order-countdown-label">Time left to pay</span>
        <span class="order-countdown-time"></span>
      </div>`;
  }

  let alertHtml = '';
  if (order.orderStage === 'delivered') {
    alertHtml = `
      <div class="order-alert">
        <i class="fas fa-envelope-open-text"></i>
        Please check your email for delivery details. If you don't see it, check your spam folder.
      </div>`;
  } else if (order.orderStage === 'failed') {
    alertHtml = `
      <div class="order-alert failed">
        <i class="fas fa-exclamation-triangle"></i>
        This order failed. Please contact us to arrange your refund.
      </div>`;
  }

  return `
    <div class="order-card" data-order-id="${order._id}">
      <div class="order-card-top">
        <div>
          <p class="order-service">${escapeHtml(order.service)}</p>
          <span class="order-id">#${order._id}</span>
        </div>
        <div class="order-price">$${Number(order.price).toFixed(2)}</div>
      </div>
      <span class="status-pill ${meta.pillClass}">${meta.label}</span>
      ${countdownHtml}
      ${alertHtml}
    </div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function renderOrders() {
  if (!orders.length) {
    showOnly(emptyState);
    return;
  }
  showOnly(ordersGrid);
  ordersGrid.innerHTML = orders.map(orderCardHtml).join('');
}

function tickCountdowns() {
  document.querySelectorAll('.order-countdown').forEach(el => {
    const deadline = Number(el.getAttribute('data-deadline'));
    const timeEl = el.querySelector('.order-countdown-time');
    const remaining = deadline - Date.now();
    const formatted = formatRemaining(remaining);

    if (formatted) {
      timeEl.textContent = formatted;
      timeEl.classList.remove('expired');
    } else {
      timeEl.textContent = 'Payment window expired';
      timeEl.classList.add('expired');
    }
  });
}

async function fetchOrders() {
  try {
    const res = await fetch('/orders/mine', { credentials: 'same-origin' });

    if (res.status === 401) {
      showOnly(loginState);
      return;
    }

    const data = await res.json();
    if (!data.success) {
      showOnly(emptyState);
      return;
    }

    orders = data.orders || [];
    renderOrders();
    tickCountdowns(); // paint immediately, don't wait a full second
  } catch (err) {
    console.error('Failed to load orders:', err);
    // Keep whatever was last rendered rather than wiping the page on a transient network error.
  }
}

function init() {
  showOnly(loadingState);
  fetchOrders();

  // Recompute the visible countdowns every second (pure client-side, no network).
  tickHandle = setInterval(tickCountdowns, TICK_INTERVAL_MS);

  // Periodically re-sync with the server so admin email actions (payment/delivery
  // confirmations) show up here without the user needing to refresh the page.
  setInterval(fetchOrders, REFRESH_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', init);