"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const tabs = [
    { name: "Data & Storage", path: "/settings/storage" },
    { name: "WhatsApp API", path: "/settings/whatsapp" },
    { name: "Users", path: "/settings/users" },
  ];

  return (
    <div style={{ padding: "32px", fontFamily: "'Inter', sans-serif", backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
      <h2 style={{ color: "#1a3a52", fontSize: "28px", fontWeight: "800", margin: "0 0 24px 0" }}>Settings</h2>
      
      <div style={{ 
        display: "flex", 
        gap: "24px", 
        borderBottom: "2px solid #e2e8f0", 
        marginBottom: "24px"
      }}>
        {tabs.map(tab => {
          const isActive = pathname.startsWith(tab.path);
          return (
            <div 
              key={tab.path}
              onClick={() => router.push(tab.path)}
              style={{
                padding: "12px 4px",
                cursor: "pointer",
                fontWeight: isActive ? "700" : "500",
                color: isActive ? "#0d9488" : "#64748b",
                borderBottom: isActive ? "3px solid #0d9488" : "3px solid transparent",
                marginBottom: "-2px",
                transition: "all 0.2s"
              }}
            >
              {tab.name}
            </div>
          );
        })}
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}
