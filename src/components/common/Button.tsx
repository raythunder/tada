// src/components/common/Button.tsx
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import Icon from './Icon';
import { motion, HTMLMotionProps } from 'framer-motion';
import { IconName } from "@/components/common/IconMap";

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "size"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: IconName;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    loading?: boolean;
    children?: React.ReactNode;
    className?: string;
    'aria-label'?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            icon,
            iconPosition = 'left',
            className,
            fullWidth = false,
            loading = false,
            disabled,
            type = 'button',
            'aria-label': ariaLabel,
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        // Base styling - consistent radius, focus ring, subtle transition
        const baseClasses = clsx(
            'inline-flex items-center justify-center font-medium whitespace-nowrap select-none outline-none relative',
            'focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
            'transition-all duration-100 ease-apple', // Faster, standard transition
            isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            fullWidth && 'w-full',
            'rounded-md'
        );

        // Variant specific styles - Refined for subtlety
        const variantClasses: Record<ButtonVariant, string> = {
            primary: clsx(
                'bg-primary text-white shadow-subtle border border-primary/90',
                !isDisabled && 'hover:bg-primary-dark active:bg-primary-dark' // Simplified active
            ),
            secondary: clsx(
                'bg-gray-100 text-gray-700 border border-border-color shadow-subtle',
                !isDisabled && 'hover:bg-gray-200 active:bg-gray-200'
            ),
            outline: clsx(
                'border border-border-color text-gray-700 bg-canvas',
                !isDisabled && 'hover:bg-gray-100/50 active:bg-gray-100/70'
            ),
            ghost: clsx(
                'text-gray-600 border border-transparent',
                !isDisabled && 'hover:bg-black/5 active:bg-black/[0.07] hover:text-gray-800'
            ),
            link: clsx(
                'text-primary underline-offset-4 h-auto px-0 py-0 rounded-none border-none bg-transparent shadow-none',
                !isDisabled && 'hover:underline hover:text-primary-dark'
            ),
            danger: clsx(
                'bg-red-500 text-white shadow-subtle border border-red-500/90',
                !isDisabled && 'hover:bg-red-600 active:bg-red-700'
            ),
        };

        // Size specific styles
        const sizeClasses: Record<ButtonSize, string> = {
            sm: 'text-xs px-2.5 h-7',
            md: 'text-sm px-3 h-8',
            lg: 'text-base px-3.5 h-9',
            icon: 'h-8 w-8 p-0', // Ensure padding is zero for icon centering
        };

        // Icon size based on button size
        const iconSizeClasses: Record<ButtonSize, number> = {
            sm: 14,
            md: 16,
            lg: 18,
            icon: 18,
        };

        // Icon margin logic
        const getIconMargin = (pos: 'left' | 'right') => {
            // No margin if icon-only or no text children *or* loading
            if (size === 'icon' || !children || loading) return '';
            if (size === 'sm') return pos === 'left' ? 'mr-1' : 'ml-1';
            return pos === 'left' ? 'mr-1.5' : 'ml-1.5'; // md and lg
        };

        // Very subtle animation props for non-disabled buttons
        const motionProps = !isDisabled
            ? {
                whileTap: { scale: 0.98, transition: { duration: 0.05 } }, // Less aggressive tap
                // No whileHover scale animation by default
            }
            : {};

        // Determine Aria Label
        const finalAriaLabel = ariaLabel || (typeof children === 'string' ? children : undefined);

        // Check if children is just the Icon component (to handle the case the user identified)
        // Although the fix is to use the `icon` prop, this detection might be useful elsewhere.
        // let isChildOnlyIcon = false;
        // React.Children.forEach(children, child => {
        //     if (React.isValidElement(child) && child.type === Icon) {
        //         isChildOnlyIcon = true;
        //     }
        // });

        return (
            <motion.button
                ref={ref}
                type={type}
                className={twMerge(
                    baseClasses,
                    variant !== 'link' && sizeClasses[size],
                    variantClasses[variant],
                    className
                )}
                disabled={isDisabled}
                aria-label={finalAriaLabel}
                {...motionProps}
                {...props}
            >
                {/* Central Loading Spinner */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon name="loader" size={iconSizeClasses[size]} className="animate-spin" />
                    </div>
                )}

                {/* Content Wrapper - Hide content visually if loading */}
                <span className={clsx('inline-flex items-center justify-center', loading && 'invisible')}>
                     {/* Render icon from prop if position is left */}
                    {icon && iconPosition === 'left' && (
                        <Icon
                            name={icon}
                            size={iconSizeClasses[size]}
                            className={twMerge(getIconMargin('left'))}
                            aria-hidden="true"
                        />
                    )}

                    {/* Render children, visually hidden if size is 'icon' */}
                    {children && <span className={size === 'icon' ? 'sr-only' : ''}>{children}</span>}

                    {/* Render icon from prop if position is right */}
                    {icon && iconPosition === 'right' && (
                        <Icon
                            name={icon}
                            size={iconSizeClasses[size]}
                            className={twMerge(getIconMargin('right'))}
                            aria-hidden="true"
                        />
                    )}
                </span>

            </motion.button>
        );
    }
);
Button.displayName = 'Button';
export default Button;