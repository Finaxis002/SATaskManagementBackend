// routes/client.js or routes/clients.js
const express = require("express");
const router = express.Router();
const Client = require("../Models/Client");

// GET /api/clients - Get all client names
// router.get("/", async (req, res) => {
//   try {
//     const clients = await Client.find({}, "name").sort({ name: 1 }); // fetch only 'name' field
//     const clientNames = clients.map((client) => client.name);
//     res.json(clientNames);
//   } catch (error) {
//     console.error("Error fetching clients:", error);
//     res.status(500).json({ message: "Failed to fetch clients", error });
//   }
// });
router.get("/details", async (req, res) => {
  try {
    const clients = await Client.find({}).sort({ name: 1 }); // fetch all fields
    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients with full details:", error);
    res.status(500).json({ message: "Failed to fetch clients", error });
  }
});


// GET /api/clients - Get selected client details
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find({}, "name contactPerson businessName").sort({ name: 1 });
    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ message: "Failed to fetch clients", error });
  }
});



// POST /api/clients - Create a new client
router.post("/", async (req, res) => {
  try {
    const { 
      name,
      contactPerson,
      businessName,
      address,
      mobile,
      emailId,
      GSTIN
       } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Client name is required." });
    }

    const clientData = {
      name: name.trim(),
      contactPerson,
      businessName,
      address,
      mobile,
      emailId,
      GSTIN,
    };

   

    const newClient = new Client(clientData);
    await newClient.save();

    res.status(201).json({ message: "Client created successfully", client: newClient });
  } catch (error) {
    console.error("Error creating client:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
});




// DELETE /api/clients - Delete client by name
router.delete("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Client name is required." });
    }

    const result = await Client.deleteOne({ name: name.trim() });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Client not found." });
    }

    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
});


module.exports = router;
