// src/components/common/Button.tsx
import React from 'react';
import {twMerge} from 'tailwind-merge';
import {clsx} from 'clsx';
import Icon from './Icon';
import {IconName} from "@/components/common/IconMap";

type ButtonVariant = 'primary' | 'secondary' | 'link' | 'danger' | 'ghost'; // Removed 'outline' and 'glass' as they are covered by 'secondary' or specific styles
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: IconName;
    iconPosition?: 'left' | 'right';
    iconProps?: Partial<React.ComponentProps<typeof Icon>>; // For specific icon styling (size, strokeWidth)
    fullWidth?: boolean;
    loading?: boolean;
    children?: React.ReactNode;
    className?: string;
    'aria-label'?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
         children, variant = 'primary', size = 'md', icon, iconPosition = 'left', iconProps,
         className, fullWidth = false, loading = false, disabled, type = 'button',
         'aria-label': ariaLabel, ...props
     }, ref) => {
        const isDisabled = disabled || loading;

        const baseClasses = clsx(
            'inline-flex items-center justify-center font-normal whitespace-nowrap select-none outline-none relative', // font-normal (400) for emphasized text
            'focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-white',
            'transition-all duration-200 ease-in-out', // Using spec transition
            isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            fullWidth && 'w-full',
            'rounded-base' // 4px border radius
        );

        // Variant specific styles - NO BORDERS on buttons per spec. Backgrounds for differentiation.
        const variantClasses: Record<ButtonVariant, string> = {
            primary: clsx(
                'bg-primary text-white', // Primary bg, white text
                !isDisabled && 'hover:bg-primary-dark active:scale-[0.98]' // Darker primary on hover, scale on active
            ),
            secondary: clsx(
                'bg-grey-ultra-light text-primary', // No bg, text primary (for secondary button) -> Changed to very light grey background
                !isDisabled && 'hover:bg-primary-light active:scale-[0.98]' // Light coral bg on hover for secondary
            ),
            link: clsx( // No background, text primary
                'text-primary underline-offset-2 h-auto px-0 py-0 rounded-none shadow-none',
                !isDisabled && 'hover:text-primary-dark hover:underline active:scale-[0.98]'
            ),
            danger: clsx(
                'bg-error text-white', // Error bg, white text
                !isDisabled && 'hover:bg-error/80 active:scale-[0.98]' // Darker error on hover
            ),
            ghost: clsx( // No background, text color depends on context (default grey-medium)
                'text-grey-medium border-transparent',
                !isDisabled && 'hover:bg-grey-ultra-light hover:text-grey-dark active:scale-[0.98]'
            ),
        };

        const sizeClasses: Record<ButtonSize, string> = {
            sm: 'text-[13px] px-3 h-8', // Adjusted small button height & padding
            md: 'text-[13px] px-4 h-8', // Per spec: height 32px,左右内边距16px -> px-4
            lg: 'text-[14px] px-5 h-9', // Adjusted large button height & padding
            icon: 'p-0', // Padding handled by icon size usually
        };

        // Specific icon button dimensions
        const iconButtonSizeClasses: Record<ButtonSize, string> = {
            sm: 'h-7 w-7',
            md: 'h-8 w-8',
            lg: 'h-9 w-9',
            icon: 'h-8 w-8', // Default icon button size is 32x32
        };


        const iconSizeMap: Record<ButtonSize, number> = {
            sm: 14, md: 16, lg: 18, icon: 16, // Default icon size for icon-only buttons
        };
        const finalIconSize = iconProps?.size ?? iconSizeMap[size];
        const finalIconStrokeWidth = iconProps?.strokeWidth ?? 1;


        const getIconMargin = (pos: 'left' | 'right') => {
            if (size === 'icon' || !children) return '';
            return pos === 'left' ? 'mr-1.5' : 'ml-1.5'; // Consistent spacing
        };

        const finalAriaLabel = ariaLabel || (size === 'icon' && !children ? undefined : (typeof children === 'string' ? children : undefined));
        if (size === 'icon' && !finalAriaLabel && !loading && !children && process.env.NODE_ENV === 'development') {
            console.warn(`Icon-only button without children is missing an 'aria-label'. Icon: ${icon || 'N/A'}`);
        }

        return (
            <button
                ref={ref} type={type}
                className={twMerge(baseClasses, size === 'icon' ? iconButtonSizeClasses[size] : sizeClasses[size], variantClasses[variant], className)}
                disabled={isDisabled} aria-label={finalAriaLabel} {...props} >
                {loading ? (
                    <Icon name="loader" size={finalIconSize} strokeWidth={finalIconStrokeWidth}
                          className="animate-spin"/>
                ) : (
                    <>
                        {icon && iconPosition === 'left' && (
                            <Icon name={icon} size={finalIconSize} strokeWidth={finalIconStrokeWidth}
                                  className={twMerge(getIconMargin('left'))} aria-hidden="true"/>)}
                        <span
                            className={clsx(size === 'icon' && !children && finalAriaLabel ? 'sr-only' : 'flex-shrink-0')}>{children}</span>
                        {icon && iconPosition === 'right' && (
                            <Icon name={icon} size={finalIconSize} strokeWidth={finalIconStrokeWidth}
                                  className={twMerge(getIconMargin('right'))} aria-hidden="true"/>)}
                    </>
                )}
            </button>
        );
    }
);
Button.displayName = 'Button';
export default Button;