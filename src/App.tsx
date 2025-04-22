// src/App.tsx
import React, {useEffect, useRef} from 'react';
import { Routes, Route, useParams, Navigate, useLocation, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { TaskFilter } from './types';
import { useAtom, useSetAtom } from 'jotai';
import { currentFilterAtom, selectedTaskIdAtom, tasksAtom } from './store/atoms';
import {startOfDay} from "@/utils/dateUtils.ts";

// Route Change Handler Component
// Updates filter state based on URL, resets selection. Search term is NOT reset here anymore.
const RouteChangeHandler: React.FC = () => {
    const [currentFilterInternal, setCurrentFilter] = useAtom(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    // const setSearchTerm = useSetAtom(searchTermAtom); // Req 3: Don't reset search term here
    const location = useLocation();
    const params = useParams();

    useEffect(() => {
        const { pathname } = location;
        const listName = params.listName ? decodeURIComponent(params.listName) : '';
        const tagName = params.tagName ? decodeURIComponent(params.tagName) : '';

        let newFilter: TaskFilter = 'all';

        if (pathname === '/today') newFilter = 'today';
        else if (pathname === '/next7days') newFilter = 'next7days';
        else if (pathname === '/completed') newFilter = 'completed';
        else if (pathname === '/trash') newFilter = 'trash';
        else if (pathname.startsWith('/list/') && listName) newFilter = `list-${listName}`;
        else if (pathname.startsWith('/tag/') && tagName) newFilter = `tag-${tagName}`;
        else if (pathname === '/summary') newFilter = 'all'; // Context for summary/calendar
        else if (pathname === '/calendar') newFilter = 'all'; // Context for summary/calendar
        else if (pathname === '/all' || pathname === '/') newFilter = 'all';

        // Update filter only if it changes
        if (currentFilterInternal !== newFilter) {
            // console.log(`Route Change: Filter changing from ${currentFilterInternal} to ${newFilter}`);
            setCurrentFilter(newFilter);
            // Reset selection when the main filter context changes manually
            setSelectedTaskId(null);
            // Req 3: Do NOT reset search term automatically on navigation
            // setSearchTerm('');
        }
    }, [location.pathname, params.listName, params.tagName, currentFilterInternal, setCurrentFilter, setSelectedTaskId]); // Removed setSearchTerm

    return <Outlet />; // Renders the matched child route component
};


// List Page Wrapper Component
const ListPageWrapper: React.FC = () => {
    const { listName } = useParams<{ listName: string }>();
    const decodedListName = listName ? decodeURIComponent(listName) : 'Inbox';
    if (!decodedListName) return <Navigate to="/list/Inbox" replace />;
    const filter: TaskFilter = `list-${decodedListName}`;
    // Pass filter for context, MainPage will use global state primarily
    return <MainPage title={decodedListName} filter={filter} />;
};

// Tag Page Wrapper Component
const TagPageWrapper: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    const decodedTagName = tagName ? decodeURIComponent(tagName) : '';
    if (!decodedTagName) return <Navigate to="/all" replace />;
    const filter: TaskFilter = `tag-${decodedTagName}`;
    // Pass filter for context, MainPage will use global state primarily
    return <MainPage title={`#${decodedTagName}`} filter={filter} />;
};

// Check Daily Task Refresh Component (Handles Requirement 5 from original prompt)
const DailyTaskRefresh: React.FC = () => {
    const setTasks = useSetAtom(tasksAtom);
    // Store only the date part (YYYY-MM-DD) for comparison
    const lastCheckDateRef = useRef<string>(startOfDay(new Date()).toISOString().split('T')[0]);

    useEffect(() => {
        const checkDate = () => {
            const todayDate = startOfDay(new Date()).toISOString().split('T')[0];
            if (todayDate !== lastCheckDateRef.current) {
                console.log("Date changed. Triggering task category refresh.");
                // Trigger a write to tasksAtom. The setter logic now handles recalculating all categories.
                // Passing the current state effectively triggers the setter's processing logic.
                setTasks(currentTasks => [...currentTasks]); // Create new array reference to trigger update
                lastCheckDateRef.current = todayDate; // Update last check date
            }
        };

        checkDate(); // Check immediately

        // Check when window gains focus
        window.addEventListener('focus', checkDate);

        // Cleanup listener
        return () => {
            window.removeEventListener('focus', checkDate);
        };
    }, [setTasks]);

    return null; // Component renders nothing
};


// Main Application Component
const App: React.FC = () => {
    return (
        <>
            <DailyTaskRefresh />
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    {/* RouteChangeHandler sets filter state based on URL */}
                    <Route element={<RouteChangeHandler/>}>
                        <Route index element={<Navigate to="/all" replace />} />
                        <Route path="all" element={<MainPage title="All Tasks" filter="all" />} />
                        <Route path="today" element={<MainPage title="Today" filter="today" />} />
                        <Route path="next7days" element={<MainPage title="Next 7 Days" filter="next7days" />} />
                        <Route path="completed" element={<MainPage title="Completed" filter="completed" />} />
                        <Route path="trash" element={<MainPage title="Trash" filter="trash" />} />
                        <Route path="summary" element={<SummaryPage />} />
                        <Route path="calendar" element={<CalendarPage />} />
                        <Route path="list/:listName" element={<ListPageWrapper />} />
                        <Route path="list/" element={<Navigate to="/list/Inbox" replace />} />
                        <Route path="tag/:tagName" element={<TagPageWrapper />} />
                        <Route path="tag/" element={<Navigate to="/all" replace />} />
                        <Route path="*" element={<Navigate to="/all" replace />} />
                    </Route>
                </Route>
            </Routes>
        </>
    );
};

export default App;