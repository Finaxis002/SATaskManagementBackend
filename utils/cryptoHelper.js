const CryptoJS = require('crypto-js');
const SECRET_KEY = process.env.INVOICE_SECRET_KEY || 'your-secret-here';

function encryptField(plain) {
  if (plain === undefined || plain === null) return '';
  return CryptoJS.AES.encrypt(plain.toString(), SECRET_KEY).toString();
}

function decryptField(cipherText) {
  try {
    if (!cipherText) return '';
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
}

module.exports = {encryptField, decryptField} ;