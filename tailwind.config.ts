// tailwind.config.ts
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin'; // Import the 'plugin' function

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Palette (Apple HIG Inspired)
        canvas: 'hsl(220 40% 98%)',        // Light background
        'canvas-alt': 'hsl(220 30% 96%)', // Slightly darker bg
        'canvas-deep': 'hsl(220 30% 92%)', // Even darker

        primary: {
          DEFAULT: 'hsl(210 100% 50%)', // Vibrant Blue
          foreground: 'hsl(0 0% 100%)',   // White text on primary
          dark: 'hsl(210 100% 45%)',     // Slightly darker for hover/active
        },
        secondary: { // Typically a gray or subdued color
          DEFAULT: 'hsl(215 15% 92%)',
          foreground: 'hsl(215 10% 35%)',
        },
        muted: {
          DEFAULT: 'hsl(215 10% 55%)',
          foreground: 'hsl(215 10% 65%)', // Often used for placeholder text
        },
        accent: { // Example accent (e.g., for notifications, highlights)
          DEFAULT: 'hsl(45 100% 50%)',
          foreground: 'hsl(45 100% 5%)',
        },
        destructive: { // Red for danger/delete
          DEFAULT: 'hsl(0 75% 55%)',
          foreground: 'hsl(0 0% 100%)',
          dark: 'hsl(0 70% 50%)',
        },
        border: 'hsl(215 20% 85%)', // Default border color
        'border-alt': 'hsl(215 20% 90%)', // Lighter border

        // Glassmorphism Backgrounds (with transparency)
        'glass': 'hsla(0, 0%, 100%, 0.3)',           // Base white glass
        'glass-alt': 'hsla(220, 30%, 97%, 0.6)',      // Lighter, less transparent
        'glass-alt-100': 'hsla(220, 40%, 98%, 0.75)', // Sidebar/IconBar like
        'glass-alt-200': 'hsla(220, 30%, 96%, 0.85)', // Header/Footer like
        'glass-inset-100': 'hsla(210, 30%, 90%, 0.5)', // Input/Editor bg
        'glass-inset-200': 'hsla(210, 30%, 90%, 0.7)', // Input/Editor bg focus

        'black': 'hsl(0, 0%, 0%)',
        'white': 'hsl(0, 0%, 100%)',
      },
      fontFamily: {
        // Use system fonts for native feel
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular', // Apple's monospace
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      fontSize: {
        // Fine-tune sizes for refinement
        '2xs': '0.625rem', // 10px
        'xs': '0.75rem',   // 12px
        'sm': '0.8125rem', // 13px
        'base': '0.875rem',// 14px
        'md': '0.9375rem', // 15px
        'lg': '1rem',      // 16px
        'xl': '1.125rem',  // 18px
        '2xl': '1.25rem',  // 20px
      },
      borderRadius: {
        sm: '4px',
        md: '6px', // Default
        lg: '8px',
        xl: '12px',
        full: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 hsla(0, 0%, 0%, 0.03), 0 1px 3px 0 hsla(210, 40%, 50%, 0.05)',
        DEFAULT: '0 1px 3px 0 hsla(0, 0%, 0%, 0.06), 0 1px 2px -1px hsla(210, 40%, 50%, 0.06)',
        md: '0 4px 6px -1px hsla(0, 0%, 0%, 0.08), 0 2px 4px -2px hsla(210, 40%, 50%, 0.08)',
        lg: '0 10px 15px -3px hsla(0, 0%, 0%, 0.08), 0 4px 6px -4px hsla(210, 40%, 50%, 0.08)',
        xl: '0 20px 25px -5px hsla(0, 0%, 0%, 0.1), 0 8px 10px -6px hsla(210, 40%, 50%, 0.1)',
        '2xl': '0 25px 50px -12px hsla(0, 0%, 0%, 0.15)',
        inner: 'inset 0 1px 3px 0 hsla(0, 0%, 0%, 0.06)',
        strong: '0 8px 24px hsla(210, 60%, 50%, 0.15), 0 2px 8px hsla(0, 0%, 0%, 0.08)',
      },
      transitionTimingFunction: {
        // Apple-like ease-out curve
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      transitionDuration: {
        '30': '30ms',
        '50': '50ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-out-to-top': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-out-to-bottom': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(10px)', opacity: '0' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-apple',
        'fade-out': 'fade-out 100ms ease-apple forwards', // Use forwards to keep final state
        'slide-in-from-top': 'slide-in-from-top 150ms ease-apple',
        'slide-out-to-top': 'slide-out-to-top 100ms ease-apple forwards',
        'slide-in-from-bottom': 'slide-in-from-bottom 150ms ease-apple',
        'slide-out-to-bottom': 'slide-out-to-bottom 100ms ease-apple forwards',
        'scale-in': 'scale-in 150ms ease-apple',
        'scale-out': 'scale-out 100ms ease-apple forwards',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({ strategy: 'class' }), // Use class strategy
    require('tailwindcss-radix')(), // Add Radix plugin
    plugin(function ({ addUtilities, theme }) {
      // Add glass utilities
      addUtilities({
        '.bg-glass-100': {
          '@apply bg-white/70 dark:bg-neutral-800/70 backdrop-blur-lg border border-white/10 dark:border-white/5': {}
        },
        '.bg-glass-200': {
          '@apply bg-neutral-50/70 dark:bg-neutral-900/70 backdrop-blur-lg border border-white/10 dark:border-white/5': {}
        },
        '.bg-glass-alt-100': {
          '@apply bg-neutral-100/75 dark:bg-neutral-800/75 backdrop-blur-xl border border-black/5 dark:border-white/5': {}
        },
      })
    }),
  ],
};

export default config;