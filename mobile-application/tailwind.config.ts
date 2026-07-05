import type { Config } from "tailwindcss";
import fs from "fs";

import { palette } from "./constants/colors";

// Absolute real-path globs: relative globs through a junction silently produce
// empty CSS and strip every NativeWind style from the release build.
const root = fs.realpathSync(__dirname).replace(/\\/g, "/");

export default {
  content: [
    `${root}/app/**/*.{js,jsx,ts,tsx}`,
    `${root}/components/**/*.{js,jsx,ts,tsx}`,
    `${root}/contexts/**/*.{js,jsx,ts,tsx}`,
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Neutral tokens — static palette, `-dark` sibling for dark mode.
        bg: { DEFAULT: palette.bg, dark: palette["bg-dark"] },
        surface: { DEFAULT: palette.surface, dark: palette["surface-dark"] },
        fg: {
          DEFAULT: palette.fg,
          "2": palette["fg-2"],
          dark: palette["fg-dark"],
          "2-dark": palette["fg-2-dark"],
        },
        line: { DEFAULT: palette.line, dark: palette["line-dark"] },
        // Brand tokens — CSS variables hydrated at runtime by ThemeProvider
        // from the fetched TenantConfig (defaults come from the placeholder
        // palette). `brand-dark` = darker brand shade, NOT dark mode.
        brand: {
          DEFAULT: "var(--color-brand)",
          dark: "var(--color-brand-dark)",
          light: "var(--color-brand-light)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          deep: "var(--color-accent-deep)",
        },
        danger: "var(--color-danger)",
        tint: "var(--color-tint)",
      },
      // DESIGN_SPEC §1 letter-spacing values (px).
      letterSpacing: {
        "tight-2": "-0.2px",
        "tight-3": "-0.3px",
        "tight-5": "-0.5px",
        kicker: "1.2px",
      },
      borderRadius: {
        card: "16px",
        "card-lg": "18px",
        stub: "20px",
        banner: "22px",
        sheet: "30px",
      },
    },
  },
  plugins: [],
} satisfies Config;
