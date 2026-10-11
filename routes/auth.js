const express = require('express');
const router = express.Router();
const path = require('path');          // only once!
const User = require('../models/User');
const generateCode = require('../utils/generatecode');
const { sendVerificationEmail } = require('../utils/sendMailer');

// Max wrong guesses allowed per emailed code before it is thrown away
const MAX_CODE_ATTEMPTS = 5;

// Minimum time between two emails to the same address (stops email bombing).
// vcode.html already makes the user wait 60s before the Resend button works.
const RESEND_COOLDOWN_MS = 30 * 1000;

// ── Tiny in-memory IP rate limiter (no extra npm package needed) ──────────────
// Works correctly on Railway because server.js sets app.set('trust proxy', 1).
function rateLimit({ windowMs, max, json = true, message = 'Too many requests. Please try again later.' }) {
  const hits = new Map(); // ip -> { count, resetAt }

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count++;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return json
        ? res.status(429).json({ success: false, message })
        : res.status(429).send(message);
    }

    next();
  };
}

const WINDOW = 15 * 60 * 1000; // 15 minutes
const signupLimiter     = rateLimit({ windowMs: WINDOW, max: 10 });
const loginLimiter      = rateLimit({ windowMs: WINDOW, max: 20 });
const sendCodeLimiter   = rateLimit({ windowMs: WINDOW, max: 10, json: false });
const verifyCodeLimiter = rateLimit({ windowMs: WINDOW, max: 30 });

// ── Per-email resend cooldown ─────────────────────────────────────────────────
const lastCodeSent = new Map(); // email -> timestamp

function onCooldown(email) {
  const last = lastCodeSent.get(String(email).toLowerCase());
  return !!last && Date.now() - last < RESEND_COOLDOWN_MS;
}

function markSent(email) {
  if (lastCodeSent.size > 5000) {
    const now = Date.now();
    for (const [key, ts] of lastCodeSent) if (now - ts >= RESEND_COOLDOWN_MS) lastCodeSent.delete(key);
  }
  lastCodeSent.set(String(email).toLowerCase(), Date.now());
}

// Creates a fresh code, stores it in the session and emails it.
// Email sending never blocks the response (a slow/misconfigured SMTP must not freeze the request).
function startVerification(req, user, purpose) {
  const code = generateCode();

  // Only a signup verification keeps a pending user; the user is NOT logged in until the code is verified
  req.session.pendingUserId = purpose === 'signup' ? user._id : null;
  req.session.verificationPurpose = purpose;      // 'signup' | 'reset'
  req.session.codeVerified = false;
  req.session.codeAttempts = 0;
  req.session.verificationCode = String(code).trim();
  req.session.verificationEmail = user.email;
  req.session.codeExpiresAt = Date.now() + 10 * 60 * 1000;

  markSent(user.email);

  sendVerificationEmail(user.email, code).catch((err) => {
    console.error('⚠️ Failed to send verification email:', err);
  });
}

// Serve signup form (GET)
router.get('/signup', (req, res) => {
  res.sendFile('signup.html', { root: path.join(__dirname, '../public') });
});

// Serve login form (GET)
router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: path.join(__dirname, '../public') });
});

// Signup POST
router.post('/signup', signupLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  // Reject objects/arrays (prevents NoSQL-injection style input like {"$ne": null})
  if ([username, email, password].some((v) => typeof v !== 'string')) {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }

  // Same rules the signup form shows (the form only displays them, it doesn't block submit)
  if (username.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Password must be between 8 and 128 characters.' });
  }

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = new User({
      username,
      email,
      password,
      verified: false   // becomes true after the emailed code is verified
    });

    await user.save();

    startVerification(req, user, 'signup');

    // Make sure session is saved before responding
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }

      // Tell the frontend where to go next instead of redirecting from the server
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
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    // Password is right but the email was never verified → send a new code, do NOT log in.
    // (Old accounts without the field are treated as verified: only an explicit false blocks.)
    if (user.verified === false) {
      if (onCooldown(user.email)) {
        return res.status(429).json({
          success: false,
          message: 'A verification code was just sent to your email. Please wait a moment and try again.'
        });
      }

      startVerification(req, user, 'signup');

      return req.session.save((err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: 'Session error' });
        }

        return res.status(403).json({
          success: false,
          message: 'Please verify your email first. We sent you a new code.',
          redirect: '/vcode.html'
        });
      });
    }

    req.session.userId = user._id;

    // Make sure the session is actually saved before telling the frontend it's OK to move on
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }

      res.json({ success: true, message: 'Welcome back!', redirect: '/' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
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
router.post('/send-code', sendCodeLimiter, async (req, res) => {
  const email = req.body.email || req.session.verificationEmail;

  if (!email || typeof email !== 'string') {
    return res.status(400).send('Please enter your email.');
  }

  try {
    // 🔥 Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).send('No account found with this email. Please sign up first.');
    }

    if (onCooldown(user.email)) {
      return res.status(429).send('Please wait a few seconds before requesting another code.');
    }

    // Resending during signup keeps the 'signup' purpose; anything else is a password reset
    const isSignupResend =
      req.session.pendingUserId && String(req.session.pendingUserId) === String(user._id);

    startVerification(req, user, isSignupResend ? 'signup' : 'reset');

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
router.post('/verify-code', verifyCodeLimiter, async (req, res) => {
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

  // Too many wrong guesses → the code is thrown away and a new one must be requested
  if ((req.session.codeAttempts || 0) >= MAX_CODE_ATTEMPTS) {
    req.session.verificationCode = null;
    req.session.codeExpiresAt = null;
    return res.status(429).json({
      success: false,
      message: 'Too many incorrect attempts. Please request a new code.'
    });
  }

  if (String(code).trim() !== String(req.session.verificationCode).trim()) {
    req.session.codeAttempts = (req.session.codeAttempts || 0) + 1;
    return res.status(400).json({
      success: false,
      message: 'Invalid code'
    });
  }

  // ✅ keep email but clear only verification code + expiry
  req.session.verificationCode = null;
  req.session.codeExpiresAt = null;
  req.session.codeAttempts = 0;

  try {
    // 🔥 Different behaviour depending on why verification was requested
    if (req.session.verificationPurpose === 'signup' && req.session.pendingUserId) {
      // Email verified → mark the account verified and log the user in
      await User.findByIdAndUpdate(req.session.pendingUserId, { verified: true });

      req.session.userId = req.session.pendingUserId;
      req.session.pendingUserId = null;
      req.session.verificationPurpose = null;

      return req.session.save((err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: 'Session error' });
        }
        return res.json({ success: true, redirect: '/' });
      });
    }

    // Password reset: mark this session as verified so /reset-password is allowed
    req.session.codeVerified = true;

    return req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      return res.json({ success: true, redirect: '/passwordreset.html' });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { password } = req.body;

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Password must be between 8 and 128 characters.' });
  }

  try {
    const email = req.session.verificationEmail;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Session expired' });
    }

    // 🔒 The emailed code must have been verified in this session first
    if (req.session.verificationPurpose !== 'reset' || req.session.codeVerified !== true) {
      return res.status(403).json({ success: false, message: 'Please verify your email code first' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    user.password = password;
    user.verified = true;   // they just proved they own this email
    await user.save();

    // ✅ OPTIONAL BUT IMPORTANT: log user in after reset
    req.session.userId = user._id;

    // One-time use: clear everything related to this reset
    req.session.verificationEmail = null;
    req.session.verificationPurpose = null;
    req.session.codeVerified = false;

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