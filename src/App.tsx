// src/App.tsx
import React from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { TaskFilter } from './types';
import { useAtom } from 'jotai';
import { currentFilterAtom } from './store/atoms';

// Helper component to set filter based on route params
const FilterSetter: React.FC<{ filter: TaskFilter; children: React.ReactElement }> = ({ filter, children }) => {
    const [, setCurrentFilter] = useAtom(currentFilterAtom);
    React.useEffect(() => {
        setCurrentFilter(filter);
    }, [filter, setCurrentFilter]);
    return children;
};

// Helper component to handle list/tag routes
const ListPageWrapper: React.FC = () => {
    const { listName } = useParams<{ listName: string }>();
    if (!listName) return <Navigate to="/" replace />; // Redirect if no list name
    const filter: TaskFilter = `list-${listName}`;
    return (
        <FilterSetter filter={filter}>
            <MainPage title={listName} filter={filter} />
        </FilterSetter>
    );
};

const TagPageWrapper: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    if (!tagName) return <Navigate to="/" replace />; // Redirect if no tag name
    const filter: TaskFilter = `tag-${tagName}`;
    return (
        <FilterSetter filter={filter}>
            <MainPage title={`#${tagName}`} filter={filter} />
        </FilterSetter>
    );
};

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                {/* Index route defaults to 'Inbox' filter */}
                <Route index element={
                    <FilterSetter filter="inbox">
                        <MainPage title="Inbox" filter="inbox" />
                    </FilterSetter>}
                />
                {/* Explicitly define filter for each route */}
                <Route path="all" element={
                    <FilterSetter filter="all">
                        <MainPage title="All Tasks" filter="all" />
                    </FilterSetter>}
                />
                <Route path="today" element={
                    <FilterSetter filter="today">
                        <MainPage title="Today" filter="today" />
                    </FilterSetter>}
                />
                <Route path="next7days" element={
                    <FilterSetter filter="next7days">
                        <MainPage title="Next 7 Days" filter="next7days" />
                    </FilterSetter>}
                />
                {/* Inbox explicitly handled by index route */}
                <Route path="summary" element={
                    <FilterSetter filter="all">
                        {/* Summary might need its own logic or default filter */}
                        <SummaryPage />
                    </FilterSetter>}
                />
                <Route path="completed" element={
                    <FilterSetter filter="completed">
                        <MainPage title="Completed" filter="completed" />
                    </FilterSetter>}
                />
                <Route path="trash" element={
                    <FilterSetter filter="trash">
                        <MainPage title="Trash" filter="trash" />
                    </FilterSetter>}
                />
                <Route path="calendar" element={
                    <FilterSetter filter="all">
                        {/* Calendar might show all tasks */}
                        <CalendarPage />
                    </FilterSetter>}
                />
                {/* Dynamic routes for lists and tags */}
                <Route path="list/:listName" element={<ListPageWrapper />} />
                <Route path="tag/:tagName" element={<TagPageWrapper />} />

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default App;