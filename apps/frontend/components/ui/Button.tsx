import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "icon" | "icon-danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const THEME = {
  primaryBg: "#1a3a52",
  primaryHover: "#204663",
  secondaryBg: "#e2e8f0",
  secondaryHover: "#cbd5e1",
  secondaryText: "#334155",
  dangerBg: "#ef4444",
  dangerHover: "#dc2626",
  dangerText: "#ffffff",
};

export const Button: React.FC<ButtonProps> = ({ 
  variant = "primary", 
  size = "md", 
  icon, 
  children, 
  style, 
  disabled,
  ...props 
}) => {
  let baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    transition: "all 0.2s ease",
    opacity: disabled ? 0.6 : 1,
  };

  if (size === "sm") {
    baseStyle.padding = "6px 12px";
    baseStyle.fontSize = "13px";
  } else if (size === "md") {
    baseStyle.padding = "10px 18px";
    baseStyle.fontSize = "14px";
  } else if (size === "lg") {
    baseStyle.padding = "14px 24px";
    baseStyle.fontSize = "16px";
  }

  if (variant === "icon" || variant === "icon-danger") {
    baseStyle.padding = "8px";
    baseStyle.borderRadius = "8px";
  }

  let variantStyle: React.CSSProperties = {};
  if (variant === "primary") {
    variantStyle = {
      backgroundColor: THEME.primaryBg,
      color: "white",
    };
  } else if (variant === "secondary") {
    variantStyle = {
      backgroundColor: THEME.secondaryBg,
      color: THEME.secondaryText,
    };
  } else if (variant === "danger") {
    variantStyle = {
      backgroundColor: THEME.dangerBg,
      color: THEME.dangerText,
    };
  } else if (variant === "ghost" || variant === "icon" || variant === "icon-danger") {
    variantStyle = {
      backgroundColor: "transparent",
      color: variant === "icon-danger" ? THEME.dangerBg : THEME.primaryBg,
      border: (variant === "icon" || variant === "icon-danger") ? "1px solid #e2e8f0" : "none",
    };
  }

  return (
    <button
      style={{ ...baseStyle, ...variantStyle, ...style }}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (style && (style.backgroundColor || style.background)) {
          e.currentTarget.style.opacity = "0.85";
          return;
        }
        if (variant === "primary") e.currentTarget.style.backgroundColor = THEME.primaryHover;
        if (variant === "secondary") e.currentTarget.style.backgroundColor = THEME.secondaryHover;
        if (variant === "danger") e.currentTarget.style.backgroundColor = THEME.dangerHover;
        if (variant === "icon" || variant === "ghost") e.currentTarget.style.backgroundColor = "#f1f5f9";
        if (variant === "icon-danger") e.currentTarget.style.backgroundColor = "#fee2e2";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        if (style && (style.backgroundColor || style.background)) {
          e.currentTarget.style.opacity = "1";
          return;
        }
        if (variant === "primary") e.currentTarget.style.backgroundColor = THEME.primaryBg;
        if (variant === "secondary") e.currentTarget.style.backgroundColor = THEME.secondaryBg;
        if (variant === "danger") e.currentTarget.style.backgroundColor = THEME.dangerBg;
        if (variant === "icon" || variant === "ghost" || variant === "icon-danger") e.currentTarget.style.backgroundColor = "transparent";
      }}
      {...props}
    >
      {icon && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
      {children}
    </button>
  );
};
