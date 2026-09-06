"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReportForm from "@/components/ReportForm";
import ImageUploader from "@/components/ImageUploader";
import ReportPreview from "@/components/ReportPreview";
import RichTextEditor from "@/components/RichTextEditor";
import { generatePDF, printReport, exportAsWord } from "@/utils/reportGenerator";
import { buildEndoUrl } from "@/utils/buildEndoUrl";
import { FiPrinter, FiDownload, FiImage, FiRefreshCw, FiEdit3, FiAlertTriangle, FiFileText, FiSave } from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Template = {
  id: number;
  name: string;
  category: string;
  sections: {
    title: string;
    content: string;
    highlight?: boolean;
    isHeading?: boolean;
    isLine?: boolean;
    isLineYellow?: boolean;
    isLineGreen?: boolean;
  }[];
};

type Doctor = {
  id: number;
  name: string;
  qualifications?: string;
  designation?: string;
  is_default?: number;
  display_order?: number;
};

type ImageData = {
  id: string;
  url: string;
  label: string;
  filePath?: string;
  nbiLabel?: string;
};

type ActionState = "idle" | "loading" | "success" | "error";
type ToastMessage = { id: number; text: string; type: "success" | "error" };

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const getCurrentDateForInput = (): string => {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK TEMPLATES (when Electron API is unavailable)
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_TEMPLATES: Template[] = [
  {
    id: 1,
    name: "Normal Study",
    category: "UGI",
    sections: [
      { title: "Esophagus", content: "Normal" },
      { title: "Stomach", content: "Normal" },
      { title: "Duodenum", content: "Normal" },
      { title: "Impression", content: "Normal study", highlight: true },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────────────────────────
function CreateReportInner() {
  // ── Template & Category loading ────────────────────────────────────────────────────────
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState<string | null>(null);

  const searchParams = useSearchParams();
  const initType = searchParams?.get("type") || "UGI";
  const editId = searchParams?.get("editId");

  // ── Report fields ───────────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState("");
  const [patientId,   setPatientId]   = useState<number | null>(null);
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge,  setPatientAge]  = useState("");
  const [patientCity, setPatientCity] = useState("");
  const [reportDate,  setReportDate]  = useState(getCurrentDateForInput());
  const [reportType,  setReportType]  = useState(initType);
  const [doctorName,  setDoctorName]  = useState("Dr Your Name");
  const [images,        setImages]        = useState<ImageData[]>([]);
  const [prefix,        setPrefix]        = useState("Mr");
  const [reportNumber,  setReportNumber]  = useState<string | null>(null); // e.g. "SH-2026-001"
  
  // ── Referral Doctor ─────────────────────────────────────────────────────────
  const [referralName, setReferralName] = useState("");
  const [referralId, setReferralId] = useState<number | null>(null);
  const [referralPhone, setReferralPhone] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);

  // ── Master Image Adjustments ────────────────────────────────────────────────
  const [masterBrightness, setMasterBrightness] = useState(110);
  const [masterContrast, setMasterContrast] = useState(108);

  // 🔥 NEW: doctors selected for this report's footer
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [printState,  setPrintState]  = useState<ActionState>("idle");
  const [pdfState,    setPdfState]    = useState<ActionState>("idle");
  const [wordState,   setWordState]   = useState<ActionState>("idle");
  const [toasts,      setToasts]      = useState<ToastMessage[]>([]);
  const [mounted,     setMounted]     = useState(false);

  const [sections, setSections] = useState<
    { title: string; content: string; highlight?: boolean; isHeading?: boolean; isLine?: boolean; isLineYellow?: boolean; isLineGreen?: boolean }[]
  >([]);

  // ── Auto-Save Draft & Edit Mode Initialization ───────────────────────────────
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [isEditModeLoaded, setIsEditModeLoaded] = useState(false);

  // ── Save as Template modal ───────────────────────────────────────────────────
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [stmName, setStmName] = useState("");
  const [stmCategory, setStmCategory] = useState("");
  const [stmSections, setStmSections] = useState<{ title: string; content: string; highlight?: boolean; isHeading?: boolean; isLine?: boolean; isLineYellow?: boolean; isLineGreen?: boolean }[]>([]);

  useEffect(() => {
    const initEditMode = async () => {
      if (editId && (window as any).api) {
        // Clear previous state immediately to prevent "ghost" data during client-side navigation
        setPatientName("");
        setPatientId(null);
        setPatientPhone("");
        setPatientAge("");
        setPatientCity("");
        setReferralName("");
        setReferralId(null);
        setReferralPhone("");
        setSections([]);
        setImages([]);
        setReportNumber(null);
        
        try {
          setLoading(true);
          const report = await (window as any).api.getReport(parseInt(editId, 10));
          if (report) {
            setPatientName(report.patient_name || "");
            setPatientId(report.patient_id || null);
            setPatientPhone(report.patient_phone || "");
            if (report.age) {
              setPatientAge(`${report.age}Yrs/${report.gender || "M"}`);
            } else {
              setPatientAge("");
            }
            setPatientCity(report.city || "");
            // Extract YYYY-MM-DD from created_at
            if (report.created_at) {
               setReportDate(new Date(report.created_at).toISOString().split('T')[0]);
            }
            setReportType(report.report_type || "UGI");
            setPrefix(report.patient_prefix || "Mr.");
            setReferralName(report.referral_name || "");
            setReferralId(report.referral_doctor_id || null);
            setReferralPhone(report.referral_doctor_phone || "");
            setTemplateId(report.template_id || null);
            
            if (report.doctor_ids) {
               setSelectedDoctorIds(JSON.parse(report.doctor_ids));
            } else if (report.doctor_id) {
               setSelectedDoctorIds([report.doctor_id]);
            }

            if (report.sections) {
               setSections(report.sections);
            }
            
            if (report.images) {
               setImages(report.images.map((img: any) => ({
                 id: img.id.toString(),
                 url: buildEndoUrl(img.file_path),
                 filePath: img.file_path,
                 label: "Image",
                 isNbi: !!img.nbi_label,
                 nbiLabel: img.nbi_label || "",
                 brightness: img.brightness ?? 120,
                 contrast: img.contrast ?? 120,
               })));
            }
            
            setReportNumber(report.report_number);
          }
        } catch (e) {
          console.error("Failed to load edit report:", e);
          setLoadError("Failed to load report for editing");
        } finally {
          setIsEditModeLoaded(true);
          setLoading(false);
        }
      } else {
        setIsEditModeLoaded(true);
      }
    };
    initEditMode();
  }, [editId]);

  useEffect(() => {
    // Only restore draft if we are NOT in edit mode
    if (editId) return;

    try {
      const draftStr = localStorage.getItem("endoscribe_draft_report");
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.patientName) setPatientName(draft.patientName);
        if (draft.patientId) setPatientId(draft.patientId);
        if (draft.patientPhone) setPatientPhone(draft.patientPhone);
        if (draft.patientAge) setPatientAge(draft.patientAge);
        if (draft.patientCity) setPatientCity(draft.patientCity);
        if (draft.reportDate) setReportDate(draft.reportDate);
        if (draft.reportType) setReportType(draft.reportType);
        if (draft.prefix) setPrefix(draft.prefix);
        if (draft.referralName) setReferralName(draft.referralName);
        if (draft.referralId) setReferralId(draft.referralId);
        if (draft.referralPhone) setReferralPhone(draft.referralPhone);
        if (draft.selectedDoctorIds) setSelectedDoctorIds(draft.selectedDoctorIds);
        if (draft.sections && draft.sections.length > 0) setSections(draft.sections);
      }
    } catch (e) {
      console.error("Failed to restore draft", e);
    } finally {
      setIsDraftRestored(true);
    }
  }, [editId]);

  useEffect(() => {
    if (editId) return; // Do NOT auto-save drafts while editing an existing report
    if (!isDraftRestored) return;
    const hasData = patientName || patientPhone || (sections.length > 0 && sections.some(s => s.content.trim() !== ""));
    if (!hasData) return;

    const draftStr = JSON.stringify({
      patientName, patientId, patientPhone, patientAge, patientCity,
      reportDate, reportType, prefix, referralName, referralId, referralPhone,
      selectedDoctorIds, sections
    });
    localStorage.setItem("endoscribe_draft_report", draftStr);
  }, [
    isDraftRestored, editId,
    patientName, patientId, patientPhone, patientAge, patientCity,
    reportDate, reportType, prefix, referralName, referralId, referralPhone,
    selectedDoctorIds, sections
  ]);

  // Mount animation
  useEffect(() => { setMounted(true); }, []);

  // ── Toast system ─────────────────────────────────────────────────────────────
  const addToast = useCallback((text: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ── Load templates ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        if (!(window as any).api) {
          setTemplates(FALLBACK_TEMPLATES);
          return;
        }
        
        const cats = await (window as any).api.getCategories();
        setCategories(cats || []);
        
        const data = await (window as any).api.getTemplates();
        if (!data || data.length === 0) throw new Error("No templates found");
        setTemplates(data);
        
        // Auto-fill sections for initType if no draft exists AND not in edit mode
        const cat = cats?.find((c: any) => c.name === initType);
        const hasDraft = !!localStorage.getItem("endoscribe_draft_report");
        const editIdStr = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("editId") : null;
        if (cat && !hasDraft && !editIdStr) {
          setSections([...cat.default_sections]);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load templates");
        setTemplates(FALLBACK_TEMPLATES); // always fall back so UI isn't blocked
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  // 🔥 NEW: load doctors (used to resolve selectedDoctorIds → full doctor objects for preview)
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        if (!(window as any).api) return;
        const data = await (window as any).api.getDoctors();
        const activeDoctors = (data || []).filter((d: any) => d.is_active !== 0);
        setDoctors(activeDoctors);
      } catch (err) {
        console.error("Failed to load doctors:", err);
      }
    };
    loadDoctors();
  }, []);

  // ── Report type change — auto-fills with category default sections
  const handleReportTypeChange = (val: string) => {
    setReportType(val);
    setTemplateId(null);
    const cat = categories.find(c => c.name === val);
    if (cat) {
      setSections([...cat.default_sections]);
    } else {
      setSections([]);
    }
  };

  // ── Template selection ───────────────────────────────────────────────────────
  const handleTemplateSelect = async (id: number) => {
    try {
      let template: Template | undefined;
      if (!(window as any).api) {
        template = templates.find((t) => t.id === id);
      } else {
        template = await (window as any).api.getTemplate(id);
      }
      if (template) {
        setSections(template.sections || []);
        setReportType(template.category);
      }
    } catch (err) {
      console.error("Template load error:", err);
    }
  };

  // ── Image handlers ───────────────────────────────────────────────────────────
  const handleImagesAdded      = (newImgs: ImageData[]) => setImages((p) => [...p, ...newImgs]);
  const handleImagesUpdated = (updated: ImageData[]) => {
    setImages(updated);
  };
  const handleImageRemoved     = (id: string) => setImages((p) => p.filter((i) => i.id !== id));
  const handleImageLabelChanged = (id: string, label: string) =>
    setImages((p) => p.map((i) => (i.id === id ? { ...i, label } : i)));

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPatientName("");
    setPatientId(null);
    setPatientPhone("");
    setPatientAge("");
    setReportDate(getCurrentDateForInput());
    setReportType("UGI");
    setReferralName("");
    setReferralId(null);
    setReferralPhone("");
    
    // Auto fill UGI sections on reset if available
    const ugiCat = categories.find(c => c.name === "UGI");
    setSections(ugiCat ? [...ugiCat.default_sections] : []);
    
    setImages([]);
    setReportNumber(null);
    // Reset doctor selection back to defaults
    const defaults = doctors.filter((d) => d.is_default).map((d) => d.id);
    setSelectedDoctorIds(defaults);
    localStorage.removeItem("endoscribe_draft_report");
    addToast("Form cleared", "success");
    setTimeout(() => {
      document.getElementById("patientNameInput")?.focus();
    }, 10);
  };

  // ── Save as Template handlers ───────────────────────────────────────────────
  const handleOpenSaveTemplate = () => {
    setStmName("");
    setStmCategory(reportType || "");
    setStmSections(sections.map(s => ({ ...s })));
    setShowSaveTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!stmName.trim()) {
      addToast("Template name is required", "error");
      return;
    }
    try {
      const payload = { name: stmName.trim(), category: stmCategory, sections: stmSections };
      const created = await (window as any).api.createTemplate(payload);
      setTemplates(prev => [...prev, { id: created?.id ?? Date.now(), name: stmName.trim(), category: stmCategory, sections: stmSections }]);
      setShowSaveTemplateModal(false);
      addToast(`Template "${stmName.trim()}" saved ✓`, "success");
    } catch (err) {
      addToast("Failed to save template", "error");
    }
  };

  // ── Action button wrapper ─────────────────────────────────────────────────────
  // successMsg is optional — if omitted, the caller handles its own toast
  // (needed when the success message depends on async data like a report number)
  const runAction = async (
    setState: (s: ActionState) => void,
    fn: () => Promise<void>,
    successMsg: string | null,
    errorMsg: string
  ) => {
    setState("loading"); 
    try {
      await fn();
      setState("success");
      if (successMsg) addToast(successMsg, "success");
    } catch (err) {
      setState("error");
      addToast(
        `${errorMsg}: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
      console.error(err);
    } finally {
      setTimeout(() => setState("idle"), 2000);
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateForm = () => {
    if (!patientName.trim()) {
      addToast("Patient name is required", "error");
      return false;
    }
    if (!patientAge.trim()) {
      addToast("Patient age is required", "error");
      return false;
    }
    if (patientPhone.trim() && !/^\d{10}$/.test(patientPhone.trim())) {
      addToast("Phone number must be exactly 10 digits", "error");
      return false;
    }
    if (selectedDoctorIds.length === 0) {
      addToast("Please select at least one doctor", "error");
      return false;
    }

    // Check if at least some procedure content or images are present
    const hasContent = sections.some(s => (s.content || "").trim() !== "");
    const hasImages = images.length > 0;
    if (!hasContent && !hasImages) {
      addToast("Please add procedure content or at least one image", "error");
      return false;
    }

    return true;
  };

  const handlePrint       = () => {
    if (!validateForm()) return;
    runAction(setPrintState, printReport, "Sent to printer ✓", "Print failed");
  };
  const handleExportWord = () => {
    if (!validateForm()) return;
    runAction(setWordState, () => exportAsWord(
      reportDate, patientName, patientAge, reportType,
      sections,
      images.map(img => ({ ...img, brightness: masterBrightness, contrast: masterContrast })),
      selectedDoctorObjects,
      prefix,
      reportNumber ?? undefined
    ), "Word document saved ✨", "Save failed");

  };

  const handleDownloadPDF = () => {
    if (!validateForm()) return;
    runAction(setPdfState, async () => {
    
    // ── 0. Save Images to Disk ───────────────────────────────────────────────
    let finalImages = [...images];
    if ((window as any).api?.saveImage) {
      for (let i = 0; i < finalImages.length; i++) {
        if (!finalImages[i].filePath && finalImages[i].url.startsWith("data:image")) {
          try {
            const savedImg = await (window as any).api.saveImage({
              base64: finalImages[i].url,
              name: `image_${i}.jpg`,
            });
            finalImages[i] = { ...finalImages[i], filePath: savedImg.filePath };
          } catch (e) {
            console.error("Failed to save image to disk:", e);
          }
        }
      }
      setImages(finalImages); // Update state so they aren't re-saved
    }

    // ── 1. Save report to DB (auto, no extra button needed) ──────────────────
    let savedReportNo = reportNumber; // reuse if already saved
    if (!(window as any).api) {
      // running in browser dev mode — skip DB save
      savedReportNo = null;
    } else if (editId) {
      // Editing existing report: always update the database
      try {
        const primaryDoctorId = selectedDoctorIds[0] ?? null;
        const saved = await (window as any).api.updateReport({
          id: parseInt(editId, 10),
          data: {
            patientId,
            patientPrefix: prefix,
            patientName,
            patientPhone,
            age: patientAge ? parseInt(patientAge) : null,
            patientCity,
            gender:   patientAge?.includes("/F") ? "F" : "M",
            doctorId: primaryDoctorId,
            doctorIds: selectedDoctorIds,
            referralDoctorId: referralId,
            referralDoctorName: referralName,
            referralDoctorPhone: referralPhone,
            templateId,
            reportType,
            sections,
            images: finalImages.map((img, i) => ({
              filePath: img.filePath,
              position: i,
              nbiLabel: img.nbiLabel || null,
              brightness: masterBrightness,
              contrast: masterContrast,
            })),
          }
        });
        savedReportNo = saved?.reportNumber ?? reportNumber;
      } catch (updateErr) {
        console.error("❌ DB update failed:", updateErr);
        addToast("⚠️ Report update failed in database! Please try again.", "error");
      }
    } else if (!savedReportNo) {
      // Creating new report
      try {
        const primaryDoctorId = selectedDoctorIds[0] ?? null;
        const saved = await (window as any).api.saveReport({
          patientId,
          patientPrefix: prefix,
          patientName,
          patientPhone,
          age: patientAge ? parseInt(patientAge) : null,
          patientCity,
          gender:   patientAge?.includes("/F") ? "F" : "M",
          doctorId: primaryDoctorId,
          doctorIds: selectedDoctorIds,
          referralDoctorId: referralId,
          referralDoctorName: referralName,
          referralDoctorPhone: referralPhone,
          templateId,
          reportType,
          sections,
          images: finalImages.map((img, i) => ({
            filePath: img.filePath,
            position: i,
            nbiLabel: img.nbiLabel || null,
            brightness: masterBrightness,
            contrast: masterContrast,
          })),
        });
        savedReportNo = saved?.reportNumber ?? null;
        if (savedReportNo) setReportNumber(savedReportNo);
      } catch (saveErr) {
        console.error("❌ DB save failed:", saveErr);
        addToast("⚠️ Report could not be saved to database! Please try again.", "error");
      }
    }

    // ── 2. Generate PDF (report number now visible in preview) ───────────────
    const result = await generatePDF(reportDate, patientName, patientAge, reportType, savedReportNo ?? undefined);
    if (result && result.absolutePath) {
      console.log(`PDF saved successfully to:\n${result.absolutePath}`);
    }

    // ── 3. Show success toast with the REAL report number ────────────────────
    // We call addToast here (not via runAction's successMsg arg) because
    // savedReportNo is a local variable resolved during this async call.
    // If we passed it as a string to runAction, it would be evaluated at
    // click-time when reportNumber state is still null → stale closure bug.
    addToast(
      savedReportNo ? `Report ${savedReportNo} — PDF downloaded ✓` : "PDF downloaded ✓",
      "success"
    );
  }, null, "PDF failed");  // null = runAction won't show its own success toast
  };

  // 🔥 NEW: resolve selected doctor IDs into full doctor objects, in the
  // order they were selected, for the preview footer.
  const selectedDoctorObjects = selectedDoctorIds
    .map((id) => doctors.find((d) => d.id === id))
    .filter((d): d is Doctor => Boolean(d));

  // ─────────────────────────────────────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    padding: "13px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    letterSpacing: "0.3px",
  };

  const btnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(0,0,0,0.2)";
  };
  const btnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
  };

  const getLabel = (state: ActionState, idle: React.ReactNode, loading: string, success: string) => {
    if (state === "loading") return <><Spinner />{loading}</>;
    if (state === "success") return <>{"\u2713"} {success}</>;
    return <>{idle}</>;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", backgroundColor: "#eef2f5", flexDirection: "column", gap: "16px"
      }}>
        <div style={{
          width: "44px", height: "44px", border: "4px solid #dee2e6",
          borderTop: "4px solid #1a3a52", borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <h2 style={{ color: "#1a3a52", fontWeight: 600, margin: 0 }}>Loading templates…</h2>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Global animations ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: none; } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: none; } }
        @keyframes toastOut { to { opacity: 0; transform: translateX(40px); } }
        input:focus, textarea:focus, select:focus {
          outline: none !important;
          border-color: #0d6efd !important;
          box-shadow: 0 0 0 3px rgba(13,110,253,0.18) !important;
        }
      `}</style>

      {/* ── Toast stack ───────────────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px" }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: t.type === "success" ? "#198754" : "#dc3545",
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
              animation: "toastIn 0.3s ease",
              minWidth: "220px",
              maxWidth: "320px",
            }}
          >
            {t.type === "success" ? "✓ " : "✕ "}{t.text}
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: "#eef2f5", height: "100vh", overflow: "hidden", animation: mounted ? "fadeIn 0.4s ease" : "none" }}>
        <div style={{ display: "flex", height: "100%" }}>

          {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
          <div
            style={{
              width: "42%",
              minWidth: "480px",
              padding: "32px",
              backgroundColor: "#f8f9fa",
              overflowY: "auto",
              borderRight: "1px solid #dee2e6",
              boxShadow: "4px 0 14px rgba(0,0,0,0.06)",
              zIndex: 10,
              animation: mounted ? "slideIn 0.35s ease" : "none",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
              <FiEdit3 size={24} color="#1a3a52" />
              <h2 style={{ color: "#1a3a52", margin: 0, fontSize: "20px", fontWeight: "700", fontFamily: "'Inter', sans-serif" }}>
                {editId ? `Editing Report: ${reportNumber || ''}` : 'EndoScribe: Endoscopy Report Generator'}
              </h2>
            </div>

            {/* Error banner (dismissible) */}
            {loadError && (
              <div style={{
                padding: "10px 14px", backgroundColor: "#fff3cd", color: "#856404",
                borderRadius: "8px", marginBottom: "16px", border: "1px solid #ffc107",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: "13px", animation: "fadeIn 0.3s ease",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiAlertTriangle /> {loadError} — using default templates.</span>
                <button
                  onClick={() => setLoadError(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#856404", padding: "0 4px" }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Form */}
            <ReportForm
              patientName={patientName}
              patientPhone={patientPhone}
              patientAge={patientAge}
              patientCity={patientCity}
              reportDate={reportDate}
              reportType={reportType}
              doctorName={doctorName}
              templates={templates}
              sections={sections}
              setSections={setSections}
              selectedDoctorIds={selectedDoctorIds}
              onDoctorSelectionChange={setSelectedDoctorIds}
              doctors={doctors}
              categories={categories}
              onDoctorsChange={setDoctors}
              onPatientNameChange={(v) => { setPatientName(v); setPatientId(null); }}
              onPatientPhoneChange={setPatientPhone}
              onPatientIdChange={setPatientId}
              onPatientAgeChange={setPatientAge}
              onPatientCityChange={setPatientCity}
              onReportDateChange={setReportDate}
              onReportTypeChange={handleReportTypeChange}
              templateId={templateId}
              onTemplateSelect={handleTemplateSelect}
              prefix={prefix}
              setPrefix={setPrefix}
              referralName={referralName}
              onReferralNameChange={setReferralName}
              onReferralIdChange={setReferralId}
              referralPhone={referralPhone}
              onReferralPhoneChange={setReferralPhone}
            />

            {/* Image uploader */}
            <div style={{ marginTop: "24px" }}>
              <div style={{ background: "white", borderRadius: "12px", border: `1px solid #e2e8f0`, padding: "24px", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", color: "#1a3a52", marginBottom: "16px" }}>Global Image Settings</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  <div>
                    <label style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>
                      Brightness: {masterBrightness}%
                    </label>
                    <input
                      type="range"
                      min="0" max="200"
                      value={masterBrightness}
                      onChange={(e) => setMasterBrightness(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: "#0d9488" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>
                      Contrast: {masterContrast}%
                    </label>
                    <input
                      type="range"
                      min="0" max="200"
                      value={masterContrast}
                      onChange={(e) => setMasterContrast(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: "#0d9488" }}
                    />
                  </div>
                </div>
              </div>

              <ImageUploader
                images={images}
                onImagesAdded={handleImagesAdded}
                onImagesUpdated={handleImagesUpdated}
                onImageRemoved={handleImageRemoved}
                onImageLabelChanged={handleImageLabelChanged}
                maxImages={6}
              />
            </div>

            {/* ── Action buttons ─────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "28px" }}>

              <button
                onClick={handlePrint}
                disabled={printState === "loading"}
                onMouseEnter={btnHover} onMouseLeave={btnLeave}
                style={{ ...btnBase, backgroundColor: printState === "success" ? "#157347" : "#0d6efd", opacity: printState === "loading" ? 0.75 : 1 }}
              >
                {getLabel(printState, <><FiPrinter style={{marginRight: 6}}/> Print</>, "Printing…", "Printed")}
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={pdfState === "loading"}
                onMouseEnter={btnHover} onMouseLeave={btnLeave}
                style={{ ...btnBase, backgroundColor: pdfState === "success" ? "#157347" : "#198754", opacity: pdfState === "loading" ? 0.75 : 1 }}
              >
                {getLabel(pdfState, <><FiDownload style={{marginRight: 6}}/> PDF</>, "Generating…", "Saved")}
              </button>

              <button
                onClick={handleExportWord}
                disabled={wordState === "loading"}
                onMouseEnter={btnHover} onMouseLeave={btnLeave}
                style={{ ...btnBase, backgroundColor: "#2b579a", color: "#fff", opacity: wordState === "loading" ? 0.75 : 1 }}
              >
                {getLabel(wordState, <><FiFileText style={{marginRight: 6}}/> Save as Word</>, "Saving…", "Saved")}
              </button>

              <button
                onClick={handleReset}
                onMouseEnter={btnHover} onMouseLeave={btnLeave}
                style={{ ...btnBase, backgroundColor: "#6c757d" }}
              >
                <FiRefreshCw style={{marginRight: 6}}/> Reset
              </button>

              {/* Save as Template button — full width above the 2-col grid */}
              <button
                onClick={handleOpenSaveTemplate}
                style={{
                  ...btnBase,
                  backgroundColor: "#0d9488",
                  gridColumn: "1 / -1",
                  marginBottom: "4px",
                }}
                onMouseEnter={btnHover}
                onMouseLeave={btnLeave}
              >
                <FiSave style={{ marginRight: 6 }} /> Save as Template
              </button>
            </div>
          </div>

          {/* ── RIGHT PANEL – A4 preview ──────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              backgroundColor: "#dbe0e5",
              padding: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "210mm",
                minHeight: "297mm",
                backgroundColor: "white",
                boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
                borderRadius: "2px",
                margin: "0 auto",
                transition: "box-shadow 0.2s ease",
                zoom: 0.75,
              }}
            >
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <ReportPreview
                patientName={patientName}
                patientAge={patientAge}
                reportDate={reportDate}
                reportType={reportType}
                sections={sections}
                doctorName={doctorName}
                images={images.map(img => ({ ...img, brightness: masterBrightness, contrast: masterContrast }))}
                prefix={prefix}
                reportNumber={reportNumber || "PREVIEW"}
                selectedDoctors={selectedDoctorObjects}
              />
            </div>
            </div>
          </div>

        </div>
      </div>
      {/* ── Save as Template Modal ─────────────────────────────── */}
      {showSaveTemplateModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 9999, display: "flex", alignItems: "flex-start",
          justifyContent: "center", overflowY: "auto", padding: "24px",
        }}>
          <div style={{
            background: "white", borderRadius: "16px",
            width: "100%", maxWidth: "680px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
            fontFamily: "Inter, sans-serif",
            marginTop: "auto", marginBottom: "auto",
          }}>
            {/* Modal Header */}
            <div style={{
              background: "white", color: "#1a3a52",
              padding: "20px 24px", borderRadius: "16px 16px 0 0",
              borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiSave /> Save Current Report as Template
              </h2>
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                style={{
                  background: "transparent", border: "none",
                  color: "#64748b", width: "30px", height: "30px",
                  borderRadius: "50%", cursor: "pointer", fontSize: "22px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Template Name *
                  </label>
                  <input
                    value={stmName}
                    onChange={e => setStmName(e.target.value)}
                    placeholder="e.g. Barrett's Esophagus"
                    autoFocus
                    style={{
                      padding: "9px 12px", border: "1.5px solid #e2e8f0",
                      borderRadius: "7px", fontSize: "13px", fontFamily: "inherit",
                      outline: "none", width: "100%", boxSizing: "border-box" as const, background: "white",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Category
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <select
                      value={stmCategory}
                      onChange={e => setStmCategory(e.target.value)}
                      style={{
                        padding: "9px 12px", border: "1.5px solid #e2e8f0",
                        borderRadius: "7px", fontSize: "13px", fontFamily: "inherit",
                        outline: "none", width: "160px", boxSizing: "border-box" as const,
                        background: "white", appearance: "none" as const, paddingRight: "28px",
                      }}
                    >
                      {categories.map((c: any) => <option key={c.id ?? c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <div style={{ position: "absolute", right: "10px", pointerEvents: "none", color: "#64748b", display: "flex" }}>▾</div>
                  </div>
                </div>
              </div>

              {/* Sections preview (editable) */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Sections
                  </label>
                  <button
                    onClick={() => setStmSections(p => [...p, { title: "", content: "" }])}
                    style={{
                      fontSize: "12px", color: "#0d9488", background: "#ccfbf1",
                      border: "none", borderRadius: "6px", cursor: "pointer",
                      padding: "4px 12px", fontWeight: "600", fontFamily: "inherit",
                    }}
                  >+ Add Section</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
                  {stmSections.map((s, i) => (
                    <div key={i} style={{
                      border: `1.5px solid ${s.highlight ? "#fca5a5" : "#e2e8f0"}`,
                      borderRadius: "10px", padding: "12px",
                      background: s.highlight ? "#fff7f7" : "#fafafa",
                    }}>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                        <input
                          value={s.title}
                          onChange={e => setStmSections(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                          placeholder="Field name"
                          style={{
                            padding: "9px 12px", border: "1.5px solid #e2e8f0",
                            borderRadius: "7px", fontSize: "13px", fontFamily: "inherit",
                            outline: "none", flex: 1, fontWeight: "600", background: "white",
                          }}
                        />
                        <button
                          onClick={() => setStmSections(p => p.map((x, idx) => idx === i ? { ...x, highlight: !x.highlight } : x))}
                          style={{
                            padding: "5px 10px",
                            border: `1.5px solid ${s.highlight ? "#fca5a5" : "#e2e8f0"}`,
                            borderRadius: "6px", cursor: "pointer", fontSize: "11px",
                            fontWeight: "600", background: s.highlight ? "#fee2e2" : "white",
                            color: s.highlight ? "#dc2626" : "#64748b", fontFamily: "inherit", whiteSpace: "nowrap" as const,
                          }}
                        >{s.highlight ? "★ Key" : "☆ Key"}</button>
                        <button
                          onClick={() => setStmSections(p => p.filter((_, idx) => idx !== i))}
                          style={{
                            padding: "5px 9px", border: "1px solid #fecaca",
                            borderRadius: "6px", cursor: "pointer",
                            background: "#fef2f2", color: "#dc2626", fontSize: "13px",
                          }}
                        >✕</button>
                      </div>
                      {!s.isHeading && !s.isLine && (
                        <div style={{ marginTop: "4px" }}>
                          <RichTextEditor
                            value={s.content}
                            onChange={html => setStmSections(p => p.map((x, idx) => idx === i ? { ...x, content: html } : x))}
                            minHeight="60px"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
                <button
                  onClick={() => setShowSaveTemplateModal(false)}
                  style={{
                    padding: "9px 20px", border: "1.5px solid #e2e8f0",
                    borderRadius: "8px", cursor: "pointer", fontFamily: "inherit",
                    fontSize: "14px", fontWeight: "600", background: "white", color: "#64748b",
                  }}
                >Cancel</button>
                <button
                  onClick={handleSaveTemplate}
                  style={{
                    padding: "9px 20px", border: "none",
                    borderRadius: "8px", cursor: "pointer", fontFamily: "inherit",
                    fontSize: "14px", fontWeight: "600", background: "#1a3a52", color: "white",
                  }}
                >Create Template</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateReportInner />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE SPINNER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Spinner = () => (
  <span
    style={{
      display: "inline-block",
      width: "14px",
      height: "14px",
      border: "2px solid rgba(255,255,255,0.35)",
      borderTop: "2px solid white",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }}
  />
);