"use client";
import React, { useEffect, useState } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiSettings, FiPlus, FiFolder, FiChevronDown, FiX, FiAlertCircle, FiCheck, FiSave } from 'react-icons/fi';
import RichTextEditor from "../../components/RichTextEditor";
import { Button } from "@/components/ui/Button";

const THEME = {
  navy:    "#1a3a52",
  teal:    "#0d9488",
  tealBg:  "#ccfbf1",
  border:  "#e2e8f0",
  bg:      "#f4f7f6",
  white:   "#ffffff",
  text:    "#1e293b",
  muted:   "#64748b",
  danger:  "#dc2626",
  dangerBg:"#fef2f2",
};

type Section = { title: string; content: string; highlight?: boolean; isHeading?: boolean; isLine?: boolean; isLineYellow?: boolean; isLineGreen?: boolean; };
type Template = { id: number; name: string; category: string; sections: Section[] };
type Category = { id: number; name: string; color_bg: string; color_fg: string; default_sections: Section[] };

export default function TemplatePage() {
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("ALL");
  const [showModal, setShowModal]   = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [editCatTarget, setEditCatTarget] = useState<Category | null>(null);
  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [delCatConfirm, setDelCatConfirm] = useState<number | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Template form state ───────────────────────────────────
  const [fName, setFName]       = useState("");
  const [fCat, setFCat]         = useState("");
  const [fSections, setFSections] = useState<Section[]>([]);

  // ── Category form state ───────────────────────────────────
  const [cName, setCName]       = useState("");
  const [cColorBg, setCColorBg] = useState("#f1f5f9");
  const [cColorFg, setCColorFg] = useState("#475569");
  const [cSections, setCSections] = useState<Section[]>([]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    if (!(window as any).api) return;
    const cats = await (window as any).api.getCategories();
    setCategories(cats);
    if (cats.length > 0 && !fCat) setFCat(cats[0].name);

    const data = await (window as any).api.getTemplates();
    setTemplates(data);
  };

  useEffect(() => { load(); }, []);

  // ── Open Modals ───────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setFName(""); 
    if (categories.length > 0) {
      setFCat(categories[0].name);
      setFSections([...categories[0].default_sections]);
    } else {
      setFCat("");
      setFSections([{ title: "Impression", content: "", highlight: true }]);
    }
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setEditTarget(t);
    setFName(t.name); setFCat(t.category);
    setFSections(t.sections.map(s => ({ ...s })));
    setShowModal(true);
  };

  const openCreateCategory = () => {
    setEditCatTarget(null);
    setCName("");
    setCColorBg("#f1f5f9");
    setCColorFg("#475569");
    setCSections([{ title: "Impression", content: "", highlight: true }]);
    setShowCatModal(true);
  };

  const openEditCategory = (c: Category) => {
    setEditCatTarget(c);
    setCName(c.name);
    setCColorBg(c.color_bg);
    setCColorFg(c.color_fg);
    setCSections(c.default_sections.map(s => ({ ...s })));
    setShowCatModal(true);
  };

  // ── Section helpers ───────────────────────────────────────
  const updateSectionTitle   = (i: number, v: string, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => p.map((s, idx) => idx === i ? { ...s, title: v } : s));
  };
  const updateSectionContent = (i: number, v: string, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => p.map((s, idx) => idx === i ? { ...s, content: v } : s));
  };
  const toggleHighlight      = (i: number, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => p.map((s, idx) => idx === i ? { ...s, highlight: !s.highlight } : s));
  };
  const toggleHeading        = (i: number, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => p.map((s, idx) => idx === i ? { ...s, isHeading: !s.isHeading, isLine: false } : s));
  };
  const toggleLine           = (i: number, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => p.map((s, idx) => idx === i ? { ...s, isLine: !s.isLine, isHeading: false, isLineYellow: false, isLineGreen: false } : s));
  };
  const toggleLineYellow           = (i: number, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => p.map((s, idx) => idx === i ? { ...s, isLineYellow: !s.isLineYellow, isHeading: false, isLine: false, isLineGreen: false } : s));
  };
  const toggleLineGreen           = (i: number, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => p.map((s, idx) => idx === i ? { ...s, isLineGreen: !s.isLineGreen, isHeading: false, isLine: false, isLineYellow: false } : s));
  };
  const removeSection        = (i: number, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => p.filter((_, idx) => idx !== i));
  };
  const addSection           = (isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => [...p, { title: "", content: "" }]);
  };
  const moveSection          = (i: number, dir: -1 | 1, isCat = false) => {
    const setter = isCat ? setCSections : setFSections;
    setter(p => {
      const copy = [...p];
      const to = i + dir;
      if (to < 0 || to >= copy.length) return copy;
      [copy[i], copy[to]] = [copy[to], copy[i]];
      return copy;
    });
  };

  // ── Save Template ──────────────────────────────────────────
  const save = async () => {
    if (!fName.trim()) return showToast("Template name is required", false);
    const payload = { name: fName.trim(), category: fCat, sections: fSections };
    try {
      if (editTarget) {
        await (window as any).api.updateTemplate(editTarget.id, payload);
        showToast("Template updated ✓");
      } else {
        await (window as any).api.createTemplate(payload);
        showToast("Template created ✓");
      }
      setShowModal(false);
      load();
    } catch (err) {
      showToast("Save failed", false);
    }
  };

  // ── Save Category ──────────────────────────────────────────
  const saveCategory = async () => {
    if (!cName.trim()) return showToast("Category name is required", false);
    const payload = { name: cName.trim(), color_bg: cColorBg, color_fg: cColorFg, default_sections: cSections };
    try {
      if (editCatTarget) {
        await (window as any).api.updateCategory(editCatTarget.id, payload);
        showToast("Category updated ✓");
      } else {
        await (window as any).api.createCategory(payload);
        showToast("Category created ✓");
      }
      setShowCatModal(false);
      load();
    } catch (err) {
      showToast("Save failed", false);
    }
  };

  const confirmDelete = async (id: number) => {
    try {
      await (window as any).api.deleteTemplate(id);
      setDelConfirm(null);
      showToast("Template deleted");
      load();
    } catch { showToast("Delete failed", false); }
  };

  const confirmDeleteCat = async (id: number) => {
    try {
      await (window as any).api.deleteCategory(id);
      setDelCatConfirm(null);
      showToast("Category deleted");
      load();
    } catch { showToast("Delete failed", false); }
  };

  const filtered = templates.filter(t =>
    (filterCat === "ALL" || t.category === filterCat) &&
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const inp: React.CSSProperties = {
    padding: "9px 12px", border: `1.5px solid ${THEME.border}`,
    borderRadius: "7px", fontSize: "13px", fontFamily: "inherit",
    outline: "none", width: "100%", boxSizing: "border-box", background: THEME.white,
  };

  const getCatColor = (catName: string) => {
    const c = categories.find(c => c.name === catName);
    return c ? { bg: c.color_bg, fg: c.color_fg } : { bg: "#f1f5f9", fg: "#475569" };
  };

  return (
    <>
      <style>{`
                * { box-sizing: border-box; }
        .tpl-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.10) !important; transform: translateY(-1px); }
        .tpl-card { transition: box-shadow 0.18s, transform 0.18s; }
        input:focus, textarea:focus, select:focus { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.15) !important; }
      `}</style>

      {/* Toast */}
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

      <div style={{ flex: 1, overflowY: "auto", background: THEME.bg, fontFamily: "'Inter', sans-serif", color: THEME.text }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div style={{
          padding: "32px 32px 10px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ color: "#1a3a52", fontSize: "28px", fontWeight: "800", margin: 0 }}>Template Manager</h2>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: THEME.muted, fontWeight: "500" }}>
              {templates.length} templates across {categories.length} procedure types
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button 
              variant="secondary"
              icon={<FiSettings />}
              onClick={openCreateCategory}
            >
              Manage Categories
            </Button>
            <Button 
              variant="primary"
              icon={<FiPlus />}
              onClick={openCreate}
            >
              New Template
            </Button>
          </div>
        </div>

        <div style={{ padding: "10px 32px 24px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* ── Filters ─────────────────────────────────────── */}
          <div style={{ 
            display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap",
            background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
          }}>
            <div style={{ position: "relative", width: "240px" }}>
              <FiSearch style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
              <input
                placeholder="Search templates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inp, width: "100%", paddingLeft: "40px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["ALL", ...categories.map(c => c.name)].map(c => {
                const active = filterCat === c;
                const cc = getCatColor(c);
                return (
                  <button key={c} onClick={() => setFilterCat(c)} style={{
                    padding: "6px 14px", borderRadius: "20px", fontSize: "12px",
                    fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
                    border: active ? "none" : `1.5px solid ${THEME.border}`,
                    background: active ? (c === "ALL" ? THEME.navy : cc.bg) : THEME.white,
                    color:      active ? (c === "ALL" ? "white"   : cc.fg) : THEME.muted,
                  }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Grid ─────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px", color: THEME.muted,
              background: THEME.white, borderRadius: "14px", border: `1px solid ${THEME.border}`,
            }}>
              <div style={{ fontSize: "40px", marginBottom: "12px", color: THEME.muted }}><FiFolder /></div>
              <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>No templates found</div>
              <div style={{ fontSize: "13px" }}>Try changing the filter or creating a new template.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {filtered.map(t => {
                const cc = getCatColor(t.category);
                return (
                  <div key={t.id} className="tpl-card" style={{
                    background: THEME.white, borderRadius: "12px",
                    border: `1px solid ${THEME.border}`,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    padding: "18px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: THEME.text, marginBottom: "6px" }}>
                          {t.name}
                        </div>
                        <span style={{
                          fontSize: "11px", fontWeight: "600", padding: "3px 9px",
                          borderRadius: "20px", background: cc.bg, color: cc.fg,
                        }}>
                          {t.category}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button variant="icon" size="sm" icon={<FiEdit2 size={16} />} onClick={() => openEdit(t)} />
                        <Button variant="icon-danger" size="sm" icon={<FiTrash2 size={16} />} onClick={() => setDelConfirm(t.id)} />
                      </div>
                    </div>

                    <div style={{ fontSize: "12px", color: THEME.muted }}>
                      {t.sections.length} section{t.sections.length !== 1 ? "s" : ""}:&nbsp;
                      {t.sections.filter(s => !s.isHeading).slice(0, 3).map(s => s.title).join(", ")}
                      {t.sections.length > 3 ? "…" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirm (Template) ─────────────────────────── */}
      {delConfirm !== null && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: THEME.white, borderRadius: "14px", padding: "28px 32px",
            fontFamily: "Inter, sans-serif", maxWidth: "380px", width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>
            <div style={{ fontSize: "32px", textAlign: "center", marginBottom: "12px", color: THEME.danger }}><FiTrash2 /></div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center", color: THEME.text }}>Delete Template?</h3>
            <p style={{ margin: "0 0 20px", textAlign: "center", color: THEME.muted, fontSize: "13px" }}>
              This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="ghost" onClick={() => setDelConfirm(null)} style={{ flex: 1 }}>Cancel</Button>
              <Button variant="danger" onClick={() => confirmDelete(delConfirm)} style={{ flex: 1 }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm (Category) ─────────────────────────── */}
      {delCatConfirm !== null && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          zIndex: 1010, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: THEME.white, borderRadius: "14px", padding: "28px 32px",
            fontFamily: "Inter, sans-serif", maxWidth: "380px", width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>
            <div style={{ fontSize: "32px", textAlign: "center", marginBottom: "12px", color: THEME.danger }}><FiTrash2 /></div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center", color: THEME.text }}>Delete Category?</h3>
            <p style={{ margin: "0 0 20px", textAlign: "center", color: THEME.muted, fontSize: "13px" }}>
              This cannot be undone. Templates using this category might lose their grouping.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="ghost" onClick={() => setDelCatConfirm(null)} style={{ flex: 1 }}>Cancel</Button>
              <Button variant="danger" onClick={() => confirmDeleteCat(delCatConfirm)} style={{ flex: 1 }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Template Modal ────────────────────────────── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 1000, display: "flex", alignItems: "flex-start",
          justifyContent: "center", overflowY: "auto", padding: "24px",
        }}>
          <div style={{
            background: THEME.white, borderRadius: "16px",
            width: "100%", maxWidth: "680px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
            fontFamily: "Inter, sans-serif",
            marginTop: "auto", marginBottom: "auto",
          }}>
            <div style={{
              background: THEME.white,
              color: THEME.navy, padding: "20px 24px",
              borderRadius: "16px 16px 0 0", borderBottom: `1px solid ${THEME.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                {editTarget ? <><FiEdit2 /> Edit Template</> : <><FiPlus /> New Template</>}
              </h2>
              <button onClick={() => setShowModal(false)} style={{
                background: "transparent", border: "none",
                color: THEME.muted, width: "30px", height: "30px",
                borderRadius: "50%", cursor: "pointer", fontSize: "22px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><FiX size={20} /></button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: THEME.muted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Template Name *
                  </label>
                  <input
                    value={fName}
                    onChange={e => setFName(e.target.value)}
                    placeholder="e.g. Barrett's Esophagus"
                    style={inp}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: THEME.muted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Category
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <select 
                      value={fCat} 
                      onChange={e => {
                        setFCat(e.target.value);
                        const c = categories.find(x => x.name === e.target.value);
                        if (c && !editTarget) setFSections([...c.default_sections]); // Auto-fill default sections if new
                      }} 
                      style={{ ...inp, width: "160px", appearance: "none", paddingRight: "28px" }}
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <div style={{ position: "absolute", right: "10px", pointerEvents: "none", color: THEME.muted, display: "flex" }}>
                      <FiChevronDown size={14} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Sections
                  </label>
                  <button onClick={() => addSection(false)} style={{
                    fontSize: "12px", color: THEME.teal, background: THEME.tealBg,
                    border: "none", borderRadius: "6px", cursor: "pointer",
                    padding: "4px 12px", fontWeight: "600", fontFamily: "inherit",
                  }}>+ Add Section</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
                  {fSections.map((s, i) => (
                    <div key={i} style={{
                      border: `1.5px solid ${s.highlight ? "#fca5a5" : THEME.border}`,
                      borderRadius: "10px",
                      padding: "12px",
                      background: s.highlight ? "#fff7f7" : "#fafafa",
                    }}>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <button onClick={() => moveSection(i, -1, false)} disabled={i === 0}
                            style={{ padding: "1px 5px", fontSize: "10px", cursor: "pointer", border: `1px solid ${THEME.border}`, borderRadius: "3px", background: "white", color: THEME.muted, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                          <button onClick={() => moveSection(i, 1, false)} disabled={i === fSections.length - 1}
                            style={{ padding: "1px 5px", fontSize: "10px", cursor: "pointer", border: `1px solid ${THEME.border}`, borderRadius: "3px", background: "white", color: THEME.muted, opacity: i === fSections.length - 1 ? 0.3 : 1 }}>▼</button>
                        </div>
                        <input
                          value={s.title}
                          onChange={e => updateSectionTitle(i, e.target.value, false)}
                          placeholder="Field name"
                          style={{ ...inp, flex: 1, fontWeight: "600" }}
                        />
                        <button
                          onClick={() => toggleHighlight(i, false)}
                          title="Toggle important / Impression"
                          style={{
                            padding: "5px 10px", border: `1.5px solid ${s.highlight ? "#fca5a5" : THEME.border}`,
                            borderRadius: "6px", cursor: "pointer", fontSize: "11px",
                            fontWeight: "600", background: s.highlight ? "#fee2e2" : "white",
                            color: s.highlight ? THEME.danger : THEME.muted, fontFamily: "inherit",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.highlight ? "★ Key" : "☆ Key"}
                        </button>
                        <button
                          onClick={() => toggleHeading(i, false)}
                          title="Toggle heading / box"
                          style={{
                            padding: "5px 10px", border: `1.5px solid ${s.isHeading ? "#f53a3a" : THEME.border}`,
                            borderRadius: "6px", cursor: "pointer", fontSize: "11px",
                            fontWeight: "600", background: s.isHeading ? "#fee2e2" : "white",
                            color: s.isHeading ? "#f53a3a" : THEME.muted, fontFamily: "inherit",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.isHeading ? "H Box" : "H Normal"}
                        </button>
                        <button
                          onClick={() => toggleLine(i, false)}
                          title="Toggle red text line"
                          style={{
                            padding: "5px 10px", border: `1.5px solid ${s.isLine ? "#f53a3a" : THEME.border}`,
                            borderRadius: "6px", cursor: "pointer", fontSize: "11px",
                            fontWeight: "600", background: s.isLine ? "#fee2e2" : "white",
                            color: s.isLine ? "#f53a3a" : THEME.muted, fontFamily: "inherit",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.isLine ? "T Red" : "T Red"}
                        </button>
                        <button
                          onClick={() => toggleLineYellow(i, false)}
                          title="Toggle yellow text line"
                          style={{
                            padding: "5px 10px", border: `1.5px solid ${s.isLineYellow ? "#fbbf24" : THEME.border}`,
                            borderRadius: "6px", cursor: "pointer", fontSize: "11px",
                            fontWeight: "600", background: s.isLineYellow ? "#fef3c7" : "white",
                            color: s.isLineYellow ? "#d97706" : THEME.muted, fontFamily: "inherit",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.isLineYellow ? "T Yel" : "T Yel"}
                        </button>
                        <button
                          onClick={() => toggleLineGreen(i, false)}
                          title="Toggle green text line"
                          style={{
                            padding: "5px 10px", border: `1.5px solid ${s.isLineGreen ? "#4ade80" : THEME.border}`,
                            borderRadius: "6px", cursor: "pointer", fontSize: "11px",
                            fontWeight: "600", background: s.isLineGreen ? "#f0fdf4" : "white",
                            color: s.isLineGreen ? "#16a34a" : THEME.muted, fontFamily: "inherit",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.isLineGreen ? "T Grn" : "T Grn"}
                        </button>
                        <button onClick={() => removeSection(i, false)} style={{
                          padding: "5px 9px", border: `1px solid #fecaca`,
                          borderRadius: "6px", cursor: "pointer", background: THEME.dangerBg,
                          color: THEME.danger, fontSize: "13px",
                        }}>✕</button>
                      </div>
                      {(!s.isHeading && !s.isLine) && (
                        <div style={{ marginTop: "8px" }}>
                          <RichTextEditor
                            value={s.content}
                            onChange={html => updateSectionContent(i, html, false)}
                            minHeight="60px"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={save}>
                  {editTarget ? "Save Changes" : "Create Template"}
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Manage Categories Modal ────────────────────────────── */}
      {showCatModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 999, display: "flex", alignItems: "flex-start",
          justifyContent: "center", overflowY: "auto", padding: "24px",
        }}>
          <div style={{
            background: THEME.white, borderRadius: "16px",
            width: "100%", maxWidth: "800px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
            fontFamily: "Inter, sans-serif",
            marginTop: "auto", marginBottom: "auto",
            display: "flex",
            maxHeight: "85vh",
          }}>
            {/* Left side: List of Categories */}
            <div style={{ width: "240px", borderRight: `1px solid ${THEME.border}`, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "20px", borderBottom: `1px solid ${THEME.border}`, background: "#fafafa", borderRadius: "16px 0 0 0" }}>
                <h3 style={{ margin: 0, fontSize: "15px", color: THEME.navy }}>Procedure Categories</h3>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                {categories.map(c => (
                  <div key={c.id} style={{
                    padding: "10px 12px", borderRadius: "8px", marginBottom: "6px",
                    cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: editCatTarget?.id === c.id ? "#f1f5f9" : "transparent"
                  }} onClick={() => openEditCategory(c)}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: THEME.text }}>{c.name}</span>
                    {editCatTarget?.id === c.id && <span style={{ color: THEME.teal, fontSize: "16px" }}>→</span>}
                  </div>
                ))}
                <button onClick={() => {
                  setEditCatTarget(null);
                  setCName(""); setCColorBg("#f1f5f9"); setCColorFg("#475569"); setCSections([{ title: "Impression", content: "", highlight: true }]);
                }} style={{
                  width: "100%", padding: "10px", marginTop: "10px", border: `1px dashed ${THEME.border}`,
                  borderRadius: "8px", background: "transparent", color: THEME.teal, fontWeight: "600", cursor: "pointer", fontSize: "13px"
                }}>+ Add New Category</button>
              </div>
            </div>

            {/* Right side: Editor */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{
                padding: "20px 24px", borderBottom: `1px solid ${THEME.border}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: THEME.navy, display: "flex", alignItems: "center", gap: "8px" }}>
                  {editCatTarget ? <><FiEdit2 /> Edit Category</> : <><FiPlus /> New Category</>}
                </h2>
                <button onClick={() => setShowCatModal(false)} style={{
                  background: "transparent", border: "none", color: THEME.muted, cursor: "pointer", fontSize: "22px"
                }}><FiX size={20} /></button>
              </div>

              <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px", flex: 1 }}>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: THEME.muted, marginBottom: "6px" }}>Category Name (e.g. COLONOSCOPY)</label>
                    <input value={cName} onChange={e => setCName(e.target.value.toUpperCase())} placeholder="Category Name" style={inp} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: THEME.muted, marginBottom: "6px" }}>Bg Color</label>
                    <input type="color" value={cColorBg} onChange={e => setCColorBg(e.target.value)} style={{ ...inp, padding: "2px", height: "35px", cursor: "pointer" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: THEME.muted, marginBottom: "6px" }}>Text Color</label>
                    <input type="color" value={cColorFg} onChange={e => setCColorFg(e.target.value)} style={{ ...inp, padding: "2px", height: "35px", cursor: "pointer" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: THEME.muted }}>DEFAULT SECTIONS</label>
                    <button onClick={() => addSection(true)} style={{
                      fontSize: "12px", color: THEME.teal, background: THEME.tealBg,
                      border: "none", borderRadius: "6px", cursor: "pointer", padding: "4px 12px", fontWeight: "600"
                    }}>+ Add Section</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {cSections.map((s, i) => (
                      <div key={i} style={{
                        border: `1.5px solid ${THEME.border}`, borderRadius: "10px", padding: "12px", background: "#fafafa",
                      }}>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <button onClick={() => moveSection(i, -1, true)} disabled={i === 0}
                              style={{ padding: "1px 5px", fontSize: "10px", cursor: "pointer", border: `1px solid ${THEME.border}`, borderRadius: "3px", background: "white", color: THEME.muted, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                            <button onClick={() => moveSection(i, 1, true)} disabled={i === cSections.length - 1}
                              style={{ padding: "1px 5px", fontSize: "10px", cursor: "pointer", border: `1px solid ${THEME.border}`, borderRadius: "3px", background: "white", color: THEME.muted, opacity: i === cSections.length - 1 ? 0.3 : 1 }}>▼</button>
                          </div>
                          <input value={s.title} onChange={e => updateSectionTitle(i, e.target.value, true)} placeholder="Field name" style={{ ...inp, flex: 1, fontWeight: "600" }} />
                          <button onClick={() => toggleHighlight(i, true)} title="Toggle important / Impression"
                            style={{
                              padding: "5px 10px", border: `1.5px solid ${s.highlight ? "#fca5a5" : THEME.border}`,
                              borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "600",
                              background: s.highlight ? "#fee2e2" : "white", color: s.highlight ? THEME.danger : THEME.muted,
                            }}>
                            {s.highlight ? "★ Key" : "☆ Key"}
                          </button>
                          <button
                            onClick={() => toggleHeading(i, true)}
                            title="Toggle heading / box"
                            style={{
                              padding: "5px 10px", border: `1.5px solid ${s.isHeading ? "#f53a3a" : THEME.border}`,
                              borderRadius: "6px", cursor: "pointer", fontSize: "11px",
                              fontWeight: "600", background: s.isHeading ? "#fee2e2" : "white",
                              color: s.isHeading ? "#f53a3a" : THEME.muted, fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.isHeading ? "H Box" : "H Normal"}
                          </button>
                          <button
                            onClick={() => toggleLine(i, true)}
                            title="Toggle red text line"
                            style={{
                              padding: "5px 10px", border: `1.5px solid ${s.isLine ? "#f53a3a" : THEME.border}`,
                              borderRadius: "6px", cursor: "pointer", fontSize: "11px",
                              fontWeight: "600", background: s.isLine ? "#fee2e2" : "white",
                              color: s.isLine ? "#f53a3a" : THEME.muted, fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.isLine ? "T Red" : "T Normal"}
                          </button>
                          <button onClick={() => removeSection(i, true)} style={{
                            padding: "5px 9px", border: `1px solid #fecaca`, borderRadius: "6px", cursor: "pointer", background: THEME.dangerBg, color: THEME.danger, fontSize: "13px",
                          }}>✕</button>
                        </div>
                        {(!s.isHeading && !s.isLine) && (
                          <div style={{ marginTop: "8px" }}>
                            <RichTextEditor 
                              value={s.content} 
                              onChange={html => updateSectionContent(i, html, true)} 
                              minHeight="60px" 
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              
              <div style={{ padding: "16px 24px", borderTop: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", background: "#fafafa", borderRadius: "0 0 16px 0" }}>
                {editCatTarget ? (
                  <Button variant="danger" onClick={() => setDelCatConfirm(editCatTarget.id)}>Delete</Button>
                ) : <div />}
                <div style={{ display: "flex", gap: "10px" }}>
                  <Button variant="ghost" onClick={() => setShowCatModal(false)}>Cancel</Button>
                  <Button variant="primary" onClick={saveCategory}>Save Category</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}