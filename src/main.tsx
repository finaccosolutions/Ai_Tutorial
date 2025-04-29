import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { LessonProvider } from './contexts/LessonContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UserPreferencesProvider>
          <LessonProvider>
            <App />
          </LessonProvider>
        </UserPreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);