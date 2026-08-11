const db = require("../db/db");
const fs = require("fs");
const { parseReportDiseases } = require("../services/analyticsParser");

// ─── Get a setting value ─────────────────────────────────────────────────────
const getSetting = (key) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.value : null);
    });
  });
};

// ─── Set a setting value ─────────────────────────────────────────────────────
const setSetting = (key, value) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [key, value],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

// ─── Generate a unique report number  e.g.  SH-2026-047 ──────────────────────
const generateReportNumber = async () => {
  const prefix = (await getSetting("report_prefix")) || "SH";
  const year = new Date().getFullYear();

  return new Promise((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as cnt FROM reports WHERE strftime('%Y', created_at) = ?",
      [String(year)],
      (err, row) => {
        if (err) return reject(err);
        const num = String((row?.cnt || 0) + 1).padStart(3, "0");
        resolve(`${prefix}-${year}-${num}`);
      }
    );
  });
};

// ─── Save a report to the DB ─────────────────────────────────────────────────
const saveReport = async (data) => {
  let {
    patientId,
    patientPrefix = "Mr.",
    patientName,
    patientPhone,
    age,
    gender,
    doctorId,
    referralDoctorId,
    referralDoctorName,
    referralDoctorPhone,
    templateId,
    reportType,
    sections,
    images = [] 
  } = data;

  const reportNumber = await generateReportNumber();

  // 🔥 Auto-create patient if not provided
  if (!patientId && patientName) {
    try {
      const existingPatient = await new Promise((res, rej) => {
        db.get("SELECT id FROM patients WHERE name = ? COLLATE NOCASE", [patientName.trim()], (err, row) => {
          if (err) return rej(err);
          res(row);
        });
      });

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        await new Promise((res, rej) => {
          db.run(
            "INSERT INTO patients (name, phone, age, gender) VALUES (?, ?, ?, ?)",
            [patientName.trim(), patientPhone || null, age || null, gender || "M"],
            function (err) {
              if (err) return rej(err);
              patientId = this.lastID;
              res();
            }
          );
        });
      }
    } catch (err) {
      console.error("Failed to auto-create patient:", err);
    }
  }

  // 🔥 Auto-create referral doctor if not provided
  if (!referralDoctorId && referralDoctorName) {
    try {
      const existingReferral = await new Promise((res, rej) => {
        db.get("SELECT id FROM referral_doctors WHERE name = ? COLLATE NOCASE", [referralDoctorName.trim()], (err, row) => {
          if (err) return rej(err);
          res(row);
        });
      });

      if (existingReferral) {
        referralDoctorId = existingReferral.id;
      } else {
        await new Promise((res, rej) => {
          db.run(
            "INSERT INTO referral_doctors (name, phone) VALUES (?, ?)",
            [referralDoctorName.trim(), referralDoctorPhone || null],
            function (err) {
              if (err) return rej(err);
              referralDoctorId = this.lastID;
              res();
            }
          );
        });
      }
    } catch (err) {
      console.error("Failed to auto-create referral doctor:", err);
    }
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO reports
       (report_number, patient_prefix, patient_name, age, gender,
        doctor_id, doctor_ids, template_id, report_type, sections, patient_id, referral_doctor_id, patient_phone, referral_doctor_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportNumber,
        patientPrefix,
        patientName,
        age,
        gender,
        doctorId || null,
        data.doctorIds ? JSON.stringify(data.doctorIds) : null,
        templateId || null,
        reportType || "UPPER GI ENDOSCOPY",
        JSON.stringify(sections || []),
        patientId || null,
        referralDoctorId || null,
        patientPhone || null,
        referralDoctorPhone || null,
      ],
      function (err) {
        if (err) return reject(err);

        const reportId = this.lastID;

        // SAVE IMAGES
        const stmt = db.prepare(
          "INSERT INTO images (report_id, file_path, position, nbi_label, brightness, contrast) VALUES (?, ?, ?, ?, ?, ?)"
        );

        images.forEach((img, index) => {
          console.log("📸 Image incoming:", img);

          const finalPath = img.relativePath ? img.relativePath : img.filePath;
          if (finalPath && finalPath.trim() !== "") {
            stmt.run(reportId, finalPath, index, img.nbiLabel || null, img.brightness ?? 70, img.contrast ?? 70);
          } else {
            console.warn("Skipping image (no valid path):", img);
          }
        });

        stmt.finalize();

        // 🔥 Trigger Analytics Parser
        parseReportDiseases(reportId, patientId, sections);

        resolve({ id: reportId, reportNumber });
      }
    );
  });
};

