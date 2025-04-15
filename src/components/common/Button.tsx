// src/components/common/Button.tsx
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import Icon, { IconName } from './Icon';
import { motion, HTMLMotionProps } from 'framer-motion'; // For subtle animations

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'; // Added icon size

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "size"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: IconName;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    loading?: boolean;
    children?: React.ReactNode;
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
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        const baseClasses = clsx(
            'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
            'transition-all duration-150 ease-in-out', // Smoother transition
            isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            fullWidth && 'w-full'
        );

        const variantClasses: Record<ButtonVariant, string> = {
            primary: clsx(
                'bg-primary text-white shadow-subtle',
                !isDisabled && 'hover:bg-primary-dark hover:shadow-medium'
            ),
            secondary: clsx(
                'bg-gray-100 text-gray-700 border border-gray-200 shadow-subtle',
                !isDisabled && 'hover:bg-gray-200 hover:border-gray-300 hover:shadow-medium'
            ),
            outline: clsx(
                'border border-gray-300 text-gray-700 bg-canvas',
                !isDisabled && 'hover:bg-gray-50 hover:border-gray-400'
            ),
            ghost: clsx(
                'text-gray-700',
                !isDisabled && 'hover:bg-gray-100 active:bg-gray-200'
            ),
            link: clsx(
                'text-primary underline-offset-4',
                !isDisabled && 'hover:underline hover:text-primary-dark'
            ),
            danger: clsx(
                'bg-red-500 text-white shadow-subtle',
                !isDisabled && 'hover:bg-red-600 hover:shadow-medium'
            ),
        };

        const sizeClasses: Record<ButtonSize, string> = {
            sm: 'text-xs px-3 h-8 rounded-md',
            md: 'text-sm px-4 h-9 rounded-lg', // Slightly larger radius
            lg: 'text-base px-5 h-10 rounded-lg',
            icon: 'h-9 w-9 rounded-lg', // Square button for icons
        };

        const iconSizeClasses: Record<ButtonSize, number> = {
            sm: 14,
            md: 16,
            lg: 18,
            icon: 18,
        };

        const iconMargin = size === 'icon' ? '' : size === 'sm' ? 'mr-1.5' : 'mr-2';
        const iconMarginRight = size === 'icon' ? '' : size === 'sm' ? 'ml-1.5' : 'ml-2';

        return (
            <motion.button
                ref={ref}
                type={type}
                className={twMerge(
                    baseClasses,
                    sizeClasses[size],
                    variantClasses[variant],
                    className
                )}
                disabled={isDisabled}
                whileTap={!isDisabled ? { scale: 0.97, transition: { duration: 0.1 } } : {}}
                {...props}
            >
                {loading ? (
                    <Icon name="loader" size={iconSizeClasses[size]} className="animate-spin" />
                ) : (
                    <>
                        {icon && iconPosition === 'left' && (
                            <Icon name={icon} size={iconSizeClasses[size]} className={iconMargin} aria-hidden="true" />
                        )}
                        {children && <span className={size === 'icon' ? 'sr-only' : ''}>{children}</span>}
                        {icon && iconPosition === 'right' && (
                            <Icon name={icon} size={iconSizeClasses[size]} className={iconMarginRight} aria-hidden="true" />
                        )}
                    </>
                )}
            </motion.button>
        );
    }
);
Button.displayName = 'Button';
export default Button;