// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: 'hsl(var(--primary-h), var(--primary-s), var(--primary-l))',
          'light': 'hsl(var(--primary-h), var(--primary-s), 96%)',
          'dark': 'hsl(var(--primary-h), var(--primary-s), 45%)',
          'foreground': 'hsl(0, 0%, 100%)',
        },
        'muted': {
          DEFAULT: 'hsl(210, 9%, 80%)',
          foreground: 'hsl(210, 10%, 60%)',
        },
        'canvas': {
          DEFAULT: 'hsl(var(--canvas))',
          alt: 'hsl(var(--canvas-alt))',
          inset: 'hsl(220, 30%, 96%)',
        },
        'border-color': {
          DEFAULT: 'hsl(210, 25%, 93%)',
          medium: 'hsl(210, 20%, 88%)',
          'glass-subtle': 'hsla(0, 0%, 0%, 0.08)',
          'glass-medium': 'hsla(0, 0%, 0%, 0.12)',
          'glass-light': 'hsla(0, 0%, 100%, 0.1)',
        },
        'glass': {
          'DEFAULT': 'hsla(0, 0%, 100%, 0.60)',
          '100': 'hsla(0, 0%, 100%, 0.80)',
          '200': 'hsla(0, 0%, 100%, 0.70)',
          '300': 'hsla(0, 0%, 100%, 0.50)',
          'alt': 'hsla(220, 40%, 98%, 0.60)',
          'alt-100': 'hsla(220, 40%, 98%, 0.80)',
          'alt-200': 'hsla(220, 40%, 98%, 0.70)',
          'alt-300': 'hsla(220, 40%, 98%, 0.50)',
          'inset': 'hsla(220, 30%, 96%, 0.70)',
          'inset-100': 'hsla(220, 30%, 96%, 0.80)',
          'inset-200': 'hsla(220, 30%, 96%, 0.60)',
        }
      },
      borderRadius: {
        'sm': '4px', 'md': '6px', 'lg': '8px', 'xl': '12px', 'full': '9999px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 hsla(0, 0%, 0%, 0.05)',
        'medium': '0 4px 8px -2px hsla(0, 0%, 0%, 0.07), 0 2px 4px -2px hsla(0, 0%, 0%, 0.05)',
        'strong': '0 10px 20px -5px hsla(0, 0%, 0%, 0.1), 0 4px 8px -4px hsla(0, 0%, 0%, 0.08)',
        'inner': 'inset 0 1px 2px 0 hsla(0, 0%, 0%, 0.05)',
        'inner-strong': 'inset 0 2px 4px 0 hsla(0, 0%, 0%, 0.06)',
        'glass': '0 4px 12px -2px hsla(var(--primary-h), var(--primary-s), 50%, 0.1), 0 2px 4px -2px hsla(var(--primary-h), var(--primary-s), 50%, 0.06)',
        'glass-lg': '0 8px 24px -6px hsla(var(--primary-h), var(--primary-s), 50%, 0.12), 0 4px 8px -4px hsla(var(--primary-h), var(--primary-s), 50%, 0.08)',
        'xl': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'emphasized': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'sharp': 'cubic-bezier(0.4, 0, 0.6, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      backdropBlur: {
        'none': '0', 'xs': '2px', 'sm': '4px', 'DEFAULT': '8px', 'md': '12px',
        'lg': '16px', 'xl': '24px', '2xl': '32px', '3xl': '48px',
      },
      keyframes: {
        'spin': { 'to': { transform: 'rotate(360deg)' }, },
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} satisfies Config;