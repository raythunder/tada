// src/components/layout/IconBar.tsx
import React, {memo, useCallback, useMemo} from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import Icon from '../common/Icon';
import {useAtom, useAtomValue} from 'jotai';
import {currentUserAtom, isSettingsOpenAtom} from '@/store/atoms';
import {twMerge} from 'tailwind-merge';
import Button from "@/components/common/Button"; // Use refined Button
import {IconName} from "@/components/common/IconMap";
import * as TooltipPrimitive from '@radix-ui/react-tooltip'; // Import Radix Tooltip

// Reusable Tooltip Component Wrapper
const Tooltip = ({children, content, ...props}: TooltipPrimitive.TooltipProps & { content: React.ReactNode }) => {
    return (
        <TooltipPrimitive.Root {...props}>
            <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    sideOffset={5}
                    className={twMerge(
                        "z-50 overflow-hidden rounded-md bg-black/80 px-2 py-1 text-xs text-white shadow-md",
                        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                    )}
                >
                    {content}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
};

const IconBar: React.FC = memo(() => {
    const currentUser = useAtomValue(currentUserAtom);
    const [, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);
    const location = useLocation();

    const navigationItems: { path: string; icon: IconName, label: string }[] = useMemo(() => [
        {path: '/all', icon: 'archive', label: 'All Tasks'},
        {path: '/calendar', icon: 'calendar-days', label: 'Calendar'},
        {path: '/summary', icon: 'sparkles', label: 'AI Summary'},
    ], []);

    const handleAvatarClick = useCallback(() => {
        setIsSettingsOpen(true);
    }, [setIsSettingsOpen]);

    // NavLink active class logic (remains the same)
    const getNavLinkClass = useCallback((itemPath: string) => ({isActive}: { isActive: boolean }): string => {
        let isEffectivelyActive = isActive;
        if (itemPath === '/all') {
            const isTaskListRelatedView = !location.pathname.startsWith('/calendar') && !location.pathname.startsWith('/summary');
            isEffectivelyActive = isTaskListRelatedView;
        }

        return twMerge(
            // Base styling for NavLink as button
            'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 ease-apple group relative outline-none',
            // Active state
            isEffectivelyActive
                ? 'bg-primary/20 dark:bg-primary/30 text-primary backdrop-blur-sm ring-1 ring-inset ring-primary/30'
                : 'text-muted-foreground dark:text-neutral-400 hover:bg-black/15 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-neutral-200 hover:backdrop-blur-sm',
            // Focus visible state
            'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-glass-alt-100 dark:focus-visible:ring-offset-neutral-800'
        );
    }, [location.pathname]);

    return (
        // Use refined background/border
        <div
            className="w-16 bg-glass-alt-100 dark:bg-neutral-800/80 backdrop-blur-xl border-r border-black/5 dark:border-white/5 flex flex-col items-center py-4 flex-shrink-0 z-20 shadow-md">
            {/* App Logo */}
            <div
                className="mb-6 mt-1 flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary/90 to-blue-500/80 rounded-lg text-white font-bold text-xl shadow-inner select-none"
                aria-label="Tada App Logo">
                <span className="-mt-0.5">T</span>
            </div>

            {/* Main Navigation */}
            <nav className="flex flex-col items-center space-y-2 flex-1">
                {navigationItems.map((item) => (
                    // Wrap NavLink in Tooltip
                    <Tooltip key={item.path} content={item.label}>
                        <NavLink
                            to={item.path}
                            className={getNavLinkClass(item.path)}
                            aria-label={item.label}
                            end={item.path !== '/all'} // Exact match needed for calendar/summary
                        >
                            {/* Ensure icon is centered */}
                            <span className="flex items-center justify-center">
                                <Icon name={item.icon} size={20} strokeWidth={1.75}/>
                            </span>
                        </NavLink>
                    </Tooltip>
                ))}
            </nav>

            {/* User Avatar / Settings Trigger */}
            <div className="mt-auto mb-1">
                <Tooltip content="Account Settings">
                    <Button
                        onClick={handleAvatarClick}
                        variant="glass" size="icon"
                        className="w-9 h-9 rounded-full overflow-hidden p-0 border border-black/10 dark:border-white/10 shadow-inner hover:bg-black/15 dark:hover:bg-white/15 backdrop-blur-md"
                        aria-label="Account Settings"
                    >
                        {currentUser?.avatar ? (
                            <img src={currentUser.avatar} alt={currentUser.name || 'User Avatar'}
                                 className="w-full h-full object-cover"/>
                        ) : (
                            // Centered fallback initial/icon
                            <div
                                className="w-full h-full bg-gradient-to-br from-neutral-400 to-neutral-500 dark:from-neutral-500 dark:to-neutral-600 flex items-center justify-center text-white font-medium text-sm">
                                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() :
                                    <Icon name="user" size={16}/>}
                            </div>
                        )}
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
});
IconBar.displayName = 'IconBar';
export default IconBar;