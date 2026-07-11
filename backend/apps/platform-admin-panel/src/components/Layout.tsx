import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AdminApi, clearTokens, errorMessage, getAccessToken, getRefreshToken } from '../lib/api';
import type { Admin, Tenant } from '../lib/types';
import { Icon, LogoMark } from './Icons';

const AdminContext = createContext<Admin | null>(null);
const TenantsIndexContext = createContext<Tenant[]>([]);

export function useAdmin(): Admin {
  const admin = useContext(AdminContext);
  if (!admin) throw new Error('useAdmin must be used inside the authenticated layout');
  return admin;
}

/** Tenant directory fetched once by the shell (badge count, breadcrumbs). */
export function useTenantsIndex(): Tenant[] {
  return useContext(TenantsIndexContext);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken() && !getRefreshToken()) {
      navigate('/login', { replace: true });
      return;
    }
    AdminApi.me()
      .then(setAdmin)
      .catch((err) => setError(errorMessage(err)));
    AdminApi.tenants()
      .then(setTenants)
      .catch(() => undefined);
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
          <div className="form-error">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
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
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton" style={{ width: '82%' }} />
          <div className="skeleton" style={{ width: '64%' }} />
          <div className="skeleton" style={{ width: '92%' }} />
        </div>
      </div>
    );
  }

  // Topbar title / breadcrumb from the route.
  const tenantMatch = /^\/tenants\/([^/]+)/.exec(location.pathname);
  const crumbTenant = tenantMatch
    ? (tenants.find((t) => t.id === tenantMatch[1])?.name ?? tenantMatch[1])
    : null;
  const pageTitle = crumbTenant ?? (location.pathname === '/admins' ? 'Administrators' : 'Tenants');
  const platformAdmin = admin.role === 'platform_admin';

  return (
    <AdminContext.Provider value={admin}>
      <TenantsIndexContext.Provider value={tenants}>
        <div className="shell">
          <aside className="sidebar">
            <div className="sidebar-brand">
              <span className="brand-tile" aria-hidden>
                <LogoMark size={17} />
              </span>
              <div>
                <div className="sidebar-title">Civic Platform</div>
                <div className="sidebar-sub">Console</div>
              </div>
            </div>
            <nav className="sidebar-nav">
              <div className="nav-section-label">Operations</div>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive || tenantMatch ? 'nav-link active' : 'nav-link'
                }
              >
                <Icon name="bell" />
                <span>Tenants</span>
                {tenants.length > 0 && <span className="nav-count">{tenants.length}</span>}
              </NavLink>
              <NavLink
                to="/admins"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                <Icon name="users" />
                <span>Admins</span>
              </NavLink>
            </nav>
            <div className="sidebar-footer">
              <div className="sidebar-identity">
                <span className="identity-avatar">{initials(admin.name)}</span>
                <div>
                  <div className="identity-name">{admin.name}</div>
                  <div className="identity-sub">
                    {tenants.length} tenant{tenants.length === 1 ? '' : 's'} live
                  </div>
                </div>
                <span className="presence-dot" />
              </div>
            </div>
          </aside>
          <div className="main-col">
            <header className="topbar">
              <span className="topbar-title">{pageTitle}</span>
              {crumbTenant && (
                <span className="topbar-crumb">
                  <Icon name="chevron-right" />
                  <span className="crumb-current">{crumbTenant}</span>
                </span>
              )}
              <div className="topbar-spacer" />
              <div className="topbar-search" aria-hidden>
                <Icon name="search" />
                <span>Search tenants, tickets…</span>
                <span className="kbd">⌘K</span>
              </div>
              <div className="topbar-identity">
                <div className="topbar-id-text">
                  <div className="topbar-name">{admin.name}</div>
                  <div className="topbar-email">{admin.email}</div>
                </div>
                <span className={`role-badge role-${admin.role}`}>
                  {platformAdmin ? 'Platform admin' : 'Tenant admin'}
                </span>
                <button className="icon-btn" onClick={logout} title="Log out" aria-label="Log out">
                  <Icon name="logout" />
                </button>
              </div>
            </header>
            <main className="content">
              <Outlet />
            </main>
          </div>
        </div>
      </TenantsIndexContext.Provider>
    </AdminContext.Provider>
  );
}
