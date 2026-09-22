// server.js — robust debug-friendly server starter
try {
  require('dotenv').config();
} catch (e) {
  console.error('⚠️ dotenv load error:', e);
}

const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');

console.log('🔍 server.js loaded — starting debug output...');

// quick environment check
try {
  console.log('cwd:', process.cwd());
  console.log('server.js path:', __filename);
  console.log('node version:', process.version);
  console.log('.env file exists?:', fs.existsSync(path.join(process.cwd(), '.env')));
  console.log('MONGO_URI present?:', typeof process.env.MONGO_URI === 'string' && process.env.MONGO_URI.length > 0);
  console.log('SESSION_SECRET present?:', typeof process.env.SESSION_SECRET === 'string' && process.env.SESSION_SECRET.length > 0);
} catch (e) {
  console.error('Error during env checks:', e && e.stack ? e.stack : e);
}

const app = express();

// global crash logging
process.on('uncaughtException', err => {
  console.error('💥 Uncaught Exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', err => {
  console.error('💥 Unhandled Promise Rejection:', err && err.stack ? err.stack : err);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('✅ Basic middleware registered.');

// Session
const MONGO_URI = process.env.MONGO_URI || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

if (!MONGO_URI) {
  console.warn('⚠️ Warning: MONGO_URI is empty. If you intended to use Atlas, set MONGO_URI in .env.');
}

try {
 app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI || 'mongodb://127.0.0.1:27017/a-digital-marketing-agency',
      collectionName: 'sessions',
      ttl: 86400
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      httpOnly: true,   // can't be read by JS
      sameSite: 'lax'
    }
  }));
  console.log('✅ Session middleware registered.');
} catch (e) {
  console.error('❌ Session setup error:', e && e.stack ? e.stack : e);
}

// Simple root route
app.get('/', (req, res) => {
  res.type('text').send('Server is up — visit /auth/login or /auth/signup if configured.');
});

// ── AUTH ROUTES ──
const routesPath = path.join(__dirname, 'routes', 'auth.js');
if (fs.existsSync(routesPath)) {
  try {
    const authRoutes = require('./routes/auth');
    app.use('/auth', authRoutes);
    console.log('✅ auth routes mounted at /auth.');
  } catch (e) {
    console.error('❌ Error mounting auth routes:', e && e.stack ? e.stack : e);
  }
} else {
  console.warn('⚠️ routes/auth.js not found; skipping mounting auth routes.');
}

// ── ORDER ROUTES ──
const ordersRoutePath = path.join(__dirname, 'routes', 'orders.js');
if (fs.existsSync(ordersRoutePath)) {
  try {
    const orderRoutes = require('./routes/orders');
    app.use('/orders', orderRoutes);
    console.log('✅ order routes mounted at /orders.');
  } catch (e) {
    console.error('❌ Error mounting order routes:', e && e.stack ? e.stack : e);
  }
} else {
  console.warn('⚠️ routes/orders.js not found; skipping mounting order routes.');
}

const PORT = process.env.PORT || 5500;
console.log('PORT to use:', PORT);

console.log('🔁 About to try mongoose.connect()...');

mongoose.connect(MONGO_URI || 'mongodb://127.0.0.1:27017/a-digital-marketing-agency', {
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err && err.stack ? err.stack : err);
  app.listen(PORT, () => console.log(`⚠️ Server started without DB on http://localhost:${PORT}`));
});