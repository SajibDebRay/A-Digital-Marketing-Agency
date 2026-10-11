const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verificationCode:    { type: String, default: null },
codeExpiresAt:       { type: Date,   default: null },
  // true once the emailed code is verified. Existing users (no field in the DB) read as true,
  // so nobody is locked out. New signups are created with verified:false in routes/auth.js.
  verified:            { type: Boolean, default: true },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePwd) {
  return await bcrypt.compare(candidatePwd, this.password);
  
};

module.exports = mongoose.model('User', userSchema);