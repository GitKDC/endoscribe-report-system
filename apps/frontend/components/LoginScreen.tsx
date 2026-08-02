"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";
import { FiEye, FiEyeOff } from "react-icons/fi";

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

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Recovery Mode State
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Enter Key, 2: Enter New Password

  useEffect(() => {
    async function checkUsers() {
      if (!(window as any).api) {
        setLoading(false);
        return;
      }
      try {
        const res = await (window as any).api.getUsersCount();
        if (res.success && res.data === 0) {
          setIsFirstTime(true);
        }
      } catch (err) {
        console.error("Failed to check users count", err);
      }
      setLoading(false);
    }
    checkUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in both fields");
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg("");
    try {
      if (isFirstTime) {
        const res = await (window as any).api.createUser(username.trim(), password, "user");
        if (res.success) {
          login(res.data);
          router.push("/");
        } else {
          setError(res.message || "Failed to create admin user");
        }
      } else {
        const res = await (window as any).api.login(username.trim(), password);
        if (res.success) {
          login(res.data);
          router.push("/");
        } else {
          setError(res.message || "Invalid username or password");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
    setIsSubmitting(false);
  };

  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Please go back and enter the username you want to recover first");
      return;
    }
    if (!recoveryKey.trim()) {
      setError("Please enter your recovery key");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await (window as any).api.verifyRecoveryKey(recoveryKey.trim());
      if (res.success && res.data === true) {
        setRecoveryStep(2); // Move to password reset step
      } else {
        setError("Invalid recovery key");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
    setIsSubmitting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Please enter the username you want to recover on the login screen first");
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      setError("Passwords do not match or are empty");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await (window as any).api.resetUserPassword(username.trim(), newPassword);
      if (res.success) {
        setIsRecovering(false);
        setRecoveryStep(1);
        setRecoveryKey("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMsg("Password reset successfully! Please log in.");
      } else {
        setError(res.message || "Failed to reset password");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: THEME.bg }}>
        <p style={{ color: THEME.navy, fontWeight: "600" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      background: THEME.bg, alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: "white", padding: "40px", borderRadius: "16px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.08)", width: "100%", maxWidth: "420px"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ margin: "0 auto 16px", display: "flex", justifyContent: "center" }}>
            <img src="/es-logo.svg" alt="EndoScribe Logo" style={{ width: "80px", height: "auto", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
          </div>
          <h1 style={{ color: THEME.navy, margin: "0 0 8px", fontSize: "24px", fontWeight: "800" }}>
            {isRecovering ? "Account Recovery" : isFirstTime ? "Welcome to EndoScribe" : "Welcome Back"}
          </h1>
          <p style={{ color: THEME.muted, margin: 0, fontSize: "14px", fontWeight: "500" }}>
            {isRecovering ? (recoveryStep === 1 ? "Enter your Master Recovery Key" : "Create a new password") : isFirstTime ? "Create your master account to get started" : "Please log in to your account"}
          </p>
        </div>

        {isRecovering ? (
          recoveryStep === 1 ? (
            <form onSubmit={handleVerifyKey} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {error && (
                <div style={{
                  background: "#fef2f2", color: THEME.danger, padding: "12px",
                  borderRadius: "8px", fontSize: "13px", fontWeight: "600",
                  border: "1px solid #fecaca", textAlign: "center"
                }}>
                  {error}
                </div>
              )}
              <div>
                <label style={{ display: "block", color: THEME.text, fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Recovery Key
                </label>
                <input
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="e.g. ENDO-1234-ABCD"
                  style={{
                    width: "100%", padding: "12px 16px", border: `1.5px solid ${THEME.border}`,
                    borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = THEME.teal}
                  onBlur={(e) => e.target.style.borderColor = THEME.border}
                  autoFocus
                />
              </div>
              <Button variant="primary" style={{ padding: "14px", fontSize: "15px", marginTop: "8px", justifyContent: "center" }} disabled={isSubmitting} type="submit">
                {isSubmitting ? "Verifying..." : "Verify Key"}
              </Button>
              <div style={{ textAlign: "center", marginTop: "8px" }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsRecovering(false); setError(""); }} style={{ color: THEME.teal, fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
                  Back to Login
                </a>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {error && (
                <div style={{
                  background: "#fef2f2", color: THEME.danger, padding: "12px",
                  borderRadius: "8px", fontSize: "13px", fontWeight: "600",
                  border: "1px solid #fecaca", textAlign: "center"
                }}>
                  {error}
                </div>
              )}
              <div>
                <label style={{ display: "block", color: THEME.text, fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{
                      width: "100%", padding: "12px 16px", border: `1.5px solid ${THEME.border}`,
                      borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
                      paddingRight: "40px"
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: THEME.muted,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                  >
                    {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: "block", color: THEME.text, fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={{
                      width: "100%", padding: "12px 16px", border: `1.5px solid ${THEME.border}`,
                      borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
                      paddingRight: "40px"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: THEME.muted,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                  >
                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <Button variant="primary" style={{ padding: "14px", fontSize: "15px", marginTop: "8px", justifyContent: "center" }} disabled={isSubmitting} type="submit">
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {error && (
              <div style={{
                background: "#fef2f2", color: THEME.danger, padding: "12px",
                borderRadius: "8px", fontSize: "13px", fontWeight: "600",
                border: "1px solid #fecaca", textAlign: "center"
              }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div style={{
                background: THEME.tealBg, color: THEME.teal, padding: "12px",
                borderRadius: "8px", fontSize: "13px", fontWeight: "600",
                border: `1px solid ${THEME.teal}`, textAlign: "center"
              }}>
                {successMsg}
              </div>
            )}

            <div>
            <label style={{ display: "block", color: THEME.text, fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: "100%", padding: "12px 16px", border: `1.5px solid ${THEME.border}`,
                borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = THEME.teal}
              onBlur={(e) => e.target.style.borderColor = THEME.border}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", color: THEME.text, fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: "100%", padding: "12px 16px", border: `1.5px solid ${THEME.border}`,
                  borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                  paddingRight: "40px"
                }}
                onFocus={(e) => e.target.style.borderColor = THEME.teal}
                onBlur={(e) => e.target.style.borderColor = THEME.border}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: THEME.muted,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {!isFirstTime && (
              <div style={{ textAlign: "right", marginTop: "4px" }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsRecovering(true); setError(""); setSuccessMsg(""); }} style={{ color: THEME.teal, fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>
                  Forgot Password?
                </a>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            style={{ padding: "14px", fontSize: "15px", marginTop: "8px", justifyContent: "center" }}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Please wait..." : isFirstTime ? "Create Account" : "Sign In"}
          </Button>
        </form>
        )}
      </div>
    </div>
  );
}
