"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReportPreview from "../../components/ReportPreview";
import { IoMdEye, IoIosArrowDown } from "react-icons/io";
import { SlCalender } from "react-icons/sl";
import { FiSearch, FiEdit2, FiTrash2, FiMessageSquare, FiRefreshCw } from "react-icons/fi";
import { MdPrint, MdPictureAsPdf, MdDownload } from "react-icons/md";
import { generatePDF } from "../../utils/reportGenerator";
import { buildEndoUrl } from "../../utils/buildEndoUrl";
import { Card } from "../../components/ui/Card";
import { Table, TableRow, TableCell } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [procedure, setProcedure] = useState("All");
  const [doctorId, setDoctorId] = useState("All");

  const [doctors, setDoctors] = useState<any[]>([]);

  const resetFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setProcedure("All");
    setDoctorId("All");
    setPage(1);
  };

  // View modal state
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Download state
  const [downloadingReport, setDownloadingReport] = useState<any>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const [whatsappModalReport, setWhatsappModalReport] = useState<any>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappDoctorPhone, setWhatsappDoctorPhone] = useState("");
  const [whatsappSelfPhone, setWhatsappSelfPhone] = useState("");
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [sendingTarget, setSendingTarget] = useState<"patient" | "doctor" | "self" | null>(null);

  const fetchReports = async () => {
    if (!(window as any).api) return;
    setLoading(true);
    try {
      const res = await (window as any).api.getAllReports({
        page,
        limit: 10,
        search,
        startDate,
        endDate,
        procedure,
        doctorId
      });
      setReports(res.data || []);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleExportCSV = async () => {
    if (!(window as any).api) return;
    try {
      const result = await (window as any).api.exportReportsCSV({
        search,
        startDate,
        endDate,
        procedure,
        doctorId
      });
      if (result.success) {
        alert("Reports exported successfully to " + result.filePath);
      } else if (result.message !== "Canceled") {
        alert("Export failed: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to export reports");
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, search, startDate, endDate, procedure, doctorId]);

  useEffect(() => {
    const fetchDoctors = async () => {
      if (!(window as any).api) return;
      const res = await (window as any).api.getDoctors();
      setDoctors(res || []);
    };
    fetchDoctors();
  }, []);

  const handleView = async (id: number) => {
    if (!(window as any).api) return;
    const data = await (window as any).api.getReport(id);
    setSelectedReport(data);
  };

  const handleDownloadPDF = async (id: number) => {
    if (!(window as any).api) return;
    setGeneratingId(id);
    const data = await (window as any).api.getReport(id);
    setDownloadingReport(data);
  };

  useEffect(() => {
    if (downloadingReport && generatingId !== null && !whatsappModalReport) {
      // Need a short delay to allow React to mount the off-screen ReportPreview and images to load
      setTimeout(async () => {
        try {
          const result = await generatePDF(
            downloadingReport.created_at,
            downloadingReport.patient_name,
            `${downloadingReport.age} Yrs / ${downloadingReport.gender}`,
            downloadingReport.report_type,
            downloadingReport.report_number,
            true // downloadToDownloads flag
          );
        } catch (err) {
          console.error("PDF generation failed", err);
          alert("Failed to generate PDF");
        } finally {
          setGeneratingId(null);
          setDownloadingReport(null);
        }
      }, 500); // 500ms delay for DOM to settle
    }
  }, [downloadingReport, generatingId, whatsappModalReport]);

  const handleOpenWhatsappModal = async (id: number) => {
    if (!(window as any).api) return;
    try {
      const data = await (window as any).api.getReport(id);
      setWhatsappModalReport(data);
      setWhatsappPhone(data.patient_phone || data.phone || "");
      setWhatsappDoctorPhone(data.referral_doctor_phone || "");
      setWhatsappSelfPhone(localStorage.getItem("whatsapp_self_phone") || "");
    } catch (err) {
      alert("Failed to fetch report details");
    }
  };

  const submitSendWhatsapp = async (target: "patient" | "doctor" | "self") => {
    let targetPhone = "";
    if (target === "patient") targetPhone = whatsappPhone;
    else if (target === "doctor") targetPhone = whatsappDoctorPhone;
    else if (target === "self") {
      targetPhone = whatsappSelfPhone;
      localStorage.setItem("whatsapp_self_phone", whatsappSelfPhone); // Remember for next time
    }
    
    if (!targetPhone) return alert("Please enter a phone number");
    setIsSendingWhatsapp(true);
    setSendingTarget(target);
    
    // First, generate and save the PDF locally
    setDownloadingReport(whatsappModalReport);
    setGeneratingId(whatsappModalReport.id);
    
    setTimeout(async () => {
      try {
        const pdfResult = await generatePDF(
          whatsappModalReport.created_at,
          whatsappModalReport.patient_name,
          `${whatsappModalReport.age} Yrs / ${whatsappModalReport.gender}`,
          whatsappModalReport.report_type,
          whatsappModalReport.report_number,
          false // downloadToDownloads=false so it saves locally and returns absolutePath
        );

        if (pdfResult && pdfResult.absolutePath) {
          // Both "doctor" and "self" are treated as a doctor for the message template
          const isDoctor = target === "doctor" || target === "self";
          
          const reportData = {
            patientName: whatsappModalReport.patient_name,
            age: whatsappModalReport.age,
            gender: whatsappModalReport.gender,
            reportType: whatsappModalReport.report_type
          };

          const sendRes = await (window as any).api.sendWhatsAppReport(pdfResult.absolutePath, targetPhone, isDoctor, reportData);
          if (sendRes.success) {
            alert(`WhatsApp message sent successfully to ${target}!`);
            if (target === "patient") setWhatsappPhone("");
            if (target === "doctor") setWhatsappDoctorPhone("");
            // Keep modal open so they can send to others if they want
          } else {
            alert("Failed to send WhatsApp: " + sendRes.message);
          }
        }
      } catch (err: any) {
        alert("Failed to send: " + err.message);
      } finally {
        setIsSendingWhatsapp(false);
        setSendingTarget(null);
        setDownloadingReport(null);
        setGeneratingId(null);
      }
    }, 500);
  };

  const mapImagesForPreview = (images: any[]) =>
    (images || []).map((img: any) => ({
      id: String(img.id),
      url: img.url || buildEndoUrl(img.file_path),
      label: "Image",
      nbiLabel: img.nbi_label || undefined,
      brightness: img.brightness ?? 70,
      contrast: img.contrast ?? 70,
    }));

  return (
    <div style={{ padding: "32px", fontFamily: "'Inter', sans-serif", backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ color: "#1a3a52", fontSize: "28px", fontWeight: "800", margin: 0 }}>Patient Reports</h2>
        <Button 
          variant="secondary"
          icon={<MdDownload size={18} />}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </div>

      {/* FILTERS */}
      <div style={{
        display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap",
        background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <FiSearch style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
          <input 
            placeholder="Search patient..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: "100%", padding: "10px 14px 10px 40px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#555" }}>Date:</span>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              style={{ padding: "10px 14px", paddingRight: "32px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
            />
            <div style={{ position: "absolute", right: "10px", pointerEvents: "none", color: "#0d9488", display: "flex" }}><SlCalender size={14} /></div>
          </div>
          <span style={{ fontSize: "14px", color: "#888" }}>to</span>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              style={{ padding: "10px 14px", paddingRight: "32px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
            />
            <div style={{ position: "absolute", right: "10px", pointerEvents: "none", color: "#0d9488", display: "flex" }}><SlCalender size={14} /></div>
          </div>
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <select 
            value={procedure} 
            onChange={(e) => { setProcedure(e.target.value); setPage(1); }}
            style={{ padding: "10px 14px", paddingRight: "32px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none", cursor: "pointer", backgroundColor: "white", appearance: "none", WebkitAppearance: "none" }}
          >
            <option value="All">All Procedures</option>
            <option value="UGI">Upper GI Endo</option>
            <option value="COLONOSCOPY">Colonoscopy</option>
            <option value="SIGMOIDOSCOPY">Sigmoidoscopy</option>
            <option value="ERCP">ERCP</option>
            <option value="ENTEROSCOPY">Enteroscopy</option>
            <option value="VLS">VLS Scopy</option>
          </select>
          <div style={{ position: "absolute", right: "10px", pointerEvents: "none", color: "#0d9488", display: "flex" }}><IoIosArrowDown size={14} /></div>
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <select 
            value={doctorId} 
            onChange={(e) => { setDoctorId(e.target.value); setPage(1); }}
            style={{ padding: "10px 14px", paddingRight: "32px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none", cursor: "pointer", backgroundColor: "white", appearance: "none", WebkitAppearance: "none" }}
          >
            <option value="All">All Doctors</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div style={{ position: "absolute", right: "10px", pointerEvents: "none", color: "#0d9488", display: "flex" }}><IoIosArrowDown size={14} /></div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
          <Button 
            variant="secondary"
            onClick={resetFilters}
            title="Reset Filters"
            style={{ padding: "8px 12px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <FiRefreshCw size={16} style={{ color: "#64748b" }} />
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <Card style={{ overflowX: "auto" }}>
        <Table headers={["Report No", "Patient", "Procedure", "Doctor", "Date", "Actions"]}>
            {loading ? (
              <TableRow><TableCell colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#666", fontSize: "15px" }}>Loading reports...</TableCell></TableRow>
            ) : reports.length === 0 ? (
              <TableRow><TableCell colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#666", fontSize: "15px" }}>No reports found matching your criteria.</TableCell></TableRow>
            ) : (
              reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell style={{ fontWeight: "600", color: "#333", whiteSpace: "nowrap" }}>{r.report_number || "-"}</TableCell>
                  <TableCell style={{ fontWeight: "500", color: "#111" }}>{r.patient_prefix} {r.patient_name}</TableCell>
                  <TableCell style={{ color: "#007bff", fontWeight: "600" }}>{r.report_type}</TableCell>
                  <TableCell>{r.doctor_name || "-"}</TableCell>
                  <TableCell style={{ fontWeight: "500" }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: "8px", marginLeft: "-8px" }}>
                      <Button variant="icon" size="sm" icon={<IoMdEye size={18} />} onClick={() => handleView(r.id)} />
                      <Button 
                        variant="icon" 
                        size="sm" 
                        icon={<FiEdit2 size={18} />} 
                        onClick={() => router.push(`/create-report?editId=${r.id}`)}
                        style={{ color: "#d97706" }}
                      />
                      <Button 
                        variant="icon" 
                        size="sm" 
                        icon={<MdDownload size={18} />} 
                        onClick={() => handleDownloadPDF(r.id)} 
                        disabled={generatingId === r.id} 
                      />
                      <Button 
                        variant="icon" 
                        size="sm" 
                        icon={<FiMessageSquare size={18} />} 
                        onClick={() => handleOpenWhatsappModal(r.id)} 
                        disabled={generatingId === r.id}
                        style={{ color: "#16a34a" }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
        </Table>
      </Card>

      {/* PAGINATION */}
      {reports.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", padding: "0 8px" }}>
          <span style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
            Showing <strong style={{ color: "#111" }}>{(page - 1) * 10 + 1}</strong> to <strong style={{ color: "#111" }}>{Math.min(page * 10, totalItems)}</strong> of <strong style={{ color: "#111" }}>{totalItems}</strong> entries
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
            <Button 
              variant="secondary"
              size="sm"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* MODAL FOR REPORT VIEW */}
      {selectedReport && (
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
                  {selectedReport.report_number}
                </span>
              </div>
              <Button variant="secondary" onClick={() => setSelectedReport(null)}>Close</Button>
            </div>

            {/* Modal Body (A4 Report) */}
            <div style={{ padding: "30px", width: "100%", display: "flex", justifyContent: "center" }}>
              <div style={{ zoom: 0.85, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", borderRadius: "2px", overflow: "hidden" }}>
                <ReportPreview
                  patientName={selectedReport.patient_name}
                  patientAge={`${selectedReport.age} Yrs / ${selectedReport.gender}`}
                  reportDate={selectedReport.created_at}
                  reportType={selectedReport.report_type}
                  sections={selectedReport.sections || []}
                  doctorName={selectedReport.doctor_name || ""}
                  images={mapImagesForPreview(selectedReport.images)}
                  prefix={selectedReport.patient_prefix}
                  reportNumber={selectedReport.report_number}
                  selectedDoctors={selectedReport.selected_doctors}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR WHATSAPP */}
      {whatsappModalReport && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 10000, 
          display: "flex", justifyContent: "center", alignItems: "center"
        }}>
          <div style={{
            background: "white", padding: "32px", borderRadius: "16px",
            width: "100%", maxWidth: "420px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
          }}>
            <h2 style={{ color: "#1a3a52", margin: "0 0 8px", fontSize: "20px" }}>Send Report via WhatsApp</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" }}>
              Sending report for <strong>{whatsappModalReport.patient_name}</strong>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                <h4 style={{ margin: "0 0 12px", color: "#1e293b", fontSize: "14px" }}>Send to Patient</h4>
                <div style={{ display: "flex", gap: "12px" }}>
                  <input 
                    type="text" 
                    value={whatsappPhone} 
                    onChange={e => setWhatsappPhone(e.target.value)}
                    placeholder="Patient Phone (e.g. 919876543210)"
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                  <Button 
                    variant="primary" 
                    style={{ background: "#16a34a", borderColor: "#16a34a", padding: "8px 16px" }} 
                    onClick={() => submitSendWhatsapp("patient")} 
                    disabled={isSendingWhatsapp || !whatsappPhone}
                  >
                    {sendingTarget === "patient" ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>

              {whatsappModalReport.referral_name && (
                <div style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                  <h4 style={{ margin: "0 0 12px", color: "#1e293b", fontSize: "14px" }}>Send to Dr. {whatsappModalReport.referral_name}</h4>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input 
                      type="text" 
                      value={whatsappDoctorPhone} 
                      onChange={e => setWhatsappDoctorPhone(e.target.value)}
                      placeholder="Doctor Phone (e.g. 919876543210)"
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                    <Button 
                      variant="primary" 
                      style={{ background: "#0284c7", borderColor: "#0284c7", padding: "8px 16px" }} 
                      onClick={() => submitSendWhatsapp("doctor")} 
                      disabled={isSendingWhatsapp || !whatsappDoctorPhone}
                    >
                      {sendingTarget === "doctor" ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>
              )}

              {whatsappModalReport.doctor_name && (
                <div style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                  <h4 style={{ margin: "0 0 12px", color: "#1e293b", fontSize: "14px" }}>Send to Self ({whatsappModalReport.doctor_name})</h4>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input 
                      type="text" 
                      value={whatsappSelfPhone} 
                      onChange={e => setWhatsappSelfPhone(e.target.value)}
                      placeholder="Your Phone (e.g. 919876543210)"
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                    <Button 
                      variant="primary" 
                      style={{ background: "#8b5cf6", borderColor: "#8b5cf6", padding: "8px 16px" }} 
                      onClick={() => submitSendWhatsapp("self")} 
                      disabled={isSendingWhatsapp || !whatsappSelfPhone}
                    >
                      {sendingTarget === "self" ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <Button variant="secondary" onClick={() => setWhatsappModalReport(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFF-SCREEN REPORT PREVIEW FOR PDF GENERATION */}
      {downloadingReport && (
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0, pointerEvents: "none" }}>
          <ReportPreview
            patientName={downloadingReport.patient_name}
            patientAge={`${downloadingReport.age} Yrs / ${downloadingReport.gender}`}
            reportDate={downloadingReport.created_at}
            reportType={downloadingReport.report_type}
            sections={downloadingReport.sections || []}
            doctorName={downloadingReport.doctor_name || ""}
            images={mapImagesForPreview(downloadingReport.images)}
            prefix={downloadingReport.patient_prefix}
            reportNumber={downloadingReport.report_number}
            selectedDoctors={downloadingReport.selected_doctors}
          />
        </div>
      )}
    </div>
  );
}