// whatsapp.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const client = new Client({ authStrategy: new LocalAuth() });

let whatsappReady = false;

function initWhatsApp(io) {
  client.on("qr", (qr) => {
    whatsappReady = false;
    console.log("QR emitted:", qr);
    io.emit("qr", qr);
  });

  client.on("ready", async () => {
    setTimeout(() => {
      whatsappReady = true;
      io.emit("ready");
    }, 2000); // wait 2 seconds before reporting ready
    // Fetch and log contacts immediately when WhatsApp is ready
    try {
      const contacts = await client.getContacts();
    } catch (err) {
      console.error("Error fetching contacts on ready:", err.message);
    }
  });

  client.on("message", (msg) => {
    io.emit("message", msg); // Optional: push incoming messages
  });

  client.on("auth_failure", (msg) => {
    whatsappReady = false;
    console.error("AUTHENTICATION FAILURE:", msg);
    // Optionally, delete session folder here automatically!
  });

  client.on("disconnected", (reason) => {
    whatsappReady = false;
    console.log("Client was logged out", reason);
  });

  client.initialize();
}

async function getChats(req, res) {
  if (!whatsappReady) {
    console.error("WhatsApp client is not ready.");
    return res.status(503).json({ error: "WhatsApp client not ready" });
  }

  let chats;
  try {
    chats = await client.getChats();
  } catch (err) {
    whatsappReady = false; // Flag as not ready, so UI can show reconnect
    console.error("FATAL: getChats() failed inside WhatsApp Web context:", err);
    console.error("Stack Trace:", err.stack); // Log the full error stack for deeper insights

    // Try to recover:
    // 1. Destroy and re-initialize WhatsApp client.
    // 2. Tell frontend to show QR/reconnect message.
    try {
      // Try to destroy old client (defensive: ignore if not possible)
      if (client && typeof client.destroy === "function") {
        await client.destroy();
        console.log("WhatsApp client destroyed due to fatal error.");
      }
    } catch (e) {
      console.warn("Error destroying WhatsApp client:", e.message);
    }

    // Optionally: try to re-initialize the client automatically
    setTimeout(() => {
      try {
        console.log(
          "Attempting WhatsApp client re-initialization after fatal error..."
        );
        client.initialize();
      } catch (e) {
        console.warn("Client failed to re-initialize:", e.message);
      }
    }, 5000);

    return res.status(503).json({
      error:
        "WhatsApp client error (getChats). Client will auto-recover in a few seconds. Please reload and scan QR if needed.",
      details: err.message,
    });
  }

  try {
    // --- Your current logic ---
    const safeChats = Array.isArray(chats)
      ? chats.filter((chat) => {
          // Defensive checks for WhatsApp web.js weirdness
          if (
            !chat ||
            typeof chat !== "object" ||
            !chat.id ||
            typeof chat.id !== "object" ||
            !chat.id._serialized ||
            typeof chat.id._serialized !== "string"
          ) {
            console.warn("[getChats] Skipping bad chat object:", chat);
            return false;
          }
          return true;
        })
      : [];
    const result = await Promise.all(
      safeChats.map(async (chat) => {
        try {
          let name = "";
          if (chat.isGroup) {
            name = chat.name || "Unknown Group";
          } else {
            name =
              chat?.name ||
              chat?.pushname ||
              chat?.shortName ||
              chat?.number ||
              chat.id.user ||
              "Unknown Contact";
          }

          let profilePic = null;
          try {
            if (chat.id && chat.id._serialized) {
              profilePic = await client.getProfilePicUrl(chat.id._serialized);
            }
          } catch (e) {
            console.warn(
              `Failed to get profile pic for chat ${chat.id?._serialized}:`,
              e.message
            );
            profilePic = null;
          }

          return {
            id: chat.id._serialized,
            name: name.trim() || "Unknown",
            isGroup: !!chat.isGroup,
            unreadCount: chat.unreadCount || 0,
            lastMessage:
              chat.lastMessage && chat.lastMessage.body
                ? chat.lastMessage.body.substring(0, 100)
                : "",
            profilePic,
          };
        } catch (error) {
          console.warn("Error processing chat:", error);
          return null;
        }
      })
    );

    const filteredResult = result.filter((item) => item !== null);

    res.json(filteredResult);
  } catch (err) {
    whatsappReady = false;
    console.error("Error in /api/whatsapp/chats after getChats:", err);
    console.error("Stack Trace:", err.stack); // Log the full error stack

    res.status(503).json({
      error: "WhatsApp client lost connection. Please reconnect.",
      details: err.message,
    });
  }
}


async function getContacts(req, res) {
  try {
    const contacts = await client.getContacts();
    res.json(
      contacts.map((contact) => ({
        id: contact.id._serialized,
        name: contact.pushname || contact.name || contact.number,
        number: contact.number,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getMessages(req, res) {
  try {
    const chat = await client.getChatById(req.params.chatId);
    const messages = await chat.fetchMessages({ limit: 50 });

    // Fetch media if present
    const result = await Promise.all(
      messages.map(async (msg) => {
        let media = null;
        if (msg.hasMedia) {
          try {
            const m = await msg.downloadMedia();
            if (m) {
              media = {
                mimetype: m.mimetype, // "image/jpeg", "application/pdf", etc.
                data: m.data, // base64-encoded
                filename: m.filename, // for docs
              };
            }
          } catch (e) {}
        }

        return {
          id: msg.id.id,
          body: msg.body,
          type: msg.type, // "image", "document", etc.
          fromMe: msg.fromMe,
          author: msg.author || msg.from,
          timestamp: msg.timestamp,
          media, // <-- Send media if present, otherwise null
        };
      })
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function sendMessage(req, res) {
  try {
    const { chatId, message } = req.body;
    await client.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Add this new status route!
async function getStatus(req, res) {
  res.json({ ready: whatsappReady });
}

module.exports = {
  initWhatsApp,
  getChats,
  getContacts,
  getMessages,
  sendMessage,
  getStatus,
};
