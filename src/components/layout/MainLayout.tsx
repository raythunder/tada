// src/components/layout/MainLayout.tsx
import React, {Suspense, useMemo} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal'; // Radix-based modal
import {useAtomValue} from 'jotai';
import {searchTermAtom} from '@/store/atoms';
import Icon from "@/components/common/Icon";
import {twMerge} from 'tailwind-merge';

// Loading spinner component (keep as is or refine style)
const LoadingSpinner: React.FC = () => (
    <div
        className="absolute inset-0 flex items-center justify-center bg-canvas/50 dark:bg-neutral-900/50 backdrop-blur-sm z-50">
        <Icon name="loader" size={32} className="text-primary animate-spin"/>
    </div>
);
LoadingSpinner.displayName = 'LoadingSpinner';

const MainLayout: React.FC = () => {
    const searchTerm = useAtomValue(searchTermAtom);
    const location = useLocation();

    // Sidebar visibility logic (remains the same)
    const hideSidebar = useMemo(() => {
        const isSearching = searchTerm.trim().length > 0;
        return !isSearching && ['/calendar', '/summary'].some(path => location.pathname.startsWith(path));
    }, [searchTerm, location.pathname]);

    return (
        // Main container with base background
        <div className="flex h-screen bg-canvas dark:bg-neutral-900 overflow-hidden font-sans">
            <IconBar/>

            {/* Conditional Sidebar rendering */}
            {!hideSidebar && (
                // Use relative positioning for potential absolute elements inside
                <div className="w-56 flex-shrink-0 h-full relative shadow-md z-10"> {/* Added shadow */}
                    <Sidebar/>
                </div>
            )}

            {/* Main Content Area */}
            <main className={twMerge(
                "flex-1 overflow-hidden relative flex flex-col min-w-0",
                // Use a slightly different background for the main content area for depth
                "bg-canvas-alt dark:bg-neutral-900"
            )}>
                {/* Suspense for lazy-loaded route components */}
                <Suspense fallback={<LoadingSpinner/>}>
                    <Outlet/> {/* Renders the matched child route */}
                </Suspense>
            </main>

            {/* Settings Modal (Radix Dialog, already portal-based) */}
            {/* No need to conditionally render here, Radix handles visibility */}
            <SettingsModal/>
            {/* AddListModal is now part of Sidebar and uses Radix Dialog */}
        </div>
    );
};
MainLayout.displayName = 'MainLayout';
export default MainLayout;