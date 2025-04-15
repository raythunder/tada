// src/components/layout/IconBar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom'; // Use NavLink for active state
import Icon, { IconName } from '../common/Icon';
import { useAtom } from 'jotai';
import { currentUserAtom, isSettingsOpenAtom } from '@/store/atoms';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

const IconBar: React.FC = () => {
    const [currentUser] = useAtom(currentUserAtom);
    const [, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);

    const navigationItems: { path: string; icon: IconName, label: string }[] = [
        { path: '/', icon: 'list', label: 'All Tasks' }, // Changed icon for "All"
        { path: '/calendar', icon: 'calendar-days', label: 'Calendar' }, // Updated icon
        { path: '/summary', icon: 'file-text', label: 'Summary' },
    ];

    const handleAvatarClick = () => {
        setIsSettingsOpen(true);
    };

    const getNavLinkClass = ({ isActive }: { isActive: boolean }): string =>
        twMerge(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 ease-in-out group',
            isActive
                ? 'bg-primary/15 text-primary' // Subtle active state
                : 'text-muted-foreground hover:bg-gray-500/10 hover:text-gray-800'
        );


    return (
        <div className="w-16 bg-glass/darker backdrop-blur-md border-r border-gray-200/80 flex flex-col items-center py-4 shadow-sm z-20">
            {/* App Logo Placeholder */}
            <div className="mb-6 mt-2 flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg text-white font-bold text-xl shadow-inner">
                T
            </div>

            <nav className="flex flex-col items-center space-y-4 flex-1">
                {navigationItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={getNavLinkClass}
                        title={item.label} // Tooltip
                        end // Use end prop for exact matching on "/"
                    >
                        <Icon name={item.icon} size={20} />
                    </NavLink>
                ))}
            </nav>

            {/* Avatar / Settings Trigger at the bottom */}
            <div className="mt-auto mb-2">
                <motion.button
                    onClick={handleAvatarClick}
                    className="w-9 h-9 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-alt"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title="Account Settings"
                >
                    {currentUser?.avatar ? (
                        <img
                            src={currentUser.avatar}
                            alt={currentUser.name || 'User Avatar'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-medium text-sm">
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                    )}
                </motion.button>
            </div>
        </div>
    );
};

export default IconBar;