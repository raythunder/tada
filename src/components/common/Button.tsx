// src/components/common/Button.tsx
import React from 'react';
import {twMerge} from 'tailwind-merge';
import {clsx} from 'clsx';
import Icon from './Icon';
import {IconName} from "@/components/common/IconMap";

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'; // Consistent sizes

// Use React.ButtonHTMLAttributes for standard button props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: IconName;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    loading?: boolean;
    children?: React.ReactNode;
    className?: string;
    'aria-label'?: string; // Keep aria-label
}

// Performance: ForwardRef allows memoization if parent component uses it
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'secondary', // Default to secondary for less emphasis
            size = 'md',
            icon,
            iconPosition = 'left',
            className,
            fullWidth = false,
            loading = false,
            disabled,
            type = 'button',
            'aria-label': ariaLabel, // Capture aria-label
            ...props // Spread remaining standard button attributes
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        // Use clsx for conditional classes, twMerge handles overrides
        const baseClasses = clsx(
            'inline-flex items-center justify-center font-medium whitespace-nowrap select-none outline-none relative',
            'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas', // Adjusted focus ring
            'transition-all duration-150 ease-apple', // Faster transition for buttons
            isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            fullWidth && 'w-full',
            'rounded-md' // Default radius
        );

        // Refined Variant styles for Apple-like feel
        const variantClasses: Record<ButtonVariant, string> = {
            primary: clsx(
                'bg-primary text-primary-foreground border border-transparent shadow-subtle', // Subtle shadow
                !isDisabled && 'hover:bg-primary-dark active:bg-primary/90'
            ),
            secondary: clsx(
                'bg-neutral-200/70 dark:bg-neutral-700/50 text-neutral-800 dark:text-neutral-100 border border-black/10 dark:border-white/10 shadow-sm', // Less contrast
                !isDisabled && 'hover:bg-neutral-300/70 dark:hover:bg-neutral-600/60 active:bg-neutral-300/80 dark:active:bg-neutral-600/70'
            ),
            outline: clsx(
                'border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 bg-transparent', // Simple outline
                !isDisabled && 'hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 active:bg-neutral-100/70 dark:active:bg-neutral-800/60'
            ),
            ghost: clsx(
                'text-neutral-600 dark:text-neutral-400 border border-transparent bg-transparent', // No background
                !isDisabled && 'hover:bg-black/10 dark:hover:bg-white/10 hover:text-neutral-800 dark:hover:text-neutral-100 active:bg-black/15 dark:active:bg-white/15'
            ),
            link: clsx(
                'text-primary underline-offset-4 h-auto px-0 py-0 rounded-none border-none bg-transparent shadow-none backdrop-filter-none font-normal text-sm', // Specific link styling
                !isDisabled && 'hover:underline hover:text-primary-dark'
            ),
            danger: clsx(
                'bg-destructive text-destructive-foreground border border-transparent shadow-subtle',
                !isDisabled && 'hover:bg-destructive-dark active:bg-destructive/90'
            ),
            glass: clsx( // Refined glass for Apple feel
                'border border-black/5 dark:border-white/5 text-neutral-700 dark:text-neutral-200 shadow-sm',
                'bg-white/40 dark:bg-neutral-700/30 backdrop-blur-md',
                !isDisabled && 'hover:bg-white/60 dark:hover:bg-neutral-700/50 active:bg-white/70 dark:active:bg-neutral-700/60'
            ),
        };

        // Adjusted Size styles for typical Apple UI scale
        const sizeClasses: Record<ButtonSize, string> = {
            sm: 'text-xs px-2 h-[28px]', // Slightly smaller
            md: 'text-sm px-3 h-[32px]', // Standard
            lg: 'text-base px-3.5 h-[36px]', // Larger actions
            icon: 'h-8 w-8 p-0', // Keep consistent icon size
        };

        // Consistent Icon sizes
        const iconSizeClasses: Record<ButtonSize, number> = {
            sm: 14,
            md: 15, // Slightly smaller for md
            lg: 16,
            icon: 16, // Keep consistent icon size
        };

        // Helper for icon margin
        const getIconMargin = (pos: 'left' | 'right') => {
            if (size === 'icon' || !children) return '';
            if (size === 'sm') return pos === 'left' ? 'mr-1' : 'ml-1';
            return pos === 'left' ? 'mr-1.5' : 'ml-1.5';
        };

        // Determine aria-label, warn if missing for icon-only buttons
        const finalAriaLabel = ariaLabel || (size === 'icon' && !children ? undefined : (typeof children === 'string' ? children : undefined));
        if (size === 'icon' && !finalAriaLabel && !loading && !children && process.env.NODE_ENV === 'development') {
            console.warn(`Icon-only button without children is missing an 'aria-label' prop. Icon: ${icon || 'N/A'}`);
        }

        return (
            <button
                ref={ref}
                type={type}
                className={twMerge(
                    baseClasses,
                    variant !== 'link' && sizeClasses[size], // Don't apply sizing for link variant
                    variantClasses[variant],
                    className // Allow external overrides
                )}
                disabled={isDisabled}
                aria-label={finalAriaLabel}
                {...props} // Pass standard button props like onClick, etc.
            >
                {loading ? (
                    // Use dedicated loader icon
                    <Icon name="loader" size={iconSizeClasses[size]} className="animate-spin"/>
                ) : (
                    <>
                        {icon && iconPosition === 'left' && (
                            <Icon
                                name={icon}
                                size={iconSizeClasses[size]}
                                className={twMerge(getIconMargin('left'), 'flex-shrink-0')} // Prevent icon shrinking
                                aria-hidden="true" // Icon is decorative if text/aria-label is present
                            />
                        )}
                        {/* Render children, make sr-only if it's an icon-only button with label */}
                        <span className={clsx(
                            (size === 'icon' && !children && finalAriaLabel) && 'sr-only',
                            'leading-none' // Helps vertical alignment
                        )}>
                            {children}
                        </span>
                        {icon && iconPosition === 'right' && (
                            <Icon
                                name={icon}
                                size={iconSizeClasses[size]}
                                className={twMerge(getIconMargin('right'), 'flex-shrink-0')} // Prevent icon shrinking
                                aria-hidden="true"
                            />
                        )}
                    </>
                )}
            </button>
        );
    }
);
Button.displayName = 'Button';
export default Button;