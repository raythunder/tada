// src/App.tsx
import React, {useEffect, useRef} from 'react';
import {Navigate, Outlet, Route, Routes, useLocation, useParams} from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import {TaskFilter} from './types';
import {useAtom, useSetAtom} from 'jotai';
import {currentFilterAtom, selectedTaskIdAtom, tasksAtom} from './store/atoms';
import {startOfDay} from "@/utils/dateUtils";

// Route Change Handler Component
// Updates filter state based on URL, resets selection. Search term is NOT reset here.
// No UI changes needed here.
const RouteChangeHandler: React.FC = () => {
    const [currentFilterInternal, setCurrentFilter] = useAtom(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const location = useLocation();
    const params = useParams();

    useEffect(() => {
        const {pathname} = location;
        const listName = params.listName ? decodeURIComponent(params.listName) : '';
        const tagName = params.tagName ? decodeURIComponent(params.tagName) : '';

        let newFilter: TaskFilter = 'all'; // Default filter

        // Determine filter based on path
        if (pathname === '/today') newFilter = 'today';
        else if (pathname === '/next7days') newFilter = 'next7days';
        else if (pathname === '/completed') newFilter = 'completed';
        else if (pathname === '/trash') newFilter = 'trash';
        else if (pathname.startsWith('/list/') && listName) newFilter = `list-${listName}`;
        else if (pathname.startsWith('/tag/') && tagName) newFilter = `tag-${tagName}`;
        else if (pathname === '/summary') newFilter = 'all'; // Use 'all' context for summary
        else if (pathname === '/calendar') newFilter = 'all'; // Use 'all' context for calendar
        else if (pathname === '/all' || pathname === '/') newFilter = 'all';

        // Update filter only if it has actually changed
        if (currentFilterInternal !== newFilter) {
            // console.log(`Route Change: Filter changing from ${currentFilterInternal} to ${newFilter}`);
            setCurrentFilter(newFilter);
            // Reset selection when the main filter context changes
            setSelectedTaskId(null);
        }
    }, [location.pathname, params.listName, params.tagName, currentFilterInternal, setCurrentFilter, setSelectedTaskId]);

    return <Outlet/>; // Renders the matched child route component
};
RouteChangeHandler.displayName = 'RouteChangeHandler';

// List Page Wrapper Component
// No UI changes needed here.
const ListPageWrapper: React.FC = () => {
    const {listName} = useParams<{ listName: string }>();
    const decodedListName = listName ? decodeURIComponent(listName) : 'Inbox';
    if (!decodedListName) return <Navigate to="/list/Inbox" replace/>;
    const filter: TaskFilter = `list-${decodedListName}`;
    return <MainPage title={decodedListName} filter={filter}/>;
};
ListPageWrapper.displayName = 'ListPageWrapper';

// Tag Page Wrapper Component
// No UI changes needed here.
const TagPageWrapper: React.FC = () => {
    const {tagName} = useParams<{ tagName: string }>();
    const decodedTagName = tagName ? decodeURIComponent(tagName) : '';
    if (!decodedTagName) return <Navigate to="/all" replace/>;
    const filter: TaskFilter = `tag-${decodedTagName}`;
    return <MainPage title={`#${decodedTagName}`} filter={filter}/>;
};
TagPageWrapper.displayName = 'TagPageWrapper';

// Component to trigger task category refresh when the date changes
// No UI changes needed here.
const DailyTaskRefresh: React.FC = () => {
    const setTasks = useSetAtom(tasksAtom);
    const lastCheckDateRef = useRef<string>(startOfDay(new Date()).toISOString().split('T')[0]);

    useEffect(() => {
        const checkDate = () => {
            const todayDate = startOfDay(new Date()).toISOString().split('T')[0];
            if (todayDate !== lastCheckDateRef.current) {
                console.log(`Date changed from ${lastCheckDateRef.current} to ${todayDate}. Triggering task category refresh.`);
                setTasks(currentTasks => [...currentTasks]);
                lastCheckDateRef.current = todayDate;
            }
        };

        checkDate();
        const intervalId = setInterval(checkDate, 60 * 1000);
        window.addEventListener('focus', checkDate);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', checkDate);
        };
    }, [setTasks]);

    return null; // No visual output
};
DailyTaskRefresh.displayName = 'DailyTaskRefresh';

// Main Application Component
// Structure remains the same, routing handles the page views.
const App: React.FC = () => {
    return (
        <>
            <DailyTaskRefresh/>
            <Routes>
                {/* MainLayout provides the core structure */}
                <Route path="/" element={<MainLayout/>}>
                    {/* RouteChangeHandler manages filter state globally */}
                    <Route element={<RouteChangeHandler/>}>
                        {/* Index route redirects */}
                        <Route index element={<Navigate to="/all" replace/>}/>
                        {/* Standard filter views rendered within MainPage */}
                        <Route path="all" element={<MainPage title="All Tasks" filter="all"/>}/>
                        <Route path="today" element={<MainPage title="Today" filter="today"/>}/>
                        <Route path="next7days" element={<MainPage title="Next 7 Days" filter="next7days"/>}/>
                        <Route path="completed" element={<MainPage title="Completed" filter="completed"/>}/>
                        <Route path="trash" element={<MainPage title="Trash" filter="trash"/>}/>
                        {/* Dedicated views */}
                        <Route path="summary" element={<SummaryPage/>}/>
                        <Route path="calendar" element={<CalendarPage/>}/>
                        {/* Dynamic list view */}
                        <Route path="list/:listName" element={<ListPageWrapper/>}/>
                        <Route path="list/" element={<Navigate to="/list/Inbox" replace/>}/>
                        {/* Dynamic tag view */}
                        <Route path="tag/:tagName" element={<TagPageWrapper/>}/>
                        <Route path="tag/" element={<Navigate to="/all" replace/>}/>
                        {/* Catch-all route */}
                        <Route path="*" element={<Navigate to="/all" replace/>}/>
                    </Route>
                </Route>
            </Routes>
        </>
    );
};
App.displayName = 'App';
export default App;