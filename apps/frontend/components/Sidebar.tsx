"use client";
import { useRouter, usePathname } from "next/navigation";

import { 
  FiHome, 
  FiEdit, 
  FiUsers, 
  FiHeart, 
  FiFileText, 
  FiFolder, 
  FiActivity,
  FiMessageSquare,
  FiSettings
} from "react-icons/fi";

const NAV = [
  { name: "Dashboard",   path: "/",               icon: <FiHome /> },
  { name: "New Report",  path: "/create-report",  icon: <FiEdit /> },
  { name: "Patients",    path: "/patients",       icon: <FiUsers /> },
  { name: "Referrals",   path: "/referrals",      icon: <FiHeart /> },
  { name: "Reports",     path: "/reports",         icon: <FiFileText /> },
  { name: "Templates",   path: "/templates",       icon: <FiFolder /> },
  { name: "Analytics",   path: "/analytics",       icon: <FiActivity /> },
  { name: "Settings",    path: "/settings/storage", icon: <FiSettings /> },
];

import { useAuth } from "../context/AuthContext";
import { FiLogOut } from "react-icons/fi";

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [...NAV];

  return (
    <>
      <style>{`
                .sidebar-nav-item { transition: background 0.18s, color 0.18s, padding-left 0.18s; }
        .sidebar-nav-item:hover { background: rgba(255,255,255,0.10) !important; padding-left: 20px !important; }
      `}</style>

      <div style={{
        width: "240px",
        minWidth: "240px",
        height: "100vh",
        background: "linear-gradient(180deg, #0f2a3f 0%, #1a3a52 60%, #1e4a66 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "4px 0 20px rgba(0,0,0,0.25)",
        zIndex: 100,
      }}>

        {/* ── Logo + Hospital Name ─────────────────────────────── */}
        <div style={{
          padding: "20px 18px 18px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <img
            src="/images/shlogo.png"
            alt="Shobha Hospital Logo"
            style={{ width: "46px", height: "46px", objectFit: "contain", flexShrink: 0 }}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              (img.nextElementSibling as HTMLElement).style.display = "flex";
            }}
          />
          {/* Fallback circle if logo missing */}
          <div style={{
            display: "none",
            width: "44px", height: "44px", borderRadius: "50%",
            background: "linear-gradient(135deg, #0d9488, #2a7a2a)",
            alignItems: "center", justifyContent: "center",
            fontSize: "20px", flexShrink: 0,
          }}><FiHeart size={22} color="#fff" /></div>

          <div>
            <div style={{ fontSize: "17px", fontWeight: "700", lineHeight: 1.2, color: "#d2e6f3", letterSpacing: "0.2px", whiteSpace: "nowrap" }}>
              Shobha Hospital
            </div>
            <div style={{ fontSize: "12px", color: "#7dd3fc", lineHeight: 1.3, marginTop: "2px" }}>
              & Superspeciality Gastroenterology Centre
            </div>
          </div>
        </div>

        <div style={{ marginTop: "16px" }} />

        {/* ── Navigation ──────────────────────────────────────── */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {navItems.map((item) => {
            const active = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
            return (
              <div
                key={item.path}
                className="sidebar-nav-item"
                onClick={() => router.push(item.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  marginBottom: "4px",
                  cursor: "pointer",
                  background: active
                    ? "linear-gradient(90deg, rgba(13,148,136,0.35), rgba(13,148,136,0.15))"
                    : "transparent",
                  borderLeft: active ? "3px solid #0d9488" : "3px solid transparent",
                  fontWeight: active ? "600" : "400",
                  fontSize: "14px",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.72)",
                  letterSpacing: "0.1px",
                }}
              >
                <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>
                  {item.icon}
                </span>
                {item.name}
              </div>
            );
          })}
        </nav>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div 
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, overflow: "hidden" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", fontWeight: "bold", color: "white", flexShrink: 0
            }}>
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontWeight: "600", color: "rgba(255, 255, 255, 0.95)", fontSize: "13px", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {user?.username}
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{
              background: "transparent", border: "none", color: "rgba(255,255,255,0.7)",
              cursor: "pointer", padding: "8px", borderRadius: "8px", display: "flex",
              alignItems: "center", justifyContent: "center", transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
            title="Log Out"
          >
            <FiLogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
}