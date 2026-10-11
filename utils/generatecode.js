const crypto = require('crypto');

// Cryptographically secure 6-digit code (Math.random() is predictable and not safe for this)
function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

module.exports = generateVerificationCode;