import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        card: "var(--card)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--madrasa-blue)",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "var(--madrasa-red)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#eef4f8",
          foreground: "#556270",
        },
        border: "#d7e3ea",
        input: "#d7e3ea",
        ring: "var(--madrasa-blue)",
      },
      borderRadius: {
        lg: "0.9rem",
        xl: "1.2rem",
      },
      boxShadow: {
        card: "0 10px 30px rgba(78, 173, 224, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
