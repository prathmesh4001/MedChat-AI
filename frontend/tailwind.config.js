/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        growBar: { from: { width: '0%' }, to: {} },
        glow: { '0%, 100%': { boxShadow: '0 0 12px rgba(122,215,198,0.15)' }, '50%': { boxShadow: '0 0 24px rgba(122,215,198,0.3)' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
        growBar: 'growBar 1s ease-out',
        glow: 'glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
