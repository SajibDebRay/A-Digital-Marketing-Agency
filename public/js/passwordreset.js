document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('resetForm');

  if (!form) {
    console.error("❌ Form not found");
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const passwordInput = document.getElementById('newPassword');
    const confirmInput  = document.getElementById('confirmPassword');

    if (!passwordInput || !confirmInput) {
      console.error("❌ Password input not found");
      return;
    }

    // Not trimmed on purpose: the password must be saved exactly as typed,
    // because login.html and signup.html don't trim it either.
    const password = passwordInput.value;

    // pass.js already shows the "did not match" message and blocks its own submit,
    // but this handler would still run — so never send mismatched passwords to the server.
    if (password !== confirmInput.value) return;

    try {
      const res = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = '/';
      } else {
        alert(data.message || 'Failed to update password');
      }

    } catch (err) {
      console.error("❌ Error:", err);
      alert('Something went wrong');
    }
  });

});