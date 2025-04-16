// tailwind.config.js
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Refined color palette
        'primary': {
          DEFAULT: 'hsl(210, 100%, 50%)', // Brighter blue
          'light': 'hsl(210, 100%, 96%)', // Lighter shade for backgrounds
          'dark': 'hsl(210, 100%, 45%)', // Slightly darker for hover
        },
        'muted': {
          DEFAULT: 'hsl(210, 10%, 65%)', // Adjusted muted text
          foreground: 'hsl(210, 10%, 45%)', // Darker muted text
        },
        'canvas': { // Base background colors
          DEFAULT: 'hsl(0, 0%, 100%)',
          alt: 'hsl(220, 30%, 98.5%)', // Slightly cooler alt background
          inset: 'hsl(220, 30%, 96%)', // Slightly cooler inset background
        },
        'glass': { // For blurred backgrounds - increased translucency
          DEFAULT: 'hsla(0, 0%, 100%, 0.7)',
          darker: 'hsla(220, 30%, 98.5%, 0.75)',
        }
      },
      borderRadius: {
        'sm': '0.25rem', // Small radius
        'md': '0.375rem', // Default medium radius (use this most often)
        'lg': '0.5rem', // Large radius (for buttons, modals)
        'xl': '0.75rem', // Extra large (maybe modals)
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)', // Softer subtle shadow
        'medium': '0 3px 5px -1px rgba(0, 0, 0, 0.05), 0 2px 3px -2px rgba(0, 0, 0, 0.04)', // Softer medium
        'strong': '0 8px 12px -3px rgba(0, 0, 0, 0.06), 0 4px 5px -4px rgba(0, 0, 0, 0.05)', // Softer strong
        'inner-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'emphasized': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'scale-in': 'scale-in 0.2s ease-out forwards',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} satisfies Config;