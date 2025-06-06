// routes/invoices.js
const express = require('express');
const router = express.Router();
const Invoice = require('../Models/Invoice');

// POST /api/invoices - save invoice
router.post('/', async (req, res) => {
  try {
    const invoiceData = req.body;
  
    // Upsert invoice by invoiceNumber (overwrite if exists)
    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber: invoiceData.invoiceNumber },
      invoiceData,
      { new: true, upsert: true }
    );

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
    res.json(invoices);
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
