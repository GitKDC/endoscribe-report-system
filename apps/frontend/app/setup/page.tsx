"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiHardDrive, FiCheckCircle, FiChevronRight, FiShield, FiFolder } from "react-icons/fi";

const THEME = {
  navy: "#1a3a52",
  navyDark: "#0f2a3f",
  teal: "#0d9488",
  bg: "#f0f4f8",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  white: "#ffffff",
};

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({
    hospitalName: "",
    storagePaths: {}
  });

  useEffect(() => {
    if ((window as any).api) {
      (window as any).api.getAppConfig().then((c: any) => {
        if (!c.isFirstLaunch) {
          router.replace("/");
        } else {
          setConfig(c);
        }
      });
    }
  }, []);

  const handleSelectFolder = async (key: string) => {
    if (!(window as any).api) return;
    const newPath = await (window as any).api.selectFolder();
    if (newPath) {
      setConfig({
        ...config,
        storagePaths: { ...config.storagePaths, [key]: newPath }
      });
    }
  };

  const finishSetup = async () => {
    setSaving(true);
    if ((window as any).api) {
      await (window as any).api.setAppConfig({
        ...config,
        isFirstLaunch: false
      });
      router.replace("/");
    }
  };

  if (!config.storagePaths.base) return null;

  return (
    <div style={{ height: "100vh", width: "100vw", background: THEME.navyDark, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter" }}>
      <div style={{ background: THEME.white, width: "700px", borderRadius: "16px", padding: "40px", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.5s" }}>
            <div style={{ marginBottom: "24px", display: "flex" }}>
              <img src="/es-logo.svg" alt="EndoScribe Logo" style={{ width: "80px", height: "auto", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            </div>
            <h1 style={{ margin: "0 0 12px 0", color: THEME.navyDark, fontSize: "28px", fontWeight: "800" }}>Welcome to EndoScribe</h1>
            <p style={{ color: THEME.muted, fontSize: "15px", lineHeight: "1.6", marginBottom: "32px" }}>
              Let's set up your secure, offline-first medical data environment. EndoScribe is designed to protect your patient records, images, and analytics.
            </p>
            <button 
              onClick={() => setStep(2)}
              style={{ width: "100%", padding: "14px", background: THEME.navy, color: "#fff", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              Configure Data Storage <FiChevronRight />
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: "fadeIn 0.5s" }}>
            <h2 style={{ margin: "0 0 8px 0", color: THEME.navyDark, fontSize: "24px", fontWeight: "700" }}>Storage Configuration</h2>
            <p style={{ color: THEME.muted, fontSize: "14px", marginBottom: "24px" }}>
              Choose where to securely store your clinical database, patient images, and exports. You can change this anytime later.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px", alignItems: "center" }}>
              {['database', 'images', 'reports', 'backups', 'exports'].map(key => (
                <div key={key} style={{ width: "100%", maxWidth: "500px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: THEME.navy, textTransform: "capitalize", marginBottom: "6px", textAlign: "left" }}>{key} Directory</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ flex: 1, padding: "10px 14px", background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: "8px", fontSize: "13px", color: THEME.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {config.storagePaths[key] || "Not Set"}
                    </div>
                    <button onClick={() => handleSelectFolder(key)} style={{ padding: "0 16px", background: THEME.white, border: `1px solid ${THEME.border}`, borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", fontSize: "13px", color: THEME.navy }}>
                      <FiFolder /> Browse
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "16px" }}>
              <button 
                onClick={() => setStep(1)}
                style={{ flex: 1, padding: "14px", background: THEME.white, color: THEME.navy, border: `1px solid ${THEME.border}`, borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
              >
                Back
              </button>
              <button 
                onClick={finishSetup}
                disabled={saving}
                style={{ flex: 2, padding: "14px", background: THEME.teal, color: "#fff", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <FiCheckCircle /> Initialize EndoScribe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
