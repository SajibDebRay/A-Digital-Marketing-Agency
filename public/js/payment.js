/* =============================================
   Cr@ckFlow Payment Page — payment.js (FIXED)
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ======================================================
     1.  READ SERVICE & PRICE FROM URL PARAMS (or localStorage fallback)
     ====================================================== */
  const params       = new URLSearchParams(window.location.search);
  const serviceName  = params.get('service') || localStorage.getItem('selectedService') || 'Unknown Service';
  const priceRaw     = params.get('price')   || localStorage.getItem('selectedPrice')   || '0';
  const servicePrice = parseFloat(priceRaw);

  const serviceDescriptions = {

  'Email Marketing Package':
    'Grow your business via targeted email campaigns. Includes email sends, newsletter design, and software management.',

  'B2B Data Services & Lead Generation':
    'B2B & B2C lead generation with emails, phone numbers when available, LinkedIn profiles, and targeted business data.',

  'SEO Package — SEO Services Pricing':
    'Professional SEO services designed to improve your search visibility, rankings, organic traffic, and overall website performance.',

  'Virtual Assistant & Administrative Support Services':
    'Virtual assistant services including WordPress management, real estate listing, Excel data entry, research, and administrative tasks.',

  'B2B Data Services — Ready Database':
    'Quality business database containing emails, phone numbers, company information, and verified business data.',

  'Social Media Marketing Package':
    'Social media management and marketing for Facebook, Instagram, LinkedIn, and other platforms to improve branding and engagement.'

};

  const desc           = serviceDescriptions[serviceName] || 'Professional digital marketing service tailored to your business needs.';
  const priceFormatted = '$' + servicePrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  /* BUG FIX: all setters now use null-safe helper to prevent TypeError crash */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  setText('serviceName',    serviceName);
  setText('serviceDesc',    desc);
  setText('serviceAmount',  servicePrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  setText('subtotal',       priceFormatted);
  setText('totalDue',       priceFormatted);
  setText('btnAmount',      priceFormatted);
  setText('skrillAmount',   priceFormatted);   // now exists in HTML — also null-safe just in case
  setText('payoneerAmount', priceFormatted);   // now exists in HTML — also null-safe just in case
  setText('requiredAmt',    priceFormatted);

  /* ======================================================
     2.  PAYMENT METHOD SWITCHING
     ====================================================== */
  const paymentOptions = document.querySelectorAll('.payment-option');
  const allFields = {
    stripe  : document.getElementById('stripeFields'),
    skrill  : document.getElementById('skrillFields'),
    payoneer: document.getElementById('payoneerFields'),
  };

  function showFields(method) {
    Object.entries(allFields).forEach(function ([key, el]) {
      if (!el) return;
      if (key === method) {
        el.style.display   = 'block';
        el.style.opacity   = '0';
        el.style.transform = 'translateY(8px)';
        requestAnimationFrame(function () {
          el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
          el.style.opacity    = '1';
          el.style.transform  = 'translateY(0)';
        });
      } else {
        el.style.display = 'none';
      }
    });
  }

  paymentOptions.forEach(function (option) {
    option.addEventListener('click', function () {
      paymentOptions.forEach(function (o) { o.classList.remove('active'); });
      this.classList.add('active');
      const radio = this.querySelector('input[type="radio"]');
      radio.checked = true;
      showFields(radio.value);
    });
  });

  /* ======================================================
     3.  CARD NUMBER AUTO-FORMAT & BRAND ICON
     ====================================================== */
  const cardInput = document.getElementById('cardNumber');
  const brandIcon = document.getElementById('cardBrandIcon');
  if (cardInput) {
    cardInput.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '').slice(0, 16);
      this.value = v.replace(/(.{4})/g, '$1 ').trim();
      if (brandIcon) {
        if      (v.startsWith('4'))       brandIcon.className = 'fab fa-cc-visa input-icon';
        else if (/^5[1-5]/.test(v))      brandIcon.className = 'fab fa-cc-mastercard input-icon';
        else if (/^3[47]/.test(v))       brandIcon.className = 'fab fa-cc-amex input-icon';
        else if (v.startsWith('6'))      brandIcon.className = 'fab fa-cc-discover input-icon';
        else                              brandIcon.className = 'far fa-credit-card input-icon';
      }
    });
  }

  const expiryInput = document.getElementById('expiry');
  if (expiryInput) {
    expiryInput.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '').slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + ' / ' + v.slice(2);
      this.value = v;
    });
  }

  const cvvInput = document.getElementById('cvv');
  if (cvvInput) {
    cvvInput.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  /* ======================================================
     4.  VALIDATION HELPERS
     ====================================================== */
  function markValid(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('is-invalid');
    const fb = document.getElementById(id + 'Feedback')
            || el.parentElement.querySelector('.invalid-feedback')
            || (el.closest('.form-group') && el.closest('.form-group').querySelector('.invalid-feedback'));
    if (fb) fb.classList.remove('show-feedback');
  }

  function markInvalid(id, msg) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.classList.add('is-invalid');
    /* BUG FIX: also search the parent form-group to cover inputs nested in .input-icon-wrap */
    const fb = document.getElementById(id + 'Feedback')
            || (el.closest('.form-group') && el.closest('.form-group').querySelector('.invalid-feedback'))
            || el.parentElement.querySelector('.invalid-feedback');
    if (fb) {
      if (msg) fb.textContent = msg;
      /* BUG FIX: show-feedback is now defined in payment.css */
      fb.classList.add('show-feedback');
    }
    return false;
  }

  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  /* ======================================================
     5.  LIVE BLUR VALIDATION
     ====================================================== */
  function addBlurValidation(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function () {
      if (el.value.trim()) { fn(el.value.trim()) ? markValid(id) : markInvalid(id); }
    });
    el.addEventListener('input', function () {
      if (el.classList.contains('is-invalid') && fn(el.value.trim())) markValid(id);
    });
  }
  addBlurValidation('firstName', function (v) { return v.length >= 2; });
  addBlurValidation('lastName',  function (v) { return v.length >= 2; });
  addBlurValidation('email',     function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); });

  /* ======================================================
     6.  FORM VALIDATION ON SUBMIT
     ====================================================== */
  function validateForm(method) {
    let valid = true;

    function check(id, fn, msg) {
      if (!fn(getVal(id).trim())) { markInvalid(id, msg); valid = false; }
      else markValid(id);
    }

    check('firstName', function (v) { return v.length >= 2; },  'Please enter your first name.');
    check('lastName',  function (v) { return v.length >= 2; },  'Please enter your last name.');
    check('email',     function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, 'Please enter a valid email address.');

    if (method === 'stripe') {
      check('cardNumber', function (v) { return v.replace(/\s/g, '').length === 16; }, 'Enter a valid 16-digit card number.');
      check('expiry',     function (v) { return /^\d{2}\s\/\s\d{2}$/.test(v); }, 'Enter a valid expiry date.');
      check('cvv',        function (v) { return v.length >= 3; }, 'Enter a valid CVV.');
      check('cardName',   function (v) { return v.length >= 3; }, 'Please enter the name on your card.');
      check('stripeBalance', function (v) { return v !== '' && !isNaN(v) && parseFloat(v) >= 0; }, 'Please enter your account balance.');
    } else if (method === 'skrill') {
      check('skrillEmail',   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, 'Enter a valid Skrill email.');
      check('skrillBalance', function (v) { return v !== '' && !isNaN(v) && parseFloat(v) >= 0; }, 'Please enter your Skrill balance.');
    } else if (method === 'payoneer') {
      check('payoneerEmail',   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, 'Enter a valid Payoneer email.');
      check('payoneerBalance', function (v) { return v !== '' && !isNaN(v) && parseFloat(v) >= 0; }, 'Please enter your Payoneer balance.');
    }

    if (!valid) {
      const first = document.querySelector('.is-invalid');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return valid;
  }

  /* ======================================================
     7.  HANDLE PAYMENT
     ====================================================== */
  window.handlePayment = function () {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    if (!validateForm(method)) return;

    const balanceFieldId = method === 'stripe'   ? 'stripeBalance'
                         : method === 'skrill'   ? 'skrillBalance'
                         : 'payoneerBalance';
    const userBalance = parseFloat(getVal(balanceFieldId)) || 0;

    const btn     = document.getElementById('proceedBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoad = btn.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoad.style.display = 'inline-flex';
    btn.disabled = true;

    setTimeout(function () {
      btnText.style.display = '';
      btnLoad.style.display = 'none';
      btn.disabled = false;

      if (userBalance < servicePrice) {
        const deficit = servicePrice - userBalance;
        setText('yourBalance', '$' + userBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
        setText('deficitAmt',  '-$' + deficit.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
        $('#insufficientModal').modal('show');
      } else {
        setText('successService', serviceName);
        setText('receiptEmail',   getVal('email'));

        if (document.getElementById('saveInfo').checked) {
          localStorage.setItem('savedFirstName', getVal('firstName'));
          localStorage.setItem('savedLastName',  getVal('lastName'));
          localStorage.setItem('savedEmail',     getVal('email'));
          localStorage.setItem('savedPhone',     getVal('phone'));
        }

        localStorage.removeItem('selectedService');
        localStorage.removeItem('selectedPrice');
        $('#successModal').modal('show');
      }
    }, 2000);
  };

  /* ======================================================
     8.  PRE-FILL FROM SAVED INFO
     ====================================================== */
  if (localStorage.getItem('savedFirstName')) {
    function setInput(id, key) {
      const el = document.getElementById(id);
      if (el && localStorage.getItem(key)) el.value = localStorage.getItem(key);
    }
    setInput('firstName', 'savedFirstName');
    setInput('lastName',  'savedLastName');
    setInput('email',     'savedEmail');
    setInput('phone',     'savedPhone');
    const si = document.getElementById('saveInfo');
    if (si) si.checked = true;
  }

  /* ======================================================
     9.  STAGGER ANIMATE FIELDS ON LOAD
     ====================================================== */
  const animEls = document.querySelectorAll('.form-group, .payment-option, .save-info-row');
  animEls.forEach(function (el, i) {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(12px)';
    el.style.transition = 'opacity 0.4s ease ' + (i * 0.04 + 0.1) + 's, transform 0.4s ease ' + (i * 0.04 + 0.1) + 's';
    setTimeout(function () {
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    }, 80);
  });

});