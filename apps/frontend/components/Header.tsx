"use client";
import React, { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";

export default function Header() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time ? time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : "";
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  const dateStr = time ? time.toLocaleDateString("en-US", dateOptions) : "";

  return (
    <div style={{
      padding: "8px 24px",
      background: "#1a3a52", // THEME.navy
      color: "#ffffff",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontFamily: "'Inter', sans-serif",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      zIndex: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: "600", letterSpacing: "0.5px" }}>
          <img src="/es-logo.svg" alt="Logo" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
          ENDOSCRIBE
        </span>
        {time && (
          <span style={{ 
            fontSize: "12px", 
            fontWeight: "600", 
            color: "#ccfbf1", // THEME.tealLight
            background: "rgba(13,148,136,0.2)",
            padding: "4px 10px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            <FiClock /> {timeStr} | {dateStr}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: "15px", fontWeight: "600", lineHeight: "1.3" }}>
            Dr. Hrushikesh Chaudhari
          </span>
          <span style={{ fontSize: "10px", fontWeight: "500", color: "#cbd5e1", marginTop: "1px" }}>
            DNB(Med.), DNB(Gastro), MNAMS(New Delhi)
          </span>
          <span style={{ fontSize: "9px", fontWeight: "500", color: "#cbd5e1", fontStyle: "italic" }}>
            Former Consultant at AIG, Hyderabad
          </span>
          <span style={{ fontSize: "11px", fontWeight: "500", color: "#cbd5e1", marginTop: "1px" }}>
            Consultant Gastroenterologist, Therapeutic Endoscopist & Liver Specialist
          </span>
        </div>
      </div>
    </div>
  );
}