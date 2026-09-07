const express = require('express');
const router = express.Router();
const path = require('path');          // only once!
const User = require('../models/User');
const generateCode = require('../utils/generatecode');
const sendVerificationEmail = require('../utils/sendMailer');

// Serve signup form (GET)
router.get('/signup', (req, res) => {
  res.sendFile('signup.html', { root: path.join(__dirname, '../public') });
});

// Serve login form (GET)
router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: path.join(__dirname, '../public') });
});

// Signup POST
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).send('User already exists');
    }

    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // 🔥 Generate verification code
    const code = generateCode();

    // Save verification info in session
    req.session.userId = user._id;
    req.session.verificationCode = String(code).trim();
    req.session.verificationEmail = email;
    req.session.codeExpiresAt = Date.now() + 10 * 60 * 1000;

    // Send code to user's email
    await sendVerificationEmail(email, code);

    // Make sure session is saved before redirect
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Session error');
      }

      // Redirect to verification page
      res.redirect('/vcode.html');
    });

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Login POST
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid credentials');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).send('Invalid credentials');

    req.session.userId = user._id;
    res.redirect('/home.html');
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
// Returns the logged-in user's email and username as JSON.
// Used by accountdetais.js to populate the Account Details page.
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.session.userId).select('username email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ username: user.username, email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// SEND VERIFICATION CODE
router.post('/send-code', async (req, res) => {
  const email = req.body.email || req.session.verificationEmail;

  if (!email) {
    return res.status(400).send('Please enter your email.');
  }

  try {
    // 🔥 Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).send('No account found with this email. Please sign up first.');
    }

    const code = generateCode();

    req.session.verificationCode = String(code).trim();
    req.session.verificationEmail = email;
    req.session.codeExpiresAt = Date.now() + 10 * 60 * 1000;

    console.log('Generated Code:', req.session.verificationCode);

    await sendVerificationEmail(email, code);

    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Session error');
      }

      return res.send('Verification code sent');
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send('Failed to send verification code');
  }
});

// VERIFY CODE
router.post('/verify-code', (req, res) => {
  const { code } = req.body;

  if (!req.session.verificationCode) {
    return res.status(400).json({
      success: false,
      message: 'No code found. Please request again.'
    });
  }

  if (Date.now() > req.session.codeExpiresAt) {
    return res.status(400).json({
      success: false,
      message: 'Code expired'
    });
  }

  if (String(code).trim() !== String(req.session.verificationCode).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid code'
    });
  }

  // ✅ keep email but clear only verification code + expiry
  req.session.verificationCode = null;
  req.session.codeExpiresAt = null;

  // 🔥 Different redirect depending on why verification was requested
  if (req.session.userId) {
    return res.json({
      success: true,
      redirect: '/home.html'
    });
  }

  return res.json({
    success: true,
    redirect: '/passwordreset.html'
  });
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { password } = req.body;

  try {
    const email = req.session.verificationEmail;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Session expired' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    user.password = password;
    await user.save();

    // ✅ OPTIONAL BUT IMPORTANT: log user in after reset
    req.session.userId = user._id;

    req.session.verificationEmail = null;

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Error updating password' });
  }
});
// ── GET /auth/status ──────────────────────────────────────────────────────────
// Called by auth-check.js on every page to check login state
router.get('/status', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }

  try {
    const user = await User.findById(req.session.userId).select('username email');
    if (!user) {
      return res.json({ loggedIn: false });
    }
    return res.json({ loggedIn: true, user: { name: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.json({ loggedIn: false });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

module.exports = router;
