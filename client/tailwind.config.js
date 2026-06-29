/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../shared/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        // High fidelity/premium color palette
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a3ff',
          500: '#4f73ff', // Primary blue
          600: '#2b4eff',
          700: '#1b3bfa',
          800: '#142ecf',
          900: '#1125a3',
          950: '#070e61',
        },
        slate: {
          950: '#0b0f19', // Premium dark card background
        }
      }
    },
  },
  plugins: [],
}
