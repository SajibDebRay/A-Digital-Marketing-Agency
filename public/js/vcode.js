console.log("vcode.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('verificationForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form submitted");

    const input = document.getElementById('codeInput');
    if (!input) {
      console.error("Input not found");
      alert("Input field missing");
      return;
    }

    const code = input.value.trim();
    // ✅ FIX 1: also retrieve email — backend now looks up by email+code, not session
    const email = localStorage.getItem('pendingEmail');
    console.log("Code entered:", code, "| Email:", email);

    if (!email) {
      alert("Session expired. Please sign up again.");
      window.location.href = '/signup.html';
      return;
    }

    try {
      const res = await fetch('/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, email }) // ✅ FIX 1: send email alongside code
      });

      const data = await res.json();
      console.log("Server response:", data);

      if (res.ok && data.success) {
        localStorage.removeItem('pendingEmail'); // ✅ clean up after success
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
  // ============================
  const resendBtn = document.getElementById('resendBtn');
  const timerText = document.getElementById('timerText');

  if (!resendBtn || !timerText) return;

  let cooldown = 30;
  let timer;

  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;

    // ✅ FIX 2: was 'resetEmail' — correct key is 'pendingEmail' for signup flow
    const email = localStorage.getItem('pendingEmail');

    if (!email) {
      alert("Session expired. Please sign up again.");
      window.location.href = '/signup.html';
      return;
    }

    try {
      const res = await fetch('/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        console.log("Code resent");
        startCooldown();
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

  function startCooldown() {
    cooldown = 30;
    timerText.textContent = `Resend available in ${cooldown}s`;

    timer = setInterval(() => {
      cooldown--;
      timerText.textContent = `Resend available in ${cooldown}s`;
      if (cooldown <= 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        timerText.textContent = '';
      }
    }, 1000);
  }
});