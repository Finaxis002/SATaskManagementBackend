const multer = require("multer");
const path = require("path");

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Specify where files should be uploaded
    cb(null, "uploads/"); // This will store the uploaded files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Use the original file name to store the file
    const originalName = file.originalname; // Get the original name of the file
    cb(null, originalName); // Save the file with the original name
  },
});

// Initialize multer with the storage configuration and file filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // Optional: Set higher file size limit (e.g., 50MB)
  fileFilter: (req, file, cb) => {
    cb(null, true); // Accept all file types
  },
});

module.exports = upload;
