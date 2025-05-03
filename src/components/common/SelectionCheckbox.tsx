// src/components/common/SelectionCheckbox.tsx
import React, {memo, useMemo} from 'react';
import {twMerge} from 'tailwind-merge';
import Icon from './Icon';
// Import Radix Checkbox components
import * as Checkbox from '@radix-ui/react-checkbox';

interface SelectionCheckboxProps {
    id: string;
    checked: boolean; // Keep this as boolean for external control clarity
    indeterminate?: boolean;
    onChange: (checked: boolean) => void; // Radix onCheckedChange gives boolean | 'indeterminate', convert back for consistency if needed or adjust parent
    'aria-label': string;
    size?: number;
    className?: string;
    disabled?: boolean;
}

const SelectionCheckboxRadix: React.FC<SelectionCheckboxProps> = memo(({
                                                                           id,
                                                                           checked,
                                                                           indeterminate = false,
                                                                           onChange,
                                                                           'aria-label': ariaLabel,
                                                                           size = 16,
                                                                           className,
                                                                           disabled = false,
                                                                       }) => {
    // State for Radix Checkbox (checked can be boolean or 'indeterminate')
    const checkboxState = useMemo((): Checkbox.CheckedState => {
        if (indeterminate) return 'indeterminate';
        return checked; // Directly use the boolean checked prop
    }, [checked, indeterminate]);

    // Wrapper classes based on Radix state (using data-state)
    const wrapperClasses = useMemo(() => twMerge(
        "relative inline-flex items-center justify-center flex-shrink-0 rounded-full border transition-all duration-200 ease-apple focus-within:ring-1 focus-within:ring-primary/50 focus-within:ring-offset-1",
        "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
        !disabled && "cursor-pointer",
        // Styling based on data-state attribute provided by Radix
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:hover:bg-primary/90 data-[state=checked]:hover:border-primary/90",
        "data-[state=indeterminate]:bg-primary/50 data-[state=indeterminate]:border-primary/50 data-[state=indeterminate]:hover:bg-primary/60 data-[state=indeterminate]:hover:border-primary/60",
        "data-[state=unchecked]:bg-white/40 data-[state=unchecked]:border-gray-400/80 data-[state=unchecked]:hover:border-primary/60",
        className
    ), [disabled, className]);

    // --- FIX: Correct iconName and iconColor logic ---
    const iconName = useMemo(() => {
        // Check the 'indeterminate' prop first for the minus icon
        if (indeterminate) return 'minus';
        // Then check the boolean 'checked' prop for the check icon
        if (checked) return 'check';
        // Otherwise, no icon
        return undefined;
    }, [checked, indeterminate]);

    const iconColor = useMemo(() => {
        // Icon is white if checked or indeterminate
        if (checked || indeterminate) return 'text-white';
        // Otherwise, transparent (effectively hidden)
        return 'text-transparent';
    }, [checked, indeterminate]);

    // Adapt Radix onChange to match the expected boolean signature
    const handleCheckedChange = (radixChecked: Checkbox.CheckedState) => {
        // Convert 'indeterminate' back to false for the parent onChange,
        // as the parent usually deals with boolean checked state.
        // The visual indeterminate state is handled by the 'indeterminate' prop.
        onChange(radixChecked === true);
    };


    return (
        <Checkbox.Root
            id={id}
            checked={checkboxState}
            onCheckedChange={handleCheckedChange} // Use the adapted handler
            disabled={disabled}
            aria-label={ariaLabel}
            className={wrapperClasses}
            style={{width: size, height: size}}
        >
            <Checkbox.Indicator className="absolute inset-0 flex items-center justify-center">
                {iconName && (
                    <Icon
                        name={iconName}
                        size={size * 0.65}
                        className={twMerge("transition-colors duration-100 ease-apple", iconColor)}
                        strokeWidth={3}
                        aria-hidden="true"
                    />
                )}
            </Checkbox.Indicator>
        </Checkbox.Root>
    );
});
SelectionCheckboxRadix.displayName = 'SelectionCheckboxRadix';

export default SelectionCheckboxRadix;