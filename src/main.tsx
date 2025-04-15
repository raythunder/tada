// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as JotaiProvider } from 'jotai'; // Import Jotai Provider
import App from './App';
import './styles/index.css'; // Ensure CSS is imported

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* Wrap the App with Jotai Provider */}
        <JotaiProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </JotaiProvider>
    </React.StrictMode>
);