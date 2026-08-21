import React, { useEffect, useRef, useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { SlCalender } from "react-icons/sl";
import { FiPlus, FiX, FiKey, FiUser, FiFileText, FiActivity } from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";
import RichTextEditor from "./RichTextEditor";

const THEME = {
  navy:    "#1a3a52",
  teal:    "#0d9488",
  tealBg:  "#f0fdfa",
  border:  "#e2e8f0",
  bg:      "#f8fafc",
  white:   "#ffffff",
  text:    "#1e293b",
  muted:   "#64748b",
  danger:  "#dc2626",
  dangerBg:"#fff0f0",
  highlight:"#fef2f2",
  highlightBorder: "#fca5a5",
};

interface Section {
  title: string;
  content: string;
  highlight?: boolean;
  isHeading?: boolean;
  isLine?: boolean;
}

interface Doctor {
  id: number;
  name: string;
  qualifications?: string;
  designation?: string;
  is_default?: number;
  display_order?: number;
}

interface ReportFormProps {
  patientName: string;
  patientPhone: string;
  patientAge: string;
  patientCity?: string;
  reportDate: string;
  reportType: string;
  doctorName: string;
  prefix: string;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  templates: { id: number; name: string; category: string; sections: Section[] }[];
  doctors: Doctor[];
  categories: any[];
  onDoctorsChange: (docs: Doctor[]) => void;
  selectedDoctorIds: number[];
  onDoctorSelectionChange: (ids: number[]) => void;
  onPatientNameChange: (v: string) => void;
  onPatientPhoneChange: (v: string) => void;
  onPatientIdChange?:  (id: number | null) => void;
  onPatientAgeChange:  (v: string) => void;
  onPatientCityChange?: (v: string) => void;
  onReportDateChange:  (v: string) => void;
  onReportTypeChange:  (v: string) => void;
  onTemplateSelect:    (templateId: number) => void;
  templateId?:         number | null;
  setPrefix:           (v: string) => void;
  referralName:        string;
  onReferralNameChange: (v: string) => void;
  referralPhone:       string;
  onReferralPhoneChange: (v: string) => void;
  onReferralIdChange?: (id: number | null) => void;
}

const ReportForm: React.FC<ReportFormProps> = ({
  patientName, patientPhone, patientAge, patientCity, reportDate, reportType, prefix,
  doctorName, sections, setSections, templates, onReportTypeChange,
  doctors, categories, onDoctorsChange, selectedDoctorIds, onDoctorSelectionChange,
  onPatientNameChange, onPatientPhoneChange, onPatientIdChange, onPatientAgeChange, onPatientCityChange,
  onReportDateChange, onTemplateSelect, templateId, setPrefix,
  referralName, onReferralNameChange, onReferralIdChange,
  referralPhone, onReferralPhoneChange
}) => {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [age, setAge]     = useState("");
  const [gender, setGender] = useState("M");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [newFieldTitle, setNewFieldTitle] = useState("");
  const [docMenuOpen, setDocMenuOpen] = useState(false);
  const [docIndex, setDocIndex] = useState(-1);
  const [draggedSectionIdx, setDraggedSectionIdx] = useState<number | null>(null);
  const [dragOverSectionIdx, setDragOverSectionIdx] = useState<number | null>(null);

  useEffect(() => {
    if (patientAge) {
      if (patientAge.includes("Yrs/")) {
        const parts = patientAge.split("Yrs/");
        if (parts.length === 2) {
          setAge(parts[0].trim());
          setGender(parts[1].trim());
        }
      } else {
        setAge(patientAge.replace(/\D/g, ''));
      }
    } else {
      setAge("");
    }
  }, [patientAge]);

  useEffect(() => {
    if (prefix === "Mr." || prefix === "Master.") {
      setGender("M");
      if (age) onPatientAgeChange(`${age}Yrs/M`);
    } else if (prefix === "Mrs." || prefix === "Miss.") {
      setGender("F");
      if (age) onPatientAgeChange(`${age}Yrs/F`);
    }
  }, [prefix, age, onPatientAgeChange]);

  useEffect(() => {
    if (templateId !== undefined && templateId !== null) {
      setSelectedTemplateId(templateId.toString());
    } else {
      setSelectedTemplateId("");
    }
  }, [templateId]);

  // ── Patient Autocomplete ──
  const [patients, setPatients] = useState<any[]>([]);
  const [showPatientSugs, setShowPatientSugs] = useState(false);
  const patientInputRef = useRef<HTMLDivElement>(null);
  
  // ── Referral Autocomplete ──
  const [referrals, setReferrals] = useState<any[]>([]);
  const [showReferralSugs, setShowReferralSugs] = useState(false);
  const [referralIndex, setReferralIndex] = useState(-1);
  const referralInputRef = useRef<HTMLDivElement>(null);

  // ref for the trigger element — used to measure where to place the dropdown
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const loadPatients = async () => {
      if (!(window as any).api) return;
      try {
        const res = await (window as any).api.getPatients({ limit: 500 });
        setPatients(Array.isArray(res) ? res : (res?.data || []));
      } catch (err) {
        console.error("Failed to load patients:", err);
      }
    };
    loadPatients();
    
    const loadReferrals = async () => {
      if (!(window as any).api) return;
      try {
        const res = await (window as any).api.getReferrals({ limit: 500 });
        setReferrals(Array.isArray(res) ? res : (res?.data || []));
      } catch (err) {
        console.error("Failed to load referrals:", err);
      }
    };
    loadReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate dropdown position every time it opens
  useEffect(() => {
    if (!docMenuOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = Math.min(220, doctors.length * 58 + 8);

    if (spaceBelow >= dropH + 8) {
      // open downward
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        maxHeight: "220px",
        overflowY: "auto",
        background: THEME.white,
        border: `1.5px solid ${THEME.border}`,
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
      });
    } else {
      // open upward
      setDropdownStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        maxHeight: "220px",
        overflowY: "auto",
        background: THEME.white,
        border: `1.5px solid ${THEME.border}`,
        borderRadius: "8px",
        boxShadow: "0 -8px 24px rgba(0,0,0,0.14)",
      });
    }
  }, [docMenuOpen, doctors.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientInputRef.current && !patientInputRef.current.contains(e.target as Node)) {
        setShowPatientSugs(false);
      }
      if (referralInputRef.current && !referralInputRef.current.contains(e.target as Node)) {
        setShowReferralSugs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const focus = (name: string) => () => setActiveField(name);
  const blur  = () => setActiveField(null);

  const inp = (name: string): React.CSSProperties => ({
    padding: "12px 14px",
    border: `1.5px solid ${activeField === name ? THEME.teal : THEME.border}`,
    borderRadius: "8px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    background: THEME.white,
    color: THEME.text,
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow: activeField === name ? "0 0 0 3px rgba(13,148,136,0.15)" : "none",
  });

  const lbl: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: "700",
    marginBottom: "5px",
    color: THEME.navy,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    fontFamily: "'Inter', sans-serif",
  };

  const card: React.CSSProperties = {
    padding: "24px 26px",
    background: THEME.white,
    borderRadius: "14px",
    border: `1px solid ${THEME.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  const cardHdr: React.CSSProperties = {
    margin: "0 0 14px 0",
    fontSize: "11px",
    fontWeight: "700",
    color: THEME.navy,
    display: "flex",
    alignItems: "center",
    gap: "7px",
    paddingBottom: "10px",
    borderBottom: `1.5px solid ${THEME.border}`,
    fontFamily: "'Inter', sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  };

  const icon = (element: React.ReactNode, bg: string) => (
    <span style={{
      width: "22px", height: "22px", borderRadius: "6px",
      background: bg, display: "inline-flex",
      alignItems: "center", justifyContent: "center", fontSize: "14px",
    }}>{element}</span>
  );

  const filteredTemplates = templates.filter(t => t.category === reportType);

  const updateSection      = (i: number, v: string) => setSections(p => p.map((s, idx) => idx === i ? { ...s, content: v } : s));
  const updateHeadingTitle = (i: number, v: string) => setSections(p => p.map((s, idx) => idx === i ? { ...s, title: v } : s));
  const deleteSection      = (i: number) => setSections(p => p.filter((_, idx) => idx !== i));

  const addCustomSection = () => {
    const title = newFieldTitle.trim();
    if (!title) return;
    setSections(prev => {
      let insertAt = prev.length;
      for (let i = prev.length - 1; i >= 0; i--) { if (prev[i].highlight) { insertAt = i; break; } }
      const copy = [...prev];
      copy.splice(insertAt, 0, { title, content: "" });
      return copy;
    });
    setNewFieldTitle("");
  };

  const addCustomHeading = () => {
    const title = newFieldTitle.trim();
    if (!title) return;
    setSections(prev => {
      let insertAt = prev.length;
      for (let i = prev.length - 1; i >= 0; i--) { if (prev[i].highlight) { insertAt = i; break; } }
      const copy = [...prev];
      copy.splice(insertAt, 0, { title, content: "", isHeading: true });
      return copy;
    });
    setNewFieldTitle("");
  };

  const applyFormat = (i: number, ta: HTMLTextAreaElement, type: "bold" | "italic" | "red" | "yellow" | "green") => {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    if (s === e) return;
    const w = type === "bold" ? "**" : type === "italic" ? "*" : type === "yellow" ? "%%" : type === "green" ? "&&" : "!!";
    const nc = value.slice(0, s) + w + value.slice(s, e) + w + value.slice(e);
    setSections(p => p.map((sec, idx) => idx === i ? { ...sec, content: nc } : sec));
  };

  const toggleDoctor = (id: number) => {
    onDoctorSelectionChange(
      selectedDoctorIds.includes(id) ? selectedDoctorIds.filter(d => d !== id) : [...selectedDoctorIds, id]
    );
  };

  const selectedDoctors = doctors.filter(d => selectedDoctorIds.includes(d.id));

  return (
    <>
      <style>{`
                * { box-sizing: border-box; }
        .rfmt:hover { background: #e2e8f0 !important; }
        .rrem:hover { background: #fee2e2 !important; }
        .doc-opt:hover { background: #f0fdfa !important; }
        .pat-sug:hover { background: #f1f5f9 !important; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        select, input[type="date"] {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: 32px;
          height: 100%;
          cursor: pointer;
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: "'Inter', sans-serif" }}>

        {/* ── Patient Info ─────────────────────────────── */}
        <div style={card}>
          <h4 style={cardHdr}>{icon(<FiUser color={THEME.teal} />, THEME.teal + "18")} Patient Information</h4>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
            <div style={{ flex: "2 1 250px" }}>
              <label style={lbl}>Patient Name</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center", width: "76px", flexShrink: 0 }}>
                  <select value={prefix} onChange={e => setPrefix(e.target.value)}
                    style={{ ...inp("pfx"), width: "100%", paddingRight: "26px", cursor: "pointer" }}>
                    <option>Mr.</option><option>Mrs.</option><option>Master.</option><option>Miss.</option>
                  </select>
                  <div style={{ position: "absolute", right: "8px", pointerEvents: "none", color: THEME.teal, display: "flex" }}><IoIosArrowDown size={14} /></div>
                </div>
                <div ref={patientInputRef} style={{ position: "relative", flex: 1 }}>
                  <input type="text" value={patientName} 
                    onChange={e => {
                      onPatientNameChange(e.target.value);
                      setShowPatientSugs(true);
                    }}
                    onFocus={() => { focus("pn")(); setShowPatientSugs(true); }} 
                    onBlur={blur}
                    placeholder="Full name" 
                    style={{ ...inp("pn"), width: "100%" }} />
                  
                  {/* Suggestions Dropdown */}
                  {showPatientSugs && patientName.length > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                      background: "white", border: `1.5px solid ${THEME.border}`, borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10000, maxHeight: "200px", overflowY: "auto"
                    }}>
                      {patients.filter(p => p.name.toLowerCase().includes(patientName.toLowerCase())).length === 0 ? (
                        <div style={{ padding: "10px", fontSize: "13px", color: THEME.muted, textAlign: "center" }}>
                          New patient will be created automatically.
                        </div>
                      ) : (
                        patients.filter(p => p.name.toLowerCase().includes(patientName.toLowerCase())).map(p => (
                          <div key={p.id} className="pat-sug"
                            onClick={() => {
                              onPatientNameChange(p.name);
                              onPatientPhoneChange(p.phone || "");
                              if (onPatientIdChange) onPatientIdChange(p.id);
                              if (p.city && onPatientCityChange) onPatientCityChange(p.city);
                              
                              setPrefix(p.gender === "M" ? "Mr." : "Mrs.");
                              setAge(p.age ? String(p.age) : "");
                              setGender(p.gender || "M");
                              onPatientAgeChange(`${p.age || ""}Yrs/${p.gender || "M"}`);

                              if (p.procedure_type) {
                                onReportTypeChange(p.procedure_type);
                              }
                              
                              setShowPatientSugs(false);
                            }}
                            style={{
                              padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${THEME.border}`,
                              display: "flex", justifyContent: "space-between", alignItems: "center"
                            }}
                          >
                            <span style={{ fontSize: "13px", fontWeight: "600", color: THEME.navy }}>{p.name} {p.phone && <span style={{ color: THEME.muted, fontWeight: "400", marginLeft: "6px" }}>📞 {p.phone}</span>}</span>
                            <span style={{ fontSize: "11px", color: THEME.muted }}>{p.age} Yrs • {p.gender}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ flex: "1 1 120px" }}>
              <label style={lbl}>Age / Gender</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input type="number" value={age}
                  onChange={e => { setAge(e.target.value); if (e.target.value) onPatientAgeChange(`${e.target.value}Yrs/${gender}`); }}
                  placeholder="Age" onFocus={focus("age")} onBlur={blur}
                  style={{ ...inp("age"), flex: 1 }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", width: "66px", flexShrink: 0 }}>
                  <select value={gender}
                    onChange={e => { setGender(e.target.value); if (age) onPatientAgeChange(`${age}Yrs/${e.target.value}`); }}
                    style={{ ...inp("gen"), width: "100%", paddingRight: "24px", cursor: "pointer" }}>
                    <option value="M">M</option><option value="F">F</option>
                  </select>
                  <div style={{ position: "absolute", right: "8px", pointerEvents: "none", color: THEME.teal, display: "flex" }}><IoIosArrowDown size={14} /></div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={lbl}>Phone</label>
            <input type="text" value={patientPhone} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  onPatientPhoneChange(val);
                }}
              placeholder="Phone No." onFocus={focus("ph")} onBlur={blur}
              style={{ ...inp("ph"), width: "100%" }} />
          </div>
          <div style={{ marginBottom: "12px" }} ref={referralInputRef}>
            <label style={lbl}>Referred By</label>
            <div style={{ position: "relative" }}>
              <input 
                type="text" 
                value={referralName} 
                onChange={e => {
                  onReferralNameChange(e.target.value);
                  onReferralIdChange?.(null);
                  setShowReferralSugs(true);
                  setReferralIndex(-1);
                }}
                onFocus={() => { focus("rf")(); setShowReferralSugs(true); }}
                onBlur={blur}
                onKeyDown={e => {
                  const filtered = referrals.filter(r => r.name.toLowerCase().includes(referralName.toLowerCase()));
                  if (showReferralSugs && filtered.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setReferralIndex(i => Math.min(i + 1, filtered.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setReferralIndex(i => Math.max(i - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (referralIndex >= 0 && filtered[referralIndex]) {
                        const r = filtered[referralIndex];
                        onReferralNameChange(r.name);
                        if (r.phone) onReferralPhoneChange(r.phone);
                        onReferralIdChange?.(r.id);
                        setShowReferralSugs(false);
                      }
                    }
                  }
                }}
                style={{ ...inp("rf"), width: "100%" }} 
                placeholder="Search referral doctor..." 
              />
              {showReferralSugs && referralName.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #ddd", borderRadius: "0 0 6px 6px", maxHeight: "200px", overflowY: "auto", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {referrals.filter(r => r.name.toLowerCase().includes(referralName.toLowerCase())).length === 0 ? (
                    <div style={{ padding: "10px", color: "#666", fontSize: "14px" }}>
                      New Referral Doctor will be created.
                    </div>
                  ) : (
                    referrals.filter(r => r.name.toLowerCase().includes(referralName.toLowerCase())).map((r, i) => (
                      <div 
                        key={r.id}
                        className="pat-sug"
                        onMouseEnter={() => setReferralIndex(i)}
                        onClick={() => {
                          onReferralNameChange(r.name);
                          if (r.phone) onReferralPhoneChange(r.phone);
                          onReferralIdChange?.(r.id);
                          setShowReferralSugs(false);
                        }}
                        style={{ padding: "10px", borderBottom: "1px solid #eee", cursor: "pointer", display: "flex", justifyContent: "space-between", background: referralIndex === i ? THEME.tealBg : "white" }}
                      >
                        <span style={{ fontWeight: 600, color: THEME.navy }}>{r.name}</span>
                        {r.clinic_name && <span style={{ color: "#666", fontSize: "13px" }}>🏥 {r.clinic_name}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={lbl}>Referral Phone No.</label>
            <input 
              type="text" 
              value={referralPhone} 
              onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  onReferralPhoneChange(val);
                }}
              placeholder="Referral Phone No." onFocus={focus("rfph")} onBlur={blur}
              style={{ ...inp("rfph"), width: "100%" }} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ flex: "1 1 120px" }}>
              <label style={lbl}>Date</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input type="date" value={reportDate} onChange={e => onReportDateChange(e.target.value)}
                  onFocus={focus("dt")} onBlur={blur} style={{ ...inp("dt"), paddingRight: "32px", cursor: "pointer" }} />
                <div style={{ position: "absolute", right: "12px", pointerEvents: "none", color: THEME.teal, display: "flex" }}><SlCalender size={15} /></div>
              </div>
            </div>

            {/* ── Doctor multi-select — uses fixed positioning to avoid overflow ── */}
            <div style={{ flex: "1.5 1 220px" }}>
              <label style={lbl}>Doctor(s)</label>
              <div
                ref={triggerRef}
                tabIndex={0}
                onClick={() => setDocMenuOpen(o => !o)}
                onKeyDown={e => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    if (!docMenuOpen) {
                      setDocMenuOpen(true);
                      setDocIndex(0);
                    } else {
                      if (e.key === "ArrowDown") setDocIndex(i => Math.min(i + 1, doctors.length - 1));
                      else if (e.key === "ArrowUp") setDocIndex(i => Math.max(i - 1, 0));
                    }
                  } else if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!docMenuOpen) {
                      setDocMenuOpen(true);
                    } else if (docIndex >= 0 && doctors[docIndex]) {
                      toggleDoctor(doctors[docIndex].id);
                    }
                  } else if (e.key === "Escape") {
                    setDocMenuOpen(false);
                  }
                }}
                style={{
                  ...inp("doc"),
                  cursor: "pointer",
                  borderColor: docMenuOpen ? THEME.teal : THEME.border,
                  boxShadow: docMenuOpen ? "0 0 0 3px rgba(13,148,136,0.15)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "44px",      // fixed height — never grows
                  overflow: "hidden",
                  userSelect: "none",
                  padding: "0 10px",
                }}
              >
                <span style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: 1,
                  fontSize: "13px",
                  color: selectedDoctors.length ? THEME.text : THEME.muted,
                  fontWeight: selectedDoctors.length ? 500 : 400,
                }}>
                  {selectedDoctors.length === 0
                    ? "Select doctor(s)…"
                    : selectedDoctors.length === 1
                    ? selectedDoctors[0].name
                    : `${selectedDoctors[0].name.replace(/^Dr\.?\s*/i, "Dr ")} +${selectedDoctors.length - 1}`}
                </span>
                <span style={{ color: THEME.teal, display: "flex", flexShrink: 0, transform: docMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  <IoIosArrowDown size={16} />
                </span>
              </div>

              {/* Dropdown rendered via portal-like fixed positioning */}
              {docMenuOpen && (
                <>
                  {/* backdrop */}
                  <div
                    onClick={() => setDocMenuOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 9998 }}
                  />
                  <div style={dropdownStyle}>
                    {doctors.length === 0 && (
                      <div style={{ padding: "12px", fontSize: "12px", color: THEME.muted, textAlign: "center" }}>
                        No doctors yet. Add from Dashboard.
                      </div>
                    )}
                    {doctors.map((d, i) => {
                      const checked = selectedDoctorIds.includes(d.id);
                      return (
                        <label key={d.id} className="doc-opt" 
                          onMouseEnter={() => setDocIndex(i)}
                          style={{
                          display: "flex", alignItems: "flex-start", gap: "8px",
                          padding: "9px 12px", cursor: "pointer",
                          borderBottom: `1px solid ${THEME.border}`,
                          background: docIndex === i ? THEME.tealBg : "transparent",
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDoctor(d.id)}
                            style={{ marginTop: "3px", cursor: "pointer", accentColor: THEME.teal }}
                          />
                          <div>
                            <div style={{ fontSize: "12.5px", fontWeight: "600", color: THEME.text }}>{d.name}</div>
                            {d.designation && (
                              <div style={{ fontSize: "11px", color: THEME.muted, marginTop: "1px" }}>{d.designation}</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>


        {/* ── Report Details ────────────────────────── */}
        <div style={card}>
          <h4 style={cardHdr}>{icon(<FiFileText color="#7c3aed" />, "#7c3aed18")} Report Details</h4>

          <div style={{ marginBottom: "12px" }}>
            <label style={lbl}>Procedure Type</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select value={reportType}
                onChange={e => { onReportTypeChange(e.target.value); setSelectedTemplateId(""); }}
                onFocus={focus("rt")} onBlur={blur} style={{ ...inp("rt"), paddingRight: "32px", cursor: "pointer" }}>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <div style={{ position: "absolute", right: "12px", pointerEvents: "none", color: THEME.teal, display: "flex" }}><IoIosArrowDown size={16} /></div>
            </div>
          </div>

          <div>
            <label style={lbl}>Load Template</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select value={selectedTemplateId}
                onChange={e => { const id = Number(e.target.value); setSelectedTemplateId(e.target.value); if (id) onTemplateSelect(id); }}
                onFocus={focus("tpl")} onBlur={blur}
                style={{
                  ...inp("tpl"),
                  borderColor: activeField === "tpl" ? THEME.teal : THEME.teal + "55",
                  fontWeight: "500", color: THEME.navy,
                  paddingRight: "32px", cursor: "pointer"
                }}>
                <option value="">— Select Template —</option>
                {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div style={{ position: "absolute", right: "12px", pointerEvents: "none", color: THEME.teal, display: "flex" }}><IoIosArrowDown size={16} /></div>
            </div>
          </div>
        </div>

        {/* ── Clinical Findings ─────────────────────── */}
        <div style={card}>
          <h4 style={cardHdr}>{icon(<FiActivity color="#b45309" />, "#b4530918")} Clinical Findings</h4>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedSectionIdx !== null && dragOverSectionIdx !== null && draggedSectionIdx !== dragOverSectionIdx) {
                setSections(p => {
                  const copy = [...p];
                  const draggedItem = copy[draggedSectionIdx];
                  copy.splice(draggedSectionIdx, 1);
                  copy.splice(dragOverSectionIdx, 0, draggedItem);
                  return copy;
                });
              }
              setDraggedSectionIdx(null);
              setDragOverSectionIdx(null);
            }}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {sections.map((section, i) => {
            const isHL = !!section.highlight;
            const fk   = `s${i}`;
            const act  = activeField === fk;

            return (
              <div
                key={i}
                draggable
                onDragStart={(e) => {
                  setDraggedSectionIdx(i);
                  e.dataTransfer.effectAllowed = "move";
                  const dragGhost = document.createElement("div");
                  e.dataTransfer.setDragImage(dragGhost, 0, 0);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverSectionIdx(i);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => {
                  setDraggedSectionIdx(null);
                  setDragOverSectionIdx(null);
                }}
                style={{
                  marginBottom: "10px",
                  display: "flex",
                  gap: "8px",
                  alignItems: section.isHeading ? "center" : "flex-start",
                  borderTop: dragOverSectionIdx === i ? `2px solid ${THEME.teal}` : "none",
                  opacity: draggedSectionIdx === i ? 0.4 : 1,
                  transition: "border 0.2s, opacity 0.2s",
                }}
              >
                <div style={{ cursor: "grab", color: THEME.muted, display: "flex", alignItems: "center", paddingTop: section.isHeading ? "0" : "10px" }}>
                  <MdDragIndicator size={20} />
                </div>
                
                <div style={{ flex: 1, pointerEvents: draggedSectionIdx !== null ? "none" : "auto" }}>
                  {section.isHeading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input type="text" value={section.title} onChange={e => updateHeadingTitle(i, e.target.value)}
                        onFocus={focus(`h${i}`)} onBlur={blur}
                        style={{
                          ...inp(`h${i}`), flex: 1, fontWeight: "800",
                          textTransform: "uppercase", color: THEME.danger,
                          borderColor: THEME.highlightBorder, background: THEME.highlight,
                        }} />
                      <span style={{ fontSize: "10px", color: THEME.muted, whiteSpace: "nowrap", fontWeight: "600" }}>SECTION</span>
                      <button onClick={() => deleteSection(i)} style={{
                        padding: "4px 8px", border: `1px solid ${THEME.border}`,
                        borderRadius: "5px", cursor: "pointer", color: THEME.danger, background: "white", fontSize: "12px",
                      }}>✕</button>
                    </div>
                  ) : section.isLine ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                        <label style={{ ...lbl, marginBottom: 0, color: THEME.teal }}>
                          Standalone Line
                        </label>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button className="rrem" onClick={() => deleteSection(i)} style={{
                            padding: "2px 8px", border: `1px solid ${THEME.border}`,
                            borderRadius: "5px", cursor: "pointer", fontSize: "11px",
                            fontWeight: "600", color: THEME.danger, background: "white",
                            transition: "background 0.12s", fontFamily: "inherit",
                            display: "flex", alignItems: "center"
                          }}><FiX style={{ marginRight: 4 }} /> Remove</button>
                        </div>
                      </div>
                      <div onClick={() => focus(fk)()}>
                        <RichTextEditor 
                          value={section.content || section.title || ""} 
                          onChange={(html) => updateSection(i, html)}
                          minHeight="60px"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                        <label style={{ ...lbl, marginBottom: 0 }}>
                          {section.title}
                          {isHL && (
                            <span style={{ color: THEME.danger, marginLeft: "8px", textTransform: "none", letterSpacing: 0, fontWeight: "500", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
                              <FiKey style={{ marginRight: 4 }} /> Key
                            </span>
                          )}
                        </label>

                        <div style={{ display: "flex", gap: "4px" }}>
                          {!isHL && (
                            <button className="rrem" onClick={() => deleteSection(i)} style={{
                              padding: "2px 8px", border: `1px solid ${THEME.border}`,
                              borderRadius: "5px", cursor: "pointer", fontSize: "11px",
                              fontWeight: "600", color: THEME.danger, background: "white",
                              transition: "background 0.12s", fontFamily: "inherit",
                              display: "flex", alignItems: "center"
                            }}><FiX style={{ marginRight: 4 }} /> Remove</button>
                          )}
                        </div>
                      </div>

                      <div onClick={() => focus(fk)()}>
                        <RichTextEditor 
                          value={section.content || ""} 
                          onChange={(html) => updateSection(i, html)}
                          minHeight={isHL ? "100px" : "80px"}
                          highlight={isHL}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>

          {/* Add custom field */}
          <div style={{
            marginTop: "14px", padding: "12px 14px",
            background: THEME.tealBg, borderRadius: "9px",
            border: `1.5px dashed ${THEME.teal}55`,
          }}>
            <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: "600", color: THEME.teal, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center" }}>
              <FiPlus style={{ marginRight: 6 }} /> Add Custom Field
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <input type="text" value={newFieldTitle}
                onChange={e => setNewFieldTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCustomSection(); }}
                placeholder="Field name, e.g. Colon, Biopsy Site…"
                onFocus={focus("nf")} onBlur={blur}
                style={{ ...inp("nf"), flex: "1 1 200px" }} />
              <button onClick={addCustomSection} disabled={!newFieldTitle.trim()} style={{
                padding: "8px 12px",
                background: newFieldTitle.trim() ? THEME.teal : THEME.border,
                color: "white", border: "none", borderRadius: "7px",
                fontSize: "12px", fontWeight: "600",
                cursor: newFieldTitle.trim() ? "pointer" : "not-allowed",
                whiteSpace: "nowrap", fontFamily: "inherit",
                flex: "1 1 auto"
              }}>+ Field</button>
              <button onClick={() => {
                const title = newFieldTitle.trim();
                if (!title) return;
                setSections(prev => {
                  let insertAt = prev.length;
                  for (let i = prev.length - 1; i >= 0; i--) { if (prev[i].highlight) { insertAt = i; break; } }
                  const copy = [...prev];
                  copy.splice(insertAt, 0, { title: "", content: title, isLine: true });
                  return copy;
                });
                setNewFieldTitle("");
              }} disabled={!newFieldTitle.trim()} style={{
                padding: "8px 12px",
                background: newFieldTitle.trim() ? THEME.navy : THEME.border,
                color: "white", border: "none", borderRadius: "7px",
                fontSize: "12px", fontWeight: "600",
                cursor: newFieldTitle.trim() ? "pointer" : "not-allowed",
                whiteSpace: "nowrap", fontFamily: "inherit",
                flex: "1 1 auto"
              }}>+ Line</button>
              <button onClick={addCustomHeading} disabled={!newFieldTitle.trim()} style={{
                padding: "8px 12px",
                background: newFieldTitle.trim() ? "#f53a3a" : THEME.border,
                color: "white", border: "none", borderRadius: "7px",
                fontSize: "12px", fontWeight: "600",
                cursor: newFieldTitle.trim() ? "pointer" : "not-allowed",
                whiteSpace: "nowrap", fontFamily: "inherit",
                flex: "1 1 auto"
              }}>+ Heading</button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default ReportForm;