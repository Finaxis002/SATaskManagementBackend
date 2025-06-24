const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: false, // Make optional to support file-only messages
    },
    fileUrls: [
      {
        type: String,
      },
    ],
    // (Optional: keep old field for backward compatibility)
    fileUrl: {
      type: String,
      required: false,
    },

    timestamp: {
      type: String,
      required: true,
    },
    recipient: {
      type: String,
      required: false,
    },
    group: {
      type: String,
      required: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readBy: [{ type: String, default: [] }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
