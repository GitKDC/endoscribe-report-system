const db = require("../db/db");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const getDirSize = (dirPath) => {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(dirPath, files[i]);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      size += stats.size;
    } else if (stats.isDirectory()) {
      size += getDirSize(filePath);
    }
  }
  return size;
};

const dashboardRepo = {
  getStats: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const todayQuery = `SELECT COUNT(*) as cnt FROM reports WHERE date(created_at) = date('now', 'localtime')`;
        const monthQuery = `SELECT COUNT(*) as cnt FROM reports WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')`;
        const patientsQuery = `SELECT COUNT(*) as cnt FROM patients`;

        const getCount = (query) => {
          return new Promise((res, rej) => {
            db.get(query, [], (err, row) => {
              if (err) return rej(err);
              res(row ? row.cnt : 0);
            });
          });
        };

        const todayReports = await getCount(todayQuery);
        const thisMonthReports = await getCount(monthQuery);
        const totalPatients = await getCount(patientsQuery);

        // Storage Calculation
        let storageUsedBytes = 0;
        try {
          const { readConfig } = require("../utils/config");
          const config = readConfig();
          const dbPath = config.storagePaths.database;
          const imagesPath = config.storagePaths.images;

          if (fs.existsSync(dbPath)) storageUsedBytes += getDirSize(dbPath);
          if (fs.existsSync(imagesPath)) storageUsedBytes += getDirSize(imagesPath);
        } catch (e) {
          console.error("Failed to calculate storage size", e);
        }

        const storageUsedMB = (storageUsedBytes / (1024 * 1024)).toFixed(1);

        resolve({
          todayReports,
          thisMonthReports,
          totalPatients,
          storageUsedMB
        });
      } catch (err) {
        reject(err);
      }
    });
  }
};

module.exports = dashboardRepo;
