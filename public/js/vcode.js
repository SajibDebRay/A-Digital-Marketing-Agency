console.log("vcode.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('verificationForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const input = document.getElementById('codeInput');
    if (!input) {
      console.error("Input not found");
      alert("Input field missing");
      return;
    }

    const code = input.value.trim();

    // The page's inline script already shows the "enter 6 digits" error.
    // Don't send incomplete codes to the server (each wrong code uses up one of the 5 attempts).
    if (!/^\d{6}$/.test(code)) return;

    // The server remembers which email/flow this is (signup, unverified login or password reset)
    // in the session, so no email is needed from localStorage any more.
    try {
      const res = await fetch('/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.removeItem('resetEmail'); // clean up after success
        window.location.href = data.redirect;
      } else {
        alert(data.message || 'Invalid or expired code');
      }

    } catch (err) {
      console.error("ERROR:", err);
      alert('Something went wrong');
    }
  });

  // ============================
  // RESEND CODE
  // (the countdown timer is handled by the inline script in vcode.html)
  // ============================
  const resendBtn = document.getElementById('resendBtn');
  if (!resendBtn) return;

  resendBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})   // server uses the email stored in the session
      });

      if (res.ok) {
        console.log("Code resent");
      } else {
        const text = await res.text();
        console.error("Resend failed:", text);
        alert(text || 'Failed to resend code');
        resendBtn.disabled = false;
      }

    } catch (err) {
      console.error("ERROR:", err);
      alert('Error sending code');
      resendBtn.disabled = false;
    }
  });
});