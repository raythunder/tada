// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html', // Scan HTML file
    './src/**/*.{js,ts,jsx,tsx}' // Scan source files for Tailwind classes
  ],
  theme: {
    extend: {
      // Define custom colors
      colors: {
        'primary': {
          DEFAULT: 'hsl(var(--primary-h), var(--primary-s), var(--primary-l))', // #3b82f6 (Blue 500)
          'light': 'hsl(var(--primary-h), var(--primary-s), 96%)', // Very light blue for backgrounds
          'dark': 'hsl(var(--primary-h), var(--primary-s), 45%)', // Darker blue for hover/active
          'foreground': 'hsl(0, 0%, 100%)', // White text on primary background
        },
        'muted': {
          DEFAULT: 'hsl(210, 9%, 80%)', // Light gray for borders, dividers
          foreground: 'hsl(210, 10%, 60%)', // Darker gray for text, icons
        },
        'canvas': {
          DEFAULT: 'hsl(0, 0%, 100%)', // White main background
          alt: 'hsl(220, 40%, 98%)', // Slightly off-white alternative background (like sidebars)
          inset: 'hsl(220, 30%, 96%)', // Background for inset elements like inputs
        },
        'border-color': { // Specific border colors if needed, otherwise use muted or black/white opacity
          DEFAULT: 'hsl(210, 25%, 93%)',
          medium: 'hsl(210, 20%, 88%)',
          'glass-subtle': 'hsla(0, 0%, 0%, 0.08)', // Subtle border for glass elements
          'glass-medium': 'hsla(0, 0%, 0%, 0.12)', // Medium border for glass
          'glass-light': 'hsla(0, 0%, 100%, 0.1)', // Light border for dark glass (if needed)
        },
        // Glassmorphism background colors with varying opacity
        'glass': {
          'DEFAULT': 'hsla(0, 0%, 100%, 0.60)', // Default white glass
          '100': 'hsla(0, 0%, 100%, 0.80)',
          '200': 'hsla(0, 0%, 100%, 0.70)',
          '300': 'hsla(0, 0%, 100%, 0.50)',
          'alt': 'hsla(220, 40%, 98%, 0.60)', // Off-white glass
          'alt-100': 'hsla(220, 40%, 98%, 0.80)',
          'alt-200': 'hsla(220, 40%, 98%, 0.70)',
          'alt-300': 'hsla(220, 40%, 98%, 0.50)',
          'inset': 'hsla(220, 30%, 96%, 0.70)', // Inset glass (inputs)
          'inset-100': 'hsla(220, 30%, 96%, 0.80)',
          'inset-200': 'hsla(220, 30%, 96%, 0.60)',
        }
      },
      // Define custom border radius
      borderRadius: {
        'sm': '4px',
        'md': '6px', // Default
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
      // Define custom box shadows
      boxShadow: {
        'subtle': '0 1px 2px 0 hsla(0, 0%, 0%, 0.05)',
        'medium': '0 4px 8px -2px hsla(0, 0%, 0%, 0.07), 0 2px 4px -2px hsla(0, 0%, 0%, 0.05)',
        'strong': '0 10px 20px -5px hsla(0, 0%, 0%, 0.1), 0 4px 8px -4px hsla(0, 0%, 0%, 0.08)',
        'inner': 'inset 0 1px 2px 0 hsla(0, 0%, 0%, 0.05)',
        'inner-strong': 'inset 0 2px 4px 0 hsla(0, 0%, 0%, 0.06)',
        // Shadows specifically for glass elements, incorporating primary color tint
        'glass': '0 4px 12px -2px hsla(var(--primary-h), var(--primary-s), 50%, 0.1), 0 2px 4px -2px hsla(var(--primary-h), var(--primary-s), 50%, 0.06)',
        'glass-lg': '0 8px 24px -6px hsla(var(--primary-h), var(--primary-s), 50%, 0.12), 0 4px 8px -4px hsla(var(--primary-h), var(--primary-s), 50%, 0.08)',
        // Standard Tailwind xl shadow, often used for modals/popovers
        'xl': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      // Define custom transition timing functions (easings)
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)', // Similar to ease-in-out, common in Apple UI
        'emphasized': 'cubic-bezier(0.4, 0, 0.2, 1)', // Standard Material Design emphasis curve
        'sharp': 'cubic-bezier(0.4, 0, 0.6, 1)', // Faster exit curve
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      // Define custom backdrop blur levels
      backdropBlur: {
        'none': '0',
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px', // Default blur level
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      // Define keyframe animations
      keyframes: {
        // Keep spin animation for loaders
        'spin': {
          'to': { transform: 'rotate(360deg)' },
        },
        // Removed unused fade, scale, slide keyframes as requested
      },
      // Define animation utilities
      animation: {
        'spin': 'spin 1s linear infinite', // Apply spin animation
        // Removed other animation utilities
      }
    },
  },
  // Enable Tailwind plugins
  plugins: [
    require('@tailwindcss/forms'), // Provides base styles for form elements
  ],
} satisfies Config;