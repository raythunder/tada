// src/App.tsx
import React, {useEffect, useRef} from 'react';
import { Routes, Route, useParams, Navigate, useLocation, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { TaskFilter } from './types';
import { useAtom, useSetAtom } from 'jotai';
import { currentFilterAtom, selectedTaskIdAtom, searchTermAtom, tasksAtom } from './store/atoms';
import {startOfDay} from "@/utils/dateUtils.ts";

// Route Change Handler Component
// Updates global state (filter, selection, search) based on URL changes.
const RouteChangeHandler: React.FC = () => {
    const [currentFilterInternal, setCurrentFilter] = useAtom(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const setSearchTerm = useSetAtom(searchTermAtom);
    const location = useLocation();
    const params = useParams();

    // Effect runs when location or params change
    useEffect(() => {
        const { pathname } = location;
        // Decode list/tag names from URL parameters
        const listName = params.listName ? decodeURIComponent(params.listName) : '';
        const tagName = params.tagName ? decodeURIComponent(params.tagName) : '';

        let newFilter: TaskFilter = 'all'; // Default filter

        // Determine the filter based on the current pathname
        if (pathname === '/today') newFilter = 'today';
        else if (pathname === '/next7days') newFilter = 'next7days';
        else if (pathname === '/completed') newFilter = 'completed';
        else if (pathname === '/trash') newFilter = 'trash';
        else if (pathname.startsWith('/list/') && listName) newFilter = `list-${listName}`;
        else if (pathname.startsWith('/tag/') && tagName) newFilter = `tag-${tagName}`;
            // Treat Summary and Calendar as having an underlying 'all' context for data,
        // though their UI is different. This helps if we need background data fetching.
        else if (pathname === '/summary') newFilter = 'all'; // Or a specific filter if needed
        else if (pathname === '/calendar') newFilter = 'all'; // Or a specific filter if needed
        else if (pathname === '/all' || pathname === '/') newFilter = 'all';
        // Add handling for other routes or unrecognized paths if necessary
        // else console.warn("Unhandled path for filter:", pathname);

        // Update state ONLY if the filter has actually changed
        if (currentFilterInternal !== newFilter) {
            // console.log(`Route Change: Filter changing from ${currentFilterInternal} to ${newFilter}`);
            setCurrentFilter(newFilter);
            // Reset selection and search term when the main filter context changes
            setSelectedTaskId(null);
            setSearchTerm('');
        }

        // Dependencies ensure effect runs on relevant changes
    }, [location.pathname, params.listName, params.tagName, currentFilterInternal, setCurrentFilter, setSelectedTaskId, setSearchTerm]);

    return <Outlet />; // Renders the matched child route component (e.g., MainPage, CalendarPage)
};


// List Page Wrapper Component
// Extracts list name from URL and passes it to MainPage
const ListPageWrapper: React.FC = () => {
    const { listName } = useParams<{ listName: string }>();
    // Decode and provide fallback to 'Inbox' if somehow empty
    const decodedListName = listName ? decodeURIComponent(listName) : 'Inbox';
    // Redirect if decoding resulted in empty string (shouldn't happen with route path)
    if (!decodedListName) return <Navigate to="/list/Inbox" replace />;

    const filter: TaskFilter = `list-${decodedListName}`;
    return <MainPage title={decodedListName} filter={filter} />;
};

// Tag Page Wrapper Component
// Extracts tag name from URL and passes it to MainPage
const TagPageWrapper: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    const decodedTagName = tagName ? decodeURIComponent(tagName) : '';
    // Redirect if tag name is missing or empty
    if (!decodedTagName) return <Navigate to="/all" replace />;

    const filter: TaskFilter = `tag-${decodedTagName}`;
    return <MainPage title={`#${decodedTagName}`} filter={filter} />;
};

// Check Daily Task Refresh Component
// Requirement 5 Fix: Component to check date and trigger task category refresh if needed
const DailyTaskRefresh: React.FC = () => {
    const setTasks = useSetAtom(tasksAtom);
    const lastCheckDateRef = useRef<string>(startOfDay(new Date()).toISOString().split('T')[0]); // Store YYYY-MM-DD

    useEffect(() => {
        const checkDate = () => {
            const todayDate = startOfDay(new Date()).toISOString().split('T')[0];
            if (todayDate !== lastCheckDateRef.current) {
                // console.log("Date changed. Triggering task category refresh.");
                // Trigger a write to tasksAtom. The setter logic now handles recalculating all categories.
                // Passing the current state effectively triggers the setter's processing logic.
                setTasks(currentTasks => [...currentTasks]); // Trigger update by creating a new array reference
                lastCheckDateRef.current = todayDate; // Update last check date
            }
        };

        // Check immediately on mount
        checkDate();

        // Set up listeners for when the app likely becomes active again
        window.addEventListener('focus', checkDate); // Check when tab/window gains focus
        // Optional: Interval checking (use cautiously for performance)
        // const intervalId = setInterval(checkDate, 60 * 1000 * 5); // Check every 5 minutes

        // Cleanup listeners
        return () => {
            window.removeEventListener('focus', checkDate);
            // clearInterval(intervalId); // Clear interval if used
        };
    }, [setTasks]); // Dependency on setTasks

    return null; // This component doesn't render anything visible
};


// Main Application Component
const App: React.FC = () => {
    return (
        <>
            {/* Component to handle daily task refresh logic */}
            <DailyTaskRefresh />
            <Routes>
                {/* MainLayout wraps all authenticated routes */}
                <Route path="/" element={<MainLayout />}>
                    {/* RouteChangeHandler manages filter state based on nested routes */}
                    <Route element={<RouteChangeHandler/>}>
                        {/* Index route redirects to '/all' */}
                        <Route index element={<Navigate to="/all" replace />} />
                        {/* Core filter views */}
                        <Route path="all" element={<MainPage title="All Tasks" filter="all" />} />
                        <Route path="today" element={<MainPage title="Today" filter="today" />} />
                        <Route path="next7days" element={<MainPage title="Next 7 Days" filter="next7days" />} />
                        <Route path="completed" element={<MainPage title="Completed" filter="completed" />} />
                        <Route path="trash" element={<MainPage title="Trash" filter="trash" />} />
                        {/* Specific pages */}
                        <Route path="summary" element={<SummaryPage />} />
                        <Route path="calendar" element={<CalendarPage />} />
                        {/* Dynamic list and tag views */}
                        <Route path="list/:listName" element={<ListPageWrapper />} />
                        <Route path="list/" element={<Navigate to="/list/Inbox" replace />} /> {/* Handle trailing slash */}
                        <Route path="tag/:tagName" element={<TagPageWrapper />} />
                        <Route path="tag/" element={<Navigate to="/all" replace />} /> {/* Handle trailing slash */}
                        {/* Catch-all route redirects to '/all' */}
                        <Route path="*" element={<Navigate to="/all" replace />} />
                    </Route>
                </Route>
                {/* Add other top-level routes here if needed (e.g., Login) */}
            </Routes>
        </>
    );
};

export default App;