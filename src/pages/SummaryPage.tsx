// src/pages/SummaryPage.tsx
import React from 'react';
import SummaryView from '../components/summary/SummaryView';

// Simple wrapper component for the Summary View
const SummaryPage: React.FC = () => {
    // SummaryView handles its own state and logic
    return <SummaryView />;
};

export default SummaryPage; // No need to memoize page components usually