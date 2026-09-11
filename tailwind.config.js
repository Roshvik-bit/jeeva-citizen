/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "480px"
      },
      animation: {
        'radar': 'radar-pulse 2s infinite ease-in-out',
        'beacon': 'beacon-wave 2s infinite ease-in-out',
        'ping-slow': 'ping-slow 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        'radar-pulse': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
          '70%': { transform: 'scale(1.03)', boxShadow: '0 0 0 24px rgba(239, 68, 68, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        'beacon-wave': {
          '0%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.6)' },
          '70%': { boxShadow: '0 0 0 20px rgba(245, 158, 11, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)' },
        },
      }
    },
  },
  plugins: [],
}
