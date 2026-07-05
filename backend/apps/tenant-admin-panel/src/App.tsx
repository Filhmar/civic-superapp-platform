import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toasts';
import { AuthLayout } from './components/AuthLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Branding } from './pages/Branding';
import { Modules } from './pages/Modules';
import { Content } from './pages/Content';
import { Operations } from './pages/Operations';
import { Audit } from './pages/Audit';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AuthLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/branding" element={<Branding />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/content" element={<Content />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/audit" element={<Audit />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
