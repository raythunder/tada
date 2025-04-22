// src/components/common/MenuItem.tsx
import React, { memo, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import Icon from './Icon';
import { IconName } from './IconMap';

interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: IconName;
    iconColor?: string;
    selected?: boolean;
    children: React.ReactNode;
    className?: string;
}

const MenuItem: React.FC<MenuItemProps> = memo(({
                                                    icon,
                                                    iconColor,
                                                    selected,
                                                    children,
                                                    className,
                                                    ...props
                                                }) => {
    const buttonClass = useMemo(() => twMerge(
        "block w-full text-left px-2.5 py-1 text-sm hover:bg-black/15 transition-colors duration-100 ease-apple flex items-center focus:outline-none focus-visible:bg-black/15 rounded-[3px]",
        selected && "bg-primary/20 text-primary font-medium hover:bg-primary/25",
        className
    ), [selected, className]);

    return (
        <button
            className={buttonClass}
            role="menuitem"
            aria-selected={selected}
            {...props}
        >
            {icon && (
                <Icon
                    name={icon}
                    size={14}
                    className={twMerge("mr-1.5 flex-shrink-0 opacity-80", iconColor)}
                    aria-hidden="true"
                />
            )}
            {children}
        </button>
    );
});
MenuItem.displayName = 'MenuItem';

export default MenuItem;