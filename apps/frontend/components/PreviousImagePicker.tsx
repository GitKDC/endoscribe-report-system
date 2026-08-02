import React, { useState, useEffect } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { Button } from "./ui/Button";

interface PreviousImagePickerProps {
  onClose: () => void;
  onImport: (images: any[]) => void;
}

export const PreviousImagePicker: React.FC<PreviousImagePickerProps> = ({ onClose, onImport }) => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [procedureFilter, setProcedureFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchImages = async () => {
    if (!(window as any).api) return;
    setLoading(true);
    try {
      const res = await (window as any).api.getPreviousImages({
        search,
        procedureFilter,
        page,
        limit: 24
      });
      setImages(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, [search, procedureFilter, page]);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleImport = () => {
    const selectedImages = images.filter(img => selectedIds.has(img.id));
    onImport(selectedImages);
  };

  const buildEndoUrl = (path: string) => {
    if (!path) return "";
    return `endo:///${path.replace(/\\/g, "/")}`;
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 10000, 
      display: "flex", justifyContent: "center", alignItems: "center"
    }}>
      <div style={{
        background: "white", borderRadius: "12px", width: "90%", maxWidth: "1000px",
        height: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#1a3a52" }}>Select from Old Reports</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "24px", color: "#666" }}><FiX /></button>
        </div>

        {/* Filters */}
        <div style={{ padding: "20px 24px", display: "flex", gap: "16px", background: "#f8fafc", borderBottom: "1px solid #eee" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <FiSearch style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
            <input 
              placeholder="Search by disease, keywords, or patient name..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: "100%", padding: "10px 14px 10px 40px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <select 
            value={procedureFilter} 
            onChange={(e) => { setProcedureFilter(e.target.value); setPage(1); }}
            style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none", cursor: "pointer", backgroundColor: "white" }}
          >
            <option value="All">All Procedures</option>
            <option value="UGI">Upper GI Endo</option>
            <option value="COLONOSCOPY">Colonoscopy</option>
            <option value="SIGMOIDOSCOPY">Sigmoidoscopy</option>
            <option value="ERCP">ERCP</option>
            <option value="ENTEROSCOPY">Enteroscopy</option>
            <option value="VLS">VLS Scopy</option>
          </select>
        </div>

        {/* Image Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ margin: "auto", color: "#666" }}>Loading images...</div>
          ) : images.length === 0 ? (
            <div style={{ margin: "auto", color: "#666" }}>No images found matching your search.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
              {images.map((img) => (
                <div 
                  key={img.id} 
                  onClick={() => toggleSelect(img.id)}
                  style={{
                    border: selectedIds.has(img.id) ? "3px solid #007bff" : "1px solid #ddd",
                    borderRadius: "8px", overflow: "hidden", cursor: "pointer",
                    boxShadow: selectedIds.has(img.id) ? "0 0 10px rgba(0,123,255,0.3)" : "none",
                    position: "relative",
                    transition: "all 0.2s"
                  }}
                >
                  <img 
                    src={buildEndoUrl(img.file_path)} 
                    alt="Past Image" 
                    style={{ width: "100%", height: "150px", objectFit: "cover", display: "block" }}
                  />
                  <div style={{ padding: "8px", background: "white", fontSize: "12px", color: "#333" }}>
                    <div style={{ fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {img.patient_name}
                    </div>
                    <div style={{ color: "#666", fontSize: "11px", marginTop: "2px", display: "flex", justifyContent: "space-between" }}>
                      <span>{new Date(img.created_at).toLocaleDateString()}</span>
                      <span style={{ fontWeight: "bold" }}>{img.report_type}</span>
                    </div>
                  </div>
                  {selectedIds.has(img.id) && (
                    <div style={{ position: "absolute", top: "8px", right: "8px", background: "#007bff", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold" }}>
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <span style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#666" }}>Page {page} of {totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#666", fontWeight: "bold" }}>{selectedIds.size} selected</span>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={selectedIds.size === 0} onClick={handleImport}>Import Selected</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
