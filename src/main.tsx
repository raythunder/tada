// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {Provider as JotaiProvider} from 'jotai';
import App from './App';
// Import Radix UI Tooltip Provider - Wrap your app or relevant part
import * as Tooltip from '@radix-ui/react-tooltip';

// Import base styles LAST to ensure Tailwind utilities override defaults
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element. Ensure your HTML has an element with id='root'.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        {/* Jotai Provider for global state */}
        <JotaiProvider>
            {/* Radix Tooltip Provider */}
            <Tooltip.Provider delayDuration={300}> {/* Adjust delay as needed */}
                {/* BrowserRouter for routing */}
                <BrowserRouter>
                    <App/>
                </BrowserRouter>
            </Tooltip.Provider>
        </JotaiProvider>
    </React.StrictMode>
);

/// <reference types="vite/client" />