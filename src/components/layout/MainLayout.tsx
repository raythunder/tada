// src/components/layout/MainLayout.tsx
import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal';
import { useAtomValue } from 'jotai';
import { isSettingsOpenAtom, searchTermAtom } from '@/store/atoms';
import Icon from "@/components/common/Icon";
import { twMerge } from 'tailwind-merge';
// import AddListModal from '@/components/common/AddListModal'; // Import modal for rendering here if needed

// Simple loading spinner
const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-glass/70 backdrop-blur-md z-50">
        <Icon name="loader" size={32} className="text-primary animate-spin" />
    </div>
);

const MainLayout: React.FC = () => {
    const isSettingsOpen = useAtomValue(isSettingsOpenAtom);
    const searchTerm = useAtomValue(searchTermAtom);
    const location = useLocation();

    // Determine if Sidebar should be hidden
    // Hide Sidebar if not searching AND on Calendar or Summary pages
    const hideSidebar = !searchTerm && ['/calendar', '/summary'].some(path => location.pathname.startsWith(path));

    // AddListModal state is managed in Sidebar, but rendered here to overlay properly
    // const isAddListModalOpen = useAtomValue(isAddListModalOpenAtom); // Uncomment if moving modal render here

    return (
        <div className="flex h-screen bg-canvas-alt overflow-hidden font-sans">
            <IconBar />

            {/* Conditional Sidebar rendering without motion/transition */}
            {!hideSidebar && (
                <div className="w-56 flex-shrink-0 h-full relative"> {/* Fixed width */}
                    <Sidebar />
                </div>
            )}

            {/* Main Content Area */}
            <main className={twMerge(
                "flex-1 overflow-hidden relative flex flex-col min-w-0", // Flex properties for layout
                "bg-glass/30 backdrop-blur-lg" // Background styling
            )}>
                {/* Suspense for lazy-loaded route components */}
                <Suspense fallback={<LoadingSpinner />}>
                    <Outlet /> {/* Renders the matched child route */}
                </Suspense>
            </main>

            {/* Modals - Render based on Jotai state, no AnimatePresence */}
            {/* Render modals here ensures they are above other layout elements */}
            {isSettingsOpen && <SettingsModal key="settings-modal" />}
            {/* Example: If AddListModal rendering is moved here */}
            {/* {isAddListModalOpen && <AddListModal onAdd={...} />}  */}
            {/* Add other global modals here */}
        </div>
    );
};

export default MainLayout;