// src/components/layout/MainLayout.tsx
import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal';
import { useAtomValue } from 'jotai';
import { isSettingsOpenAtom, searchTermAtom } from '@/store/atoms'; // Added searchTermAtom
import { AnimatePresence, motion } from 'framer-motion';
import Icon from "@/components/common/Icon";
import { twMerge } from 'tailwind-merge';

// Simple Loading Spinner Component
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full bg-canvas">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-primary"
        >
            <Icon name="loader" size={28} />
        </motion.div>
    </div>
);

// Main Layout Component
const MainLayout: React.FC = () => {
    const isSettingsOpen = useAtomValue(isSettingsOpenAtom);
    const searchTerm = useAtomValue(searchTermAtom); // Read search term
    const location = useLocation();

    // Determine if sidebar should be hidden based on route path
    // Hide for Calendar and Summary views
    // Keep sidebar if searching, even on calendar/summary (allows search result navigation)
    const hideSidebar = !searchTerm && ['/calendar', '/summary'].some(path => location.pathname.startsWith(path));

    return (
        <div className="flex h-screen bg-canvas overflow-hidden">
            <IconBar />

            <AnimatePresence initial={false}>
                {!hideSidebar && (
                    <motion.div
                        key="sidebar"
                        initial={{ width: 0, opacity: 0, marginRight: '-1px' }}
                        animate={{ width: 224, opacity: 1, marginRight: '0px' }}
                        exit={{ width: 0, opacity: 0, marginRight: '-1px', transition: { duration: 0.18, ease: 'easeIn' } }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="flex-shrink-0 h-full"
                        style={{ overflow: 'hidden' }}
                    >
                        <Sidebar />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main content area */}
            <main className={twMerge(
                "flex-1 overflow-hidden relative flex flex-col min-w-0",
                // Apply a base glass effect to the main content area backdrop if desired
                // "bg-glass/50 backdrop-blur-lg"
            )}>
                <Suspense fallback={<LoadingSpinner />}>
                    <Outlet />
                </Suspense>
            </main>

            {/* Animated Modals */}
            <AnimatePresence>
                {isSettingsOpen && <SettingsModal key="settings-modal" />}
            </AnimatePresence>
        </div>
    );
};

export default MainLayout;