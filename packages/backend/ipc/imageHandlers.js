const { ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getUserDataPath } = require("../utils/appPaths");

function registerImageHandlers() {
  console.log("📸 Image handler registered");

  ipcMain.handle("save-image", async (_, { base64, name }) => {

    try {
      console.log("📸 save-image called");
      const { getMonthlyImagesPath, getStoragePaths } = require("../utils/appPaths");
      
      const imagesDir = getMonthlyImagesPath();

      const ext = name?.split(".").pop()?.toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const fileName = `${uuidv4()}.${safeExt}`;
      const filePath = path.join(imagesDir, fileName);

      const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(filePath, base64Data, "base64");
      
      const baseImagesPath = getStoragePaths().images;
      const relativePath = path.relative(baseImagesPath, filePath);

      console.log("✅ Image saved relative:", relativePath);

      return {
        success: true,
        filePath: filePath, // Keep absolute for frontend file:// access right now
        relativePath: relativePath
      };
    } catch (err) {
      console.error("❌ Image save failed:", err);
      throw err;
    }
  });
  ipcMain.handle("get-previous-images", async (_, { search, procedureFilter, page = 1, limit = 50 }) => {
    try {
      console.log("📸 get-previous-images called");
      const db = require("../db/db");
      return new Promise((resolve, reject) => {
        const offset = (page - 1) * limit;
        
        let query = `
          SELECT i.id, i.file_path, i.nbi_label, i.brightness, i.contrast, 
                 r.patient_name, r.report_type, r.created_at, r.report_number
          FROM images i
          JOIN reports r ON i.report_id = r.id
          WHERE 1=1
        `;
        let countQuery = `
          SELECT COUNT(*) as total
          FROM images i
          JOIN reports r ON i.report_id = r.id
          WHERE 1=1
        `;
        const params = [];

        if (procedureFilter && procedureFilter !== "All") {
          query += ` AND r.report_type = ?`;
          countQuery += ` AND r.report_type = ?`;
          params.push(procedureFilter);
        }

        if (search) {
          query += ` AND (r.patient_name LIKE ? OR r.sections LIKE ?)`;
          countQuery += ` AND (r.patient_name LIKE ? OR r.sections LIKE ?)`;
          params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
        
        db.get(countQuery, params, (err, row) => {
          if (err) return reject(err);
          const totalItems = row.total;
          
          db.all(query, [...params, limit, offset], (err, rows) => {
            if (err) return reject(err);
            resolve({
              data: rows,
              totalItems,
              totalPages: Math.ceil(totalItems / limit),
              currentPage: page
            });
          });
        });
      });
    } catch (err) {
      console.error("❌ Failed to get previous images:", err);
      throw err;
    }
  });
}

module.exports = { registerImageHandlers };