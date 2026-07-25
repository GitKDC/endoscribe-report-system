const db = require("../db/db");

const getAnalytics = (filters = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const get = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (e, row) => e ? rej(e) : res(row)));
      const query = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, rows) => e ? rej(e) : res(rows)));

      let baseReportWhere = "WHERE 1=1";
      let baseDiseaseWhere = "WHERE 1=1";
      const params = [];

      // Filter handling can be extended here
      // For now, return overall data
      
      const totalReportsRes = await get(`SELECT COUNT(*) as cnt FROM reports ${baseReportWhere}`);
      const totalReports = totalReportsRes.cnt || 0;
      
      const todayReportsRes = await get(`SELECT COUNT(*) as cnt FROM reports ${baseReportWhere} AND date(created_at) = date('now', 'localtime')`);
      const monthReportsRes = await get(`SELECT COUNT(*) as cnt FROM reports ${baseReportWhere} AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')`);
      const totalPatientsRes = await get(`SELECT COUNT(DISTINCT patient_id) as cnt FROM reports ${baseReportWhere}`);

      // Disease distribution
      const diseasesRaw = await query(`
        SELECT disease_name as name, COUNT(*) as value 
        FROM report_diseases 
        GROUP BY disease_name 
        ORDER BY value DESC
      `);

      const totalDiseaseOccurrences = diseasesRaw.reduce((sum, d) => sum + d.value, 0);

      // Add percentage
      const diseaseDistribution = diseasesRaw.map(d => ({
        ...d,
        percentage: totalDiseaseOccurrences > 0 ? ((d.value / totalDiseaseOccurrences) * 100).toFixed(1) : 0
      }));

      // Age distribution per disease
      // We will group by predefined ranges
      const ageRaw = await query(`
        SELECT rd.disease_name, p.age 
        FROM report_diseases rd
        JOIN patients p ON rd.patient_id = p.id
        WHERE p.age IS NOT NULL
      `);
      
      // Organize by age group
      const ageGroups = ["0-18", "19-30", "31-45", "46-60", "61-75", "75+"];
      const diseaseByAge = {};
      ageRaw.forEach(row => {
        let group = "75+";
        if (row.age <= 18) group = "0-18";
        else if (row.age <= 30) group = "19-30";
        else if (row.age <= 45) group = "31-45";
        else if (row.age <= 60) group = "46-60";
        else if (row.age <= 75) group = "61-75";

        if (!diseaseByAge[row.disease_name]) {
          diseaseByAge[row.disease_name] = { name: row.disease_name };
          ageGroups.forEach(g => diseaseByAge[row.disease_name][g] = 0);
        }
        diseaseByAge[row.disease_name][group]++;
      });

      // Gender distribution
      const genderRaw = await query(`
        SELECT rd.disease_name, p.gender, COUNT(*) as count
        FROM report_diseases rd
        JOIN patients p ON rd.patient_id = p.id
        WHERE p.gender IS NOT NULL
        GROUP BY rd.disease_name, p.gender
      `);
      
      const diseaseByGender = {};
      genderRaw.forEach(row => {
        if (!diseaseByGender[row.disease_name]) {
          diseaseByGender[row.disease_name] = { name: row.disease_name, Male: 0, Female: 0, Total: 0 };
        }
        const g = row.gender.toUpperCase() === 'F' ? 'Female' : 'Male';
        diseaseByGender[row.disease_name][g] += row.count;
        diseaseByGender[row.disease_name].Total += row.count;
      });
      // Convert to percentages for easy charting
      const genderStats = Object.values(diseaseByGender).map(d => ({
        name: d.name,
        Male: d.Total > 0 ? ((d.Male / d.Total) * 100).toFixed(1) : 0,
        Female: d.Total > 0 ? ((d.Female / d.Total) * 100).toFixed(1) : 0,
        MaleCount: d.Male,
        FemaleCount: d.Female
      }));

      // City distribution
      const cityRaw = await query(`
        SELECT rd.disease_name, p.city, COUNT(*) as count
        FROM report_diseases rd
        JOIN patients p ON rd.patient_id = p.id
        WHERE p.city IS NOT NULL AND p.city != ''
        GROUP BY p.city, rd.disease_name
      `);
      const cityData = {};
      cityRaw.forEach(row => {
        if (!cityData[row.city]) cityData[row.city] = { total: 0, diseases: {} };
        cityData[row.city].total += row.count;
        cityData[row.city].diseases[row.disease_name] = row.count;
      });
      const diseaseByCity = Object.keys(cityData).map(city => ({
        name: city,
        total: cityData[city].total,
        ...cityData[city].diseases
      })).sort((a, b) => b.total - a.total);

      // Organ distribution
      const organRaw = await query(`
        SELECT organ_name, disease_name, COUNT(*) as count
        FROM report_diseases
        GROUP BY organ_name, disease_name
      `);
      const organData = {};
      organRaw.forEach(row => {
        if (!organData[row.organ_name]) organData[row.organ_name] = { total: 0, diseases: {} };
        organData[row.organ_name].total += row.count;
        organData[row.organ_name].diseases[row.disease_name] = row.count;
      });
      const diseaseByOrgan = Object.keys(organData).map(organ => ({
        name: organ,
        total: organData[organ].total,
        ...organData[organ].diseases
      })).sort((a, b) => b.total - a.total);

      // Monthly trends
      const monthlyRaw = await query(`
        SELECT strftime('%Y-%m', created_at) as month, disease_name, COUNT(*) as count
        FROM report_diseases
        WHERE created_at >= date('now', '-12 months')
        GROUP BY month, disease_name
        ORDER BY month ASC
      `);
      const monthData = {};
      monthlyRaw.forEach(row => {
        if (!monthData[row.month]) monthData[row.month] = { month: row.month };
        monthData[row.month][row.disease_name] = row.count;
      });
      const monthlyTrends = Object.values(monthData);

      // Daily trend (last 30 days overall reports, backward compatibility for simple chart)
      const dayTrendRaw = await query(`SELECT date(created_at) as date, COUNT(*) as count FROM reports WHERE created_at >= date('now', '-30 days') GROUP BY date(created_at) ORDER BY date`);
      const last30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split("T")[0];
      });
      const dayMap = {};
      dayTrendRaw.forEach(r => dayMap[r.date] = r.count);
      const reportsByDay = last30.map(date => ({ date, count: dayMap[date] || 0 }));

      // Type breakdown
      const typeBreakdown = await query(`SELECT report_type as name, COUNT(*) as value FROM reports GROUP BY report_type`);

      // ─── RESTORED OLD ANALYTICS LOGIC (SCALABLE) ───
      const dowData = await query(`SELECT cast(strftime('%w', created_at) as integer) as day, COUNT(*) as count FROM reports GROUP BY day`);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const reportsByDayOfWeek = days.map((day, i) => {
        const found = dowData.find(d => d.day === i);
        return { name: day, count: found ? found.count : 0 };
      });

      const cityReferralData = await query(`SELECT rd.city, COUNT(r.id) as value FROM reports r JOIN referral_doctors rd ON r.referral_doctor_id = rd.id WHERE rd.city IS NOT NULL AND rd.city != '' GROUP BY rd.city ORDER BY value DESC`);
      
      const oldKeywords = ["Polyp", "Colitis", "Carcinoma", "Bleeding", "Ulcer", "Erythema", "Gastritis"];
      const keywordCounts = {};
      const ageAnalytics = {
        "0-20": { total: 0, conditions: {} },
        "21-40": { total: 0, conditions: {} },
        "41-60": { total: 0, conditions: {} },
        "61+": { total: 0, conditions: {} }
      };

      // Total by age bracket
      const ageTotals = await query(`
        SELECT 
          CASE 
            WHEN age <= 20 THEN '0-20'
            WHEN age <= 40 THEN '21-40'
            WHEN age <= 60 THEN '41-60'
            ELSE '61+' 
          END as age_group,
          COUNT(*) as cnt
        FROM reports
        WHERE age IS NOT NULL
        GROUP BY age_group
      `);
      ageTotals.forEach(row => {
        if (ageAnalytics[row.age_group]) {
          ageAnalytics[row.age_group].total = row.cnt;
        }
      });

      // Conditions by age
      for (const k of oldKeywords) {
        const keywordData = await query(`
          SELECT 
            CASE 
              WHEN age <= 20 THEN '0-20'
              WHEN age <= 40 THEN '21-40'
              WHEN age <= 60 THEN '41-60'
              ELSE '61+' 
            END as age_group,
            COUNT(*) as cnt
          FROM reports
          WHERE LOWER(sections) LIKE ? OR LOWER(report_type) LIKE ?
          GROUP BY age_group
        `, [`%${k.toLowerCase()}%`, `%${k.toLowerCase()}%`]);
        
        let totalForKey = 0;
        keywordData.forEach(row => {
          if (row.age_group && ageAnalytics[row.age_group]) {
            ageAnalytics[row.age_group].conditions[k] = row.cnt;
            totalForKey += row.cnt;
          }
        });
        keywordCounts[k] = totalForKey;
      }

      // Special procedures
      const getProcCount = async (proc) => {
        const res = await get(`SELECT COUNT(*) as cnt FROM reports WHERE LOWER(sections) LIKE ? OR LOWER(report_type) LIKE ?`, [`%${proc}%`, `%${proc}%`]);
        return res ? res.cnt : 0;
      };
      
      const ercpCount = await getProcCount('ercp');
      const enteroscopyCount = await getProcCount('enteroscopy');

      const topImpressions = Object.keys(keywordCounts)
        .map(k => ({ name: k, value: keywordCounts[k] }))
        .sort((a, b) => b.value - a.value);


      resolve({
        totalReports,
        todayReports: todayReportsRes?.cnt || 0,
        monthReports: monthReportsRes?.cnt || 0,
        totalPatients: totalPatientsRes?.cnt || 0,
        diseaseDistribution,
        diseaseByAge: Object.values(diseaseByAge),
        diseaseByGender: genderStats,
        diseaseByCity,
        diseaseByOrgan,
        monthlyTrends,
        reportsByDay,
        reportsByType: typeBreakdown,
        
        // Old analytics fields
        reportsByDayOfWeek,
        reportsByCity: cityReferralData.map(c => ({ name: c.city, value: c.value })),
        topImpressions,
        specialProcedures: { ercp: ercpCount, enteroscopy: enteroscopyCount },
        ageAnalytics
      });

    } catch (e) {
      reject(e);
    }
  });
};

module.exports = { getAnalytics };
