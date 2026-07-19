/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: 'rgba(255, 255, 255, 0.02)',
        'surface-hover': 'rgba(255, 255, 255, 0.05)',
        primary: '#10b981',
        secondary: '#8b95a5',
        muted: '#545d6e',
        border: 'rgba(255, 255, 255, 0.08)',
        'border-focus': 'rgba(16, 185, 129, 0.5)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(16, 185, 129, 0.15)',
        'glow-primary': '0 4px 24px rgba(16, 185, 129, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
