const { ipcMain } = require("electron");
const patientRepo = require("../repositories/patientRepo");

function registerPatientHandlers() {
  ipcMain.handle("create-patient", async (_, data) => {
    return await patientRepo.createPatient(data);
  });

  ipcMain.handle("get-patients", async (_, query) => {
    return await patientRepo.searchPatients(query);
  });

  ipcMain.handle("get-patient", async (_, id) => {
    return await patientRepo.getPatient(id);
  });

  ipcMain.handle("update-patient", async (_, data) => {
    const { id, ...rest } = data;
    return await patientRepo.updatePatient(id, rest);
  });

  ipcMain.handle("delete-patient", async (_, id) => {
    return await patientRepo.deletePatient(id);
  });

  ipcMain.handle("export-patients-csv", async (_, query) => {
    try {
      const { dialog } = require("electron");
      const fs = require("fs");
      const { getAllReports } = require("../repositories/reportRepo");
      
      const reportsData = await getAllReports({ ...query, page: 1, limit: 1000000 });
      const reports = reportsData.data || [];
      if (reports.length === 0) return { success: false, message: "No data to export" };

      const { readConfig } = require("../utils/config");
      const config = readConfig();
      const exportDir = config.storagePaths.exports || require("electron").app.getPath("downloads");
      const defaultPath = require("path").join(exportDir, `patients_export_${new Date().toISOString().split("T")[0]}.csv`);

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Save Patients CSV",
        defaultPath,
        filters: [{ name: "CSV Files", extensions: ["csv"] }]
      });

      if (canceled || !filePath) return { success: false, message: "Canceled" };

      const headers = ["Date", "Patient Name", "Phone", "Age", "Gender", "Procedure", "Doctor", "Referral Doctor", "Impression", "Last Visit"];
      const escapeCSV = (str) => {
        if (str === null || str === undefined) return '""';
        const cleanStr = String(str).replace(/"/g, '""');
        return `"${cleanStr}"`;
      };

      const rows = reports.map(report => {
        let impression = "";
        if (report.sections) {
          try {
            const sectionsArr = typeof report.sections === "string" ? JSON.parse(report.sections) : report.sections;
            const impSec = sectionsArr.find(s => s.title.toLowerCase().includes("impression") || s.highlight);
            if (impSec) impression = impSec.content;
          } catch (e) {}
        }
        
        return [
          escapeCSV(" " + new Date(report.created_at).toLocaleDateString("en-GB")),
          escapeCSV(report.patient_name),
          escapeCSV(report.phone || ""),
          escapeCSV(report.age),
          escapeCSV(report.gender),
          escapeCSV(report.report_type),
          escapeCSV(report.doctor_name || "Unknown"),
          escapeCSV(report.referral_name || ""),
          escapeCSV(impression),
          escapeCSV(report.last_visit ? " " + new Date(report.last_visit).toLocaleDateString("en-GB") : "")
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      fs.writeFileSync(filePath, csvContent, "utf-8");
      
      return { success: true, filePath };
    } catch (error) {
      console.error("❌ Error exporting patients:", error);
      throw error;
    }
  });
}

module.exports = { registerPatientHandlers };
