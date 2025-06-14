const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceDate: { type: Date, required: true },
  invoiceType: { type: String, required: true },

  selectedFirm: {
    name: String,
    gstin: String,
    address: String,
    email: String,
    phone: String,
    bank: {
      name: String,
      account: String,
      ifsc: String,
    },
  },

  placeOfSupply: String,

  customer: {
    _id: String,
    name: String,
    address: String,
    GSTIN: String,
    mobile: String,
    emailId: String,
  },

  items: [{
    id: String,
    description: String,
    hsn: String,
    qty: Number,
    rate: String,
    
  }],

  totalAmount:{ type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);