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
        border: "hsl(214 32% 91%)",
        input: "hsl(214 32% 91%)",
        ring: "hsl(217 91% 60%)",
        background: "hsl(210 40% 98%)",
        foreground: "hsl(222 47% 11%)",
        primary: {
          DEFAULT: "hsl(217 91% 60%)",
          foreground: "hsl(210 40% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(214 32% 91%)",
          foreground: "hsl(222 47% 11%)",
        },
        muted: {
          DEFAULT: "hsl(210 40% 96%)",
          foreground: "hsl(215 16% 47%)",
        },
        destructive: {
          DEFAULT: "hsl(0 72% 51%)",
          foreground: "hsl(210 40% 98%)",
        },
        card: {
          DEFAULT: "hsla(0 0% 100% / 0.78)",
          foreground: "hsl(222 47% 11%)",
        },
      },
      boxShadow: {
        soft: "0 24px 60px -20px rgba(15, 23, 42, 0.25)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 38%), radial-gradient(circle at 20% 20%, rgba(99,102,241,0.18), transparent 30%)",
      },
    },
  },
  plugins: [],
};

export default config;
