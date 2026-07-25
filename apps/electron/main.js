const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const fs = require("fs");
const serve = require("electron-serve").default || require("electron-serve");
const loadURL = serve({ directory: path.join(__dirname, "..", "frontend", "out") });

protocol.registerSchemesAsPrivileged([
  { scheme: 'endo', privileges: { bypassCSP: true, supportFetchAPI: true, secure: true, corsEnabled: true } }
]);

// Mac M-series: NO GPU flags needed — Apple Silicon handles this natively
// Only add platform-specific flags when needed
if (process.platform === "linux") {
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("disable-dev-shm-usage");
  app.disableHardwareAcceleration();
}

let db;
let win;

async function createWindow() {
  console.log("🔵 Creating Electron window...");
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "EndoScribe",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      enableRemoteModule: false,
      webSecurity: false,
    },
  });
  
  win.removeMenu();

  if (process.env.DEBUG) {
    win.webContents.openDevTools();
  }

  win.webContents.on("did-start-loading", () => console.log("⏳ Page started loading..."));
  win.webContents.on("did-finish-load",   () => console.log("✅ Page loaded successfully"));
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error(`Page failed to load (${errorCode}): ${errorDescription}`);
  });
  // 'crashed' is deprecated — use render-process-gone
  win.webContents.on("render-process-gone", (event, details) => {
    console.error("Renderer process gone:", details.reason);
    if (details.reason !== "clean-exit") win.reload();
  });

  try {
    if (app.isPackaged) {
      console.log("Loading static export from electron-serve...");
      await loadURL(win);
    } else {
      const url = process.env.NEXT_URL || "http://localhost:3000";
      console.log(`Loading URL: ${url}`);
      await win.loadURL(url);
    }
    console.log("URL loaded successfully");
  } catch (err) {
    console.error("Failed to load URL:", err);
    // Destroy the blank failed window before creating a new one
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
    setTimeout(() => createWindow(), 2000);
  }
}

async function initializeApp() {
  try {
    console.log("🔵 Initializing database...");
    db = require("../../packages/backend/db/db");

    console.log("🔵 Registering IPC handlers...");
    require("../../packages/backend/ipc/reportHandlers").registerReportHandlers();
    require("../../packages/backend/ipc/imageHandlers").registerImageHandlers();
    require("../../packages/backend/ipc/templateHandlers").registerTemplateHandlers();
    require("../../packages/backend/ipc/backupHandlers").registerBackupHandlers();
    require("../../packages/backend/ipc/doctorsHandlers").registerDoctorHandlers();
    require("../../packages/backend/ipc/patientHandlers").registerPatientHandlers();
    require("../../packages/backend/ipc/referralHandlers").registerReferralHandlers();
    require("../../packages/backend/ipc/dashboardHandlers").registerDashboardHandlers();
    require("../../packages/backend/ipc/analyticsHandlers").registerAnalyticsHandlers();
    require("../../packages/backend/ipc/categoryHandlers").registerCategoryHandlers();
    require("../../packages/backend/ipc/storageHandlers").registerStorageHandlers();
    require("../../packages/backend/ipc/authHandlers").registerAuthHandlers();
    require("../../packages/backend/ipc/whatsappHandlers").registerWhatsappHandlers();
    require("../../packages/backend/ipc/licenseHandlers").registerLicenseHandlers();

    console.log("App initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
    process.exit(1);
  }
}

app.whenReady().then(async () => {
  console.log("🚀 App is ready");

  /*
   * 🔥 FIX (round 2): `endo://` is a *standard* scheme, so Chromium parses
   * it like http(s) — the segment right after "://" up to the next "/" is
   * the HOST, not part of the path. If the URL we receive only has two
   * slashes after "endo:" (e.g. "endo://Users/kartik/foo.jpg" instead of
   * "endo:///Users/kartik/foo.jpg"), the first real path segment
   * ("Users") gets silently swallowed into `hostname` AND LOWER-CASED,
   * which is exactly what the logs showed: paths missing "/Users" or
   * showing "users" in lowercase, causing every lookup to 404 even though
   * the file exists.
   *
   * buildEndoUrl() on the renderer side now always forces exactly three
   * slashes so the host is guaranteed empty. As a defensive second layer
   * here (covering any caller that still produces a 2-slash URL, or any
   * already-cached value), we explicitly reconstruct the full path as
   * `hostname + pathname` whenever hostname is non-empty — this recovers
   * the swallowed segment. The only remaining caveat is that `hostname`
   * is lower-cased by the URL spec, so if a hostname segment had to be
   * recovered this way we try the lower-cased path first and fall back
   * to a case-insensitive disk lookup if that exact case doesn't exist
   * (macOS's default filesystem is case-insensitive but case-preserving,
   * so fs.existsSync on the lower-cased variant usually still finds the
   * file; this fallback just makes the *logged* path accurate too).
   */
  protocol.handle('endo', (request) => {
    let decodedPath;

    try {
      const parsed = new URL(request.url);

      // Reconstruct the full intended path. If hostname is empty (the
      // correct 3-slash form), this is just pathname. If hostname is
      // non-empty (a 2-slash URL slipped through), prepend it back.
      const fullRawPath = parsed.hostname
        ? `/${parsed.hostname}${parsed.pathname}`
        : parsed.pathname;

      decodedPath = decodeURIComponent(fullRawPath);

      if (parsed.hostname) {
        console.warn(
          "⚠️  endo:// URL had only 2 slashes — recovered host segment back into path:",
          request.url
        );
      }
    } catch (err) {
      console.error("❌ Failed to parse endo:// URL:", request.url, err);
      return new Response("Bad Request", { status: 400 });
    }

    if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(decodedPath)) {
      decodedPath = decodedPath.substring(1);
    }

    decodedPath = path.normalize(decodedPath);

    console.log("🖼️  endo:// resolving ->", decodedPath);

    if (!fs.existsSync(decodedPath)) {
      const recovered = tryRecoverCasing(decodedPath);
      if (recovered) {
        console.log("✅ Recovered correct case ->", recovered);
        decodedPath = recovered;
      } else {
        console.error("❌ endo:// file does not exist on disk:", decodedPath);
      }
    }

    const fileUrl = pathToFileURL(decodedPath).href;
    return net.fetch(fileUrl);
  });

  await initializeApp();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/**
 * tryRecoverCasing
 * Walks a path segment-by-segment from the filesystem root, doing a
 * case-insensitive match at each level against what's actually on disk.
 * Returns the correctly-cased absolute path if found, or null.
 * This only matters as a safety net for any already-corrupted (2-slash)
 * URLs that might still be floating around in the renderer before a
 * refresh; new URLs built with the fixed buildEndoUrl() never hit this.
 */
function tryRecoverCasing(lowerOrWrongCasePath) {
  try {
    const parts = lowerOrWrongCasePath.split(path.sep).filter(Boolean);
    let current = path.sep;

    for (const part of parts) {
      if (!fs.existsSync(current)) return null;
      const entries = fs.readdirSync(current);
      const match = entries.find((e) => e.toLowerCase() === part.toLowerCase());
      if (!match) return null;
      current = path.join(current, match);
    }

    return fs.existsSync(current) ? current : null;
  } catch {
    return null;
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("👋 Closing app");
    app.quit();
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});