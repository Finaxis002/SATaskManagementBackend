const multer = require("multer");
const path = require("path");

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Specify where files should be uploaded
    cb(null, 'uploads/'); // This will store the uploaded files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Specify the name of the file once uploaded
    cb(null, Date.now() + path.extname(file.originalname)); // Adds timestamp to filename
  }
});

// Initialize multer with the storage configuration and file filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Optional: Set higher file size limit (e.g., 50MB)
  fileFilter: (req, file, cb) => {
    cb(null, true); // Accept all file types
  }
});

module.exports = upload;
