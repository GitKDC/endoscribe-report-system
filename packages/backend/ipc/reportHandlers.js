const { ipcMain, dialog } = require("electron");
const fs = require("fs");
const db = require("../db/db");
const { getTemplate } = require("../repositories/templateRepo");
const { generateReport } = require("../services/reportService");
const {
  saveReport,
  updateReport,
  getAllReports,
  getReport,
  getSetting,
  setSetting,
} = require("../repositories/reportRepo");

const registerReportHandlers = () => {

  // ── Generate (in-memory, returns sections for preview) ───────────────────
  ipcMain.handle("generate-report", async (_, data) => {
    try {
      console.log("📨 IPC HIT: generate-report");
      const report = await generateReport(data, db);
      console.log("✅ Report generated successfully");
      return report;
    } catch (error) {
      console.error("❌ Error generating report:", error);
      throw error;
    }
  });

  // ── Save report to DB (called just before PDF export) ────────────────────
  ipcMain.handle("save-report", async (_, data) => {
    try {
      console.log("📨 IPC HIT: save-report", data?.patientName);
      const result = await saveReport(data);
      console.log("✅ Report saved:", result.reportNumber);
      return result; // { id, reportNumber }
    } catch (error) {
      console.error("❌ Error saving report:", error);
      throw error;
    }
  });

  // ── Update existing report ────────────────────────────────────────────────
  ipcMain.handle("update-report", async (_, { id, data }) => {
    try {
      console.log("📨 IPC HIT: update-report", id, data?.patientName);
      const result = await updateReport(id, data);
      console.log("✅ Report updated:", result.reportNumber);
      return result; // { id, reportNumber }
    } catch (error) {
      console.error("❌ Error updating report:", error);
      throw error;
    }
  });

  // ── Get all reports (for Reports list page) ───────────────────────────────
  ipcMain.handle("get-all-reports", async (_, filters) => {
    try {
      const reports = await getAllReports(filters || {});
      return reports;
    } catch (error) {
      console.error("❌ Error fetching reports:", error);
      throw error;
    }
  });

  // ── Export reports to CSV ──────────────────────────────────────────────────
  ipcMain.handle("export-reports-csv", async (event, filters) => {
    try {
      // 1. Fetch data
      const reportsData = await getAllReports({ ...filters, page: 1, limit: 1000000 });
      const reports = reportsData.data || [];
      if (reports.length === 0) return { success: false, message: "No data to export" };

      // 2. Open Save Dialog
      const { readConfig } = require("../utils/config");
      const config = readConfig();
      const exportDir = config.storagePaths.exports || require("electron").app.getPath("downloads");
      const defaultPath = require("path").join(exportDir, `reports_export_${new Date().toISOString().split("T")[0]}.csv`);

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Save CSV Export",
        defaultPath,
        filters: [{ name: "CSV Files", extensions: ["csv"] }]
      });

      if (canceled || !filePath) return { success: false, message: "Canceled" };

      // 3. Format CSV
      const headers = ["Report Number", "Procedure Name", "Patient Name", "Doctor", "Date", "Report File (Local Path)"];
      const escapeCSV = (str) => {
        if (str === null || str === undefined) return '""';
        const cleanStr = String(str).replace(/"/g, '""');
        return `"${cleanStr}"`;
      };

      const rows = reports.map(report => {
        return [
          escapeCSV(report.report_number),
          escapeCSV(report.report_type),
          escapeCSV(report.patient_name),
          escapeCSV(report.doctor_name || "Unknown"),
          escapeCSV(" " + new Date(report.created_at).toLocaleDateString("en-GB")),
          escapeCSV(report.pdf_path || "Not downloaded yet")
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      
      // 4. Write to disk
      fs.writeFileSync(filePath, csvContent, "utf-8");
      
      return { success: true, filePath };
    } catch (error) {
      console.error("❌ Error exporting reports:", error);
      throw error;
    }
  });

  // ── Save PDF directly to reports directory ─────────────────────────────────
  ipcMain.handle("save-report-pdf", async (event, data) => {
    try {
      const { saveReportPdf } = require("../repositories/reportRepo");
      return await saveReportPdf(data.reportNumber, data.base64Data, data.filename);
    } catch (err) {
      throw err;
    }
  });

  ipcMain.handle("save-report-word", async (event, data) => {
    try {
      const { saveReportWord } = require("../repositories/reportRepo");
      return await saveReportWord(data.reportNumber, data.htmlContent, data.filename);
    } catch (err) {
      throw err;
    }
  });

  // ── Get single report ─────────────────────────────────────────────────────
  ipcMain.handle("get-report", async (_, id) => {
    try {
      const report = await getReport(id);
      return report;
    } catch (error) {
      console.error("❌ Error fetching report:", error);
      throw error;
    }
  });

  // ── Settings CRUD ─────────────────────────────────────────────────────────
  ipcMain.handle("get-setting", async (_, key) => getSetting(key));
  ipcMain.handle("set-setting", async (_, key, value) => setSetting(key, value));
};

module.exports = { registerReportHandlers };