// public/js/auth-check.js

(async () => {
  try {
    const res = await fetch('/auth/status');
    const data = await res.json();
    const menu = document.getElementById('user-dropdown-menu');
    const notice = document.getElementById('auth-notice');

    // ── PROTECTED PAGE GUARD ──
    const protectedPages = ['accountdetais', 'refer'];
    const currentPage = window.location.pathname;
    const isProtected = protectedPages.some(p => currentPage.includes(p));

    if (!data.loggedIn && isProtected) {
      document.body.innerHTML = `
        <div style="
          min-height:100vh;
          background:#0b1426;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          font-family:'Jost',sans-serif;
          text-align:center;
          padding:2rem;
        ">
          <div style="
            background:rgba(19,32,64,0.9);
            border:1px solid rgba(201,168,76,0.3);
            border-radius:16px;
            padding:3rem 2.5rem;
            max-width:440px;
            width:100%;
          ">
            <div style="font-size:2.5rem; margin-bottom:1rem;">🔒</div>
            <h2 style="
              font-family:'Cormorant Garamond',serif;
              color:#ffffff;
              font-size:1.8rem;
              font-weight:500;
              margin-bottom:0.8rem;
            ">Members Only</h2>
            <p style="
              color:#8a96b0;
              font-size:0.9rem;
              line-height:1.7;
              margin-bottom:2rem;
            ">You need to be logged in to access this page. Please log in or create a free account to continue.</p>
            <a href="/auth/login" style="
              display:inline-block;
              padding:0.8rem 2rem;
              background:linear-gradient(135deg,#c9a84c,#e8c97a);
              color:#0b1426;
              font-size:0.75rem;
              font-weight:600;
              letter-spacing:0.15em;
              text-transform:uppercase;
              border-radius:8px;
              text-decoration:none;
              margin-right:0.8rem;
              margin-bottom:0.5rem;
            ">Log In</a>
            <a href="/auth/signup" style="
              display:inline-block;
              padding:0.78rem 1.8rem;
              border:1px solid rgba(201,168,76,0.35);
              color:#e8c97a;
              font-size:0.75rem;
              font-weight:500;
              letter-spacing:0.15em;
              text-transform:uppercase;
              border-radius:8px;
              text-decoration:none;
              margin-bottom:0.5rem;
            ">Sign Up</a>
            <div style="margin-top:1.5rem;">
              <a href="/home.html" style="color:#8a96b0; font-size:0.8rem; text-decoration:none; letter-spacing:0.05em;">
                ← Back to Home
              </a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // ── DROPDOWN ──
    if (data.loggedIn) {
      if (menu) menu.innerHTML = `
        <div style="padding:0.6rem 1.2rem 0.4rem; font-size:0.75rem; color:var(--gold); letter-spacing:0.1em; text-transform:uppercase;">
          👤 ${data.user.name || 'My Account'}
        </div>
        <div class="dropdown-divider-gold"></div>
        <a class="dropdown-item" href="/accountdetais.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
            <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
          </svg> Account Details
        </a>
        <a class="dropdown-item" href="/refer.html">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5m-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
          </svg> Refer a Friend
        </a>
        <div class="dropdown-divider-gold"></div>
        <a class="dropdown-item" href="/auth/logout" style="color:#e07070 !important;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0z"/>
            <path fill-rule="evenodd" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
          </svg> Log Out
        </a>
      `;

    } else {
      // ── GUEST DROPDOWN ──
      if (menu) menu.innerHTML = `
        <a class="dropdown-item" href="/auth/login">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0z"/>
            <path fill-rule="evenodd" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
          </svg> Log In
        </a>
        <a class="dropdown-item" href="/auth/signup" style="color:var(--gold-light) !important;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
            <path fill-rule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5"/>
          </svg> Sign Up
        </a>
      `;

      // Show general notice banner
      if (notice) notice.style.display = 'block';

      // ── PRICING PAGE: intercept all Order Now buttons ──
            // ── PRICING PAGE: intercept all Order Now buttons ──
      const isOnPricingPage = window.location.pathname.includes('pricing');
      if (isOnPricingPage) {
       

        // Run now and also after DOM is fully ready
        attachOrderListeners();
        document.addEventListener('DOMContentLoaded', attachOrderListeners);
      }
    }

  } catch (err) {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.innerHTML = `<a class="dropdown-item" href="/auth/login">Log In</a>`;
    console.warn('Auth check failed:', err);
  }
})();