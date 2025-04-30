// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {Provider as JotaiProvider} from 'jotai';
import App from './App';
import 'react-tooltip/dist/react-tooltip.css'; // Keep if using react-tooltip externally
import {TooltipProvider} from '@radix-ui/react-tooltip'; // Import Radix Tooltip Provider
import './styles/index.css'; // Import Tailwind CSS

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element. Ensure your HTML has an element with id='root'.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        {/* Jotai Provider for global state */}
        <JotaiProvider>
            {/* Radix Tooltip Provider at the root for global tooltip management */}
            <TooltipProvider delayDuration={300}>
                {/* BrowserRouter for routing */}
                <BrowserRouter>
                    <App/>
                </BrowserRouter>
            </TooltipProvider>
        </JotaiProvider>
    </React.StrictMode>
);

/// <reference types="vite/client" />