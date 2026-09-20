import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppSettingsProvider } from '@/contexts/AppSettingsContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import App from '@/App';
import '@/css/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppSettingsProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppSettingsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