// ─── Update an existing report ───────────────────────────────────────────────
const updateReport = async (reportId, data) => {
  let {
    patientId,
    patientPrefix = "Mr.",
    patientName,
    patientPhone,
    age,
    gender,
    doctorId,
    referralDoctorId,
    referralDoctorName,
    referralDoctorPhone,
    templateId,
    reportType,
    sections,
    images = [] 
  } = data;

  // 🔥 Auto-create or Update patient
  if (patientName) {
    try {
      const existingPatient = await new Promise((res, rej) => {
        if (patientId) {
           db.get("SELECT id FROM patients WHERE id = ?", [patientId], (err, row) => err ? rej(err) : res(row));
        } else {
           db.get("SELECT id FROM patients WHERE name = ? COLLATE NOCASE", [patientName.trim()], (err, row) => err ? rej(err) : res(row));
        }
      });

      if (existingPatient) {
        patientId = existingPatient.id;
        await new Promise((res, rej) => {
          db.run(
            "UPDATE patients SET name = ?, phone = ?, age = ?, gender = ? WHERE id = ?",
            [patientName.trim(), patientPhone || null, age || null, gender || "M", patientId],
            (err) => err ? rej(err) : res()
          );
        });
      } else {
        await new Promise((res, rej) => {
          db.run(
            "INSERT INTO patients (name, phone, age, gender) VALUES (?, ?, ?, ?)",
            [patientName.trim(), patientPhone || null, age || null, gender || "M"],
            function (err) {
              if (err) return rej(err);
              patientId = this.lastID;
              res();
            }
          );
        });
      }
    } catch (err) {
      console.error("Failed to auto-create/update patient:", err);
    }
  }

  // 🔥 Auto-create or Update referral doctor
  if (referralDoctorName) {
    try {
      const existingReferral = await new Promise((res, rej) => {
        if (referralDoctorId) {
          db.get("SELECT id FROM referral_doctors WHERE id = ?", [referralDoctorId], (err, row) => err ? rej(err) : res(row));
        } else {
          db.get("SELECT id FROM referral_doctors WHERE name = ? COLLATE NOCASE", [referralDoctorName.trim()], (err, row) => err ? rej(err) : res(row));
        }
      });

      if (existingReferral) {
        referralDoctorId = existingReferral.id;
        await new Promise((res, rej) => {
          db.run(
            "UPDATE referral_doctors SET name = ?, phone = ? WHERE id = ?",
            [referralDoctorName.trim(), referralDoctorPhone || null, referralDoctorId],
            (err) => err ? rej(err) : res()
          );
        });
      } else {
        await new Promise((res, rej) => {
          db.run(
            "INSERT INTO referral_doctors (name, phone) VALUES (?, ?)",
            [referralDoctorName.trim(), referralDoctorPhone || null],
            function (err) {
              if (err) return rej(err);
              referralDoctorId = this.lastID;
              res();
            }
          );
        });
      }
    } catch (err) {
      console.error("Failed to auto-create/update referral doctor:", err);
    }
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE reports SET
         patient_prefix = ?, patient_name = ?, age = ?, gender = ?,
         doctor_id = ?, doctor_ids = ?, template_id = ?, report_type = ?, sections = ?,
         patient_id = ?, referral_doctor_id = ?, patient_phone = ?, referral_doctor_phone = ?
       WHERE id = ?`,
      [
        patientPrefix,
        patientName,
        age,
        gender,
        doctorId || null,
        data.doctorIds ? JSON.stringify(data.doctorIds) : null,
        templateId || null,
        reportType || "UPPER GI ENDOSCOPY",
        JSON.stringify(sections || []),
        patientId || null,
        referralDoctorId || null,
        patientPhone || null,
        referralDoctorPhone || null,
        reportId
      ],
      async function (err) {
        if (err) return reject(err);

        // Fetch report_number for return value
        const reportNumber = await new Promise((res, rej) => {
          db.get("SELECT report_number FROM reports WHERE id = ?", [reportId], (e, r) => e ? rej(e) : res(r?.report_number));
        });

        // 1. Delete all existing images
        await new Promise((res, rej) => {
          db.run("DELETE FROM images WHERE report_id = ?", [reportId], (e) => e ? rej(e) : res());
        });

        // 2. Insert the new images
        const stmt = db.prepare(
          "INSERT INTO images (report_id, file_path, position, nbi_label, brightness, contrast) VALUES (?, ?, ?, ?, ?, ?)"
        );

        images.forEach((img, index) => {
          const finalPath = img.relativePath ? img.relativePath : img.filePath;
          if (finalPath && finalPath.trim() !== "") {
            stmt.run(reportId, finalPath, index, img.nbiLabel || null, img.brightness ?? 70, img.contrast ?? 70);
          }
        });

        stmt.finalize();

        // 3. Delete existing diseases
        await new Promise((res, rej) => {
          db.run("DELETE FROM report_diseases WHERE report_id = ?", [reportId], (e) => e ? rej(e) : res());
        });

        // 4. Re-trigger analytics
        parseReportDiseases(reportId, patientId, sections);

        resolve({ id: reportId, reportNumber });
      }
    );
  });
};

// ─── Get all reports (list view with pagination & filters) ─────────────────────
const getAllReports = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const { page = 1, limit = 10, search = "", startDate, endDate, procedure, doctorId } = filters;
    
    let baseQuery = `
      FROM reports r
      LEFT JOIN doctors d ON r.doctor_id = d.id
      LEFT JOIN referral_doctors rd ON r.referral_doctor_id = rd.id
      WHERE 1=1
    `;
    let countParams = [];
    
    if (search) {
      baseQuery += ` AND r.patient_name LIKE ?`;
      countParams.push(`%${search}%`);
    }
    if (startDate && endDate) {
      baseQuery += ` AND date(r.created_at) BETWEEN date(?) AND date(?)`;
      countParams.push(startDate, endDate);
    }
    if (procedure && procedure !== "All") {
      baseQuery += ` AND r.report_type = ?`;
      countParams.push(procedure);
    }
    if (doctorId && doctorId !== "All") {
      baseQuery += ` AND r.doctor_id = ?`;
      countParams.push(doctorId);
    }
    
    // First, get total count
    db.get(`SELECT COUNT(*) as total ${baseQuery}`, countParams, (err, countRow) => {
      if (err) return reject(err);
      
      const totalItems = countRow.total || 0;
      const totalPages = Math.ceil(totalItems / limit);
      
      const offset = (page - 1) * limit;
      let dataQuery = `
        SELECT r.id, r.report_number, r.patient_prefix, r.patient_name,
               r.age, r.gender, r.report_type, r.created_at, r.sections, r.pdf_path,
               d.name AS doctor_name, rd.name AS referral_name,
               p.phone,
               (SELECT MAX(created_at) FROM reports r2 WHERE r2.patient_id = p.id) as last_visit
        FROM reports r
        LEFT JOIN doctors d ON r.doctor_id = d.id
        LEFT JOIN referral_doctors rd ON r.referral_doctor_id = rd.id
        LEFT JOIN patients p ON r.patient_id = p.id
        WHERE 1=1
      `;
      
      if (search) dataQuery += ` AND r.patient_name LIKE ?`;
      if (startDate && endDate) dataQuery += ` AND date(r.created_at) BETWEEN date(?) AND date(?)`;
      if (procedure && procedure !== "All") dataQuery += ` AND r.report_type = ?`;
      if (doctorId && doctorId !== "All") dataQuery += ` AND r.doctor_id = ?`;

      dataQuery += `
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const dataParams = [...countParams, limit, offset];
      
      const { getStoragePaths } = require("../utils/appPaths");
      const path = require("path");

      db.all(dataQuery, dataParams, (err, rows) => {
        if (err) return reject(err);
        
        const configPaths = getStoragePaths();
        const finalRows = (rows || []).map(r => {
          if (r.pdf_path && !path.isAbsolute(r.pdf_path)) {
            r.pdf_path = path.join(configPaths.reports, r.pdf_path);
          }
          return r;
        });

        resolve({
          data: finalRows,
          totalItems,
          totalPages,
          currentPage: page
        });
      });
    });
  });
};

