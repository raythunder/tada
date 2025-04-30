// src/components/common/SelectionCheckbox.tsx
import React, { memo, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import Icon from './Icon';

interface SelectionCheckboxProps {
    id: string;
    checked: CheckboxPrimitive.CheckboxProps['checked']; // Use Radix type ('indeterminate' | boolean)
    onCheckedChange: (checked: boolean | 'indeterminate') => void; // Use Radix handler prop name
    'aria-label': string;
    size?: number;
    className?: string;
    disabled?: boolean;
}

const SelectionCheckbox: React.FC<SelectionCheckboxProps> = memo(({
                                                                      id,
                                                                      checked,
                                                                      onCheckedChange,
                                                                      'aria-label': ariaLabel,
                                                                      size = 16,
                                                                      className,
                                                                      disabled = false,
                                                                  }) => {
    const state = useMemo(() => {
        if (checked === 'indeterminate') return 'indeterminate';
        return checked ? 'checked' : 'unchecked';
    }, [checked]);

    const wrapperClasses = useMemo(() => twMerge(
        // Base styles for the Root element
        "relative inline-flex items-center justify-center flex-shrink-0 rounded-full border transition-all duration-150 ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
        // Disabled state
        "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:bg-gray-200/50 data-[disabled]:border-gray-300",
        // State-based styling
        state === 'checked' && "bg-primary border-primary hover:bg-primary/90",
        state === 'indeterminate' && "bg-primary/80 border-primary/80 hover:bg-primary/90", // Slightly different for indeterminate
        state === 'unchecked' && "bg-white/40 border-gray-400/80 hover:border-primary/60",
        className // Allow external classes
    ), [state, className]);

    const iconName = useMemo(() => {
        if (state === 'checked') return 'check';
        if (state === 'indeterminate') return 'minus';
        return undefined;
    }, [state]);

    const iconColor = useMemo(() => {
        if (state === 'checked' || state === 'indeterminate') return 'text-white';
        return 'text-transparent';
    }, [state]);

    return (
        // Use Radix Checkbox Root
        <CheckboxPrimitive.Root
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-label={ariaLabel}
            className={wrapperClasses}
            style={{ width: size, height: size }}
        >
            {/* Radix Checkbox Indicator for the checkmark/minus */}
            <CheckboxPrimitive.Indicator className="flex items-center justify-center w-full h-full">
                {iconName && (
                    <Icon
                        name={iconName}
                        size={size * 0.65} // Adjust icon size
                        className={twMerge("transition-colors duration-100 ease-apple", iconColor)}
                        strokeWidth={3} // Make icon bolder
                        aria-hidden="true"
                    />
                )}
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
});
SelectionCheckbox.displayName = 'SelectionCheckbox';

export default SelectionCheckbox;