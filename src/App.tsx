// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { AppProvider } from './context/AppContext';

const App: React.FC = () => {
    return (
        <AppProvider>
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<MainPage title="All" />} />
                    <Route path="today" element={<MainPage title="Today" />} />
                    <Route path="next7days" element={<MainPage title="Next 7 Days" />} />
                    <Route path="inbox" element={<MainPage title="Inbox" />} />
                    <Route path="summary" element={<SummaryPage />} />
                    <Route path="completed" element={<MainPage title="Completed" />} />
                    <Route path="trash" element={<MainPage title="Trash" />} />
                    <Route path="calendar" element={<CalendarPage />} />
                </Route>
            </Routes>
        </AppProvider>
    );
};

export default App;