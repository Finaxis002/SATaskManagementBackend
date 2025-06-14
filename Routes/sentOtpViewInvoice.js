const express = require('express');
const router = express.Router();
const { sendEmail } = require('../email/emailService')
const otpStore = {};
const OTP_TTL = 10 * 60 * 1000; // 10 min

// Generate and send OTP
router.post('/api/send-otp-view-invoice', async (req, res) => {
  const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
  otpStore["view-invoice"] = { otp, expires: Date.now() + OTP_TTL };

  
  // Use your nodemailer setup here
//   await sendMail({
//     to: "finaxis.ai@gmail.com",
//     subject: "Your OTP for Viewing Invoices",
//     text: `Your OTP is: ${otp}`,
//   });
  await sendEmail("caanunaysharda@gmail.com", "Your OTP for Viewing Invoices", `Your OTP is: ${otp}`);

  res.json({ success: true });
});

// Verify OTP
router.post('/api/verify-otp-view-invoice', (req, res) => {
  const { otp } = req.body;
  const data = otpStore["view-invoice"];
  if (
    data &&
    data.otp === otp &&
    Date.now() < data.expires
  ) {
    // Invalidate used OTP
    delete otpStore["view-invoice"];
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

module.exports = router;