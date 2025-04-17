const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other email providers too
  auth: {
    user: process.env.GMAIL_USER,  // Your email
    pass: process.env.GMAIL_PASS,  // Your email password or App password
  },
});

const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: process.env.GMAIL_USER, // Sender address
    to,  // Recipient's email
    subject,  // Email subject
    text,  // Email content
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
};

module.exports = { sendEmail };
