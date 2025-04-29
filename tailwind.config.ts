// tailwind.config.ts
import type {Config} from 'tailwindcss';

export default {
    darkMode: ['class'],
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}' // Ensure it scans all relevant files
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))", // Main app background
                foreground: "hsl(var(--foreground))", // Default text
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                    dark: "hsl(var(--primary) / 0.9)", // Example darker primary
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                // Add custom glassmorphism variants if needed, or use inline bg-opacity/backdrop-blur
                glass: {
                    DEFAULT: "hsl(var(--card) / 0.6)",
                    foreground: "hsl(var(--card-foreground))",
                    alt: {
                        DEFAULT: "hsl(var(--secondary) / 0.4)",
                        foreground: "hsl(var(--secondary-foreground))",
                    }
                },
                canvas: { // For main background areas if needed
                    DEFAULT: "hsl(var(--background))",
                    alt: "hsl(var(--muted) / 0.4)",
                },


                // primary: {
                // 	DEFAULT: 'hsl(var(--primary))',
                // 	light: 'hsl(var(--primary-h), var(--primary-s), 96%)',
                // 	dark: 'hsl(var(--primary-h), var(--primary-s), 45%)',
                // 	foreground: 'hsl(var(--primary-foreground))'
                // },
                // muted: {
                // 	DEFAULT: 'hsl(var(--muted))',
                // 	foreground: 'hsl(var(--muted-foreground))'
                // },
                // canvas: {
                // 	DEFAULT: 'hsl(var(--canvas))',
                // 	alt: 'hsl(var(--canvas-alt))',
                // 	inset: 'hsl(220, 30%, 96%)'
                // },
                'border-color': {
                    DEFAULT: 'hsl(210, 25%, 93%)',
                    medium: 'hsl(210, 20%, 88%)',
                    'glass-subtle': 'hsla(0, 0%, 0%, 0.08)',
                    'glass-medium': 'hsla(0, 0%, 0%, 0.12)',
                    'glass-light': 'hsla(0, 0%, 100%, 0.1)'
                },
                // glass: {
                // 	'100': 'hsla(0, 0%, 100%, 0.80)',
                // 	'200': 'hsla(0, 0%, 100%, 0.70)',
                // 	'300': 'hsla(0, 0%, 100%, 0.50)',
                // 	DEFAULT: 'hsla(0, 0%, 100%, 0.60)',
                // 	alt: 'hsla(220, 40%, 98%, 0.60)',
                // 	'alt-100': 'hsla(220, 40%, 98%, 0.80)',
                // 	'alt-200': 'hsla(220, 40%, 98%, 0.70)',
                // 	'alt-300': 'hsla(220, 40%, 98%, 0.50)',
                // 	inset: 'hsla(220, 30%, 96%, 0.70)',
                // 	'inset-100': 'hsla(220, 30%, 96%, 0.80)',
                // 	'inset-200': 'hsla(220, 30%, 96%, 0.60)'
                // },
                // background: 'hsl(var(--background))',
                // foreground: 'hsl(var(--foreground))',
                // card: {
                // 	DEFAULT: 'hsl(var(--card))',
                // 	foreground: 'hsl(var(--card-foreground))'
                // },
                // popover: {
                // 	DEFAULT: 'hsl(var(--popover))',
                // 	foreground: 'hsl(var(--popover-foreground))'
                // },
                // secondary: {
                // 	DEFAULT: 'hsl(var(--secondary))',
                // 	foreground: 'hsl(var(--secondary-foreground))'
                // },
                // accent: {
                // 	DEFAULT: 'hsl(var(--accent))',
                // 	foreground: 'hsl(var(--accent-foreground))'
                // },
                // destructive: {
                // 	DEFAULT: 'hsl(var(--destructive))',
                // 	foreground: 'hsl(var(--destructive-foreground))'
                // },
                // border: 'hsl(var(--border))',
                // input: 'hsl(var(--input))',
                // ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                },
            },
            borderRadius: {
                sm: 'calc(var(--radius) - 4px)',
                md: 'calc(var(--radius) - 2px)',
                lg: 'var(--radius)',
                xl: '12px',
                full: '9999px'
            },
            boxShadow: {
                subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                medium: '0 4px 8px -2px hsla(0, 0%, 0%, 0.07), 0 2px 4px -2px hsla(0, 0%, 0%, 0.05)',
                strong: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
                'inner-strong': 'inset 0 2px 4px 0 hsla(0, 0%, 0%, 0.06)',
                glass: '0 4px 12px -2px hsla(var(--primary-h), var(--primary-s), 50%, 0.1), 0 2px 4px -2px hsla(var(--primary-h), var(--primary-s), 50%, 0.06)',
                'glass-lg': '0 8px 24px -6px hsla(var(--primary-h), var(--primary-s), 50%, 0.12), 0 4px 8px -4px hsla(var(--primary-h), var(--primary-s), 50%, 0.08)',
                xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },
            transitionTimingFunction: {
                apple: 'cubic-bezier(0.4, 0, 0.2, 1)',
                emphasized: 'cubic-bezier(0.4, 0, 0.2, 1)',
                sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
                'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
                'ease-out': 'cubic-bezier(0, 0, 0.2, 1)'
            },
            backdropBlur: {
                none: '0',
                xs: '2px',
                sm: '4px',
                DEFAULT: '8px',
                md: '12px',
                lg: '16px',
                xl: '24px',
                '2xl': '32px',
                '3xl': '48px'
            },
            keyframes: {
                spin: {
                    '0%': {
                        transform: 'rotate(0deg)'
                    },
                    '100%': {
                        transform: 'rotate(360deg)'
                    }
                },
                'accordion-down': {
                    from: {
                        height: '0'
                    },
                    to: {
                        height: 'var(--radix-accordion-content-height)'
                    }
                },
                'accordion-up': {
                    from: {
                        height: 'var(--radix-accordion-content-height)'
                    },
                    to: {
                        height: '0'
                    }
                },
                "fade-in": {
                    from: {opacity: "0"},
                    to: {opacity: "1"},
                },
                "fade-out": {
                    from: {opacity: "1"},
                    to: {opacity: "0"},
                },
                "slide-in-from-right": {
                    from: {transform: "translateX(100%)", opacity: "0.8"},
                    to: {transform: "translateX(0)", opacity: "1"},
                },
                "slide-out-to-right": {
                    from: {transform: "translateX(0)", opacity: "1"},
                    to: {transform: "translateX(100%)", opacity: "0.8"},
                }
            },
            animation: {
                spin: 'spin 1s linear infinite',
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                "fade-in": "fade-in 0.3s ease-out",
                "fade-out": "fade-out 0.2s ease-in",
                "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
                "slide-out-to-right": "slide-out-to-right 0.3s ease-out",
            },
        }
    },
    // Include necessary plugins
    plugins: [
        require('@tailwindcss/forms'), // Provides base styles for form elements
        require("tailwindcss-animate")
    ],
} satisfies Config;