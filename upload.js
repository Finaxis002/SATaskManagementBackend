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
  limits: { fileSize: 10 * 1024 * 1024 }, // Set the file size limit (10MB)
  fileFilter: (req, file, cb) => {
    // Allow image files and PDF files
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed"), false);
    }
  }
});

module.exports = upload;
