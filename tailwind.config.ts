// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Refined color palette
        'primary': {
          DEFAULT: 'hsl(208, 100%, 50%)',
          'light': 'hsl(208, 100%, 96%)',
          'dark': 'hsl(208, 100%, 45%)',
          'foreground': 'hsl(0, 0%, 100%)', // White for high contrast on primary blue
        },
        'muted': {
          DEFAULT: 'hsl(210, 9%, 80%)', // Lighter muted
          foreground: 'hsl(210, 10%, 60%)', // Darker muted text
        },
        'canvas': {
          DEFAULT: 'hsl(0, 0%, 100%)',
          alt: 'hsl(220, 40%, 98%)',
          inset: 'hsl(220, 30%, 96%)',
        },
        'border-color': {
          DEFAULT: 'hsl(210, 25%, 93%)',
          medium: 'hsl(210, 20%, 88%)',
          // Added subtle border color specifically for glass elements
          'glass-subtle': 'hsla(0, 0%, 0%, 0.08)',
          'glass-medium': 'hsla(0, 0%, 0%, 0.12)',
        },
        // --- Enhanced Glassmorphism Colors ---
        'glass': {
          // Base Canvas Colors with Alpha
          'DEFAULT': 'hsla(0, 0%, 100%, 0.6)', // Default white glass (more transparent)
          '100': 'hsla(0, 0%, 100%, 0.8)',     // More opaque white glass
          '200': 'hsla(0, 0%, 100%, 0.7)',
          '300': 'hsla(0, 0%, 100%, 0.5)',

          // Alt Canvas Colors with Alpha
          'alt': 'hsla(220, 40%, 98%, 0.6)',    // Default alt glass (more transparent)
          'alt-100': 'hsla(220, 40%, 98%, 0.8)', // More opaque alt glass
          'alt-200': 'hsla(220, 40%, 98%, 0.7)',
          'alt-300': 'hsla(220, 40%, 98%, 0.5)',

          // Inset Canvas Colors with Alpha
          'inset': 'hsla(220, 30%, 96%, 0.7)',  // Default inset glass
          'inset-100': 'hsla(220, 30%, 96%, 0.8)',
          'inset-200': 'hsla(220, 30%, 96%, 0.6)',
        }
        // --- End Enhanced Glassmorphism Colors ---
      },
      borderRadius: {
        'sm': '4px', // Slightly larger small radius
        'md': '6px',  // DEFAULT - Standardized radius
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 hsla(0, 0%, 0%, 0.05)', // Even subtler
        'medium': '0 4px 8px -2px hsla(0, 0%, 0%, 0.06), 0 2px 4px -2px hsla(0, 0%, 0%, 0.04)', // Slightly softer medium
        'strong': '0 10px 20px -5px hsla(0, 0%, 0%, 0.08), 0 4px 8px -4px hsla(0, 0%, 0%, 0.06)', // Adjusted strong shadow
        'inner': 'inset 0 1px 2px 0 hsla(0, 0%, 0%, 0.05)',
        'inner-strong': 'inset 0 2px 4px 0 hsla(0, 0%, 0%, 0.06)',
        // Shadow specific for glass elements for better depth perception
        'glass': '0 4px 12px -2px hsla(210, 40%, 50%, 0.1), 0 2px 4px -2px hsla(210, 40%, 50%, 0.06)',
        'glass-lg': '0 8px 24px -6px hsla(210, 40%, 50%, 0.12), 0 4px 8px -4px hsla(210, 40%, 50%, 0.08)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'emphasized': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'sharp': 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '5px', // Adjusted default blur levels
        'DEFAULT': '10px',
        'md': '14px',
        'lg': '18px',
        'xl': '24px', // More pronounced max blur
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out': { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.97)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'scale-out': { '0%': { opacity: '1', transform: 'scale(1)' }, '100%': { opacity: '0', transform: 'scale(0.97)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-down': { '0%': { opacity: '1', transform: 'translateY(0)' }, '100%': { opacity: '0', transform: 'translateY(8px)' } },
        'slide-in-right': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'slide-out-right': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out forwards',
        'fade-out': 'fade-out 0.15s ease-in forwards',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'scale-out': 'scale-out 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-up': 'slide-up 0.18s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-down': 'slide-down 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards', // Slightly slower slide
        'slide-out-right': 'slide-out-right 0.22s cubic-bezier(0.4, 0, 0.6, 1) forwards',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} satisfies Config;