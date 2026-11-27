
/* =============================================
   CrackFlow Authentication & Account Menu
   =============================================
   Responsibilities:
   - Verify login status.
   - Render logged-in and guest dropdown menus.
   - Display the guest notice banner.
   - Protect designated pages at the UI level.
   - Handle authentication request failures safely.

   IMPORTANT:
   Protected routes and private data must also be
   secured by the server.
   ============================================= */

(function () {
  'use strict';

  /**
   * Escape user-provided text before inserting into HTML.
   */
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      var entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };

      return entities[character];
    });
  }

  /**
   * Determine whether the current page requires login.
   */
  function isProtectedPage() {
    var pathname = window.location.pathname
      .toLowerCase()
      .replace(/\/+$/, '');

    var protectedPaths = new Set([
      '/accountdetais.html',
      '/accountdetais',
      '/refer.html',
      '/refer'
    ]);

    return protectedPaths.has(pathname);
  }

  /**
   * Request authentication status from the server.
   */
  async function getAuthenticationStatus() {
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
   * Hide the guest notice banner.
   */
  function hideGuestNotice() {
    var notice = document.getElementById('auth-notice');

    if (notice) {
      notice.style.display = 'none';
    }
  }

  /**
   * Display the guest notice banner.
   */
  function showGuestNotice() {
    var notice = document.getElementById('auth-notice');

    if (notice) {
      notice.style.display = 'block';
    }
  }

  /**
   * Render the logged-in account dropdown.
   */
  function renderLoggedInMenu(menu, user) {
    if (!menu) {
      return;
    }

    var name =
      user && typeof user.name === 'string' && user.name.trim()
        ? user.name.trim()
        : 'My Account';

    // Escape the dynamic username before HTML insertion.
    var safeName = escapeHTML(name);

    menu.innerHTML = `
      <div style="
        padding:0.6rem 1.2rem 0.4rem;
        font-size:0.75rem;
        color:var(--gold);
        letter-spacing:0.1em;
        text-transform:uppercase;
      ">
        👤 ${safeName}
      </div>

      <div class="dropdown-divider-gold"></div>

      <a class="dropdown-item" href="/accountdetais.html">
        <i class="fas fa-user-circle mr-2" aria-hidden="true"></i>
        Account Details
      </a>

      <a class="dropdown-item" href="/refer.html">
        <i class="fas fa-share-alt mr-2" aria-hidden="true"></i>
        Refer a Friend
      </a>

      <div class="dropdown-divider-gold"></div>

      <a class="dropdown-item" href="/auth/logout"
         style="color:#e07070 !important;">
        <i class="fas fa-sign-out-alt mr-2" aria-hidden="true"></i>
        Log Out
      </a>
    `;
  }

  /**
   * Render the guest dropdown.
   */
  function renderGuestMenu(menu) {
    if (!menu) {
      return;
    }

    menu.innerHTML = `
      <a class="dropdown-item" href="/auth/login">
        <i class="fas fa-sign-in-alt mr-2" aria-hidden="true"></i>
        Log In
      </a>

      <a class="dropdown-item"
         href="/auth/signup"
         style="color:var(--gold-light) !important;">
        <i class="fas fa-user-plus mr-2" aria-hidden="true"></i>
        Sign Up
      </a>
    `;
  }

  /**
   * Show an access-denied screen for logged-out visitors.
   * Used only on designated protected pages.
   */
  function showMembersOnlyScreen() {
    document.body.innerHTML = `
      <main style="
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
          <div style="font-size:2.5rem;margin-bottom:1rem;">
            🔒
          </div>

          <h2 style="
            font-family:'Cormorant Garamond',serif;
            color:#ffffff;
            font-size:1.8rem;
            font-weight:500;
            margin-bottom:0.8rem;
          ">
            Members Only
          </h2>

          <p style="
            color:#8a96b0;
            font-size:0.9rem;
            line-height:1.7;
            margin-bottom:2rem;
          ">
            You need to be logged in to access this page.
            Please log in or create an account to continue.
          </p>

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
          ">
            Log In
          </a>

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
          ">
            Sign Up
          </a>

          <div style="margin-top:1.5rem;">
            <a href="/" style="
              color:#8a96b0;
              font-size:0.8rem;
              text-decoration:none;
              letter-spacing:0.05em;
            ">
              ← Back to Home
            </a>
          </div>
        </div>
      </main>
    `;
  }

  /**
   * Show a verification-error screen when authentication
   * cannot be confirmed on a protected page.
   */
  function showVerificationError() {
    document.body.innerHTML = `
      <main style="
        min-height:100vh;
        background:#0b1426;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:2rem;
        font-family:'Jost',sans-serif;
      ">
        <div style="
          max-width:440px;
          width:100%;
          padding:3rem 2rem;
          background:#132040;
          border:1px solid rgba(201,168,76,.3);
          border-radius:16px;
        ">
          <h2 style="color:#fff;">Session Verification Failed</h2>

          <p style="
            color:#8a96b0;
            line-height:1.7;
            margin:1rem 0 2rem;
          ">
            We couldn't verify your account right now.
            Please try again or log in to continue.
          </p>

          <a href="" style="
            display:inline-block;
            padding:.8rem 1.5rem;
            background:linear-gradient(135deg,#c9a84c,#e8c97a);
            color:#0b1426;
            text-decoration:none;
            border-radius:8px;
            font-weight:600;
          ">
            Retry
          </a>

          <p style="margin-top:1.5rem;">
            <a href="/auth/login" style="color:#e8c97a;">
              Log In
            </a>
            &nbsp; · &nbsp;
            <a href="/" style="color:#8a96b0;">
              Home
            </a>
          </p>
        </div>
      </main>
    `;
  }

  /**
   * Main authentication initialization.
   */
  async function initializeAuth() {
    var menu = document.getElementById('user-dropdown-menu');
    var protectedPage = isProtectedPage();

    try {
      var data = await getAuthenticationStatus();

      if (!data.loggedIn && protectedPage) {
        showMembersOnlyScreen();
        return;
      }

      if (data.loggedIn) {
        renderLoggedInMenu(menu, data.user);
        hideGuestNotice();
      } else {
        renderGuestMenu(menu);
        showGuestNotice();
      }

    } catch (error) {
      console.error('CrackFlow authentication check failed:', error);

      if (protectedPage) {
        // Do not display protected page content when the
        // browser cannot verify the current session.
        showVerificationError();
        return;
      }

      // Keep account navigation usable during API failures.
      // This is a guest fallback, not proof that the user
      // is actually logged out.
      renderGuestMenu(menu);
      showGuestNotice();
    }
  }

  // Initialize once the script runs.
  initializeAuth();

})();
