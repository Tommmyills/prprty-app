/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    // NOTE to AI: You can extend the theme with custom colors or styles here.
    extend: {
      colors: {
        // Midnight Glass color palette
        obsidian: {
          start: "#050510",
          end: "#0F0F1A",
        },
        // Premium glass effects
        glass: {
          bg: "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.1)",
          borderLight: "rgba(255, 255, 255, 0.2)",
          highlight: "rgba(255, 255, 255, 0.05)",
        },
        // Floating orb colors
        orb: {
          magenta: "#FF006E",
          gold: "#FFB800",
        },
        // Glint gradient colors
        glint: {
          purple: "#6B21A8",
          orange: "#FF6B35",
        },
        // Status colors
        neon: {
          blue: "#00D4FF",
          purple: "#A855F7",
          cyan: "#22D3EE",
          pink: "#EC4899",
          green: "#10B981",
          red: "#EF4444",
          orange: "#F97316",
          gold: "#D4AF37",
        },
      },
      fontSize: {
        xs: "10px",
        sm: "12px",
        base: "14px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "56px",
        "7xl": "64px",
        "8xl": "72px",
        "9xl": "80px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");

      // space-{n}  ->  gap: {n}
      matchUtilities(
        { space: (value) => ({ gap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-x-{n}  ->  column-gap: {n}
      matchUtilities(
        { "space-x": (value) => ({ columnGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-y-{n}  ->  row-gap: {n}
      matchUtilities(
        { "space-y": (value) => ({ rowGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
    }),
  ],
};
