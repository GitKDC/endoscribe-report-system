"use client";
import { useEffect, useState } from "react";
import { FiUsers, FiUserPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const THEME = {
  navy:    "#1a3a52",
  teal:    "#0d9488",
  tealBg:  "#f0fdfa",
  bg:      "#f0f4f8",
  border:  "#e2e8f0",
  text:    "#1e293b",
  muted:   "#64748b",
  danger:  "#dc2626",
  dangerBg:"#fef2f2",
};

type Doctor = {
  id: number;
  name: string;
  qualifications?: string;
  designation?: string;
  is_default?: number;
  display_order?: number;
  is_active?: number;
};

export default function ProfilePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [editDoc, setEditDoc] = useState<Doctor | null>(null);

  // Form states
  const [fName, setFName] = useState("");
  const [fQual, setFQual] = useState("");
  const [fDesig, setFDesig] = useState("");
  const [fDefault, setFDefault] = useState(false);
  const [fActive, setFActive] = useState(true);

  const [delDocId, setDelDocId] = useState<number | null>(null);
  const [toast, setToast] = useState<{msg: string, ok: boolean} | null>(null);

  const showToast = (msg: string, ok=true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    if ((window as any).api) {
      const data = await (window as any).api.getDoctors();
      setDoctors(data || []);
    }
  };

  const openAddDoctor = () => {
    setEditDoc(null);
    setFName("");
    setFQual("");
    setFDesig("");
    setFDefault(false);
    setFActive(true);
    setShowDocForm(true);
  };

  const openEditDoctor = (d: Doctor) => {
    setEditDoc(d);
    setFName(d.name);
    setFQual(d.qualifications || "");
    setFDesig(d.designation || "");
    setFDefault(!!d.is_default);
    setFActive(d.is_active !== 0);
    setShowDocForm(true);
  };

  const saveDoctor = async () => {
    if (!fName.trim()) return showToast("Doctor name is required", false);
    const payload = {
      name: fName.trim(),
      qualifications: fQual.trim(),
      designation: fDesig.trim(),
      is_default: fDefault ? 1 : 0,
      is_active: fActive ? 1 : 0
    };

    if (editDoc) {
      if ((window as any).api) {
        await (window as any).api.updateDoctor(editDoc.id, payload);
        showToast("Doctor updated ✓");
      }
    } else {
      if ((window as any).api) {
        await (window as any).api.createDoctor(payload);
        showToast("Doctor added ✓");
      }
    }
    setShowDocForm(false);
    loadDoctors();
  };

  const confirmDeleteDoctor = async (id: number) => {
    if ((window as any).api) {
      try {
        await (window as any).api.deleteDoctor(id);
        setDelDocId(null);
        showToast("Doctor removed");
        loadDoctors();
      } catch (err: any) {
        setDelDocId(null);
        const msg = err.message.replace("Error invoking remote method 'delete-doctor': Error: ", "");
        showToast(msg, false);
      }
    }
  };

  return (
    <div style={{ padding: "40px", flex: 1, overflowY: "auto", background: THEME.bg, fontFamily: "'Inter', sans-serif" }}>
      {toast && (
        <div style={{
          position: "fixed", top: "16px", right: "16px", zIndex: 9999,
          padding: "11px 20px", borderRadius: "8px",
          background: toast.ok ? THEME.teal : THEME.danger,
          color: "white", fontFamily: "Inter, sans-serif",
          fontSize: "13px", fontWeight: "500",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        }}>
          {toast.ok ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}

      <h1 style={{ fontSize: "28px", fontWeight: "800", color: THEME.navy, marginBottom: "8px" }}>User Profile</h1>
      <p style={{ color: THEME.muted, marginBottom: "32px", fontSize: "15px" }}>
        Manage your profile details and hospital staff profiles here.
      </p>

      {/* Main Profile Info (Placeholder for Authentication) */}
      <Card style={{ padding: "32px", marginBottom: "32px", display: "flex", gap: "24px", alignItems: "center" }}>
        <div style={{
          width: "100px", height: "100px", borderRadius: "50%",
          background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "36px", fontWeight: "bold", color: "white", flexShrink: 0
        }}>
          HC
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: THEME.navy }}>Dr. Hrushikesh P. Chaudhari</h2>
          <p style={{ margin: "4px 0 12px", color: THEME.muted, fontSize: "15px" }}>Consultant Gastroenterologist</p>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button size="sm" icon={<FiEdit2 />}>Edit Profile</Button>
          </div>
        </div>
      </Card>

      <Card style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: THEME.navy, display: "flex", alignItems: "center" }}>
            <FiUsers style={{ marginRight: "10px", color: THEME.teal }} /> Managed Profiles (Doctors)
          </h3>
          <Button onClick={openAddDoctor} size="sm" icon={<FiUserPlus />}>
            Add Doctor
          </Button>
        </div>

        {doctors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: THEME.muted, fontSize: "14px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
            No doctors added yet. Click "Add Doctor" to create a profile.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {doctors.map((d) => (
              <div key={d.id} style={{
                border: `1px solid ${THEME.border}`,
                borderRadius: "12px",
                padding: "16px 20px",
                background: "#ffffff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)"}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: THEME.navy, marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      {d.name}
                      {d.is_active === 0 && (
                        <span style={{ fontSize: "11px", fontWeight: "600", color: THEME.muted, background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>
                          Archived
                        </span>
                      )}
                    </div>
                    {d.qualifications && (
                      <div style={{ fontSize: "13px", color: THEME.muted, marginBottom: "2px" }}>
                        {d.qualifications}
                      </div>
                    )}
                    {d.designation && (
                      <div style={{ fontSize: "13px", color: THEME.muted }}>
                        {d.designation}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <Button variant="icon" size="sm" icon={<FiEdit2 size={16} />} onClick={() => openEditDoctor(d)} />
                    <Button variant="icon-danger" size="sm" icon={<FiTrash2 size={16} />} onClick={() => setDelDocId(d.id)} />
                  </div>
                </div>
                {!!d.is_default && (
                  <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
                    <span style={{
                      display: "inline-block",
                      fontSize: "11px", fontWeight: "700", color: THEME.teal,
                      background: THEME.tealBg, padding: "4px 10px", borderRadius: "20px",
                    }}>
                      Default for new reports
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Add / Edit Doctor Modal ───────────────────────── */}
      {showDocForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "white", width: "400px", borderRadius: "12px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)", overflow: "hidden"
          }}>
            <div style={{ background: "#f8fafc", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: THEME.navy }}>
                {editDoc ? "Edit Doctor Profile" : "Add Doctor Profile"}
              </h3>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: THEME.text }}>
                  Name <span style={{ color: THEME.danger }}>*</span>
                </label>
                <input
                  type="text"
                  value={fName} onChange={e => setFName(e.target.value)}
                  placeholder="Dr. John Doe"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: THEME.text }}>
                  Qualifications
                </label>
                <input
                  type="text"
                  value={fQual} onChange={e => setFQual(e.target.value)}
                  placeholder="MBBS, MD"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: THEME.text }}>
                  Designation
                </label>
                <input
                  type="text"
                  value={fDesig} onChange={e => setFDesig(e.target.value)}
                  placeholder="Consultant"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={fDefault} onChange={e => setFDefault(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: THEME.teal }}
                />
                <span style={{ fontWeight: "500", color: THEME.text }}>Set as default doctor</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={fActive} onChange={e => setFActive(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: THEME.teal }}
                />
                <span style={{ fontWeight: "500", color: THEME.text }}>Active Status</span>
              </label>
            </div>
            <div style={{ padding: "16px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <Button variant="ghost" onClick={() => setShowDocForm(false)}>Cancel</Button>
              <Button onClick={saveDoctor}>{editDoc ? "Save Changes" : "Add Profile"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ────────────────────────── */}
      {delDocId && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "white", width: "360px", padding: "24px",
            borderRadius: "12px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ margin: "0 0 8px", color: THEME.navy }}>Remove Doctor?</h3>
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: THEME.muted, lineHeight: 1.5 }}>
              Are you sure you want to remove this doctor? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Button variant="ghost" onClick={() => setDelDocId(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => confirmDeleteDoctor(delDocId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
