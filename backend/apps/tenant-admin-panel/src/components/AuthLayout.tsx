import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { api, ApiError, fetchMe, getAccessToken, logout } from '../lib/api';
import type { AdminUser, BrandColors, ConfigResponse, Tenant } from '../lib/types';
import { Icon } from './Icons';

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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function hexToRgb(hex: string): string | null {
  if (!HEX_RE.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Re-theme the console shell from the tenant's config brand colors. */
function applyTenantTheme(colors: Partial<BrandColors> | undefined): void {
  if (!colors) return;
  const root = document.documentElement.style;
  if (colors.primary && HEX_RE.test(colors.primary)) {
    root.setProperty('--primary', colors.primary);
    const rgb = hexToRgb(colors.primary);
    if (rgb) root.setProperty('--primary-rgb', rgb);
  }
  if (colors.primaryDark && HEX_RE.test(colors.primaryDark)) {
    root.setProperty('--primary-dark', colors.primaryDark);
  }
  if (colors.tint && HEX_RE.test(colors.tint)) {
    root.setProperty('--primary-soft', colors.tint);
  }
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
        // Theme the console from the tenant's config colors (best effort).
        api<ConfigResponse>(`/admin/tenants/${tenant.id}/config`)
          .then((cfg) => {
            if (!cancelled) applyTenantTheme(cfg.config?.brand?.colors);
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
          <div className="sidebar-brand-mark">{initials(session.tenant.name)}</div>
          <div>
            <div className="sidebar-brand-title">{session.tenant.name}</div>
            <div className="sidebar-brand-sub">City Console</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">LGU administration</div>
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
        <div className="sidebar-foot">
          <div className="sidebar-identity">
            <span className="identity-avatar">{initials(session.admin.name)}</span>
            <div>
              <div className="identity-name">{session.admin.name}</div>
              <div className="identity-sub">{session.tenant.id}</div>
            </div>
            <span className="presence-dot" />
          </div>
        </div>
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
            <button
              className="icon-btn"
              onClick={() => void handleLogout()}
              title="Log out"
              aria-label="Log out"
            >
              <Icon name="logout" />
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
