"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [licensed, setLicensed] = useState(false);
  const [hwid, setHwid] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      if ((window as any).api && (window as any).api.verifyLicense) {
        const result = await (window as any).api.verifyLicense();
        if (result.valid) {
          setLicensed(true);
        } else {
          setLicensed(false);
          setHwid(result.hwid);
        }
      } else {
        // If not in electron, just pass through (for dev browser testing)
        setLicensed(true);
      }
    } catch (e) {
      console.error("License check failed", e);
      setLicensed(false);
      setHwid("ERROR_READING_HWID");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError("Please enter a license key.");
      return;
    }
    setError("");
    setVerifying(true);
    try {
      const result = await (window as any).api.saveLicense(licenseKey.trim());
      if (result.success) {
        setLicensed(true);
      } else {
        setError(result.message || "Invalid License Key.");
      }
    } catch (e) {
      setError("Failed to verify license.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ color: "#64748b", fontFamily: "Inter" }}>Verifying License...</div>
      </div>
    );
  }

  if (licensed) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        background: "white",
        padding: "40px",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        width: "100%",
        maxWidth: "450px",
        textAlign: "center"
      }}>
        <div style={{ margin: "0 auto 20px", display: "flex", justifyContent: "center" }}>
          <img src="/es-logo.svg" alt="EndoScribe Logo" style={{ width: "80px", height: "auto", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
        </div>
        
        <h2 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "24px" }}>Software Locked</h2>
        <p style={{ margin: "0 0 30px 0", color: "#64748b", fontSize: "14px", lineHeight: "1.5" }}>
          EndoScribe is locked to your computer's hardware to prevent unauthorized use. Please provide this Machine ID to your administrator to receive an activation key.
        </p>

        <div style={{ 
          background: "#f1f5f9", 
          padding: "15px", 
          borderRadius: "8px", 
          marginBottom: "30px",
          textAlign: "left"
        }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: "#94a3b8", marginBottom: "5px" }}>Your Machine ID</div>
          <div style={{ 
            fontFamily: "monospace", 
            fontSize: "14px", 
            color: "#0f172a", 
            background: "#e2e8f0", 
            padding: "8px 12px", 
            borderRadius: "4px",
            userSelect: "all",
            wordBreak: "break-all"
          }}>
            {hwid}
          </div>
        </div>

        <div style={{ marginBottom: "20px", textAlign: "left" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>License Key</label>
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            style={{
              width: "100%",
              padding: "12px 15px",
              borderRadius: "8px",
              border: `1px solid ${error ? "#ef4444" : "#cbd5e1"}`,
              fontSize: "14px",
              fontFamily: "monospace",
              boxSizing: "border-box",
              outline: "none"
            }}
          />
          {error && <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px", fontWeight: 500 }}>{error}</div>}
        </div>

        <Button 
          variant="primary" 
          onClick={handleActivate}
          disabled={verifying}
          style={{ width: "100%", padding: "12px", fontSize: "15px", fontWeight: 600 }}
        >
          {verifying ? "Verifying..." : "Activate Software"}
        </Button>
      </div>
    </div>
  );
}
