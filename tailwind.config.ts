// tailwind.config.ts
import type {Config} from 'tailwindcss';

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class', // Or 'media' if you prefer
    theme: {
        extend: {
            // Define HSL colors using CSS variables for easy theming
            colors: {
                // Base Canvas & Text
                canvas: 'hsl(var(--canvas-h) var(--canvas-s) var(--canvas-l) / <alpha-value>)',
                'canvas-alt': 'hsl(var(--canvas-alt-h) var(--canvas-alt-s) var(--canvas-alt-l) / <alpha-value>)',
                foreground: 'hsl(var(--foreground-h) var(--foreground-s) var(--foreground-l) / <alpha-value>)',
                muted: {
                    DEFAULT: 'hsl(var(--muted-h) var(--muted-s) var(--muted-l) / <alpha-value>)',
                    foreground: 'hsl(var(--muted-foreground-h) var(--muted-foreground-s) var(--muted-foreground-l) / <alpha-value>)',
                },
                // Primary Colors
                primary: {
                    DEFAULT: 'hsl(var(--primary-h) var(--primary-s) var(--primary-l) / <alpha-value>)',
                    light: 'hsl(var(--primary-h) var(--primary-s) var(--primary-l-light) / <alpha-value>)', // Lighter variant
                    dark: 'hsl(var(--primary-h) var(--primary-s) var(--primary-l-dark) / <alpha-value>)',  // Darker variant
                    foreground: 'hsl(var(--primary-foreground-h) var(--primary-foreground-s) var(--primary-foreground-l) / <alpha-value>)',
                },
                // Glass Effects (Example - adjust HSL and alpha as needed)
                glass: {
                    DEFAULT: 'hsl(var(--glass-h) var(--glass-s) var(--glass-l) / var(--glass-a))',
                    '100': 'hsl(var(--glass-h) var(--glass-s) var(--glass-l) / var(--glass-a-100))',
                    alt: {
                        DEFAULT: 'hsl(var(--glass-alt-h) var(--glass-alt-s) var(--glass-alt-l) / var(--glass-alt-a))',
                        '100': 'hsl(var(--glass-alt-h) var(--glass-alt-s) var(--glass-alt-l) / var(--glass-alt-a-100))',
                        '200': 'hsl(var(--glass-alt-h) var(--glass-alt-s) var(--glass-alt-l) / var(--glass-alt-a-200))',
                    },
                    inset: {
                        '100': 'hsl(var(--glass-inset-h) var(--glass-inset-s) var(--glass-inset-l) / var(--glass-inset-a-100))',
                        '200': 'hsl(var(--glass-inset-h) var(--glass-inset-s) var(--glass-inset-l) / var(--glass-inset-a-200))',
                    }
                },
                // Border & Ring (Optional - often use black/white with alpha)
                border: 'hsl(var(--border-h) var(--border-s) var(--border-l) / <alpha-value>)',
                ring: 'hsl(var(--ring-h) var(--ring-s) var(--ring-l) / <alpha-value>)',
                // Other Semantic Colors
                destructive: {
                    DEFAULT: 'hsl(var(--destructive-h) var(--destructive-s) var(--destructive-l) / <alpha-value>)',
                    foreground: 'hsl(var(--destructive-foreground-h) var(--destructive-foreground-s) var(--destructive-foreground-l) / <alpha-value>)',
                },
            },
            // Consistent Border Radius
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            // Consistent Box Shadows
            boxShadow: {
                sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
                'inner-lg': 'inset 0 4px 8px 0 rgb(0 0 0 / 0.05)',
                strong: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 5px 10px -6px rgba(0, 0, 0, 0.1)', // Stronger shadow
                subtle: '0 2px 5px rgba(0,0,0,0.07)', // Subtle shadow for buttons etc.
            },
            // Animations & Keyframes (Match definitions in index.css)
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                fadeOut: {
                    from: { opacity: '1' },
                    to: { opacity: '0' },
                },
                contentShow: {
                    from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
                    to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
                },
                contentHide: {
                    from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
                    to: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
                },
                slideUpAndFade: {
                    from: { opacity: '0', transform: 'translateY(2px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideDownAndFade: {
                    from: { opacity: '1', transform: 'translateY(0)' },
                    to: { opacity: '0', transform: 'translateY(2px)' },
                },
                slideRightAndFade: {
                    from: { opacity: '0', transform: 'translateX(-2px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                slideLeftAndFade: {
                    from: { opacity: '1', transform: 'translateX(0)' },
                    to: { opacity: '0', transform: 'translateX(-2px)' },
                },
            },
            animation: {
                fadeIn: 'fadeIn 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                fadeOut: 'fadeOut 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                contentShow: 'contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                contentHide: 'contentHide 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                slideUpAndFade: 'slideUpAndFade 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                slideDownAndFade: 'slideDownAndFade 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                slideRightAndFade: 'slideRightAndFade 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                slideLeftAndFade: 'slideLeftAndFade 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            },
            // Optional: Custom transition timing function
            transitionTimingFunction: {
                'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)', // Similar to ease-out
            },
            // Font Families (Example)
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'monospace'], // Ensure CodeMirror var is used
            },
            // Add backdrop blur utilities if not default
            backdropBlur: {
                xs: '2px',
                sm: '4px',
                md: '8px',
                lg: '12px',
                xl: '16px',
            }
        },
    },
    plugins: [
        require('tailwindcss-radix'), // Use the Radix plugin for data-* variants
        require('@tailwindcss/forms'), // Optional: if you need form reset styles
    ],
} satisfies Config;