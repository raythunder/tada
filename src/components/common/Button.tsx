// src/components/common/Button.tsx
import React from 'react';
import Icon, { IconName } from './Icon';

interface ButtonProps {
    children?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: IconName;
    iconPosition?: 'left' | 'right';
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
                                           children,
                                           variant = 'primary',
                                           size = 'md',
                                           icon,
                                           iconPosition = 'left',
                                           className = '',
                                           onClick,
                                           disabled = false,
                                           type = 'button',
                                           fullWidth = false,
                                       }) => {
    const variantClasses = {
        primary: 'bg-blue-500 hover:bg-blue-600 text-white',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
        ghost: 'hover:bg-gray-100 text-gray-700',
        link: 'text-blue-500 hover:text-blue-600 underline',
        danger: 'bg-red-500 hover:bg-red-600 text-white',
    };

    const sizeClasses = {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-2',
        lg: 'text-base px-4 py-2',
    };

    const baseClasses = 'font-medium rounded focus:outline-none transition-colors duration-200';
    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
    const widthClasses = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${widthClasses} ${className} flex items-center justify-center`}
            onClick={onClick}
            disabled={disabled}
        >
            {icon && iconPosition === 'left' && (
                <Icon name={icon} size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} className="mr-2" />
            )}
            {children}
            {icon && iconPosition === 'right' && (
                <Icon name={icon} size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} className="ml-2" />
            )}
        </button>
    );
};

export default Button;