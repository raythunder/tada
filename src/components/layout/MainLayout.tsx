// src/components/layout/MainLayout.tsx
import React, { Suspense, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal'; // Now uses shadcn Dialog
import { useAtomValue } from 'jotai';
import { isSettingsOpenAtom, searchTermAtom } from '@/store/atoms';
import { cn } from "@/lib/utils";
import Icon from "@/components/common/Icon"; // Corrected path
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

// Enhanced Loading Spinner
const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-md z-50">
        <Icon name="loader" size={32} className="text-primary animate-spin" />
    </div>
);
LoadingSpinner.displayName = 'LoadingSpinner';

const MainLayout: React.FC = () => {
    const isSettingsOpen = useAtomValue(isSettingsOpenAtom);
    const searchTerm = useAtomValue(searchTermAtom);
    const location = useLocation();

    // Determine if sidebar should be shown
    const showSidebar = useMemo(() => {
        const isSearching = searchTerm.trim().length > 0;
        // Show sidebar if searching OR not on calendar/summary
        return isSearching || !['/calendar', '/summary'].some(path => location.pathname.startsWith(path));
    }, [searchTerm, location.pathname]);

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans antialiased">
            <IconBar />

            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Conditional Sidebar */}
                {showSidebar && (
                    <>
                        <ResizablePanel
                            defaultSize={20} // Percentage or pixels
                            minSize={15}
                            maxSize={30}
                            className="!overflow-visible" // Allow popovers/menus to overflow visually
                        >
                            {/* Sidebar Container */}
                            <div className={cn(
                                "h-full relative flex flex-col bg-card/30 dark:bg-card/10 backdrop-blur-lg border-r border-border/50 shadow-md transition-all duration-300 ease-apple"
                                // Use animate-fade-in if needed, or rely on ResizablePanel animation
                            )}>
                                <Sidebar />
                            </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                    </>
                )}

                <ResizablePanel defaultSize={showSidebar ? 80 : 100}>
                    {/* Main Content Area */}
                    <main className={cn(
                        "h-full flex-1 overflow-hidden relative flex flex-col min-w-0",
                        "bg-background/50 dark:bg-background/30 backdrop-blur-lg" // Subtle background effect
                    )}>
                        <Suspense fallback={<LoadingSpinner />}>
                            <Outlet /> {/* Renders the matched child route */}
                        </Suspense>
                    </main>
                </ResizablePanel>

            </ResizablePanelGroup>


            {/* Settings Modal - Rendered conditionally based on Jotai state */}
            {/* Uses shadcn Dialog internally now */}
            {isSettingsOpen && <SettingsModal />}
            {/* AddListModal is rendered within Sidebar */}
        </div>
    );
};
MainLayout.displayName = 'MainLayout';
export default MainLayout;