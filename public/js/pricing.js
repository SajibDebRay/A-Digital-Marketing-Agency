
/* =============================================
   CrackFlow Pricing & Service Order Handler
   =============================================
   Responsibilities:
   - Handle .order-btn elements on service pages.
   - Verify login status before checkout.
   - Map service cards using stable HTML IDs.
   - Preserve existing payment.html parameters.
   - Prevent duplicate click handling.
   
   The Pricing page has no .order-btn elements.
   Meta & Google Ads ordering remains disabled
   until its payment backend mapping is verified.
   ============================================= */

(function () {
  'use strict';

  // Canonical service names understood by the existing
  // service-options.js / payment.js workflow.
  var SERVICE_BY_CARD_ID = Object.freeze({
    'seo-package': 'SEO Services',
    'social-media': 'SMM Services',
    'email-marketing': 'Email Marketing',
    'lead-generation': 'Data Scraping',
    'ready-database': 'Database',
    'virtual-assistant': 'Administrative Support'
  });

  // Client-side display/reference prices only.
  // The server MUST independently validate all prices.
  var BASE_PRICES = Object.freeze({
    'SEO Services': 249.99,
    'SMM Services': 49.99,
    'Email Marketing': 5.99,
    'Data Scraping': 149.99,
    'Database': 49.99,
    'Administrative Support': 49.99
  });

  var listenersAttached = false;

  /**
   * Display the existing login notice.
   */
  function showLoginNotice() {
    var paywall = document.getElementById('paywall-notice');

    if (paywall) {
      paywall.style.display = 'block';
      paywall.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      return;
    }

    window.location.href = '/auth/login';
  }

  /**
   * Check the current authentication status.
   */
  async function checkAuthentication() {
    var response = await fetch('/auth/status', {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        'Authentication request failed: HTTP ' + response.status
      );
    }

    var data = await response.json();

    if (!data || typeof data.loggedIn !== 'boolean') {
      throw new Error('Invalid authentication response.');
    }

    return data;
  }

  /**
   * Resolve the service from the nearest card wrapper ID.
   */
  function getServiceFromButton(button) {
    var card = button.closest('.pricing-card');

    if (!card) {
      return null;
    }

    var wrapper = card.closest('[id]');

    if (!wrapper) {
      return null;
    }

    return SERVICE_BY_CARD_ID[wrapper.id] || null;
  }

  /**
   * Handle an individual order click.
   */
  async function onOrderClick(event, button) {
    event.preventDefault();
    event.stopPropagation();

    // Prevent multiple checkout attempts from repeated clicks.
    if (button.dataset.checkoutPending === 'true') {
      return;
    }

    button.dataset.checkoutPending = 'true';
    button.setAttribute('aria-disabled', 'true');

    try {
      // Verify login before proceeding.
      var authData = await checkAuthentication();

      if (!authData.loggedIn) {
        showLoginNotice();
        return;
      }

      // Resolve the service using its stable wrapper ID.
      var service = getServiceFromButton(button);

      if (!service) {
        throw new Error(
          'This service is not configured for the existing payment system.'
        );
      }

      var numericPrice = BASE_PRICES[service];

      if (
        typeof numericPrice !== 'number' ||
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0
      ) {
        throw new Error('Invalid service price configuration.');
      }

      var price = numericPrice.toFixed(2);

      // Retain the existing payment workflow's storage keys.
      try {
        localStorage.setItem('selectedService', service);
        localStorage.setItem('selectedPrice', price);
      } catch (storageError) {
        // Continue: URL parameters are still passed below.
        console.warn(
          'Local storage unavailable; continuing with URL parameters.',
          storageError
        );
      }

      // Preserve the existing payment page contract.
      // IMPORTANT: The server must validate the service and price.
      var checkoutUrl =
        '/payment.html?service=' +
        encodeURIComponent(service) +
        '&price=' +
        encodeURIComponent(price);

      window.location.assign(checkoutUrl);

    } catch (error) {
      console.error('Order processing error:', error);

      window.alert(
        'We could not process your order right now. ' +
        'Please refresh the page or contact CrackFlow.'
      );

    } finally {
      // Re-enable the button if navigation did not complete.
      button.dataset.checkoutPending = 'false';
      button.removeAttribute('aria-disabled');
    }
  }

  /**
   * Delegated click handler.
   * Supports order buttons added dynamically after page load.
   */
  function handleDocumentClick(event) {
    var target = event.target;

    if (!target || typeof target.closest !== 'function') {
      return;
    }

    var button = target.closest('.order-btn');

    if (!button) {
      return;
    }

    onOrderClick(event, button);
  }

  /**
   * Attach only one document-level listener.
   */
  function attachOrderListeners() {
    if (listenersAttached || !document) {
      return;
    }

    document.addEventListener('click', handleDocumentClick);

    listenersAttached = true;
  }

  // Preserve compatibility with existing pages/scripts.
  window.attachOrderListeners = attachOrderListeners;

  // Initialize safely regardless of script loading position.
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      attachOrderListeners,
      { once: true }
    );
  } else {
    attachOrderListeners();
  }

})();
