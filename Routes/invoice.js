// routes/invoices.js
const express = require('express');
const router = express.Router();
const Invoice = require('../Models/Invoice');
const {encryptField, decryptField} = require('../utils/cryptoHelper');
const InvoiceSerial = require('../Models/InvoiceSerial');
const verifyToken = require("../middleware/verifyToken");
const checkHeaders = require("../middleware/checkHeaders");

const firmPrefixes = {
  "Finaxis Business Consultancy": "FA",
  "Sharda Associates": "SA",
  "Kailash Real Estate": "KRS",
  "Bhojpal Realities": "BR",
};

router.use(checkHeaders);
router.use(verifyToken);
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

//invoice serail number 


// GET /api/invoices/next-serial?firm=...&type=...&year=...&month=...
router.get('/preview-serial', async (req, res) => {
  const { firm, type, year, month } = req.query;

  // Step 1: Generate a key like 'FA-25I06'
  const prefix = firmPrefixes[firm] || "XX";
  const typeCode = ["Invoice", "Tax Invoice"].includes(type) ? "I" : "P";
  const key = `${prefix}-${year}${typeCode}${month}`;

  // Step 2: Fetch existing lastSerial (do NOT increment)
  const existing = await InvoiceSerial.findOne({ key });
  const nextSerial = existing ? existing.lastSerial + 1 : 1;

  // Step 3: Respond with padded invoice number (e.g., FA25I06001)
  res.json({
    invoiceNumber: `${prefix}${year}${typeCode}${month}${String(nextSerial).padStart(3, "0")}`,
    serial: String(nextSerial).padStart(3, "0"),
  });
});

router.post('/finalize-serial', async (req, res) => {
  const { firm, type, year, month } = req.body;

  // Step 1: Build the key like 'FA-25I06'
  const prefix = firmPrefixes[firm] || "XX";
  const typeCode = ["Invoice", "Tax Invoice"].includes(type) ? "I" : "P";
  const key = `${prefix}-${year}${typeCode}${month}`;

  // Step 2: Increment lastSerial and save in DB
  const serialDoc = await InvoiceSerial.findOneAndUpdate(
    { key },
    { $inc: { lastSerial: 1 } },
    { new: true, upsert: true }
  );

  // Step 3: Build invoice number and return
  const paddedSerial = String(serialDoc.lastSerial).padStart(3, "0");

  res.json({
    invoiceNumber: `${prefix}${year}${typeCode}${month}${paddedSerial}`,
    serial: paddedSerial,
  });
});


module.exports = router;
