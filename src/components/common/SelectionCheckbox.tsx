import React, { memo, useMemo, useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from './Icon';

interface SelectionCheckboxProps {
    id: string;
    checked: boolean;
    indeterminate?: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    'aria-label': string;
    size?: number;
    className?: string;
    disabled?: boolean;
}

const SelectionCheckbox: React.FC<SelectionCheckboxProps> = memo(({
                                                                      id,
                                                                      checked,
                                                                      indeterminate = false,
                                                                      onChange,
                                                                      'aria-label': ariaLabel,
                                                                      size = 16,
                                                                      className,
                                                                      disabled = false,
                                                                  }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    const state = useMemo(() => {
        if (indeterminate) return 'indeterminate';
        return checked ? 'checked' : 'unchecked';
    }, [checked, indeterminate]);

    const wrapperClasses = useMemo(() => twMerge(
        "relative inline-flex items-center justify-center flex-shrink-0 rounded-full border transition-all duration-200 ease-apple focus-within:ring-1 focus-within:ring-primary/50 focus-within:ring-offset-1",
        disabled
            ? "opacity-50 cursor-not-allowed bg-gray-200/50 border-gray-300"
            : "cursor-pointer",
        state === 'checked'
            ? "bg-primary border-primary hover:bg-primary/90 hover:border-primary/90"
            : state === 'indeterminate'
                ? "bg-primary/50 border-primary/50 hover:bg-primary/60 hover:border-primary/60"
                : "bg-white/40 border-gray-400/80 hover:border-primary/60", // unchecked
        className
    ), [state, disabled, className]);

    const iconName = useMemo(() => {
        if (state === 'checked') return 'check';
        if (state === 'indeterminate') return 'minus';
        return undefined; // No icon for unchecked state inside the SVG
    }, [state]);

    const iconColor = useMemo(() => {
        if (state === 'checked' || state === 'indeterminate') return 'text-white';
        return 'text-transparent'; // Hidden icon for unchecked
    }, [state]);

    return (
        <label htmlFor={id} className={wrapperClasses} style={{ width: size, height: size }}>
            <input
                ref={inputRef}
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
                disabled={disabled}
                className="sr-only" // Hide the actual checkbox input
            />
            <div className="absolute inset-0 flex items-center justify-center">
                {iconName && (
                    <Icon
                        name={iconName}
                        size={size * 0.65} // Adjust icon size relative to checkbox size
                        className={twMerge("transition-colors duration-100 ease-apple", iconColor)}
                        strokeWidth={3} // Make icon bolder
                        aria-hidden="true"
                    />
                )}
            </div>
        </label>
    );
});
SelectionCheckbox.displayName = 'SelectionCheckbox';

export default SelectionCheckbox;