// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as JotaiProvider } from 'jotai'; // Jotai state provider
import App from './App'; // Main application component

import './styles/index.css'; // Import Tailwind CSS styles

// Find the root element in the HTML
const rootElement = document.getElementById('root');
if (!rootElement) {
    // Throw an error if the root element is not found, as React cannot mount.
    throw new Error("Failed to find the root element. Ensure your HTML has an element with id='root'.");
}

// Create a React root attached to the root element
const root = ReactDOM.createRoot(rootElement);

// Render the application within necessary providers
root.render(
    <React.StrictMode> {/* Helps identify potential problems in the app */}
        <JotaiProvider> {/* Provides Jotai state management context */}
            <BrowserRouter> {/* Provides routing context */}
                <App /> {/* Render the main application */}
            </BrowserRouter>
        </JotaiProvider>
    </React.StrictMode>
);