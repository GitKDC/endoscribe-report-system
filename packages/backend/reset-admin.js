const sqlite3 = require("@journeyapps/sqlcipher").verbose();
const path = require("path");
const fs = require("fs");
const { getDatabasePath } = require("./utils/appPaths");

const dbPath = getDatabasePath();

if (!fs.existsSync(dbPath)) {
  console.log("Could not find the database at:", dbPath);
  process.exit(1);
} else {
  console.log("Found active database at:", dbPath);
  startReset(dbPath);
}

function startReset(databasePath) {
  const db = new sqlite3.Database(databasePath, (err) => {
    if (err) {
      console.error("❌ DB connection error:", err.message);
      process.exit(1);
    }
  });

  const DB_MASTER_KEY = "ENDOSCRIBE_AES_256_SECURE_VAULT_KEY!";

  db.serialize(async () => {
    db.run(`PRAGMA key = '${DB_MASTER_KEY}'`);
    db.run("PRAGMA cipher_page_size = 4096");
    db.run("PRAGMA kdf_iter = 64000");
    db.run("PRAGMA cipher_hmac_algorithm = HMAC_SHA1");
    db.run("PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA1");

    const crypto = require("crypto");
    const newPassword = "admin";
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(newPassword, salt, 64).toString("hex");

    db.run("UPDATE users SET password_hash = ?, salt = ? WHERE role = 'admin'", [hash, salt], function(err) {
      if (err) {
        console.error("Failed to update password:", err);
      } else {
        if (this.changes > 0) {
          console.log("✅ SUCCESS! Your admin password has been reset to: admin");
          console.log("You can now open the app and log in with your admin username and the password: admin");
        } else {
          console.log("No admin user found in the database. Did you create one yet?");
        }
      }
      process.exit(0);
    });
  });
}
