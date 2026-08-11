const { contextBridge, ipcRenderer } = require("electron");

console.log("✅ Preload script loaded");

contextBridge.exposeInMainWorld("api", {
  // ─── TEMPLATE APIs ──────────────────────────────────────────────────────
  getTemplates:   async ()       => ipcRenderer.invoke("get-templates"),
  getTemplate:    async (id)     => ipcRenderer.invoke("get-template", id),
  createTemplate: async (data)   => ipcRenderer.invoke("create-template", data),
  updateTemplate: async (id, d)  => ipcRenderer.invoke("update-template", id, d),
  deleteTemplate: async (id)     => ipcRenderer.invoke("delete-template", id),

  // ─── CATEGORY APIs ──────────────────────────────────────────────────────
  getCategories:   async ()      => ipcRenderer.invoke("get-categories"),
  createCategory:  async (data)  => ipcRenderer.invoke("create-category", data),
  updateCategory:  async (id, d) => ipcRenderer.invoke("update-category", id, d),
  deleteCategory:  async (id)    => ipcRenderer.invoke("delete-category", id),

  // ─── DOCTOR APIs ────────────────────────────────────────────────────────
  getDoctors:   async ()       => ipcRenderer.invoke("get-doctors"),
  getDoctor:    async (id)     => ipcRenderer.invoke("get-doctor", id),
  createDoctor: async (data)   => ipcRenderer.invoke("create-doctor", data),
  updateDoctor: async (id, d)  => ipcRenderer.invoke("update-doctor", id, d),
  deleteDoctor: async (id)     => ipcRenderer.invoke("delete-doctor", id),
  // ─── PATIENT APIs ─────────────────────────────────────────────────────────
  getPatients:   async (query)  => ipcRenderer.invoke("get-patients", query),
  getPatient:    async (id)     => ipcRenderer.invoke("get-patient", id),
  createPatient: async (data)   => ipcRenderer.invoke("create-patient", data),
  updatePatient: async (id, d)  => ipcRenderer.invoke("update-patient", { id, ...d }),
  deletePatient: async (id)     => ipcRenderer.invoke("delete-patient", id),
  exportPatientsCSV: async (query) => ipcRenderer.invoke("export-patients-csv", query),

  // ─── REFERRAL APIs ────────────────────────────────────────────────────────
  getReferrals:   async (filters) => ipcRenderer.invoke("get-referrals", filters),
  getReferral:    async (id)     => ipcRenderer.invoke("get-referral", id),
  createReferral: async (data)   => ipcRenderer.invoke("create-referral", data),
  updateReferral: async (id, d)  => ipcRenderer.invoke("update-referral", { id, ...d }),
  deleteReferral: async (id)     => ipcRenderer.invoke("delete-referral", id),

  // ─── REPORT APIs ────────────────────────────────────────────────────────
  // Generate (returns sections for live preview — does NOT save to DB)
  generateReport: async (data) => ipcRenderer.invoke("generate-report", data),
  saveImage: async (data) => ipcRenderer.invoke("save-image", data),
  getPreviousImages: async (filters) => ipcRenderer.invoke("get-previous-images", filters),
  // Save to DB right before PDF export — returns { id, reportNumber }
  saveReport:    async (data)  => ipcRenderer.invoke("save-report", data),
  updateReport:  async (data)  => ipcRenderer.invoke("update-report", data),
  saveReportPdf: async (data)  => ipcRenderer.invoke("save-report-pdf", data),
  saveReportWord: async (data) => ipcRenderer.invoke("save-report-word", data),

  // ─── DASHBOARD APIs ────────────────────────────────────────────────────────
  getDashboardStats: async () => ipcRenderer.invoke("get-dashboard-stats"),
  getAnalytics: async (filters) => ipcRenderer.invoke("get-analytics", filters),

  // Reports list / detail
  getAllReports: async (filters) => ipcRenderer.invoke("get-all-reports", filters),
  exportReportsCSV: async (filters) => ipcRenderer.invoke("export-reports-csv", filters),
  getReport:    async (id)     => ipcRenderer.invoke("get-report", id),

  // ─── SETTINGS ────────────────────────────────────────────────────────────
  getSetting: async (key)         => ipcRenderer.invoke("get-setting", key),
  setSetting: async (key, value)  => ipcRenderer.invoke("set-setting", key, value),

  // ─── AUTH ────────────────────────────────────────────────────────────────
  getUsersCount: async () => ipcRenderer.invoke("auth:getUsersCount"),
  login: async (username, password) => ipcRenderer.invoke("auth:login", username, password),
  createUser: async (username, password, role) => ipcRenderer.invoke("auth:createUser", username, password, role),
  getAllUsers: async () => ipcRenderer.invoke("auth:getAllUsers"),
  deleteUser: async (id) => ipcRenderer.invoke("auth:deleteUser", id),
  
  // ─── RECOVERY ────────────────────────────────────────────────────────────
  generateRecoveryKey: async () => ipcRenderer.invoke("auth:generateRecoveryKey"),
  verifyRecoveryKey: async (key) => ipcRenderer.invoke("auth:verifyRecoveryKey", key),
  resetUserPassword: async (username, password) => ipcRenderer.invoke("auth:resetUserPassword", username, password),

  // ─── WHATSAPP ────────────────────────────────────────────────────────────
  sendWhatsAppReport: async (pdfPath, toPhoneNumber, isDoctor, reportData) => ipcRenderer.invoke("whatsapp:sendReport", pdfPath, toPhoneNumber, isDoctor, reportData),

  // ─── LICENSING ───────────────────────────────────────────────────────────
  verifyLicense: async () => ipcRenderer.invoke("license:verify"),
  saveLicense: async (key) => ipcRenderer.invoke("license:save", key),

  // ─── STORAGE & CONFIG APIs ───────────────────────────────────────────────
  getAppConfig:   async ()       => ipcRenderer.invoke("get-app-config"),
  setAppConfig:   async (upd)    => ipcRenderer.invoke("set-app-config", upd),
  verifyStorage:  async ()       => ipcRenderer.invoke("verify-storage"),
  optimizeDb:     async ()       => ipcRenderer.invoke("optimize-db"),
  getStorageHealth: async ()     => ipcRenderer.invoke("get-storage-health"),
  migrateStorage: async (path)   => ipcRenderer.invoke("migrate-storage", path),
  selectFolder:   async ()       => ipcRenderer.invoke("select-folder"),
  getOldDataSummary: async ()    => ipcRenderer.invoke("get-old-data-summary"),
  verifyAdminPassword: async (p) => ipcRenderer.invoke("verify-admin-password", p),
  deleteOldData: async ()        => ipcRenderer.invoke("delete-old-data"),

  // ─── BACKUP APIs ─────────────────────────────────────────────────────────
  // Manual backup → opens save-file dialog, zips db + images
  createBackup: async () => ipcRenderer.invoke("create-backup"),

  // Called on app launch to auto-backup if 30+ days since last
  checkAutoBackup: async () => ipcRenderer.invoke("check-auto-backup"),

  // Returns { freeGB, totalGB, lowSpace }
  checkDiskSpace: async () => ipcRenderer.invoke("check-disk-space"),

  // ─── MISC ────────────────────────────────────────────────────────────────
  getAppDataPath: () => ipcRenderer.invoke("get-app-data-path"),
  isElectron:     () => true,

  // ─── GOOGLE CONTACTS ─────────────────────────────────────────────────────
  getGoogleCredentials: async () => ipcRenderer.invoke("get-google-credentials"),
  setGoogleCredentials: async (data) => ipcRenderer.invoke("set-google-credentials", data),
  syncGoogleContacts: async (data) => ipcRenderer.invoke("sync-google-contacts", data),
});

console.log("✅ API bridge ready");