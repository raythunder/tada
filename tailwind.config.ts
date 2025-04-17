// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': { DEFAULT: 'hsl(208, 100%, 50%)', 'light': 'hsl(208, 100%, 96%)', 'dark': 'hsl(208, 100%, 45%)' },
        'muted': { DEFAULT: 'hsl(210, 9%, 65%)', foreground: 'hsl(210, 10%, 45%)' },
        'canvas': { DEFAULT: 'hsl(0, 0%, 100%)', alt: 'hsl(220, 30%, 97.5%)', inset: 'hsl(220, 30%, 96%)' },
        'border-color': { DEFAULT: 'hsl(210, 20%, 90%)', medium: 'hsl(210, 15%, 85%)' },
        // Updated glass colors for wider use
        'glass': {
          // Opaque versions (for backgrounds that need blur but less transparency)
          '100': 'hsla(0, 0%, 100%, 0.85)',  // Base white glass (Modals, Dropdowns)
          'alt-100': 'hsla(220, 30%, 97.5%, 0.85)', // Alt bg glass (IconBar?)
          'inset-100': 'hsla(220, 30%, 96%, 0.85)', // Inset bg glass

          // Standard transparency (Headers)
          '200': 'hsla(0, 0%, 100%, 0.75)', // Standard white glass
          'alt-200': 'hsla(220, 30%, 97.5%, 0.75)', // Standard alt glass (Sidebar, TaskDetail footer?)
          'inset-200': 'hsla(220, 30%, 96%, 0.75)', // Standard inset glass

          // More transparent (subtle overlays?)
          '300': 'hsla(0, 0%, 100%, 0.6)',
          'alt-300': 'hsla(220, 30%, 97.5%, 0.6)',
        }
      },
      borderRadius: { 'sm': '4px', 'md': '6px', 'lg': '8px', 'xl': '12px', 'full': '9999px' },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 1px -1px rgba(0, 0, 0, 0.02)',
        'medium': '0 3px 5px -1px rgba(0, 0, 0, 0.04), 0 2px 3px -2px rgba(0, 0, 0, 0.03)',
        'strong': '0 6px 10px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'inner': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)', 'emphasized': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: { // Ensure enough blur levels
        'xs': '2px', 'sm': '4px', 'DEFAULT': '8px', 'md': '12px', 'lg': '16px', 'xl': '20px', '2xl': '24px', '3xl': '32px',
      },
      // Keyframes and animations are kept subtle as per original config
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out': { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.97)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'scale-out': { '0%': { opacity: '1', transform: 'scale(1)' }, '100%': { opacity: '0', transform: 'scale(0.97)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-down': { '0%': { opacity: '1', transform: 'translateY(0)' }, '100%': { opacity: '0', transform: 'translateY(8px)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'fade-out': 'fade-out 0.15s ease-in forwards',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'scale-out': 'scale-out 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-up': 'slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-down': 'slide-down 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} satisfies Config;