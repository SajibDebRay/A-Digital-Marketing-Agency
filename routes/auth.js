const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../models/User');
const generateCode = require('../utils/generatecode');
const { sendVerificationEmail } = require('../utils/sendMailer');

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
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = new User({ username, email, password });
    await user.save();

    // Generate verification code and save to DB (not session)
    const code = generateCode();
    user.verificationCode  = String(code).trim();
    user.codeExpiresAt     = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send code to user's email
    await sendVerificationEmail(email, code);

    // Save email to session as fallback, but main flow uses DB
    req.session.userId = user._id;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      res.json({
        success: true,
        message: 'Account created! Check your email for a verification code.',
        redirect: '/vcode.html'
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login POST
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    req.session.userId = user._id;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      res.json({ success: true, message: 'Welcome back!', redirect: '/home.html' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const user = await User.findById(req.session.userId).select('username email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ username: user.username, email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── SEND VERIFICATION CODE ────────────────────────────────────────────────────
// Used for both signup resend and password reset flow
router.post('/send-code', async (req, res) => {
  const email = req.body.email;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please enter your email.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'No account found with this email. Please sign up first.' });
    }

    const code = generateCode();
    user.verificationCode = String(code).trim();
    user.codeExpiresAt    = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(email, code);
    return res.json({ success: true, message: 'Verification code sent' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
});

// ── VERIFY CODE ───────────────────────────────────────────────────────────────
// Uses email + DB — no session dependency, works reliably on Railway
router.post('/verify-code', async (req, res) => {
  const { code, email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !user.verificationCode) {
      return res.status(400).json({ success: false, message: 'No code found. Please request again.' });
    }

    if (Date.now() > new Date(user.codeExpiresAt).getTime()) {
      return res.status(400).json({ success: false, message: 'Code expired.' });
    }

    if (String(code).trim() !== String(user.verificationCode).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid code.' });
    }

    // Clear code from DB
    user.verificationCode = null;
    user.codeExpiresAt    = null;
    await user.save();

    // Set session and redirect
    req.session.userId = user._id;
    req.session.save((err) => {
      if (err) return res.status(500).json({ success: false, message: 'Session error.' });

      // If user came from signup → home, if from password reset → passwordreset
      const redirect = req.body.flow === 'reset' ? '/passwordreset.html' : '/home.html';
      return res.json({ success: true, redirect });
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { password, email } = req.body;

  try {
    const resolvedEmail = email || req.session.verificationEmail;

    if (!resolvedEmail) {
      return res.status(400).json({ success: false, message: 'Session expired' });
    }

    const user = await User.findOne({ email: resolvedEmail });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    user.password = password;
    await user.save();

    req.session.userId = user._id;
    req.session.verificationEmail = null;

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

// ── GET /auth/status ──────────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }
  try {
    const user = await User.findById(req.session.userId).select('username email');
    if (!user) return res.json({ loggedIn: false });
    return res.json({ loggedIn: true, user: { name: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.json({ loggedIn: false });
  }
});

module.exports = router;