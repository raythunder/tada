import React, {Suspense, useMemo, useState, useCallback, useEffect} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal';
import Icon from "@/components/ui/Icon.tsx";
import {twMerge} from 'tailwind-merge';
import {useAtomValue} from "jotai";
import {isZenFullScreenAtom} from "@/store/jotai.ts";
import useMediaQuery from '@/hooks/useMediaQuery';
import Button from "@/components/ui/Button.tsx";

/**
 * A loading spinner component displayed as a fallback for suspended content.
 */
const LoadingSpinner: React.FC = () => (
    <div
        className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-grey-deep/70 z-50 backdrop-blur-sm">
        <Icon name="loader" size={24} className="text-primary dark:text-primary-light animate-spin" strokeWidth={1.5}/>
    </div>
);
LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * The main layout structure for the application.
 * It includes the primary navigation `IconBar`, the secondary `Sidebar`,
 * and the main content area which renders child routes via `<Outlet />`.
 */
const MainLayout: React.FC = () => {
    const location = useLocation();
    const isZenFullScreen = useAtomValue(isZenFullScreenAtom);
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    // Determine if the sidebar should be hidden based on the current route.
    const hideSidebar = useMemo(() => {
        return ['/calendar', '/summary', '/zen', '/echo'].some(path => location.pathname.startsWith(path));
    }, [location.pathname]);

    const closeMobileNav = useCallback(() => {
        setIsMobileNavOpen(false);
    }, []);

    useEffect(() => {
        setIsMobileNavOpen(false);
    }, [location.pathname]);

    return (
        <div
            className="flex min-h-screen h-[100dvh] bg-transparent overflow-hidden font-primary">
            {isDesktop && !isZenFullScreen && <IconBar/>}
            {isDesktop && !hideSidebar && !isZenFullScreen && (
                <div className={twMerge(
                    "w-[240px] flex-shrink-0 h-full relative border-r border-grey-light/50 dark:border-grey-deep/50",
                    "bg-white/50 dark:bg-grey-deep/50 backdrop-blur-md transition-colors duration-300"
                )}>
                    <Sidebar/>
                </div>
            )}
            <main className={twMerge(
                "flex-1 overflow-hidden relative flex flex-col min-w-0",
                "bg-white/50 dark:bg-grey-deep/50 backdrop-blur-md transition-colors duration-300"
            )}>
                {!isDesktop && !isZenFullScreen && (
                    <div className="fixed top-3 left-3 z-[70]">
                        <Button
                            size="icon"
                            variant="ghost"
                            icon="align-left"
                            aria-label="Open navigation"
                            onClick={() => setIsMobileNavOpen(true)}
                            className="bg-white/80 dark:bg-grey-deep/80 backdrop-blur-md shadow-interactive"
                        />
                    </div>
                )}
                <Suspense fallback={<LoadingSpinner/>}>
                    <Outlet/>
                </Suspense>
            </main>
            <SettingsModal/>
            {!isDesktop && isMobileNavOpen && !isZenFullScreen && (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        aria-label="Close navigation"
                        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                        onClick={closeMobileNav}
                    />
                    <div className={twMerge(
                        "absolute left-0 top-0 h-full flex",
                        hideSidebar ? "w-[80px]" : "w-[320px] max-w-[85%]",
                        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                        "bg-white/95 dark:bg-grey-deep/95 border-r border-grey-light/50 dark:border-grey-deep/50 shadow-2xl"
                    )}>
                        <IconBar/>
                        {!hideSidebar && (
                            <div className="flex-1 overflow-hidden">
                                <Sidebar/>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
MainLayout.displayName = 'MainLayout';
export default MainLayout;
