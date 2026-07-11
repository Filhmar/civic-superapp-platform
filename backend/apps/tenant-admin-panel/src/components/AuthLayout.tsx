import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { api, ApiError, fetchMe, getAccessToken, logout } from '../lib/api';
import { applyTenantTheme, resetTheme } from '../lib/theme';
import type { AdminUser, ConfigResponse, Tenant } from '../lib/types';
import { Icon, VolcanoMark } from './Icons';
import type { IconName } from './Icons';

export interface Session {
  admin: AdminUser;
  tenant: Tenant;
}

export function useSession(): Session {
  return useOutletContext<Session>();
}

const NAV_ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/branding', label: 'Branding', icon: 'branding' },
  { to: '/modules', label: 'Modules', icon: 'modules' },
  { to: '/content', label: 'Content', icon: 'content' },
  { to: '/operations', label: 'Operations', icon: 'operations' },
  { to: '/audit', label: 'Audit log', icon: 'audit' },
];

const PAGE_TITLES: Record<string, string> = {
  '/branding': 'Branding Studio',
  '/modules': 'Modules',
  '/content': 'Content',
  '/operations': 'Operations',
  '/audit': 'Audit log',
};

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [sealUrl, setSealUrl] = useState<string | null>(null);
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
        // Theme the whole console from the tenant's config colors (best effort).
        api<ConfigResponse>(`/admin/tenants/${tenant.id}/config`)
          .then((cfg) => {
            if (cancelled) return;
            applyTenantTheme(cfg.config?.brand?.colors);
            const seal = cfg.config?.brand?.logo?.assets?.seal;
            if (seal && /^https?:\/\//.test(seal)) setSealUrl(seal);
          })
          .catch(() => undefined);
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
    resetTheme();
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

  const pageTitle = PAGE_TITLES[location.pathname];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-watermark" aria-hidden>
          {sealUrl ? (
            <img src={sealUrl} alt="" />
          ) : (
            <svg viewBox="0 0 24 24" width="220" height="220">
              <path d="M12 3 L21 20 L3 20 Z" fill="#fff" />
            </svg>
          )}
        </div>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <VolcanoMark size={24} />
          </div>
          <div>
            <div className="sidebar-brand-title">{session.tenant.name}</div>
            <div className="sidebar-brand-sub">City Console</div>
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
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-tenant-id">{session.tenant.id}</div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="topbar-mark" aria-hidden>
            <VolcanoMark size={19} />
          </div>
          <h1 className="topbar-title">
            {pageTitle ?? (
              <>
                <span data-testid="tenant-name">{session.tenant.name}</span> — City Console
              </>
            )}
          </h1>
          <div className="topbar-spacer" />
          <div className="topbar-identity">
            <div className="admin-name">{session.admin.name}</div>
            <div className="admin-email">{session.admin.email}</div>
          </div>
          <span className="role-badge">{session.admin.role.replace(/_/g, ' ')}</span>
          <button
            className="icon-btn"
            onClick={() => void handleLogout()}
            title="Log out"
            aria-label="Log out"
          >
            <Icon name="logout" />
          </button>
        </header>
        <main className="content">
          <Outlet context={session} />
        </main>
      </div>
    </div>
  );
}
