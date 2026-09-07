/* =============================================
   Cr@ckFlow — service-options.js
   Renders dynamic per-service order forms on
   payment.html and keeps the price in sync.
   ============================================= */

(function () {

  /* ── Base prices ── */
  const BASE = {
  'Email Marketing Package': 5.99,
  'B2B Data Services & Lead Generation': 149.99,
  'SEO Package — SEO Services Pricing': 249.99,
  'Virtual Assistant & Administrative Support Services': 49.99,
  'B2B Data Services — Ready Database': 49.99,
  'Social Media Marketing Package': 49.99
};

  /* ── Helpers ── */
  function fmt(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Master price updater ── */
  function updatePrice(total) {
    const f = fmt(total);
    setText('subtotal',       f);
    setText('totalDue',       f);
    setText('btnAmount',      f);
    setText('skrillAmount',   f);
    setText('payoneerAmount', f);
    setText('requiredAmt',    f);
    // also update the big left-panel amount
    const amountEl = document.getElementById('serviceAmount');
    if (amountEl) amountEl.textContent = total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ── Shared CSS for injected forms ── */
  const sharedCSS = `
    .so-wrap { margin-top: 1.5rem; }
    .so-section-label {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--gold, #c9a84c);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .so-section-label::before {
      content: '';
      display: inline-block;
      width: 18px; height: 1px;
      background: var(--gold, #c9a84c);
    }
    .so-group { margin-bottom: 1.2rem; }
    .so-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 500;
      color: #e8c97a;
      margin-bottom: 0.4rem;
      letter-spacing: 0.03em;
    }
    .so-input, .so-textarea, .so-select {
      width: 100%;
      background: rgba(11,20,38,0.7);
      border: 1px solid rgba(201,168,76,0.25);
      border-radius: 8px;
      color: #f7f3ec;
      font-family: 'Jost', sans-serif;
      font-size: 0.88rem;
      padding: 0.6rem 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .so-input:focus, .so-textarea:focus, .so-select:focus {
      border-color: rgba(201,168,76,0.6);
    }
    .so-textarea { resize: vertical; min-height: 90px; }
    .so-hint {
      font-size: 0.75rem;
      color: #8a96b0;
      margin-top: 0.35rem;
      line-height: 1.5;
    }
    .so-alert {
      background: rgba(201,168,76,0.1);
      border: 1px solid rgba(201,168,76,0.3);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      color: #e8c97a;
      line-height: 1.6;
      margin-bottom: 1rem;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .so-alert i { margin-top: 2px; flex-shrink: 0; color: var(--gold, #c9a84c); }
    .so-price-preview {
      background: rgba(201,168,76,0.08);
      border: 1px solid rgba(201,168,76,0.2);
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-size: 0.85rem;
      color: #f7f3ec;
      margin-bottom: 1.2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .so-price-preview span:last-child {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.3rem;
      color: #e8c97a;
      font-weight: 500;
    }
    .so-add-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.5rem 1.1rem;
      background: rgba(201,168,76,0.1);
      border: 1px solid rgba(201,168,76,0.3);
      border-radius: 7px;
      color: #e8c97a;
      font-size: 0.78rem;
      font-weight: 500;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      font-family: 'Jost', sans-serif;
    }
    .so-add-btn:hover { background: rgba(201,168,76,0.18); border-color: rgba(201,168,76,0.5); }
    .so-remove-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 0.38rem 0.8rem;
      background: rgba(224,112,112,0.1);
      border: 1px solid rgba(224,112,112,0.25);
      border-radius: 6px;
      color: #e07070;
      font-size: 0.75rem;
      cursor: pointer;
      font-family: 'Jost', sans-serif;
      transition: background 0.2s;
      margin-top: 0.4rem;
    }
    .so-remove-btn:hover { background: rgba(224,112,112,0.2); }
    .so-url-row { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.8rem; }
    .so-smm-platform {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .so-smm-chip {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 0.5rem 1.1rem;
      border: 1px solid rgba(201,168,76,0.25);
      border-radius: 20px;
      background: transparent;
      color: #8a96b0;
      font-size: 0.8rem;
      font-family: 'Jost', sans-serif;
      cursor: pointer;
      transition: all 0.2s;
    }
    .so-smm-chip.active {
      background: rgba(201,168,76,0.12);
      border-color: rgba(201,168,76,0.5);
      color: #e8c97a;
    }
    .so-smm-chip i { font-size: 1rem; }
    .so-divider {
      height: 1px;
      background: rgba(201,168,76,0.12);
      margin: 1.2rem 0;
    }
    .so-qty-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .so-qty-btn {
      width: 34px; height: 34px;
      border-radius: 7px;
      border: 1px solid rgba(201,168,76,0.3);
      background: rgba(201,168,76,0.08);
      color: #e8c97a;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
    }
    .so-qty-btn:hover { background: rgba(201,168,76,0.18); }
    .so-qty-display {
      font-size: 1rem;
      font-weight: 600;
      color: #f7f3ec;
      min-width: 60px;
      text-align: center;
    }
  `;

  /* inject shared CSS once */
  if (!document.getElementById('so-styles')) {
    const style = document.createElement('style');
    style.id = 'so-styles';
    style.textContent = sharedCSS;
    document.head.appendChild(style);
  }

  /* ── Find injection point ── */
  function getContainer() {
    return document.getElementById('service-options-container');
  }

  /* ════════════════════════════════════════════
     1. EMAIL MARKETING
     ════════════════════════════════════════════ */
  function buildEmailMarketing(base) {
    let qty = 1;
    const c = getContainer();
    c.innerHTML = `
      <div class="so-wrap">
        <div class="so-section-label"><i class="fas fa-envelope-open-text"></i> Email Campaign Details</div>

        <div class="so-price-preview">
          <span>Price per sending</span>
          <span>${fmt(base)}</span>
        </div>

        <div class="so-group">
          <label class="so-label">Number of Sendings</label>
          <div class="so-qty-row">
            <button class="so-qty-btn" id="em-minus">−</button>
            <span class="so-qty-display" id="em-qty-display">1</span>
            <button class="so-qty-btn" id="em-plus">+</button>
          </div>
          <div class="so-hint">Each sending = ${fmt(base)}. Total updates automatically.</div>
        </div>

        <div class="so-group">
          <label class="so-label">Email Subject Line <span style="color:#8a96b0;font-weight:300;">(for each sending)</span></label>
          <input class="so-input" id="em-subject" type="text" placeholder="e.g. Exclusive offer just for you 🎯" maxlength="150">
          <div class="so-hint">Keep it under 60 characters for best open rates.</div>
        </div>

        <div class="so-group">
          <label class="so-label">HTML Design Brief</label>
          <textarea class="so-textarea" id="em-design" placeholder="Describe how you'd like the email designed — colors, layout, tone, logo placement, call-to-action text, etc." maxlength="1000"></textarea>
          <div class="so-hint">Our team will design the HTML template based on your brief. The more detail, the better the result.</div>
        </div>

        <div class="so-alert">
          <i class="fas fa-info-circle"></i>
          <span>HTML email templates are designed by our team at no extra cost. Please provide as much detail as possible in the brief above.</span>
        </div>
      </div>
    `;

    function refresh() {
      document.getElementById('em-qty-display').textContent = qty;
      updatePrice(base * qty);
    }

    document.getElementById('em-minus').addEventListener('click', () => { if (qty > 1) { qty--; refresh(); } });
    document.getElementById('em-plus').addEventListener('click',  () => { qty++; refresh(); });
    refresh();
  }

  /* ════════════════════════════════════════════
     2. DATA SCRAPING
     ════════════════════════════════════════════ */
  function buildDataScraping(base) {
    let qty = 1; // qty × 1000 emails
    const c = getContainer();
    c.innerHTML = `
      <div class="so-wrap">
        <div class="so-section-label"><i class="fas fa-database"></i> Data Scraping Details</div>

        <div class="so-price-preview">
          <span>Price per 1,000 emails</span>
          <span>${fmt(base)}</span>
        </div>

        <div class="so-group">
          <label class="so-label">Number of Emails Required</label>
          <div class="so-qty-row">
            <button class="so-qty-btn" id="ds-minus">−</button>
            <span class="so-qty-display" id="ds-qty-display">1,000</span>
            <button class="so-qty-btn" id="ds-plus">+</button>
          </div>
          <div class="so-hint">Minimum 1,000 · increases in steps of 1,000 · ${fmt(base)} per 1,000.</div>
        </div>

        <div class="so-group">
          <label class="so-label">Target Niche / Audience</label>
          <textarea class="so-textarea" id="ds-niche" placeholder="Describe the type of contacts you need — industry, job titles, company size, country, any specific platforms (LinkedIn, websites, etc.). The more specific, the better the data quality." maxlength="1500"></textarea>
          <div class="so-hint">250–300 words recommended for best accuracy.</div>
        </div>
      </div>
    `;

    function refresh() {
      document.getElementById('ds-qty-display').textContent = (qty * 1000).toLocaleString();
      updatePrice(base * qty);
    }

    document.getElementById('ds-minus').addEventListener('click', () => { if (qty > 1) { qty--; refresh(); } });
    document.getElementById('ds-plus').addEventListener('click',  () => { qty++; refresh(); });
    refresh();
  }

  /* ════════════════════════════════════════════
     3. SEO SERVICES
     ════════════════════════════════════════════ */
  function buildSEO(base) {
    let urls = [''];
    const c = getContainer();
    c.innerHTML = `
      <div class="so-wrap">
        <div class="so-section-label"><i class="fas fa-search"></i> SEO Service Details</div>

        <div class="so-alert">
          <i class="fas fa-exclamation-triangle"></i>
          <span><strong>Important:</strong> Please contact our team before placing your SEO order to get a proper plan tailored to your website. Placing an order without consultation may result in a mismatch of expectations.</span>
        </div>

        <div class="so-price-preview">
          <span>Price per website</span>
          <span>${fmt(base)}</span>
        </div>

        <div class="so-group">
          <label class="so-label">Website URLs</label>
          <div id="seo-url-list"></div>
          <button class="so-add-btn" id="seo-add-url">
            <i class="fas fa-plus"></i> Add Another Website
          </button>
          <div class="so-hint">Each additional website doubles the price proportionally (${fmt(base)} per site).</div>
        </div>
      </div>
    `;

    function renderUrls() {
      const list = document.getElementById('seo-url-list');
      list.innerHTML = '';
      urls.forEach((val, i) => {
        const row = document.createElement('div');
        row.className = 'so-url-row';
        row.innerHTML = `
          <input class="so-input seo-url-input" type="url" placeholder="https://yourwebsite.com" value="${val}">
          ${i > 0 ? `<button class="so-remove-btn seo-remove" data-i="${i}"><i class="fas fa-times"></i> Remove</button>` : ''}
        `;
        list.appendChild(row);
      });

      list.querySelectorAll('.seo-url-input').forEach((inp, i) => {
        inp.addEventListener('input', () => { urls[i] = inp.value; });
      });
      list.querySelectorAll('.seo-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          urls.splice(parseInt(btn.dataset.i), 1);
          renderUrls();
          updatePrice(base * urls.length);
        });
      });

      updatePrice(base * urls.length || base);
    }

    document.getElementById('seo-add-url').addEventListener('click', () => {
      urls.push('');
      renderUrls();
    });

    renderUrls();
  }

  /* ════════════════════════════════════════════
     4. ADMINISTRATIVE SUPPORT
     ════════════════════════════════════════════ */
  function buildAdminSupport(base) {
    const c = getContainer();
    c.innerHTML = `
      <div class="so-wrap">
        <div class="so-section-label"><i class="fas fa-briefcase"></i> Administrative Support Details</div>

        <div class="so-price-preview">
          <span>Price per day (5 hrs)</span>
          <span>${fmt(base)}</span>
        </div>

        <div class="so-group">
          <label class="so-label">Number of Days</label>
          <div class="so-qty-row">
            <button class="so-qty-btn" id="as-minus">−</button>
            <span class="so-qty-display" id="as-qty-display">1 day</span>
            <button class="so-qty-btn" id="as-plus">+</button>
          </div>
          <div class="so-hint">Each day = 5 hours of dedicated virtual assistant time at ${fmt(base)}/day.</div>
        </div>

        <div class="so-group">
          <label class="so-label">Type of Task</label>
          <select class="so-select" id="as-task-type">
            <option value="">— Select a task type —</option>
            <option value="data-entry">Data Entry / Excel Work</option>
            <option value="wordpress">WordPress Website Management</option>
            <option value="real-estate">Real Estate Listing</option>
            <option value="research">Online Research</option>
            <option value="scheduling">Scheduling & Calendar Management</option>
            <option value="other">Other (describe below)</option>
          </select>
        </div>

        <div class="so-group">
          <label class="so-label">Task Description</label>
          <textarea class="so-textarea" id="as-desc" placeholder="Please describe the tasks you need completed — include any specific tools, platforms, access requirements, or deadlines." maxlength="1000"></textarea>
          <div class="so-hint">The more detail you provide, the faster we can get started.</div>
        </div>

        <div class="so-group">
          <label class="so-label">Preferred Working Hours <span style="color:#8a96b0;font-weight:300;">(optional)</span></label>
          <input class="so-input" id="as-hours" type="text" placeholder="e.g. 9am–2pm GMT, weekdays only">
        </div>
      </div>
    `;

    let days = 1;
    function refresh() {
      document.getElementById('as-qty-display').textContent = days === 1 ? '1 day' : days + ' days';
      updatePrice(base * days);
    }

    document.getElementById('as-minus').addEventListener('click', () => { if (days > 1) { days--; refresh(); } });
    document.getElementById('as-plus').addEventListener('click',  () => { days++; refresh(); });
    refresh();
  }

  /* ════════════════════════════════════════════
     5. DATABASE
     ════════════════════════════════════════════ */
  function buildDatabase(base) {
    let qty = 1;
    const c = getContainer();
    c.innerHTML = `
      <div class="so-wrap">
        <div class="so-section-label"><i class="fas fa-server"></i> Database Order Details</div>

        <div class="so-alert">
          <i class="fas fa-exclamation-triangle"></i>
          <span><strong>Important:</strong> Please contact our team before ordering to confirm we have data available for your specific niche. <strong>Refunds are not available</strong> if the order is placed without prior confirmation.</span>
        </div>

        <div class="so-price-preview">
          <span>Price per 1,000 contacts</span>
          <span>${fmt(base)}</span>
        </div>

        <div class="so-group">
          <label class="so-label">Number of Contacts Required</label>
          <div class="so-qty-row">
            <button class="so-qty-btn" id="db-minus">−</button>
            <span class="so-qty-display" id="db-qty-display">1,000</span>
            <button class="so-qty-btn" id="db-plus">+</button>
          </div>
          <div class="so-hint">Minimum 1,000 · increases in steps of 1,000 · ${fmt(base)} per 1,000.</div>
        </div>

        <div class="so-group">
          <label class="so-label">Target Niche / Industry</label>
          <textarea class="so-textarea" id="db-niche" placeholder="Describe the niche or industry you need data for — e.g. real estate agents in the USA, e-commerce store owners in the UK, healthcare professionals, etc." maxlength="1500"></textarea>
          <div class="so-hint">Be as specific as possible. Contact us first to verify availability.</div>
        </div>

        <div class="so-group">
          <label class="so-label">Country / Region</label>
          <input class="so-input" id="db-country" type="text" placeholder="e.g. USA, UK, Canada, Australia, or Worldwide">
        </div>
      </div>
    `;

    function refresh() {
      document.getElementById('db-qty-display').textContent = (qty * 1000).toLocaleString();
      updatePrice(base * qty);
    }

    document.getElementById('db-minus').addEventListener('click', () => { if (qty > 1) { qty--; refresh(); } });
    document.getElementById('db-plus').addEventListener('click',  () => { qty++; refresh(); });
    refresh();
  }

  /* ════════════════════════════════════════════
     6. SMM SERVICES
     ════════════════════════════════════════════ */
  function buildSMM(base) {
    const platforms = {
      facebook  : { label: 'Facebook',  icon: 'fab fa-facebook',  urls: [] },
      instagram : { label: 'Instagram', icon: 'fab fa-instagram', urls: [] },
      linkedin  : { label: 'LinkedIn',  icon: 'fab fa-linkedin',  urls: [] },
    };
    const selected = new Set();

    const c = getContainer();
    c.innerHTML = `
      <div class="so-wrap">
        <div class="so-section-label"><i class="fas fa-share-alt"></i> SMM Service Details</div>

        <div class="so-price-preview">
          <span>Price per account/page</span>
          <span>${fmt(base)}</span>
        </div>

        <div class="so-group">
          <label class="so-label">Select Platforms</label>
          <div class="so-smm-platform">
            <button class="so-smm-chip" data-platform="facebook"><i class="fab fa-facebook"></i> Facebook</button>
            <button class="so-smm-chip" data-platform="instagram"><i class="fab fa-instagram"></i> Instagram</button>
            <button class="so-smm-chip" data-platform="linkedin"><i class="fab fa-linkedin"></i> LinkedIn</button>
          </div>
          <div class="so-hint">Each platform is ${fmt(base)}. Selecting multiple increases the total.</div>
        </div>

        <div id="smm-url-sections"></div>
      </div>
    `;

    function countTotalAccounts() {
      let total = 0;
      selected.forEach(p => { total += Math.max(1, platforms[p].urls.length); });
      return total || 1;
    }

    function renderPlatformUrls() {
      const sec = document.getElementById('smm-url-sections');
      sec.innerHTML = '';

      selected.forEach(platform => {
        const p = platforms[platform];
        if (p.urls.length === 0) p.urls = [''];

        const wrap = document.createElement('div');
        wrap.innerHTML = `
          <div class="so-divider"></div>
          <label class="so-label"><i class="${p.icon}"></i> ${p.label} Page URLs</label>
          <div id="smm-urls-${platform}"></div>
          <button class="so-add-btn smm-add-url" data-platform="${platform}" style="margin-top:0.4rem;">
            <i class="fas fa-plus"></i> Add Another ${p.label} URL
          </button>
          <div class="so-hint">Each additional URL = another account = +${fmt(base)}</div>
        `;
        sec.appendChild(wrap);

        function renderUrls() {
          const list = document.getElementById(`smm-urls-${platform}`);
          list.innerHTML = '';
          p.urls.forEach((val, i) => {
            const row = document.createElement('div');
            row.className = 'so-url-row';
            row.innerHTML = `
              <input class="so-input smm-url-inp" type="url" placeholder="https://facebook.com/yourpage" value="${val}">
              ${i > 0 ? `<button class="so-remove-btn smm-remove-url" data-platform="${platform}" data-i="${i}"><i class="fas fa-times"></i> Remove</button>` : ''}
            `;
            list.appendChild(row);
          });

          list.querySelectorAll('.smm-url-inp').forEach((inp, i) => {
            inp.addEventListener('input', () => { p.urls[i] = inp.value; });
          });
          list.querySelectorAll('.smm-remove-url').forEach(btn => {
            btn.addEventListener('click', () => {
              p.urls.splice(parseInt(btn.dataset.i), 1);
              renderUrls();
              updatePrice(base * countTotalAccounts());
            });
          });
        }

        renderUrls();

        wrap.querySelector('.smm-add-url').addEventListener('click', () => {
          p.urls.push('');
          renderUrls();
          updatePrice(base * countTotalAccounts());
        });
      });

      updatePrice(base * countTotalAccounts());
    }

    /* platform chip toggles */
    document.querySelectorAll('.so-smm-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const platform = chip.dataset.platform;
        if (selected.has(platform)) {
          selected.delete(platform);
          platforms[platform].urls = [];
          chip.classList.remove('active');
        } else {
          selected.add(platform);
          chip.classList.add('active');
        }
        renderPlatformUrls();
      });
    });

    updatePrice(base);
  }

  /* ════════════════════════════════════════════
     INIT — runs after DOM ready
     ════════════════════════════════════════════ */
  function init() {
    const params      = new URLSearchParams(window.location.search);
    const serviceName = params.get('service')
                     || localStorage.getItem('selectedService')
                     || '';

    const base = BASE[serviceName];
    if (!base) return; // unknown service — do nothing

    // inject container before the payment method section
    const formSection = document.querySelector('.form-section');
    if (!formSection) return;

    const container = document.createElement('div');
    container.id = 'service-options-container';
    formSection.parentNode.insertBefore(container, formSection);

   switch (serviceName) {

  case 'Email Marketing Package':
    buildEmailMarketing(base);
    break;

  case 'B2B Data Services & Lead Generation':
    buildDataScraping(base);
    break;

  case 'SEO Package — SEO Services Pricing':
    buildSEO(base);
    break;

  case 'Virtual Assistant & Administrative Support Services':
    buildAdminSupport(base);
    break;

  case 'B2B Data Services — Ready Database':
    buildDatabase(base);
    break;

  case 'Social Media Marketing Package':
    buildSMM(base);
    break;

  default:
    console.warn('No service option found for:', serviceName);
}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();