import React, {memo, useMemo} from 'react';
import {twMerge} from 'tailwind-merge';
import Icon from './Icon';
import * as Checkbox from '@radix-ui/react-checkbox';

interface SelectionCheckboxProps {
    id: string;
    checked: boolean;
    indeterminate?: boolean;
    onChange: (checked: boolean) => void;
    'aria-label': string;
    size?: number;
    className?: string;
    disabled?: boolean;
}

/**
 * A custom circular checkbox component built with Radix UI for accessibility.
 * It supports checked, unchecked, and indeterminate states.
 */
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
    const checkboxState = useMemo((): Checkbox.CheckedState => {
        if (indeterminate) return 'indeterminate';
        return checked;
    }, [checked, indeterminate]);

    const wrapperClasses = useMemo(() => twMerge(
        "relative inline-flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200 ease-in-out",
        "focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        checkboxState === false && "border border-grey-light hover:border-primary-dark",
        (checkboxState === true || checkboxState === 'indeterminate') && "bg-primary border-primary hover:bg-primary-dark hover:border-primary-dark",
        className
    ), [disabled, className, checkboxState]);

    const iconName = useMemo(() => {
        if (indeterminate) return 'minus';
        if (checked) return 'check';
        return undefined;
    }, [checked, indeterminate]);

    const iconColor = "text-white";
    const iconSize = size * 0.6;

    const handleCheckedChange = (radixChecked: Checkbox.CheckedState) => {
        onChange(radixChecked === true);
    };

    return (
        <Checkbox.Root
            id={id}
            checked={checkboxState}
            onCheckedChange={handleCheckedChange}
            disabled={disabled}
            aria-label={ariaLabel}
            className={wrapperClasses}
            style={{
                width: size,
                height: size,
                borderWidth: checkboxState === false ? '1px' : '0px'
            }}
        >
            <Checkbox.Indicator className="absolute inset-0 flex items-center justify-center">
                {iconName && (
                    <Icon
                        name={iconName}
                        size={iconSize}
                        className={twMerge("transition-colors duration-100 ease-in-out", iconColor)}
                        strokeWidth={size > 12 ? 2 : 1.5}
                        aria-hidden="true"
                    />
                )}
            </Checkbox.Indicator>
        </Checkbox.Root>
    );
});
SelectionCheckboxRadix.displayName = 'SelectionCheckboxRadix';
export default SelectionCheckboxRadix;