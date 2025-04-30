// src/components/common/Dropdown.tsx
import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {twMerge} from 'tailwind-merge';
import Icon from './Icon'; // Assuming Icon component is available
import {IconName} from './IconMap'; // Assuming IconName type is available

// Re-export Radix parts for easier usage
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

// Styled Content
export const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({className, sideOffset = 4, ...props}, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={twMerge(
                // Base Radix preset styling (you can customize heavily)
                "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-black/10 bg-glass-100 backdrop-blur-xl p-1 shadow-strong data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                // Customizations
                "py-1", // Standard padding
                className
            )}
            // Avoid blur propagation if needed
            onCloseAutoFocus={(e: Event) => e.preventDefault()}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

// Styled Item
export const DropdownMenuItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean,
    icon?: IconName,
    iconColor?: string
}
>(({className, inset, icon, iconColor, ...props}, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={twMerge(
            // Base Radix preset styling
            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            // Customizations
            "hover:bg-black/10 data-[highlighted]:bg-black/15 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/15", // Subtle hover/highlight
            "focus:bg-black/15 dark:focus:bg-white/15", // Focus state
            inset && "pl-8", // Inset style if needed
            props['aria-selected'] === true && "bg-primary/15 text-primary font-medium hover:bg-primary/20", // Selected style
            className
        )}
        {...props}
    >
        {icon && (
            <Icon
                name={icon}
                size={14}
                className={twMerge("mr-2 h-4 w-4 flex-shrink-0 opacity-80", iconColor)}
                aria-hidden="true"
            />
        )}
        {props.children}
    </DropdownMenuPrimitive.Item>
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

// Styled Checkbox Item
export const DropdownMenuCheckboxItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({className, children, checked, ...props}, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        className={twMerge(
            "relative flex cursor-pointer select-none items-center rounded-sm py-1 pl-7 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            "hover:bg-black/10 data-[highlighted]:bg-black/15 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/15",
            "focus:bg-black/15 dark:focus:bg-white/15",
            className
        )}
        checked={checked}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Icon name="check" className="h-4 w-4" strokeWidth={3}/>
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

// Styled Radio Item
export const DropdownMenuRadioItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({className, children, ...props}, ref) => (
    <DropdownMenuPrimitive.RadioItem
        ref={ref}
        className={twMerge(
            "relative flex cursor-pointer select-none items-center rounded-sm py-1 pl-7 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            "hover:bg-black/10 data-[highlighted]:bg-black/15 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/15",
            "focus:bg-black/15 dark:focus:bg-white/15",
            // Add selected state indication if needed, e.g., background or font weight
            props['aria-checked'] === true && "text-primary font-medium",
            className
        )}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Icon name="circle" className="h-2 w-2 fill-current"/>
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

// Styled Label
export const DropdownMenuLabel = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(({className, inset, ...props}, ref) => (
    <DropdownMenuPrimitive.Label
        ref={ref}
        className={twMerge(
            "px-2 py-1.5 text-xs font-semibold text-muted-foreground", // Adjusted style
            inset && "pl-8", className
        )}
        {...props}
    />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

// Styled Separator
export const DropdownMenuSeparator = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({className, ...props}, ref) => (
    <DropdownMenuPrimitive.Separator
        ref={ref}
        className={twMerge(
            "-mx-1 my-1 h-px bg-border", // Use theme border color
            className
        )}
        {...props}
    />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

// Styled Shortcut
export const DropdownMenuShortcut = ({
                                         className,
                                         ...props
                                     }: React.HTMLAttributes<HTMLSpanElement>) => {
    return (
        <span
            className={twMerge("ml-auto text-xs tracking-widest opacity-60", className)}
            {...props}
        />
    );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

// Styled Sub-components (Trigger, Content)
export const DropdownMenuSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({className, inset, children, ...props}, ref) => (
    <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={twMerge(
            "flex cursor-pointer select-none items-center rounded-sm px-2 py-1 text-sm outline-none focus:bg-black/15 data-[state=open]:bg-black/15 dark:focus:bg-white/15 dark:data-[state=open]:bg-white/15",
            inset && "pl-8",
            className
        )}
        {...props}
    >
        {children}
        <Icon name="chevron-right" className="ml-auto h-4 w-4"/>
    </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

export const DropdownMenuSubContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({className, ...props}, ref) => (
    <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={twMerge(
            // Base styles match main Content
            "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-black/10 bg-glass-100 backdrop-blur-xl p-1 shadow-strong data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
        )}
        {...props}
    />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

// Note: The original Dropdown component is now replaced by these exports.
// Usage would be like:
// import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/common/Dropdown';
//
// <DropdownMenu>
//   <DropdownMenuTrigger asChild>
//     <Button>Open</Button>
//   </DropdownMenuTrigger>
//   <DropdownMenuContent>
//     <DropdownMenuItem>Item 1</DropdownMenuItem>
//   </DropdownMenuContent>
// </DropdownMenu>