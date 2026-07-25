import React, { useState } from "react";
import { IoIosArrowDown } from "react-icons/io";

interface PatientFormProps {
  initialData?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function PatientForm({ initialData, onClose, onSave }: PatientFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [age, setAge] = useState<number | string>(initialData?.age || "");
  const [gender, setGender] = useState(initialData?.gender || "M");
  const [city, setCity] = useState(initialData?.city || "");
  const [procedureType, setProcedureType] = useState(initialData?.procedure_type || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Name is required");
    if (!age) return alert("Age is required");
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      return alert("Phone number must be exactly 10 digits");
    }
    
    setSaving(true);
    try {
      const data = { name, phone, age: Number(age) || null, gender, city, procedure_type: procedureType };
      if (initialData?.id) {
        await (window as any).api.updatePatient(initialData.id, data);
      } else {
        await (window as any).api.createPatient(data);
      }
      onSave();
    } catch (err) {
      console.error(err);
      alert("Failed to save patient");
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "1px solid #ccc", fontSize: "14px", fontFamily: "inherit",
    boxSizing: "border-box" as any
  };
  const lbl = {
    display: "block", marginBottom: "6px", fontSize: "13px",
    fontWeight: 600, color: "#1a3a52", textTransform: "uppercase" as any, letterSpacing: "0.5px"
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "white", width: "400px", borderRadius: "12px",
        overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
      }}>
        <div style={{
          padding: "16px 20px", background: "#f4f7f6", borderBottom: "1px solid #ddd",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <h3 style={{ margin: 0, color: "#1a3a52" }}>
            {initialData ? "Edit Patient" : "New Patient"}
          </h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666"
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={inp} placeholder="e.g. Ramesh Patil" />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} style={inp} placeholder="e.g. 9876543210" />
          </div>

          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Age *</label>
              <input type="number" required value={age} onChange={e => setAge(e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Gender</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <select value={gender} onChange={e => setGender(e.target.value)} style={{...inp, paddingRight: "32px", cursor: "pointer", WebkitAppearance: "none", MozAppearance: "none", appearance: "none"}}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
                <div style={{ position: "absolute", right: "12px", pointerEvents: "none", color: "#64748b", display: "flex" }}>
                  <IoIosArrowDown size={16} />
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} style={inp} placeholder="e.g. Jalgaon" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Procedure Type</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <select value={procedureType} onChange={e => setProcedureType(e.target.value)} style={{...inp, paddingRight: "32px", cursor: "pointer", WebkitAppearance: "none", MozAppearance: "none", appearance: "none"}}>
                  <option value="">Select Procedure</option>
                  <option value="UGI">UGI</option>
                  <option value="VLS">VLS</option>
                  <option value="SIGMOIDOSCOPY">SIGMOIDOSCOPY</option>
                  <option value="COLONOSCOPY">COLONOSCOPY</option>
                  <option value="ERCP">ERCP</option>
                  <option value="ENTEROSCOPY">ENTEROSCOPY</option>
                </select>
                <div style={{ position: "absolute", right: "12px", pointerEvents: "none", color: "#64748b", display: "flex" }}>
                  <IoIosArrowDown size={16} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{
              padding: "10px 16px", borderRadius: "8px", border: "1px solid #ccc",
              background: "white", cursor: "pointer", fontWeight: 600
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              padding: "10px 24px", borderRadius: "8px", border: "none",
              background: "#0d9488", color: "white", cursor: saving ? "wait" : "pointer", fontWeight: 600
            }}>
              {saving ? "Saving..." : "Save Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
