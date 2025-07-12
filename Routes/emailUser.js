const express = require("express");
const router = express.Router();
const { execSync } = require("child_process");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

router.post("/create-email-user", async (req, res) => {
  try {
    const { email, password } = req.body; // Accept email, not username
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });

    // Validate domain
    const match = email.match(/^([a-zA-Z0-9._-]+)@sharda\.co\.in$/);
    if (!match)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email domain." });

    const username = match[1];
    const domain = "sharda.co.in";
    const mailDirBase = `/home/user-data/mail/mailboxes/${domain}/${username}`;
    const mailDir = `${mailDirBase}/Maildir`;

    // 1. Create maildir and set permissions
    execSync(`sudo mkdir -p ${mailDir}`);
    execSync(`sudo chown -R mail:mail ${mailDirBase}`);
    execSync(`sudo chmod -R 700 ${mailDirBase}`);

    // 2. Generate hashed password with doveadm
    const hashed = execSync(`sudo doveadm pw -s SHA512-CRYPT -p '${password}'`)
      .toString()
      .trim();

    // 3. Append to /etc/dovecot/users
    const dovecotUserLine = `${username}@${domain}:${hashed}:::userdb_mail=maildir:/home/user-data/mail/mailboxes/${domain}/${username}/Maildir`;
    fs.appendFileSync("/etc/dovecot/users", dovecotUserLine + "\n");

    // 4. Insert into SQLite
    const db = new sqlite3.Database("/home/user-data/mail/users.sqlite");
    db.run(
      "INSERT INTO users (email, password, privileges) VALUES (?, ?, ?)",
      [`${username}@${domain}`, password, "user"],
      function (err) {
        db.close();
        if (err)
          return res.status(500).json({ success: false, error: err.message });
        return res.json({
          success: true,
          message: "Mail user created successfully!",
        });
      }
    );
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
