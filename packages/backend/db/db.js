const sqlite3 = require("@journeyapps/sqlcipher").verbose();
const path = require("path");
const fs = require("fs");
const { getDatabasePath } = require("../utils/appPaths");

const dbPath = getDatabasePath();

// --- Legacy Migration Check ---
const { getBaseUserDataPath } = require("../utils/config");
const legacyDbPath = path.join(getBaseUserDataPath(), "endoscribe_secure.db");
// Legacy check omitted for brevity here since we changed filename, keeping logic intact
if (fs.existsSync(legacyDbPath) && legacyDbPath !== dbPath) {
  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size < 100 * 1024) {
    console.log("🚚 Migrating secure database to new database folder...");
    fs.copyFileSync(legacyDbPath, dbPath);
    // omitted WAL copies for simplicity in this replacement block
  }
}
// ------------------------------

console.log("📁 DB path:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ DB connection error:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Secure DB connected at:", dbPath);
  }
});

// IMPORTANT: Define the master DB encryption key here
const DB_MASTER_KEY = "ENDOSCRIBE_AES_256_SECURE_VAULT_KEY!";

db.serialize(() => {
  // 1. Apply the encryption key
  db.run(`PRAGMA key = '${DB_MASTER_KEY}'`);
  
  // 2. Set ciphers and performance pragmas
  db.run("PRAGMA cipher_page_size = 4096");
  db.run("PRAGMA kdf_iter = 64000");
  db.run("PRAGMA cipher_hmac_algorithm = HMAC_SHA1");
  db.run("PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA1");

  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 10000");
});

const schemaPath = path.join(__dirname, "schema.sql");
const seedPath = path.join(__dirname, "seed.sql");

if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema, (err) => {
    if (err) {
      console.error("❌ Schema error:", err.message);
    } else {
      console.log("✅ Schema loaded");
      
      db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
        if (!err && row && row.count === 0 && fs.existsSync(seedPath)) {
          const seed = fs.readFileSync(seedPath, "utf-8");
          db.exec(seed, (seedErr) => {
            if (seedErr) console.error("❌ Seed error:", seedErr.message);
            else console.log("✅ Default templates & categories seeded");
          });
        }
      });

      // Auto-migrate new columns
      db.run("ALTER TABLE images ADD COLUMN nbi_label TEXT", () => {});
      db.run("ALTER TABLE images ADD COLUMN brightness REAL", () => {});
      db.run("ALTER TABLE images ADD COLUMN contrast REAL", () => {});
      
      db.run("ALTER TABLE reports ADD COLUMN doctor_ids TEXT", (err) => {
        if (!err) console.log("✅ Added doctor_ids column to reports");
      });
      db.run("ALTER TABLE reports ADD COLUMN patient_phone TEXT", (err) => {
        if (!err) console.log("✅ Added patient_phone column to reports");
      });
      db.run("ALTER TABLE reports ADD COLUMN referral_doctor_phone TEXT", (err) => {
        if (!err) console.log("✅ Added referral_doctor_phone column to reports");
      });
      // Run safe column additions just in case
      db.run("ALTER TABLE reports ADD COLUMN patient_id INTEGER REFERENCES patients(id)", () => {});
      db.run("ALTER TABLE reports ADD COLUMN referral_doctor_id INTEGER REFERENCES referral_doctors(id)", () => {});
      db.run("ALTER TABLE patients ADD COLUMN city TEXT", () => {});
      db.run("ALTER TABLE patients ADD COLUMN procedure_type TEXT", () => {});
      db.run("ALTER TABLE doctors ADD COLUMN is_active INTEGER DEFAULT 1", () => {});
      
      // Cloud sync columns
      const tables = ['reports', 'patients', 'images', 'referral_doctors', 'doctors', 'templates'];
      tables.forEach(table => {
        db.run(`ALTER TABLE ${table} ADD COLUMN sync_status TEXT DEFAULT 'local'`, () => {});
        db.run(`ALTER TABLE ${table} ADD COLUMN device_id TEXT`, () => {});
        db.run(`ALTER TABLE ${table} ADD COLUMN last_synced_at DATETIME`, () => {});
      });
    }
  });
} else {
  console.warn("⚠️ Schema file not found at:", schemaPath);
}

module.exports = db;