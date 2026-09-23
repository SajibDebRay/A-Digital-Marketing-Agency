// server.js — production-ready for Railway
// ============================================================
// FIXES APPLIED:
// FIX 1 → app.set('trust proxy', 1)  ← ROOT CAUSE of verify-code 400 bug
// FIX 2 → Removed bodyParser (deprecated), using express built-ins
// FIX 3 → Removed dangerous localhost MongoDB fallback
// FIX 4 → Server no longer starts if MongoDB fails (sessions would be broken)
// FIX 5 → Added session debug middleware to diagnose future issues
// ============================================================

try {
  require('dotenv').config();
} catch (e) {
  console.error('⚠️ dotenv load error:', e);
}

const fs   = require('fs');
const path = require('path');
const express   = require('express');
const mongoose  = require('mongoose');
const session   = require('express-session');
const MongoStore = require('connect-mongo');

// ─── ENV ──────────────────────────────────────────────────────────────────────
const MONGO_URI      = process.env.MONGO_URI      || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';
const IS_PROD        = process.env.NODE_ENV === 'production';
const PORT           = process.env.PORT || 5500;

console.log('🔍 server.js loaded');
console.log('  NODE_ENV       :', process.env.NODE_ENV || '(not set)');
console.log('  IS_PROD        :', IS_PROD);
console.log('  MONGO_URI set? :', MONGO_URI.length > 0);
console.log('  SESSION_SECRET :', SESSION_SECRET === 'dev-secret' ? '⚠️  using default (set SESSION_SECRET in Railway!)' : '✅ custom secret set');

// FIX 3 — Hard-stop if MONGO_URI is missing. A missing URI on Railway means
// sessions silently use localhost (which doesn't exist), breaking everything.
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set. Add it in Railway → Variables. Exiting.');
  process.exit(1);
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const app = express();

// FIX 1 — CRITICAL: Tell Express it is running behind Railway's reverse proxy.
// Without this line, Express sees an HTTP connection (Railway terminates TLS),
// so secure:true cookies are never sent → the session cookie never reaches the
// browser → every request creates a NEW session → verify-code always "not found".
// This single line is the root cause of the 400 error on verify-code.
app.set('trust proxy', 1);

// ─── GLOBAL CRASH LOGGING ─────────────────────────────────────────────────────
process.on('uncaughtException',   err => console.error('💥 Uncaught Exception:',          err?.stack || err));
process.on('unhandledRejection',  err => console.error('💥 Unhandled Promise Rejection:',  err?.stack || err));

// ─── CORE MIDDLEWARE ──────────────────────────────────────────────────────────
// FIX 2 — bodyParser is deprecated. express.json() and express.urlencoded()
// are built-in since Express 4.16 and do exactly the same thing.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('✅ Core middleware registered.');

// ─── SESSION ──────────────────────────────────────────────────────────────────
app.use(session({
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl:       MONGO_URI,
    collectionName: 'sessions',
    ttl:            86400,         // 24 hours in seconds
    autoRemove:     'native'       // let MongoDB TTL index clean up expired sessions
  }),
  cookie: {
    maxAge:   1000 * 60 * 60 * 24, // 24 hours in ms
    secure:   IS_PROD,              // true on Railway (HTTPS), false in local dev (HTTP)
    httpOnly: true,                 // not readable by client-side JS
    sameSite: IS_PROD ? 'none' : 'lax'
    // sameSite 'none' is required when secure:true AND the cookie may cross origins.
    // sameSite 'none' MUST pair with secure:true — which it does here in IS_PROD.
    // In local dev, 'lax' is fine for same-origin localhost requests.
  }
}));

console.log('✅ Session middleware registered.');
console.log('  cookie.secure  :', IS_PROD);
console.log('  cookie.sameSite:', IS_PROD ? 'none' : 'lax');

// FIX 5 — Session debug middleware.
// Logs session ID and any stored keys on every request so you can confirm
// the same session is arriving between /auth/signup and /auth/verify-code.
// Remove (or guard with !IS_PROD) once the bug is confirmed fixed.
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} | sessionID: ${req.sessionID} | keys: [${Object.keys(req.session).filter(k => k !== 'cookie').join(', ') || 'none'}]`);
  next();
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// Root health-check
app.get('/', (req, res) => {
  res.json({
    status:  'ok',
    db:      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    session: req.sessionID || 'none'
  });
});

// Auth routes
const authRoutesPath = path.join(__dirname, 'routes', 'auth.js');
if (fs.existsSync(authRoutesPath)) {
  try {
    app.use('/auth', require('./routes/auth'));
    console.log('✅ Auth routes mounted at /auth.');
  } catch (e) {
    console.error('❌ Error mounting auth routes:', e?.stack || e);
  }
} else {
  console.warn('⚠️ routes/auth.js not found — skipping.');
}

// Order routes
const ordersRoutePath = path.join(__dirname, 'routes', 'orders.js');
if (fs.existsSync(ordersRoutePath)) {
  try {
    app.use('/orders', require('./routes/orders'));
    console.log('✅ Order routes mounted at /orders.');
  } catch (e) {
    console.error('❌ Error mounting order routes:', e?.stack || e);
  }
} else {
  console.warn('⚠️ routes/orders.js not found — skipping.');
}

// ─── DATABASE → SERVER START ──────────────────────────────────────────────────
// FIX 4 — Do NOT start the server if MongoDB fails.
// Previously the catch block started the server anyway, which meant MongoStore
// sessions were silently broken — requests appeared to work but never had
// a valid session, so verify-code would always return "not found".
mongoose.connect(MONGO_URI, {
  connectTimeoutMS:         10000,
  serverSelectionTimeoutMS: 10000
})
.then(() => {
  console.log('✅ MongoDB connected.');
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch(err => {
  console.error('❌ MongoDB connection failed — server will NOT start:', err?.message || err);
  console.error('   Check MONGO_URI in Railway → Variables, and that your Atlas IP allowlist includes 0.0.0.0/0.');
  process.exit(1); // FIX 4 — exit instead of silently starting a broken server
});