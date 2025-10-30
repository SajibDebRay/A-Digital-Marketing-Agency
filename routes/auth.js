const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../models/User');

// ✅ Serve signup form (GET)
router.get('/signup', (req, res) => {
  res.sendFile('signup.html', { root: path.join(__dirname, '../public') });
});

// ✅ Serve login form (GET)
router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: path.join(__dirname, '../public') });
});

// ✅ Signup POST
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).send('User already exists');
    
    const user = new User({ username, email, password });
    await user.save();

    req.session.userId = user._id;
    res.redirect('/home.html');
  } catch (err) {
    console.error(err);
res.status(500).send(err.message);
  }
});

// ✅ Login POST
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

module.exports = router;

