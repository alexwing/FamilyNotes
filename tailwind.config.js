/** @type {import('tailwindcss').Config} */

// Visual integration with Passdroid (see passdroid/docs/design/PROPUESTA-DISENO.md):
// the neutral "slate" scale is remapped to Passdroid's navy surfaces, so every
// existing slate-* class picks up the shared look. FamilyNotes keeps emerald
// as its own accent, the way Passdroid keeps amber.
//   light: 50/100 = surfaces, 200 = border, 300 = border hover, 500/600 = muted/secondary text
//   dark:  950 = app bg, 900 = panels, 800 = raised surface, 700 = border, 400/300 = muted/secondary text
const navy = {
  50: '#f6f8fb',
  100: '#eef2f7',
  200: '#dde3ed',
  300: '#b5c1d6',
  400: '#8496b6',
  500: '#5a6985',
  600: '#4a5b78',
  700: '#2f4266',
  800: '#1f2f4d',
  900: '#16233b',
  950: '#0f1a2e',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: navy,
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        }
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'Inter', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        serif: ['"Palatino Linotype"', '"Book Antiqua"', 'Palatino', 'Georgia', '"Noto Serif"', 'serif'],
        mono: ['"Cascadia Mono"', 'Consolas', '"SFMono-Regular"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Passdroid --sh-1: hairline shadow + 1px inner highlight.
        hl: '0 1px 2px rgba(20, 33, 58, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
