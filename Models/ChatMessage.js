const chatMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: String,
    required: true,
  },
  recipient: {
    type: String,
    required: false, // For group chat, recipient is not necessary
  },
  group: {
    type: String,
    required: false, // For group chat messages
  },
  read: {
    type: Boolean,
    default: false,
  },
  file: {
    type: String, // Store the file URL
    required: false, // This is optional, as not every message will have a file
  },
  fileName: {
    type: String, // Store the file name
    required: false,
  },
  fileSize: {
    type: String, // Store the file size
    required: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
