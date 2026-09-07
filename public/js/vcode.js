console.log("vcode.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('verificationForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    console.log("Form submitted");

    const input = document.getElementById('codeInput');

    if (!input) {
      console.error("❌ Input not found");
      alert("Input field missing");
      return;
    }

    const code = input.value.trim();
    console.log("Code entered:", code);

    try {
      const res = await fetch('/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      console.log("Server response:", data);

      if (res.ok && data.success) {
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
  // 🔥 RESEND CODE FINAL FIX
  // ============================

  const resendBtn = document.getElementById('resendBtn');
  const timerText = document.getElementById('timerText');

  if (!resendBtn || !timerText) return;

  let cooldown = 30;
  let timer;

  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;

    try {
      // 🔥 GET EMAIL FROM STORAGE
      const email = localStorage.getItem('resetEmail');

      if (!email) {
        alert("Session expired. Please enter email again.");
        window.location.href = '/enteremail.html';
        return;
      }

      const res = await fetch('/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }) // 🔥 KEY FIX
      });

      if (res.ok) {
        console.log("✅ Code resent");
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