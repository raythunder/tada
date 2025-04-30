// src/components/common/MenuItem.tsx
// This component is likely deprecated as its functionality
// should be replaced by Radix DropdownMenu.Item, CheckboxItem, RadioItem, etc.
// Keeping the file structure but marking as potentially unused.
// If needed for a custom scenario, it can be kept and styled.

import React, {memo, useMemo} from 'react';
import {twMerge} from 'tailwind-merge';
import Icon from './Icon';
import {IconName} from './IconMap';

interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: IconName;
    iconColor?: string;
    selected?: boolean;
    children: React.ReactNode;
    className?: string;
    /** @deprecated Use Radix DropdownMenu.Item/CheckboxItem/RadioItem instead */
    isDeprecated?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = memo(({
                                                    icon,
                                                    iconColor,
                                                    selected,
                                                    children,
                                                    className,
                                                    isDeprecated = true, // Mark as deprecated by default
                                                    ...props
                                                }) => {
    if (isDeprecated && process.env.NODE_ENV === 'development') {
        // console.warn("MenuItem component is likely deprecated. Consider using Radix DropdownMenu primitives.");
    }

    const buttonClass = useMemo(() => twMerge(
        // Styles for Radix DropdownMenu.Item compatibility if needed
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:bg-neutral-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "hover:bg-black/10 dark:hover:bg-white/10", // Basic hover
        selected && "bg-primary/20 text-primary font-medium hover:bg-primary/25", // Selected state
        props.disabled && "opacity-50 pointer-events-none",
        className
    ), [selected, className, props.disabled]);

    return (
        <button
            className={buttonClass}
            role="menuitem" // Keep role for semantics if used standalone
            aria-selected={selected}
            {...props}
        >
            {icon && (
                <Icon
                    name={icon}
                    size={14} // Match Radix default icon size
                    className={twMerge("mr-2 flex-shrink-0 opacity-80", iconColor)}
                    aria-hidden="true"
                />
            )}
            {children}
        </button>
    );
});
MenuItem.displayName = 'MenuItem';

export default MenuItem;