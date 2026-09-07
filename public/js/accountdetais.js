// accountdetais.js
// Fetches the logged-in user's details from the server and populates the Account Details page.

document.addEventListener('DOMContentLoaded', function () {
  fetch('/auth/me')
    .then(function (res) {
      if (res.status === 401) {
        // Not logged in — redirect to login
        window.location.href = '/login.html';
        return null;
      }
      return res.json();
    })
    .then(function (data) {
      if (!data) return;
      document.getElementById('referralLink').value = data.email || '';
      document.getElementById('username').value   = data.username || '';
    })
    .catch(function (err) {
      console.error('Failed to load account details:', err);
    });
});
