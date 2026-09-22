/* =============================================
   Cr@ckFlow Payment Page — payment.js
   Manual Skrill payment flow
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Config ── */
  const SKRILL_EMAIL  = 'sajibroyal57@gmail.com';
  const WHATSAPP_NUM  = '8801753565232'; // no + sign for wa.me link

  /* ── Read service & price from URL / localStorage ── */
  const params       = new URLSearchParams(window.location.search);
  const serviceName  = params.get('service') || localStorage.getItem('selectedService') || 'Unknown Service';
  const priceRaw     = params.get('price')   || localStorage.getItem('selectedPrice')   || '0';
  const servicePrice = parseFloat(priceRaw);

  const serviceDescriptions = {
    'Email Marketing'        : 'Grow your business via targeted email campaigns. Includes 500 email sends, newsletter design, and software management. Valid for 7 days.',
    'Data Scraping'          : 'B2B & B2C leads — 1,000 emails, phone numbers (if available), and LinkedIn profiles. Valid for 7 days.',
    'SEO Services'           : 'Search engine optimisation for your website. Rank higher, drive organic growth, and turn clicks into customers. 30 days.',
    'Administrative Support' : 'Virtual assistant service (5 hours/day). Includes WordPress management, real estate listing, and Excel data entry.',
    'Database'               : 'Promote your business with our quality database — 1,000 emails/phones, company information, all verified data.',
    'SMM Services'           : 'Social media management & marketing. Increasing likes, comments, branding, and full social media handling.',
  };

  const desc           = serviceDescriptions[serviceName] || 'Professional digital marketing service.';
  const priceFormatted = '$' + servicePrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  /* ── Helpers ── */
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function markInvalid(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('is-invalid');
    const fb = el.closest('.form-group') && el.closest('.form-group').querySelector('.invalid-feedback');
    if (fb && msg) fb.textContent = msg;
    if (fb) fb.classList.add('show-feedback');
  }
  function markValid(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('is-invalid');
    const fb = el.closest('.form-group') && el.closest('.form-group').querySelector('.invalid-feedback');
    if (fb) fb.classList.remove('show-feedback');
  }

  /* ── Populate page ── */
  setText('serviceName',   serviceName);
  setText('serviceDesc',   desc);
  setText('serviceAmount', servicePrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  setText('subtotal',      priceFormatted);
  setText('totalDue',      priceFormatted);
  setText('btnAmount',     priceFormatted);

  // also set Skrill email display
  const skrillEmailEl = document.getElementById('skrill-display-email');
  if (skrillEmailEl) skrillEmailEl.textContent = SKRILL_EMAIL;

  /* ── Pre-fill saved info ── */
  ['firstName','lastName','email','phone'].forEach(id => {
    const key = 'saved' + id.charAt(0).toUpperCase() + id.slice(1);
    const el  = document.getElementById(id);
    if (el && localStorage.getItem(key)) el.value = localStorage.getItem(key);
  });

  /* ── Live blur validation ── */
  function addBlur(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur',  () => { if (el.value.trim()) { fn(el.value.trim()) ? markValid(id) : markInvalid(id); } });
    el.addEventListener('input', () => { if (el.classList.contains('is-invalid') && fn(el.value.trim())) markValid(id); });
  }
  addBlur('firstName', v => v.length >= 2);
  addBlur('lastName',  v => v.length >= 2);
  addBlur('email',     v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

  /* ── Validate form ── */
  function validateForm() {
    let valid = true;
    function check(id, fn, msg) {
      if (!fn(getVal(id))) { markInvalid(id, msg); valid = false; }
      else markValid(id);
    }
    check('firstName', v => v.length >= 2,                          'Please enter your first name.');
    check('lastName',  v => v.length >= 2,                          'Please enter your last name.');
    check('email',     v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),  'Please enter a valid email.');

    if (!valid) {
      const first = document.querySelector('.is-invalid');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return valid;
  }

  /* ── Collect service-specific details from service-options.js fields ── */
  function collectDetails() {
    const d = {};
    // Email Marketing
    if (document.getElementById('em-subject'))  d.subjectLine  = getVal('em-subject');
    if (document.getElementById('em-design'))   d.designBrief  = getVal('em-design');
    if (document.getElementById('em-qty-display')) d.quantity  = document.getElementById('em-qty-display').textContent;

    // Data Scraping
    if (document.getElementById('ds-niche'))    d.niche        = getVal('ds-niche');
    if (document.getElementById('ds-qty-display')) d.quantity  = document.getElementById('ds-qty-display').textContent;

    // SEO
    const seoInputs = document.querySelectorAll('.seo-url-input');
    if (seoInputs.length) d.websites = Array.from(seoInputs).map(i => i.value).filter(Boolean);

    // Admin Support
    if (document.getElementById('as-task-type')) d.taskType   = getVal('as-task-type');
    if (document.getElementById('as-desc'))       d.taskDesc   = getVal('as-desc');
    if (document.getElementById('as-hours'))      d.hours      = getVal('as-hours');
    if (document.getElementById('as-qty-display')) d.days      = document.getElementById('as-qty-display').textContent;

    // Database
    if (document.getElementById('db-niche'))    d.niche        = getVal('db-niche');
    if (document.getElementById('db-country'))  d.country      = getVal('db-country');
    if (document.getElementById('db-qty-display')) d.quantity  = document.getElementById('db-qty-display').textContent;

    // SMM
    const smmInputs = document.querySelectorAll('.smm-url-inp');
    if (smmInputs.length) d.socialUrls = Array.from(smmInputs).map(i => i.value).filter(Boolean);

    return d;
  }

  /* ── Get current total price (may have been updated by service-options.js) ── */
  function getCurrentPrice() {
    const totalEl = document.getElementById('totalDue');
    if (!totalEl) return servicePrice;
    const raw = totalEl.textContent.replace(/[$,]/g, '');
    return parseFloat(raw) || servicePrice;
  }

  /* ── Place Order button ── */
  window.handlePayment = async function () {
    if (!validateForm()) return;

    const btn     = document.getElementById('proceedBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoad = btn.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoad.style.display = 'inline-flex';
    btn.disabled = true;

    const finalPrice = getCurrentPrice();
    const details    = collectDetails();

    try {
      const res  = await fetch('/orders/place', {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({
          firstName : getVal('firstName'),
          lastName  : getVal('lastName'),
          email     : getVal('email'),
          phone     : getVal('phone'),
          service   : serviceName,
          price     : finalPrice,
          details,
        }),
      });

      const data = await res.json();

      btnText.style.display = '';
      btnLoad.style.display = 'none';
      btn.disabled = false;

      if (!data.success) {
        alert(data.message || 'Something went wrong. Please try again.');
        return;
      }

      // Save info if checkbox ticked
      const saveInfo = document.getElementById('saveInfo');
      if (saveInfo && saveInfo.checked) {
        localStorage.setItem('savedFirstName', getVal('firstName'));
        localStorage.setItem('savedLastName',  getVal('lastName'));
        localStorage.setItem('savedEmail',     getVal('email'));
        localStorage.setItem('savedPhone',     getVal('phone'));
      }

      localStorage.removeItem('selectedService');
      localStorage.removeItem('selectedPrice');

      // Build WhatsApp message
      const waMsg = encodeURIComponent(
        `Hi Cr@ckFlow! 👋\n\n` +
        `I've placed an order and sent payment via Skrill.\n\n` +
        `📦 *Order Details*\n` +
        `• Service: ${serviceName}\n` +
        `• Amount: $${finalPrice.toFixed(2)}\n` +
        `• Order ID: ${data.orderId}\n` +
        `• Name: ${getVal('firstName')} ${getVal('lastName')}\n` +
        `• Email: ${getVal('email')}\n\n` +
        `💳 *Payment sent to Skrill:* ${SKRILL_EMAIL}\n\n` +
        `Please find my payment screenshot attached. Thank you!`
      );

      // Populate confirmation modal
      setText('confirm-service',  serviceName);
      setText('confirm-price',    '$' + finalPrice.toFixed(2));
      setText('confirm-order-id', data.orderId);
      setText('confirm-name',     getVal('firstName') + ' ' + getVal('lastName'));
      setText('confirm-email',    getVal('email'));

      const waBtn = document.getElementById('confirm-whatsapp-btn');
      if (waBtn) waBtn.href = `https://wa.me/${WHATSAPP_NUM}?text=${waMsg}`;

      // Show confirmation modal
      $('#confirmationModal').modal('show');

    } catch (err) {
      btnText.style.display = '';
      btnLoad.style.display = 'none';
      btn.disabled = false;
      console.error(err);
      alert('Network error. Please check your connection and try again.');
    }
  };

});