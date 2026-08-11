"use client";
import React, { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "../context/AuthContext";
import LoginScreen from "./LoginScreen";
import Sidebar from "./Sidebar";
import Header from "./Header";

function MainApp({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Hack to restore Chromium keyboard focus which often gets lost 
    // when Next.js unmounts the currently focused button during navigation in Electron.
    // This prevents the dreaded "frozen inputs" bug.
    if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== "undefined") {
      window.focus();
    }
  }, [pathname, searchParams]);

  if (loading) return null;

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header />
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {children}
        </div>
      </div>
    </>
  );
}

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MainApp>{children}</MainApp>
    </AuthProvider>
  );
}
