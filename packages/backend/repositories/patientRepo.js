const db = require("../db/db");

const patientRepo = {
  // Create a new patient
  createPatient: (data) => {
    return new Promise((resolve, reject) => {
      const { name, phone, age, gender, city, procedure_type } = data;
      const query = `
        INSERT INTO patients (name, phone, age, gender, city, procedure_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.run(query, [name, phone, age, gender, city || null, procedure_type || null], function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...data });
      });
    });
  },

  // Get patients with optional search, including report count and last visit
  searchPatients: (filters = {}) => {
    return new Promise((resolve, reject) => {
      // Fallback for backwards compatibility if passed as a string
      const isString = typeof filters === 'string';
      const search = isString ? filters : (filters.search || "");
      const page = isString ? 1 : (filters.page || 1);
      const limit = isString ? 50 : (filters.limit || 10);
      const offset = (page - 1) * limit;

      let baseQuery = `
        FROM patients p
      `;
      let countParams = [];
      
      if (search) {
        baseQuery += ` WHERE p.name LIKE ? OR p.phone LIKE ?`;
        countParams.push(`%${search}%`, `%${search}%`);
      }

      // Count total matching records
      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
      
      db.get(countQuery, countParams, (err, countResult) => {
        if (err) return reject(err);
        const total = countResult.total;

        let dataQuery = `
          SELECT 
            p.id, p.name, p.phone, p.age, p.gender, p.city, 
            COALESCE(p.procedure_type, (SELECT report_type FROM reports r WHERE r.patient_id = p.id ORDER BY created_at DESC LIMIT 1)) as procedure_type, 
            p.created_at,
            (SELECT COUNT(*) FROM reports r WHERE r.patient_id = p.id) as report_count,
            (SELECT MAX(created_at) FROM reports r WHERE r.patient_id = p.id) as last_visit
          ${baseQuery}
          ORDER BY p.updated_at DESC
          LIMIT ? OFFSET ?
        `;

        db.all(dataQuery, [...countParams, limit, offset], (err, rows) => {
          if (err) return reject(err);
          resolve({ data: rows, total });
        });
      });
    });
  },

  // Get a specific patient, along with their reports
  getPatient: (id) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, name, phone, age, gender, city, COALESCE(procedure_type, (SELECT report_type FROM reports r WHERE r.patient_id = patients.id ORDER BY created_at DESC LIMIT 1)) as procedure_type, created_at, updated_at FROM patients WHERE id = ?`;
      db.get(query, [id], (err, patient) => {
        if (err) return reject(err);
        if (!patient) return resolve(null);

        // Fetch their reports
        const reportQuery = `
          SELECT id, report_number, report_type, created_at, doctor_id
          FROM reports
          WHERE patient_id = ?
          ORDER BY created_at DESC
        `;
        db.all(reportQuery, [id], (err2, reports) => {
          if (err2) return reject(err2);
          patient.reports = reports;
          resolve(patient);
        });
      });
    });
  },

  // Update a patient
  updatePatient: (id, data) => {
    return new Promise((resolve, reject) => {
      const { name, phone, age, gender, city, procedure_type } = data;
      const query = `
        UPDATE patients 
        SET name = ?, phone = ?, age = ?, gender = ?, city = ?, procedure_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      db.run(query, [name, phone, age, gender, city || null, procedure_type || null, id], function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      });
    });
  },

  // Delete a patient
  deletePatient: (id) => {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM patients WHERE id = ?`;
      db.run(query, [id], function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      });
    });
  }
};

module.exports = patientRepo;
