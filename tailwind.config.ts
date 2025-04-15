import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Example: Add custom brand colors or refined grays if needed
        'primary': {
          DEFAULT: 'hsl(210, 90%, 50%)', // A nice blue
          'light': 'hsl(210, 90%, 95%)',
          'dark': 'hsl(210, 90%, 40%)',
        },
        'muted': {
          DEFAULT: 'hsl(210, 10%, 60%)',
          foreground: 'hsl(210, 10%, 40%)',
        },
        'canvas': { // Base background colors
          DEFAULT: 'hsl(0, 0%, 100%)',
          alt: 'hsl(210, 30%, 98%)',
          inset: 'hsl(210, 30%, 96%)',
        },
        'glass': { // For blurred backgrounds
          DEFAULT: 'hsla(0, 0%, 100%, 0.8)',
          darker: 'hsla(210, 30%, 98%, 0.85)',
        }
      },
      borderRadius: {
        'lg': '0.75rem', // Slightly larger default large radius
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 3px 1px rgba(0, 0, 0, 0.02)',
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'strong': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        // Inner shadow example if needed
        'inner-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      transitionTimingFunction: {
        // Custom easings for a more refined feel
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
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // Optional: Enhance form styling
  ],
} satisfies Config;