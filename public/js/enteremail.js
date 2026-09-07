const form = document.getElementById('forgotForm');
const button = form.querySelector('button');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = form.email.value.trim();

  // check if email is empty
  if (!email) {
    alert("Please enter your email.");
    return;
  }

  // 🔥 STORE IMMEDIATELY FOR RESEND FEATURE
  localStorage.setItem('resetEmail', email);
  console.log("Stored Email:", localStorage.getItem('resetEmail'));

  // disable button while sending request
  button.disabled = true;
  button.textContent = "Sending...";

  try {
    const res = await fetch('/auth/send-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // 🔥 keep session
      body: JSON.stringify({ email })
    });

    const message = await res.text();

    if (res.ok) {
      // redirect to verification page
      window.location.href = '/vcode.html';
    } else {
      alert(message || "No account found with this email. Please sign up first.");
    }

  } catch (error) {
    console.error(error);
    alert("Server error. Please try again.");
  }

  // enable button again if something fails
  button.disabled = false;
  button.textContent = "SEND VERIFICATION CODE";
});