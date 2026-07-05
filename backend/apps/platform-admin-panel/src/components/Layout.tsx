import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AdminApi, clearTokens, errorMessage, getAccessToken, getRefreshToken } from '../lib/api';
import type { Admin } from '../lib/types';

const AdminContext = createContext<Admin | null>(null);

export function useAdmin(): Admin {
  const admin = useContext(AdminContext);
  if (!admin) throw new Error('useAdmin must be used inside the authenticated layout');
  return admin;
}

export default function Layout() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken() && !getRefreshToken()) {
      navigate('/login', { replace: true });
      return;
    }
    AdminApi.me()
      .then(setAdmin)
      .catch((err) => setError(errorMessage(err)));
  }, [navigate]);

  const logout = () => {
    AdminApi.logout().catch(() => undefined);
    clearTokens();
    navigate('/login', { replace: true });
  };

  if (error) {
    return (
      <div className="center-screen">
        <div className="card auth-error-card">
          <p className="form-error">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="center-screen">
        <div className="muted">Loading console…</div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={admin}>
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="sidebar-mark" aria-hidden>
              ◆
            </span>
            <div>
              <div className="sidebar-title">Civic Platform</div>
              <div className="sidebar-sub">Console</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Tenants
            </NavLink>
            <NavLink to="/admins" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Admins
            </NavLink>
          </nav>
          <div className="sidebar-footer">SaaS operator console</div>
        </aside>
        <div className="main-col">
          <header className="topbar">
            <div className="topbar-spacer" />
            <div className="topbar-user">
              <span className="topbar-name">{admin.name}</span>
              <span className={`role-badge role-${admin.role}`}>
                {admin.role === 'platform_admin' ? 'Platform admin' : 'Tenant admin'}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                Log out
              </button>
            </div>
          </header>
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
