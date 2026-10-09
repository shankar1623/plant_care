/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        forest: {
          DEFAULT: '#2D6442',
          50: '#F2F7F4',
          100: '#E1EDE5',
          200: '#C2DBCB',
          300: '#94BEA2',
          400: '#629D76',
          500: '#3D7D54',
          600: '#2D6442',
          700: '#235035',
          800: '#1e351e',
          900: '#15291E',
          950: '#0B150F',
        },
        cream: {
          DEFAULT: '#f7f4ee',
          50: '#FFFFFF',
          100: '#f7f4ee',
          200: '#F2EDE4',
          300: '#E5DDCF',
          400: '#D5C7B3',
        },
        surface: {
          dark: 'rgb(var(--surface-dark-rgb, 18 26 20) / <alpha-value>)',
          card: 'rgb(var(--surface-card-rgb, 24 36 28) / <alpha-value>)',
          border: 'rgb(var(--surface-border-rgb, 36 54 42) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted-rgb, 142 158 147) / <alpha-value>)',
        },
        alert: {
          red: '#E63946',
          yellow: '#E09F3E',
          green: '#2E7D32'
        }
      }
    },
  },
  plugins: [],
}
