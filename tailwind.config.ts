// tailwind.config.ts
import type {Config} from 'tailwindcss';

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'primary': 'hsl(var(--color-primary) / <alpha-value>)',
                'primary-light': 'hsl(var(--color-primary-light) / <alpha-value>)',
                'primary-dark': 'hsl(var(--color-primary-dark) / <alpha-value>)',
                'white': 'hsl(var(--color-white) / <alpha-value>)',
                'grey-ultra-light': 'hsl(var(--color-grey-ultra-light) / <alpha-value>)',
                'grey-light': 'hsl(var(--color-grey-light) / <alpha-value>)',
                'grey-medium': 'hsl(var(--color-grey-medium) / <alpha-value>)',
                'grey-dark': 'hsl(var(--color-grey-dark) / <alpha-value>)',
                'success': 'hsl(var(--color-success) / <alpha-value>)',
                'info': 'hsl(var(--color-info) / <alpha-value>)',
                'warning': 'hsl(var(--color-warning) / <alpha-value>)',
                'error': 'hsl(var(--color-error) / <alpha-value>)',
            },
            fontFamily: {
                primary: ['var(--font-primary)', 'sans-serif'],
            },
            fontWeight: {
                light: 'var(--font-primary-light-weight)',
                normal: 'var(--font-primary-regular-weight)',
                medium: 'var(--font-primary-medium-weight)',
            },
            borderRadius: {
                'base': 'var(--border-radius-base)',
                'sm': 'var(--border-radius-small)',
            },
            boxShadow: {
                'subtle': 'var(--shadow-subtle)',
                'ai-summary': 'var(--shadow-ai-summary)',
                'modal': 'var(--shadow-modal)',
            },
            spacing: {
                '0.5': '2px', '1': '4px', '2': '8px', '3': '12px',
                '4': '16px', '5': '20px', '6': '24px',
            },
            letterSpacing: {
                tightest: '-.075em', tighter: '-.05em', tight: '-.025em',
                normal: '0', wide: '.025em', wider: '.05em',
                widest: '.1em', '0.5px': '0.5px',
            },
            lineHeight: {
                '3': '1.3', 'normal': '1.5', 'tight': '1.2', '6': '1.6',
            },
            keyframes: {
                // --- FADE IN/OUT (Good for general use, including dropdowns/popovers) ---
                fadeIn: {from: {opacity: '0'}, to: {opacity: '1'}},
                fadeOut: {from: {opacity: '1'}, to: {opacity: '0'}},

                // --- MODAL (Centered, with slight scale) ---
                modalShow: {
                    from: {opacity: '0', transform: 'translate(-50%, -48%) scale(0.98)'},
                    to: {opacity: '1', transform: 'translate(-50%, -50%) scale(1)'},
                },
                modalHide: {
                    from: {opacity: '1', transform: 'translate(-50%, -50%) scale(1)'},
                    to: {opacity: '0', transform: 'translate(-50%, -48%) scale(0.98)'},
                },

                // --- POPOVER/DROPDOWN (Subtle scale from origin, primarily fade) ---
                // This is a safer animation for Radix popper elements.
                // Radix itself will handle the positioning (translate).
                // The key is to ensure this animation respects `transform-origin`.
                scaleIn: {
                    '0%': {opacity: '0', transform: 'scale(0.95)'},
                    '100%': {opacity: '1', transform: 'scale(1)'},
                },
                scaleOut: {
                    '0%': {opacity: '1', transform: 'scale(1)'},
                    '100%': {opacity: '0', transform: 'scale(0.95)'},
                },
            },
            animation: {
                // General fade
                fadeIn: 'fadeIn 0.2s ease-in-out',
                fadeOut: 'fadeOut 0.2s ease-in-out',

                // Modal specific
                modalShow: 'modalShow 0.2s ease-out',
                modalHide: 'modalHide 0.2s ease-in',

                // Popover/Dropdown specific animations
                // Using a very short duration for the scale animation to make it feel quick
                // The Radix plugin will apply these based on data-state
                popoverShow: 'scaleIn 0.1s ease-out', // Faster, more subtle
                popoverHide: 'scaleOut 0.1s ease-in',
                dropdownShow: 'scaleIn 0.1s ease-out',
                dropdownHide: 'scaleOut 0.1s ease-in',
            },
            transitionTimingFunction: {
                'app-ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'app-ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
            },
        },
    },
    plugins: [
        require('tailwindcss-radix')({
            variantPrefix: 'radix',
        }),
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms')({strategy: 'class'}),
    ],
} satisfies Config;