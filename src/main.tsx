import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './auth/AuthContext';
import { AuthFlowProvider } from './auth/AuthFlowContext';
import { ToastProvider } from './components/Toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthFlowProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthFlowProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