// ─── Get single report by ID ──────────────────────────────────────────────────
const getReport = (id) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT r.*, d.name AS doctor_name, d.qualifications, d.designation, rd.name AS referral_name
       FROM reports r
       LEFT JOIN doctors d ON r.doctor_id = d.id
       LEFT JOIN referral_doctors rd ON r.referral_doctor_id = rd.id
       WHERE r.id = ?`,
      [id],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        // parse JSON sections
        row.sections = row.sections ? JSON.parse(row.sections) : [];
        let doctorIds = [];
        try { doctorIds = row.doctor_ids ? JSON.parse(row.doctor_ids) : []; } catch (e) {}

        const { getStoragePaths } = require("../utils/appPaths");
        const path = require("path");
        const configPaths = getStoragePaths();

        if (row.pdf_path && !path.isAbsolute(row.pdf_path)) {
          row.pdf_path = path.join(configPaths.reports, row.pdf_path);
        }

        db.all(
          "SELECT * FROM images WHERE report_id = ? ORDER BY position",
          [id],
          (err2, images) => {
            if (err2) return reject(err2);

            row.images = images.map(img => {
              if (img.file_path && !path.isAbsolute(img.file_path)) {
                img.file_path = path.join(configPaths.images, img.file_path);
              }
              return img;
            });

            if (doctorIds.length > 0) {
              const placeholders = doctorIds.map(() => '?').join(',');
              db.all(`SELECT id, name, qualifications, designation FROM doctors WHERE id IN (${placeholders})`, doctorIds, (err3, docs) => {
                row.selected_doctors = docs || [];
                resolve(row);
              });
            } else {
              if (row.doctor_name) {
                row.selected_doctors = [{
                  id: row.doctor_id,
                  name: row.doctor_name,
                  qualifications: row.qualifications,
                  designation: row.designation
                }];
              } else {
                row.selected_doctors = [];
              }
              resolve(row);
            }
          }
        );
      }
    );
  });
};

const saveReportPdf = (reportNumber, base64Data, filename) => {
  return new Promise((resolve, reject) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const { getMonthlyReportsPath, getStoragePaths } = require("../utils/appPaths");

      const reportsDir = getMonthlyReportsPath();
      const filePath = path.join(reportsDir, filename);

      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(filePath, buffer);

      const baseReportsPath = getStoragePaths().reports;
      const relativePath = path.relative(baseReportsPath, filePath);

      db.run(
        `UPDATE reports SET pdf_path = ? WHERE report_number = ?`,
        [relativePath, reportNumber],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true, filePath: relativePath });
        }
      );
    } catch (e) {
      reject(e);
    }
  });
};

const saveReportWord = (reportNumber, htmlContent, filename) => {
  return new Promise((resolve, reject) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const { getMonthlyReportsPath, getStoragePaths } = require("../utils/appPaths");

      const reportsDir = getMonthlyReportsPath();
      const filePath = path.join(reportsDir, filename);

      fs.writeFileSync(filePath, htmlContent, "utf-8");

      const baseReportsPath = getStoragePaths().reports;
      const relativePath = path.relative(baseReportsPath, filePath);

      resolve({ success: true, filePath: relativePath });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = { saveReport, updateReport, getAllReports, getReport, generateReportNumber, getSetting, setSetting, saveReportPdf, saveReportWord };
