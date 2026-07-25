"use client";
import React, { useState, useEffect } from "react";
import { FiTrash2, FiUserPlus, FiUser, FiEye, FiEyeOff } from "react-icons/fi";
import { Button } from "../../../components/ui/Button";

type User = {
  id: number;
  username: string;
  role: string;
  created_at: string;
};

const THEME = {
  navy: "#1a3a52",
  teal: "#0d9488",
  tealBg: "#ccfbf1",
  border: "#e2e8f0",
  bg: "#f4f7f6",
  text: "#1e293b",
  muted: "#64748b",
  danger: "#dc2626",
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await (window as any).api.getAllUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await (window as any).api.deleteUser(id);
      if (res.success) {
        fetchUsers();
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill all fields");
      return;
    }
    
    try {
      const res = await (window as any).api.createUser(username.trim(), password, "user");
      if (res.success) {
        setShowModal(false);
        setUsername("");
        setPassword("");
        setShowPassword(false);
        fetchUsers();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Failed to create user");
    }
  };

  const handleGenerateRecovery = async () => {
    if (!confirm("Are you sure? Generating a new recovery key will invalidate any old ones.")) return;
    try {
      const res = await (window as any).api.generateRecoveryKey();
      if (res.success) {
        setRecoveryKey(res.data);
        setShowRecoveryModal(true);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Failed to generate key");
    }
  };

  if (loading) {
    return <div style={{ padding: "32px" }}>Loading users...</div>;
  }

  return (
    <div style={{ maxWidth: "1000px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <Button 
            variant="secondary" 
            onClick={handleGenerateRecovery}
          >
            Setup Account Recovery
          </Button>
          <Button 
            variant="primary" 
            icon={<FiUserPlus />}
            onClick={() => setShowModal(true)}
          >
            Add New User
          </Button>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: "12px", border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: THEME.bg, borderBottom: `1px solid ${THEME.border}` }}>
              <th style={{ padding: "16px", color: THEME.navy, fontWeight: "600", fontSize: "14px" }}>User</th>
              <th style={{ padding: "16px", color: THEME.navy, fontWeight: "600", fontSize: "14px", width: "80px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                <td style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: THEME.tealBg, color: THEME.teal,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: "bold"
                  }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", color: THEME.text }}>{u.username}</div>
                  </div>
                </td>
                <td style={{ padding: "16px", textAlign: "center" }}>
                  <Button 
                    variant="danger" 
                    icon={<FiTrash2 />} 
                    style={{ padding: "8px" }}
                    onClick={() => handleDelete(u.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: "32px", textAlign: "center", color: THEME.muted }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, pointerEvents: "auto"
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: "white", padding: "32px", borderRadius: "16px",
            width: "100%", maxWidth: "400px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            pointerEvents: "auto", userSelect: "auto"
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: THEME.navy, margin: "0 0 24px", fontSize: "20px" }}>Create New User</h2>
            
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {error && <div style={{ color: THEME.danger, fontSize: "14px", fontWeight: "500" }}>{error}</div>}
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: THEME.text }}>Username</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${THEME.border}`, boxSizing: "border-box" }}
                  autoFocus
                />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: THEME.text }}>Password</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: "100%", padding: "10px", paddingRight: "40px", borderRadius: "8px", border: `1px solid ${THEME.border}`, boxSizing: "border-box" }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "10px", background: "none", border: "none", color: THEME.muted, cursor: "pointer", display: "flex" }}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <Button variant="secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowModal(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" style={{ flex: 1, justifyContent: "center" }} type="submit">
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRecoveryModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white", padding: "32px", borderRadius: "16px",
            width: "100%", maxWidth: "450px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            textAlign: "center"
          }}>
            <h2 style={{ color: THEME.navy, margin: "0 0 16px", fontSize: "20px" }}>Master Recovery Key</h2>
            <p style={{ color: THEME.muted, fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" }}>
              Please write down or copy this key. It is the <b>ONLY</b> way to recover your admin account if you forget your password. We will never show this to you again!
            </p>
            <div style={{
              background: THEME.bg, border: `1px dashed ${THEME.teal}`, padding: "20px",
              borderRadius: "8px", fontSize: "24px", fontWeight: "bold", color: THEME.navy,
              letterSpacing: "2px", marginBottom: "24px"
            }}>
              {recoveryKey}
            </div>
            <Button variant="primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowRecoveryModal(false)}>
              I have saved it securely
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
