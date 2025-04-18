// src/pages/CalendarPage.tsx
import React from 'react';
import CalendarView from '../components/calendar/CalendarView';

const CalendarPage: React.FC = () => {
    // CalendarView is self-contained and handles its layout
    // It will inherit the glass background from the main layout if applied there,
    // or it applies its own glass effect internally.
    return <CalendarView />;
};

export default CalendarPage;