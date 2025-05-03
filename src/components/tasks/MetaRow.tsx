// src/components/tasks/MetaRow.tsx
import React, {memo, useMemo} from 'react';
import {twMerge} from 'tailwind-merge';
import Icon from '../common/Icon';
import {IconName} from '../common/IconMap'; // Ensure IconName is exported from IconMap

interface MetaRowProps {
    icon: IconName;
    label: string;
    children: React.ReactNode;
    disabled?: boolean;
}

const MetaRow: React.FC<MetaRowProps> = memo(({icon, label, children, disabled = false}) => {
    const rowClassName = useMemo(() => twMerge(
        "flex items-center justify-between group min-h-[34px] px-1 rounded",
        disabled && "opacity-60 pointer-events-none select-none", // Disable selection when disabled
        !disabled && "hover:bg-black/5 transition-colors duration-100 ease-apple"
    ), [disabled]);

    return (
        <div className={rowClassName}>
            <span className="text-muted-foreground flex items-center text-xs font-medium w-24 flex-shrink-0">
                <Icon name={icon} size={14} className="mr-1.5 opacity-70" aria-hidden="true"/>
                {label}
            </span>
            <div className="flex-1 text-right min-w-0">
                {children}
            </div>
        </div>
    );
});
MetaRow.displayName = 'MetaRow';

export default MetaRow;