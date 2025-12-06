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
        // Background colors - Deep blacks (Render-inspired)
        'bg': {
          primary: '#0A0A0B',
          secondary: '#111113',
          tertiary: '#18181B',
          elevated: '#1F1F23',
          interactive: '#27272A',
        },
        // Dark theme colors (legacy support)
        'dark': {
          900: '#0A0A0B',
          850: '#111113',
          800: '#18181B',
          700: '#1F1F23',
          600: '#27272A',
          500: '#3F3F46',
          400: '#52525B',
        },
        // Light theme colors
        'light': {
          100: '#FAFAFA',
          200: '#F4F4F5',
          300: '#E4E4E7',
          400: '#D4D4D8',
          500: '#A1A1AA',
        },
        // Primary accent - Purple (Render-inspired)
        'accent': {
          primary: '#8B5CF6',
          'primary-hover': '#7C3AED',
          'primary-muted': 'rgba(139, 92, 246, 0.15)',
          blue: '#3B82F6',
          green: '#22C55E',
          orange: '#F59E0B',
          red: '#EF4444',
          purple: '#8B5CF6',
          cyan: '#06B6D4',
          pink: '#EC4899',
        },
        // Semantic colors
        'success': '#22C55E',
        'warning': '#F59E0B',
        'error': '#EF4444',
        'info': '#3B82F6',
        // Border colors
        border: {
          DEFAULT: '#27272A',
          muted: '#1F1F23',
          hover: '#3F3F46',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Minimal border radius - sharp corners
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'DEFAULT': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 8px rgba(0, 0, 0, 0.4)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.5)',
        'xl': '0 16px 32px rgba(0, 0, 0, 0.5)',
        'glow': '0 0 20px rgba(139, 92, 246, 0.25)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.3)',
        'card': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 8px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionDuration: {
        '0': '0ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [
    function({ addBase, addComponents, addUtilities }) {
      addBase({
        ':root': {
          '--border': '39 39 42', // #27272A in RGB
        },
      });
      addComponents({
        // Card components
        '.card': {
          '@apply bg-dark-800 border border-dark-600 rounded': {},
        },
        '.card-accent': {
          '@apply bg-dark-800 border border-dark-600 border-l-[3px] border-l-accent-primary rounded': {},
        },
        '.card-hover': {
          '@apply bg-dark-800 border border-dark-600 rounded transition-all duration-200 hover:border-dark-500 hover:bg-dark-700': {},
        },
        // Button components
        '.btn': {
          '@apply inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded transition-all duration-150': {},
        },
        '.btn-primary': {
          '@apply bg-accent-primary text-white hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-secondary': {
          '@apply bg-transparent text-white border border-dark-500 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-ghost': {
          '@apply bg-transparent text-light-500 hover:bg-dark-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-danger': {
          '@apply bg-error text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-icon': {
          '@apply p-2 rounded hover:bg-dark-700 text-light-500 hover:text-white transition-colors': {},
        },
        // Input components
        '.input-field': {
          '@apply w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded text-white placeholder-light-500 focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all': {},
        },
        // Navigation
        '.nav-link': {
          '@apply flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-light-500 rounded hover:bg-dark-700 hover:text-white transition-colors': {},
        },
        '.nav-link.active': {
          '@apply bg-accent-primary/10 text-accent-primary': {},
        },
        // Badge components
        '.badge': {
          '@apply inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-sm': {},
        },
        '.badge-accent': {
          '@apply bg-accent-primary/15 text-accent-primary': {},
        },
        '.badge-success': {
          '@apply bg-success/15 text-success': {},
        },
        '.badge-warning': {
          '@apply bg-warning/15 text-warning': {},
        },
        '.badge-error': {
          '@apply bg-error/15 text-error': {},
        },
        // Stat card
        '.stat-card': {
          '@apply bg-dark-800 border border-dark-600 border-l-[3px] border-l-accent-primary rounded p-5': {},
        },
        // Modal
        '.modal-backdrop': {
          '@apply fixed inset-0 bg-black/80 flex items-center justify-center z-50': {},
        },
        '.modal-content': {
          '@apply bg-dark-850 border border-dark-600 rounded-md w-full max-h-[90vh] overflow-y-auto m-4': {},
        },
        // Glass card - replaced with flat card for legacy support
        '.glass-card': {
          '@apply bg-dark-800 border border-dark-600 rounded': {},
        },
        // Skeleton
        '.skeleton': {
          '@apply bg-dark-700 rounded animate-pulse': {},
        },
      });
      addUtilities({
        '.transition-base': {
          'transition-property': 'color, background-color, border-color, opacity, box-shadow, transform',
          'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
          'transition-duration': '200ms',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.scrollbar-hide::-webkit-scrollbar': {
          'display': 'none',
        },
      });
    },
  ],
}
