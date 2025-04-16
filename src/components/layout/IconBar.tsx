// src/components/layout/IconBar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon, { IconName } from '../common/Icon';
import { useAtom } from 'jotai';
import { currentUserAtom, isSettingsOpenAtom } from '@/store/atoms';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

const IconBar: React.FC = () => {
    const [currentUser] = useAtom(currentUserAtom);
    const [, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);

    // Updated navigation: All Tasks first, Calendar, Summary
    const navigationItems: { path: string; icon: IconName, label: string }[] = [
        { path: '/all', icon: 'archive', label: 'All Tasks' }, // Using 'archive' for "All"
        { path: '/calendar', icon: 'calendar-days', label: 'Calendar' },
        { path: '/summary', icon: 'sparkles', label: 'AI Summary' }, // Using 'sparkles' for AI Summary
    ];

    const handleAvatarClick = () => {
        setIsSettingsOpen(true);
    };

    const getNavLinkClass = ({ isActive }: { isActive: boolean }): string =>
        twMerge(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 ease-out group relative', // Added relative for potential ::before pseudo-elements
            isActive
                ? 'bg-primary/10 text-primary' // Subtle active state
                : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200' // Gentle hover
            // Consider adding a small indicator for active state, e.g., a left border or background change
        );


    return (
        // Apply glassmorphism effect here
        <div className="w-16 bg-glass/darker backdrop-blur-md border-r border-black/5 dark:border-white/5 flex flex-col items-center py-4 flex-shrink-0 z-20 shadow-sm">
            {/* App Logo Placeholder */}
            <div className="mb-6 mt-1 flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary via-blue-500 to-purple-500 rounded-lg text-white font-bold text-lg shadow-inner">
                T
            </div>

            <nav className="flex flex-col items-center space-y-3 flex-1"> {/* Reduced space */}
                {navigationItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={getNavLinkClass}
                        title={item.label}
                        // Use end prop carefully, especially if nested routes exist
                        // 'end' might be needed for '/all' if other routes start with /all/
                        end={item.path === '/'} // Only use 'end' for the absolute root path if it existed
                    >
                        <Icon name={item.icon} size={20} />
                    </NavLink>
                ))}
            </nav>

            {/* Avatar / Settings Trigger */}
            <div className="mt-auto mb-1">
                <motion.button
                    onClick={handleAvatarClick}
                    className="w-8 h-8 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-alt"
                    whileHover={{ scale: 1.1, transition: { duration: 0.1 } }}
                    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                    title="Account Settings"
                >
                    {currentUser?.avatar ? (
                        <img
                            src={currentUser.avatar}
                            alt={currentUser.name || 'User Avatar'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-medium text-xs">
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
                        </div>
                    )}
                </motion.button>
            </div>
        </div>
    );
};

export default IconBar;