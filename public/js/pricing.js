/* =============================================
   Cr@ckFlow Pricing Page — pricing.js
   Maps H3 text → canonical service names
   then checks login before redirecting
   ============================================= */

document.addEventListener("DOMContentLoaded", () => {

  // ── Maps the long SEO H3 text → canonical service name
  // that service-options.js and payment.js understand
  const SERVICE_NAME_MAP = {
    'email marketing package'                             : 'Email Marketing',
    'b2b data services & lead generation'                 : 'Data Scraping',
    'b2b data services and lead generation'               : 'Data Scraping',
    'seo package — seo services pricing'                  : 'SEO Services',
    'seo package – seo services pricing'                  : 'SEO Services',
    'virtual assistant & administrative support services' : 'Administrative Support',
    'virtual assistant and administrative support services': 'Administrative Support',
    'b2b data services — ready database'                  : 'Database',
    'b2b data services – ready database'                  : 'Database',
    'social media marketing package'                      : 'SMM Services',
  };

  const BASE_PRICES = {
    'Email Marketing'      : 5.99,
    'Data Scraping'        : 149.99,
    'SEO Services'         : 249.99,
    'Administrative Support': 49.99,
    'Database'             : 49.99,
    'SMM Services'         : 49.99,
  };

  const orderButtons = document.querySelectorAll(".order-btn");
  console.log("Order buttons found:", orderButtons.length);

  orderButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("Order Now clicked");

      // ── Auth check first ──
      try {
        const res  = await fetch('/auth/status');
        const data = await res.json();

        if (!data.loggedIn) {
          const paywall = document.getElementById('paywall-notice');
          if (paywall) {
            paywall.style.display = 'block';
            paywall.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      } catch (err) {
        console.warn('Auth check failed:', err);
        return;
      }

      // ── Get card info ──
      const card = btn.closest(".pricing-card");
      if (!card) { console.error("Pricing card not found."); return; }

      const h3El     = card.querySelector("h3");
      const amountEl = card.querySelector(".price-amount");
      const centsEl  = card.querySelector(".price-cents");

      if (!h3El || !amountEl || !centsEl) {
        console.error("Service or price element missing.");
        return;
      }

      // ── Map long H3 text → canonical service name ──
      const h3Raw      = h3El.innerText.trim().toLowerCase()
                          .replace(/\s+/g, ' ')   // collapse whitespace
                          .replace(/&/g, 'and');   // normalise ampersands
      const service    = SERVICE_NAME_MAP[h3Raw] || h3El.innerText.trim();
      const basePrice  = BASE_PRICES[service];

      const amount = amountEl.innerText.replace(/[^0-9.]/g, "").trim();
      const cents  = centsEl.innerText.replace(/[^0-9]/g, "").padStart(2, "0");
      const price  = basePrice ? basePrice.toFixed(2) : `${amount}.${cents}`;

      console.log("Canonical service:", service, "| Price:", price);

      // ── Save & redirect ──
      localStorage.setItem("selectedService", service);
      localStorage.setItem("selectedPrice",   price);

      window.location.href =
        `payment.html?service=${encodeURIComponent(service)}&price=${encodeURIComponent(price)}`;
    });
  });

});