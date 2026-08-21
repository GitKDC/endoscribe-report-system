"use client";
import React, { useState, useEffect } from "react";
import { FiSearch, FiUserPlus, FiEdit2, FiUser } from "react-icons/fi";
import PatientForm from "../../components/PatientForm";
import PatientProfile from "../../components/PatientProfile";
import { format } from "date-fns";
import ReportPreview from "../../components/ReportPreview";
import { buildEndoUrl } from "../../utils/buildEndoUrl";
import { MdDownload } from "react-icons/md";
import { Card } from "../../components/ui/Card";
import { Table, TableRow, TableCell } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const totalPages = Math.ceil(total / limit) || 1;

  // Modals state
  const [showForm, setShowForm] = useState(false);
  const [editPatient, setEditPatient] = useState<any>(null);
  
  const [showProfile, setShowProfile] = useState<any>(null);
  const [viewReport, setViewReport] = useState<any>(null);

  const format = (date: Date, formatString: string) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-GB", { month: "short" });
    const year = String(date.getFullYear());
    if (formatString === "dd MMM yyyy") {
      return `${day} ${month} ${year}`;
    }
    return date.toISOString();
  };

  const fetchPatients = async () => {
    if (!(window as any).api) return;
    setLoading(true);
    try {
      const res = await (window as any).api.getPatients({ search, page, limit });
      if (Array.isArray(res)) {
        setPatients(res);
        setTotal(res.length);
      } else {
        setPatients(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  // ── Auto-refresh when user navigates back to this page ───────────────────────
  // In Electron + Next.js static export, pages are NOT unmounted on navigation.
  // This means useEffect([]) only runs once. We listen for visibilitychange so
  // the list always refreshes when the user switches back to this tab/page.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchPatients();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [search, page]);

  const handleExportCSV = async () => {
    if (!(window as any).api) return;
    try {
      const result = await (window as any).api.exportPatientsCSV({
        search
      });
      if (result.success) {
        alert("Patients exported successfully to " + result.filePath);
      } else if (result.message !== "Canceled") {
        alert("Export failed: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to export reports");
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(t);
  }, [search, page]);

  const handleOpenProfile = async (id: number) => {
    const p = await (window as any).api.getPatient(id);
    setShowProfile(p);
  };

  const handleViewReport = async (reportId: number) => {
    const data = await (window as any).api.getReport(reportId);
    setViewReport(data);
  };

  return (
    <div style={{ padding: "32px", fontFamily: "'Inter', sans-serif", backgroundColor: "#f4f7f6", minHeight: "100vh", position: "relative" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ color: "#1a3a52", fontSize: "28px", fontWeight: "800", margin: 0 }}>Patients</h2>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>Manage patient directory and their reports history</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Button 
            variant="secondary"
            icon={<MdDownload size={18} />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button 
            variant="primary"
            icon={<FiUserPlus size={18} />}
            onClick={() => { setEditPatient(null); setShowForm(true); }}
          >
            Add Patient
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ 
        display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap",
        background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", marginBottom: "24px"
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
          <FiSearch style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px 10px 40px",
              border: "1px solid #ccc", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box"
            }} 
          />
        </div>
      </div>

      {/* TABLE */}
      <Card style={{ overflow: "hidden" }}>
        <Table headers={["Name", "Phone", "Age/Gender", "Reports", "Last Visit", "Actions"]}>
            {loading ? (
              <TableRow><TableCell colSpan={6} style={{ textAlign: "center", color: "#64748b" }}>Loading patients...</TableCell></TableRow>
            ) : patients.length === 0 ? (
              <TableRow><TableCell colSpan={6} style={{ textAlign: "center", color: "#64748b" }}>No patients found</TableCell></TableRow>
            ) : (
              patients.map(p => (
                <TableRow key={p.id}>
                  <TableCell style={{ fontWeight: "600", color: "#1e293b" }}>{p.name}</TableCell>
                  <TableCell>{p.phone || "-"}</TableCell>
                  <TableCell>{p.age ? `${p.age} / ${p.gender}` : p.gender}</TableCell>
                  <TableCell style={{ fontWeight: "600", color: "#0d9488" }}>{p.report_count}</TableCell>
                  <TableCell>
                    {p.last_visit ? format(new Date(p.last_visit), "dd MMM yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: "8px", marginLeft: "-8px" }}>
                      <Button variant="icon" size="sm" icon={<FiUser />} onClick={() => handleOpenProfile(p.id)} />
                      <Button variant="icon" size="sm" icon={<FiEdit2 />} onClick={() => { setEditPatient(p); setShowForm(true); }} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
        </Table>
      </Card>

      {/* PAGINATION */}
      {!loading && total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", background: "white", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
          <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} patients
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button 
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span style={{ display: "flex", alignItems: "center", padding: "0 12px", fontSize: "14px", fontWeight: "600", color: "#334155" }}>
              Page {page} of {Math.ceil(total / limit) || 1}
            </span>
            <Button 
              variant="secondary"
              size="sm"
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showForm && (
        <PatientForm 
          initialData={editPatient} 
          onClose={() => setShowForm(false)} 
          onSave={() => { setShowForm(false); fetchPatients(); }} 
        />
      )}

      {showProfile && (
        <PatientProfile 
          patient={showProfile} 
          onClose={() => setShowProfile(null)} 
          onViewReport={handleViewReport} 
        />
      )}

      {/* VIEW REPORT MODAL (reusing structure from Reports page) */}
      {viewReport && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 9999, 
          display: "flex", justifyContent: "center", alignItems: "center"
        }}>
          <div style={{
            background: "#f4f7f6", borderRadius: "12px", height: "95vh", overflowY: "auto",
            display: "flex", flexDirection: "column", alignItems: "center", width: "95vw", maxWidth: "950px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            {/* Modal Header */}
            <div style={{ 
              width: "100%", boxSizing: "border-box", display: "flex", justifyContent: "space-between", alignItems: "center", 
              padding: "20px 40px", background: "white", borderBottom: "1px solid #ddd", position: "sticky", top: 0, zIndex: 10
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <h3 style={{ margin: 0, color: "#1a3a52", fontSize: "20px", fontWeight: "800" }}>Report Preview</h3>
                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "700" }}>
                  {viewReport.report_number}
                </span>
              </div>
              <Button variant="secondary" onClick={() => setViewReport(null)}>Close</Button>
            </div>

            {/* Modal Body (A4 Report) */}
            <div style={{ padding: "30px", width: "100%", display: "flex", justifyContent: "center" }}>
              <div style={{ zoom: 0.85, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", borderRadius: "2px", overflow: "hidden", background: "white" }}>
                <ReportPreview
                  patientName={viewReport.patient_name}
                  patientAge={`${viewReport.age} Yrs / ${viewReport.gender}`}
                  reportDate={viewReport.created_at}
                  reportType={viewReport.report_type}
                  sections={viewReport.sections || []}
                  doctorName={viewReport.doctor_name || ""}
                  images={viewReport.images?.map((img: any) => ({
                    id: String(img.id), url: img.url || buildEndoUrl(img.file_path), label: "Image", nbiLabel: img.nbi_label || undefined, brightness: img.brightness ?? 70, contrast: img.contrast ?? 70
                  })) || []}
                  prefix={viewReport.patient_prefix}
                  reportNumber={viewReport.report_number}
                  selectedDoctors={viewReport.selected_doctors}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
