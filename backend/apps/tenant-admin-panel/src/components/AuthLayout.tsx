import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { api, ApiError, fetchMe, getAccessToken, logout } from '../lib/api';
import type { AdminUser, Tenant } from '../lib/types';

export interface Session {
  admin: AdminUser;
  tenant: Tenant;
}

export function useSession(): Session {
  return useOutletContext<Session>();
}

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/branding', label: 'Branding' },
  { to: '/modules', label: 'Modules' },
  { to: '/content', label: 'Content' },
  { to: '/operations', label: 'Operations' },
  { to: '/audit', label: 'Audit log' },
];

export function AuthLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      navigate('/login', { replace: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [admin, tenants] = await Promise.all([fetchMe(), api<Tenant[]>('/admin/tenants')]);
        // A tenant admin sees exactly one tenant — that row is THE tenant for this console.
        const tenant = tenants.find((t) => t.id === admin.tenant_id) ?? tenants[0];
        if (!tenant) throw new ApiError(404, 'No tenant is assigned to this administrator');
        if (!cancelled) setSession({ admin, tenant });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load session');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (error) {
    return (
      <div className="center-screen">
        <div className="panel error-panel">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => void handleLogout()}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="center-screen">
        <div className="loading">Loading console…</div>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">◆</div>
          <div>
            <div className="sidebar-brand-title">City Console</div>
            <div className="sidebar-brand-sub">LGU administration</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">{session.tenant.id}</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h1 className="topbar-title">
            <span data-testid="tenant-name">{session.tenant.name}</span>
            <span className="topbar-sep"> — City Console</span>
          </h1>
          <div className="topbar-right">
            <span className="admin-name">{session.admin.name}</span>
            <span className="role-badge">{session.admin.role.replace(/_/g, ' ')}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => void handleLogout()}>
              Log out
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet context={session} />
        </main>
      </div>
    </div>
  );
}
