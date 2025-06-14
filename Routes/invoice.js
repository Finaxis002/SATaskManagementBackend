// routes/invoices.js
const express = require('express');
const router = express.Router();
const Invoice = require('../Models/Invoice');
const {encryptField, decryptField} = require('../utils/cryptoHelper')


// POST /api/invoices - save invoice
router.post('/', async (req, res) => {
  try {
    const invoiceData = req.body;

    // Encrypt totalAmount
    if (invoiceData.totalAmount)
      invoiceData.totalAmount = encryptField(invoiceData.totalAmount);

    // Encrypt item rates
    if (Array.isArray(invoiceData.items)) {
      invoiceData.items = invoiceData.items.map(item => ({
        ...item,
        rate: encryptField(item.rate),
      }));
    }
  
    // Upsert invoice by invoiceNumber (overwrite if exists)
    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber: invoiceData.invoiceNumber },
      invoiceData,
      { new: true, upsert: true }
    );

     // Decrypt fields before sending back (optional)
    const decryptedInvoice = invoice.toObject();
    decryptedInvoice.totalAmount = decryptField(decryptedInvoice.totalAmount);
    if (Array.isArray(decryptedInvoice.items)) {
      decryptedInvoice.items = decryptedInvoice.items.map(item => ({
        ...item,
        rate: decryptField(item.rate),
      }));
    }

    res.status(201).json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save invoice' });
  }
});

// GET /api/invoices?clientId=xxx - get invoices for a client
router.get('/', async (req, res) => {
  try {
    const { clientId } = req.query;
    let filter = {};
    if (clientId) {
      filter['customer._id'] = clientId;  // filter by customer id
    }
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
     // Decrypt on the fly
    const result = invoices.map(inv => {
      const obj = inv.toObject();
      obj.totalAmount = decryptField(obj.totalAmount);
      if (Array.isArray(obj.items)) {
        obj.items = obj.items.map(item => ({
          ...item,
          rate: decryptField(item.rate),
        }));
      }
      return obj;
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});


// DELETE /api/invoices/:invoiceNumber - delete an invoice
router.delete('/:invoiceNumber', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const deleted = await Invoice.findOneAndDelete({ invoiceNumber });

    if (!deleted) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;
