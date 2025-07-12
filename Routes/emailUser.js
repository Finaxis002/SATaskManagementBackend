const express = require("express");
const router = express.Router();
const { execSync } = require("child_process");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

// router.post('/create-email-user', async (req, res) => {
//   try {
//     const { username, password } = req.body; // e.g., 'finaxis', 'YourStrongPassword123'
//     const domain = 'sharda.co.in';
//     const mailDirBase = `/home/user-data/mail/mailboxes/${domain}/${username}`;
//     const mailDir = `${mailDirBase}/Maildir`;

//     // 1. Create maildir and set permissions
//     execSync(`sudo mkdir -p ${mailDir}`);
//     execSync(`sudo chown -R mail:mail ${mailDirBase}`);
//     execSync(`sudo chmod -R 700 ${mailDirBase}`);

//     // 2. Generate hashed password with doveadm
//     const hashed = execSync(`sudo doveadm pw -s SHA512-CRYPT -p '${password}'`).toString().trim();

//     // 3. Append to /etc/dovecot/users
//     const dovecotUserLine = `${username}@${domain}:${hashed}:::userdb_mail=maildir:/home/user-data/mail/mailboxes/${domain}/${username}/Maildir`;
//     fs.appendFileSync('/etc/dovecot/users', dovecotUserLine + '\n');

//     // 4. Insert into SQLite
//     const db = new sqlite3.Database('/home/user-data/mail/users.sqlite');
//     db.run(
//       "INSERT INTO users (email, password, privileges) VALUES (?, ?, ?)",
//       [`${username}@${domain}`, password, 'user'], // or hash the password for storage!
//       function (err) {
//         db.close();
//         if (err) return res.status(500).json({ success: false, error: err.message });
//         return res.json({ success: true });
//       }
//     );
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

router.post("/create-email-user", async (req, res) => {
  try {
    const { email, password } = req.body; // Accept email, not username
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });

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
    const dovecotUserLine = `${email}:${hashed}:::userdb_mail=maildir:/home/user-data/mail/mailboxes/${domain}/${username}/Maildir`;
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


router.get('/list-email-users', (req, res) => {
  try {
    const data = fs.readFileSync('/etc/dovecot/users', 'utf8');
    const users = data
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const email = line.split(':')[0];
        return { email };
      });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read users.' });
  }
});


router.delete("/delete-email-user", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    // Extract username & domain
    const match = email.match(/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)$/);
    if (!match) return res.status(400).json({ success: false, message: "Invalid email" });
    const username = match[1];
    const domain = match[2];

    // 1. Remove from dovecot users file
    const usersPath = "/etc/dovecot/users";
    let usersFile = fs.readFileSync(usersPath, "utf8")
      .split("\n")
      .filter(line => !line.startsWith(email + ":"))
      .join("\n");
    fs.writeFileSync(usersPath, usersFile + "\n");

    // 2. Remove mailbox directory
    const maildir = `/home/user-data/mail/mailboxes/${domain}/${username}`;
    execSync(`sudo rm -rf ${maildir}`);

    // 3. Remove from sqlite
    const db = new sqlite3.Database("/home/user-data/mail/users.sqlite");
    db.run(
      "DELETE FROM users WHERE email = ?",
      [email],
      function (err) {
        db.close();
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json({ success: true, message: "User deleted" });
      }
    );
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


router.post("/reset-email-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required" });

    // Generate hashed password using doveadm
    const hashed = execSync(`sudo doveadm pw -s SHA512-CRYPT -p '${password}'`).toString().trim();

    // Update /etc/dovecot/users
    const usersPath = "/etc/dovecot/users";
    let lines = fs.readFileSync(usersPath, "utf8").split("\n");
    let updated = false;
    lines = lines.map(line => {
      if (line.startsWith(email + ":")) {
        updated = true;
        // Extract maildir path if present, else reconstruct
        const maildir = line.split("userdb_mail=")[1] || `maildir:/home/user-data/mail/mailboxes/sharda.co.in/${email.split('@')[0]}/Maildir`;
        return `${email}:${hashed}:::userdb_mail=${maildir}`;
      }
      return line;
    });
    if (!updated) return res.status(404).json({ success: false, message: "User not found" });
    fs.writeFileSync(usersPath, lines.join("\n").replace(/\n+$/, "\n")); // preserve trailing newline

    // Update password in SQLite
    const db = new sqlite3.Database("/home/user-data/mail/users.sqlite");
    db.run("UPDATE users SET password = ? WHERE email = ?", [password, email], function (err) {
      db.close();
      if (err) return res.status(500).json({ success: false, error: err.message });
      return res.json({ success: true, message: "Password updated successfully!" });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});



module.exports = router;
