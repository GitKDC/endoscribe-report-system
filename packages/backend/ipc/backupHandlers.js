const { ipcMain, dialog, app, Notification } = require("electron");
const fs   = require("fs");
const path = require("path");
// archiver v5 — stable, widely tested API: archiver("zip", opts)
const archiver = require("archiver");

const { getSetting, setSetting } = require("../repositories/reportRepo");
const { getDatabasePath, getImagesBasePath, getReportsBasePath } = require("../utils/appPaths");

// ─── Helpers ─────────────────────────────────────────────────────────────────
const daysBetween = (dateStr, now = new Date()) => {
  if (!dateStr) return Infinity;
  const past = new Date(dateStr);
  return Math.floor((now - past) / (1000 * 60 * 60 * 24));
};

// ─── Core zip builder ────────────────────────────────────────────────────────
const createZip = (destPath, dbPath, imagesPath, reportsPath) => {
  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(destPath);
    const opts = { zlib: { level: 9 } };
    const archive = archiver.ZipArchive ? new archiver.ZipArchive(opts) : archiver("zip", opts);

    archive.on("error", reject);

    // "close" fires when the output stream finishes flushing
    output.on("close", () => {
      console.log(`✅ Zip closed: ${archive.pointer()} bytes written`);
      resolve(archive.pointer());
    });

    // "finish" fires on some platforms instead of "close"
    output.on("finish", () => {
      console.log(`✅ Zip finished: ${archive.pointer()} bytes`);
    });

    archive.pipe(output);

    // Add the SQLite DB
    archive.file(dbPath, { name: "endoscopy.db" });

    // Add images folder (if it exists)
    if (fs.existsSync(imagesPath)) {
      archive.directory(imagesPath, "images");
    }

    // Add reports folder (if it exists)
    if (reportsPath && fs.existsSync(reportsPath)) {
      archive.directory(reportsPath, "reports");
    }

    // Metadata JSON
    archive.append(
      JSON.stringify({
        app_version: app.getVersion ? app.getVersion() : "1.0.0",
        backup_date: new Date().toISOString(),
      }, null, 2),
      { name: "backup_info.json" }
    );

    archive.finalize();
  });
};

function registerBackupHandlers() {

  // ── A. Manual Backup ────────────────────────────────────────────────────
  ipcMain.handle("create-backup", async () => {
    const dbPath     = getDatabasePath();
    const imagesPath = getImagesBasePath();
    const reportsPath = getReportsBasePath();

    console.log("📦 Backup DB path:", dbPath);
    console.log("📦 Backup images path:", imagesPath);
    console.log("📦 Backup reports path:", reportsPath);
    console.log("📦 DB exists:", fs.existsSync(dbPath));

    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file not found at: ${dbPath}`);
    }

    const date = new Date().toISOString().split("T")[0];
    const { readConfig } = require("../utils/config");
    const config = readConfig();
    const backupDir = config.storagePaths.backups || require("../utils/appPaths").getBackupsBasePath();
    const defaultPath = path.join(backupDir, `EndoScribe_Backup_${date}.zip`);

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "Save Backup",
      defaultPath,
      filters: [{ name: "ZIP Files", extensions: ["zip"] }],
    });

    if (canceled || !filePath) return null;

    const bytes = await createZip(filePath, dbPath, imagesPath, reportsPath);
    await setSetting("last_backup_date", new Date().toISOString());

    console.log(`✅ Manual backup saved: ${filePath} (${bytes} bytes)`);
    return { success: true, path: filePath, bytes };
  });

  // ── B. Auto Monthly Backup ───────────────────────────────────────────────
  ipcMain.handle("check-auto-backup", async () => {
    const autoEnabled = await getSetting("auto_backup_enabled");
    if (autoEnabled === "0") return { skipped: true, reason: "disabled" };

    const lastBackup = await getSetting("last_backup_date");
    const days = daysBetween(lastBackup);

    if (days < 30) return { skipped: true, reason: "recent", daysSince: days };

    const dbPath     = getDatabasePath();
    const imagesPath = getImagesBasePath();
    const reportsPath = getReportsBasePath();

    if (!fs.existsSync(dbPath)) return { skipped: true, reason: "no_db" };

    const autoDir = require("../utils/appPaths").getBackupsBasePath ? require("../utils/appPaths").getBackupsBasePath() : path.join(app.getPath("userData"), "backups");
    if (!fs.existsSync(autoDir)) fs.mkdirSync(autoDir, { recursive: true });

    const date     = new Date().toISOString().split("T")[0];
    const destPath = path.join(autoDir, `AutoBackup_${date}.zip`);

    await createZip(destPath, dbPath, imagesPath, reportsPath);
    await setSetting("last_backup_date", new Date().toISOString());

    // Keep only last 3 auto-backups
    fs.readdirSync(autoDir)
      .filter(f => f.startsWith("AutoBackup_"))
      .sort()
      .reverse()
      .slice(3)
      .forEach(f => { try { fs.unlinkSync(path.join(autoDir, f)); } catch {} });

    if (Notification.isSupported()) {
      new Notification({
        title: "EndoScribe – Monthly Backup",
        body: `Auto-backup created: ${path.basename(destPath)}`,
      }).show();
    }

    return { success: true, path: destPath, daysSince: days };
  });

  // ── C. Disk Space Check ──────────────────────────────────────────────────
  ipcMain.handle("check-disk-space", async () => {
    try {
      const { checkDiskSpace } = require("check-disk-space");
      const space  = await checkDiskSpace(app.getPath("userData"));
      const freeGB = space.free  / (1024 ** 3);
      return {
        freeGB:   Math.round(freeGB  * 10) / 10,
        totalGB:  Math.round((space.size / (1024 ** 3)) * 10) / 10,
        lowSpace: freeGB < 5,
      };
    } catch (err) {
      return { freeGB: null, totalGB: null, lowSpace: false };
    }
  });
}

module.exports = { registerBackupHandlers };