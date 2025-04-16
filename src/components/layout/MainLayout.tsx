// src/components/layout/MainLayout.tsx
import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal';
import { useAtom } from 'jotai';
import { isSettingsOpenAtom } from '@/store/atoms';
import { AnimatePresence } from 'framer-motion';
import Icon from "@/components/common/Icon.tsx";
import { twMerge } from 'tailwind-merge';

// Simple loading spinner component
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full bg-canvas">
        <Icon name="loader" size={28} className="text-primary animate-spin" />
    </div>
);

const MainLayout: React.FC = () => {
    const [isSettingsOpen] = useAtom(isSettingsOpenAtom);
    const location = useLocation();

    // Determine if sidebar should be hidden based on route
    const hideSidebar = location.pathname.startsWith('/calendar') || location.pathname.startsWith('/summary');

    return (
        <div className="flex h-screen bg-canvas overflow-hidden">
            <IconBar />

            {/* Conditionally render Sidebar */}
            {!hideSidebar && <Sidebar />}

            {/* Main content area */}
            <main className={twMerge(
                "flex-1 overflow-hidden relative flex flex-col",
                // Add a subtle transition effect when sidebar hides/shows if desired
                // "transition-[margin-left] duration-300 ease-in-out",
                // hideSidebar ? "ml-0" : "ml-0" // Adjust margin if Sidebar had fixed width and wasn't part of flex
            )}>
                <Suspense fallback={<LoadingSpinner />}>
                    <Outlet /> {/* Outlet renders the matched route component */}
                </Suspense>
            </main>

            {/* Animated Settings Modal */}
            <AnimatePresence>
                {isSettingsOpen && <SettingsModal />}
            </AnimatePresence>
        </div>
    );
};

export default MainLayout;