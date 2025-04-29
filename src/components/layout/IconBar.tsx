// src/components/layout/IconBar.tsx
import React, { memo, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';
import { useAtom, useAtomValue } from 'jotai';
import { currentUserAtom, isSettingsOpenAtom, settingsSelectedTabAtom } from '@/store/atoms';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconName } from "@/components/common/IconMap";

const IconBar: React.FC = memo(() => {
    const currentUser = useAtomValue(currentUserAtom);
    const [, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);
    const [, setSettingsTab] = useAtom(settingsSelectedTabAtom);
    const location = useLocation();

    const navigationItems: { path: string; icon: IconName, label: string }[] = useMemo(() => [
        { path: '/all', icon: 'archive', label: 'Tasks' }, // Shortened label for tooltip
        { path: '/calendar', icon: 'calendar-days', label: 'Calendar' },
        { path: '/summary', icon: 'sparkles', label: 'AI Summary' },
    ], []);

    // Handler to open settings modal directly to account tab
    const handleOpenSettings = useCallback((tab: 'account' | 'logout' = 'account') => {
        if (tab === 'logout') {
            console.log("Logout action triggered");
            // Implement actual logout logic here
            // Maybe clear currentUserAtom, redirect to login page, etc.
        } else {
            setSettingsTab(tab);
            setIsSettingsOpen(true);
        }
    }, [setIsSettingsOpen, setSettingsTab]);

    // Determine active state for NavLink-like buttons
    const isNavItemActive = useCallback((itemPath: string): boolean => {
        if (itemPath === '/all') {
            // Active if not Calendar or Summary
            return !location.pathname.startsWith('/calendar') && !location.pathname.startsWith('/summary');
        }
        // Exact match for other top-level routes
        return location.pathname === itemPath || location.pathname.startsWith(itemPath + '/');
    }, [location.pathname]);

    const avatarInitial = useMemo(() => currentUser?.name?.charAt(0).toUpperCase(), [currentUser?.name]);

    return (
        <div className="w-16 bg-background/60 dark:bg-black/30 backdrop-blur-xl border-r border-border/60 flex flex-col items-center py-3 flex-shrink-0 z-20 shadow-lg">
            {/* App Logo */}
            <Link to="/all" className="mb-5 mt-1 flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg text-primary-foreground font-bold text-xl shadow-inner select-none hover:opacity-90 transition-opacity" aria-label="Tada Home" title="Tada">
                <span className="-mt-0.5">T</span>
            </Link>

            {/* Main Navigation */}
            <nav className="flex flex-col items-center space-y-2 flex-1">
                {navigationItems.map((item) => {
                    const isActive = isNavItemActive(item.path);
                    return (
                        <Tooltip key={item.path}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "w-10 h-10 rounded-lg transition-all duration-200 ease-apple", // Consistent size and shape
                                        isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                    asChild // Important: Button renders Link
                                >
                                    <Link to={item.path} aria-label={item.label} aria-current={isActive ? 'page' : undefined}>
                                        <Icon name={item.icon} size={20} strokeWidth={isActive ? 2 : 1.75} />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="tooltip-content">
                                <p>{item.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </nav>

            {/* User Avatar / Settings Trigger */}
            <div className="mt-auto mb-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost" // Changed to ghost for consistency
                            size="icon"
                            className="w-9 h-9 rounded-full overflow-hidden p-0 border border-border/50 shadow-inner hover:bg-accent focus:ring-1 focus:ring-ring"
                            aria-label="Account Menu"
                        >
                            <Avatar className="w-full h-full">
                                <AvatarImage src={currentUser?.avatar} alt={currentUser?.name || 'User'} />
                                <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
                                    {avatarInitial || <Icon name="user" size={16} />}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="center" className="w-48 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                        {currentUser && (
                            <>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem onSelect={() => handleOpenSettings('account')} className="cursor-pointer">
                            <Icon name="user" size={14} className="mr-2 opacity-70" />
                            Account Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenSettings('logout')} className="cursor-pointer !text-destructive focus:!bg-destructive/10 focus:!text-destructive">
                            <Icon name="logout" size={14} className="mr-2 opacity-70" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});
IconBar.displayName = 'IconBar';
export default IconBar;