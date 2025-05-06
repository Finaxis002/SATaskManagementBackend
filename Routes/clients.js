// routes/client.js or routes/clients.js
const express = require("express");
const router = express.Router();
const Client = require("../Models/Client");

// GET /api/clients - Get all client names
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find({}, "name").sort({ name: 1 }); // fetch only 'name' field
    const clientNames = clients.map((client) => client.name);
    res.json(clientNames);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ message: "Failed to fetch clients", error });
  }
});

module.exports = router;
