document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('resetForm');

  if (!form) {
    console.error("❌ Form not found");
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const passwordInput = document.getElementById('newPassword');

    if (!passwordInput) {
      console.error("❌ Password input not found");
      return;
    }

    const password = passwordInput.value.trim();

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
      console.log("Server response:", data);

      if (res.ok && data.success) {
        console.log("✅ Redirecting to home...");
        window.location.href = '/home.html';
      } else {
        alert(data.message || 'Failed to update password');
      }

    } catch (err) {
      console.error("❌ Error:", err);
      alert('Something went wrong');
    }
  });

});