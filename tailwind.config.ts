import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "on-background": "#1a1c1b",
        "primary-container": "#00B300",
        "on-secondary-fixed-variant": "#005500",
        "on-error": "#ffffff",
        "tertiary-fixed": "#e4e2e1",
        "on-secondary-container": "#003300",
        "inverse-on-surface": "#f1f1ef",
        "surface-dim": "#dadad8",
        error: "#ba1a1a",
        "secondary-fixed-dim": "#85C285",
        primary: "#009000",
        "tertiary-fixed-dim": "#c8c6c6",
        "inverse-primary": "#99E699",
        outline: "#6f7975",
        "on-tertiary-fixed": "#1b1c1c",
        "surface-container-low": "#f4f4f2",
        "on-secondary-fixed": "#003300",
        tertiary: "#484847",
        "on-primary": "#ffffff",
        "inverse-surface": "#2f3130",
        "surface-container-lowest": "#ffffff",
        "surface-variant": "#e2e3e1",
        "secondary-fixed": "#C2E2C2",
        surface: "#f9f9f7",
        "on-surface": "#1a1c1b",
        "outline-variant": "#bec9c4",
        "on-tertiary-fixed-variant": "#474747",
        "surface-container-highest": "#e2e3e1",
        "surface-container-high": "#e8e8e6",
        "on-primary-container": "#E6F4E6",
        "primary-fixed": "#E6F4E6",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#dcd9d9",
        "on-surface-variant": "#3f4945",
        "on-primary-fixed": "#003300",
        "surface-tint": "#009000",
        "surface-container": "#eeeeec",
        "surface-bright": "#f9f9f7",
        "tertiary-container": "#605f5f",
        "primary-fixed-dim": "#99E699",
        "on-secondary": "#ffffff",
        "on-error-container": "#93000a",
        "secondary-container": "#E6F4E6",
        secondary: "#006600",
        background: "#f9f9f7",
        "error-container": "#ffdad6",
        "on-primary-fixed-variant": "#005500",
        gold: "#C9A84C",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "12px",
        base: "8px",
        md: "24px",
        lg: "48px",
        xl: "80px",
        gutter: "24px",
        "container-max": "1200px",
        "margin-mobile": "16px",
        "margin-desktop": "32px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        "display-lg": [
          "48px",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "display-lg-mobile": [
          "36px",
          { lineHeight: "1.2", fontWeight: "700" },
        ],
        "headline-xl": [
          "32px",
          { lineHeight: "1.25", fontWeight: "600" },
        ],
        "headline-xl-mobile": [
          "28px",
          { lineHeight: "1.3", fontWeight: "600" },
        ],
        "headline-md": [
          "24px",
          { lineHeight: "1.3", fontWeight: "600" },
        ],
        "body-lg": [
          "18px",
          { lineHeight: "1.6", fontWeight: "400" },
        ],
        "body-md": [
          "16px",
          { lineHeight: "1.6", fontWeight: "400" },
        ],
        "label-md": [
          "14px",
          {
            lineHeight: "1.4",
            letterSpacing: "0.01em",
            fontWeight: "500",
          },
        ],
        "label-sm": [
          "12px",
          { lineHeight: "1.4", fontWeight: "600" },
        ],
      },
      maxWidth: {
        "container-max": "1200px",
      },
      boxShadow: {
        soft: "0px 4px 20px rgba(0,0,0,0.04)",
        ambient: "0px 8px 30px rgba(0, 144, 0, 0.08)",
        "red-ambient": "0px 8px 30px rgba(0, 144, 0, 0.08)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};
export default config;
