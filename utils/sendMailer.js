const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

async function sendVerificationEmail(toEmail, code) {
  const mailOptions = {
    from: `"Cr@ckFlow" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Email Verification</h2>
        <p>Use the verification code below:</p>
        <h1 style="letter-spacing: 4px; color: #2563eb;">${code}</h1>
        <p>This code will expire in <b>10 minutes</b>.</p>
        <p>If you didn’t request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendVerificationEmail;