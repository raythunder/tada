// src/pages/SummaryPage.tsx
import React from 'react';
import SummaryView from '../components/summary/SummaryView';

const SummaryPage: React.FC = () => {
    // SummaryView is self-contained and applies its own glass effect.
    return <SummaryView />;
};

export default SummaryPage;