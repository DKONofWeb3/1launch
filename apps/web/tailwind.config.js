/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 1launch brand palette
        brand: {
          primary: '#00FF88',   // neon green — main CTA color
          dark: '#0A0A0F',      // near-black background
          card: '#111118',      // card background
          border: '#1E1E2E',    // subtle borders
          muted: '#6B7280',     // muted text
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
