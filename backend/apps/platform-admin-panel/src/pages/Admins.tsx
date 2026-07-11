import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AdminApi, errorMessage } from '../lib/api';
import type { Admin, AdminRole, Tenant } from '../lib/types';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAdmin } from '../components/Layout';

function fmt(ts?: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

/** Tinted avatar pair per tenant primary; platform admins use indigo. */
function avatarColors(u: Admin, primaries: Record<string, string>): { bg: string; fg: string } {
  if (u.role === 'platform_admin' || !u.tenant_id) return { bg: '#EEF0FE', fg: '#5B5BD6' };
  const primary = primaries[u.tenant_id];
  if (!primary) return { bg: '#EEF0FE', fg: '#5B5BD6' };
  return { bg: `${primary}1A`, fg: primary };
}

function CreateAdminForm({
  tenants,
  onCreated,
  onCancel,
}: {
  tenants: Tenant[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [role, setRole] = useState<AdminRole>('tenant_admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId && tenants.length > 0) setTenantId(tenants[0].id);
  }, [tenants, tenantId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }
    if (role === 'tenant_admin' && !tenantId) {
      setError('Select a tenant for the new tenant admin');
      return;
    }
    setBusy(true);
    try {
      await AdminApi.createUser({
        email,
        password,
        name,
        role,
        ...(role === 'tenant_admin' ? { tenant_id: tenantId } : {}),
      });
      toast.push('Administrator invited');
      setEmail('');
      setPassword('');
      setName('');
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <h3 className="card-title">New administrator</h3>
      <form className="fields-col" style={{ marginTop: 16 }} onSubmit={(e) => void submit(e)}>
        <div className="form-grid-2">
          <label className="field">
            <span className="field-label">Full name</span>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              placeholder="name@lgu.gov.ph"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>
        <div className="form-grid-2">
          <div className="field">
            <span className="field-label">Role</span>
            <div className="role-picker">
              <button
                type="button"
                className={role === 'platform_admin' ? 'role-pill active' : 'role-pill'}
                onClick={() => setRole('platform_admin')}
              >
                Platform
              </button>
              <button
                type="button"
                className={role === 'tenant_admin' ? 'role-pill active' : 'role-pill'}
                onClick={() => setRole('tenant_admin')}
              >
                Tenant
              </button>
            </div>
          </div>
          {role === 'tenant_admin' ? (
            <label className="field">
              <span className="field-label">Tenant</span>
              <select className="input" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="field">
              <span className="field-label">Scope</span>
              <div className="helper-text" style={{ padding: '12px 0' }}>
                Platform admins have access to every tenant.
              </div>
            </div>
          )}
        </div>
        <label className="field">
          <span className="field-label">Password (min 10 characters)</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <div className="form-error">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}
        <div className="dialog-foot" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create admin'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function Admins() {
  const me = useAdmin();
  const toast = useToast();
  const [users, setUsers] = useState<Admin[] | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [primaries, setPrimaries] = useState<Record<string, string>>({});
  const [formOpen, setFormOpen] = useState(false);

  const tenantNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tenants) map[t.id] = t.name;
    return map;
  }, [tenants]);

  const load = useCallback(() => {
    AdminApi.users()
      .then(setUsers)
      .catch((err) => {
        setUsers([]);
        toast.push(errorMessage(err), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    AdminApi.tenants()
      .then((list) => {
        setTenants(list);
        for (const t of list) {
          AdminApi.config(t.id)
            .then((cfg) => {
              const primary = cfg.config.brand?.colors?.primary;
              if (primary) setPrimaries((prev) => ({ ...prev, [t.id]: primary }));
            })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, [load]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="kicker">Access control</span>
          <h1 className="page-title">Administrators</h1>
        </div>
        {me.role === 'platform_admin' && !formOpen && (
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
            <Icon name="plus" />
            Create admin
          </button>
        )}
      </div>

      {formOpen && (
        <CreateAdminForm
          tenants={tenants}
          onCreated={() => {
            setFormOpen(false);
            load();
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      <div className="table-card">
        <div className="trow trow-head cols-admins">
          <span>Administrator</span>
          <span>Role</span>
          <span>Tenant</span>
          <span>Status</span>
          <span>Last login</span>
        </div>
        {!users ? (
          <div className="empty">Loading…</div>
        ) : users.length === 0 ? (
          <div className="empty">No admin users found.</div>
        ) : (
          users.map((u) => {
            const colors = avatarColors(u, primaries);
            const active = (u.status ?? 'active').toLowerCase() === 'active';
            const statusColor = active ? '#1E8449' : '#B7791F';
            return (
              <div key={u.admin_id} className="trow cols-admins">
                <span className="admin-cell">
                  <span className="admin-avatar" style={{ background: colors.bg, color: colors.fg }}>
                    {initials(u.name)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="admin-cell-name" style={{ display: 'block' }}>
                      {u.name}
                    </span>
                    <span className="admin-cell-email">{u.email}</span>
                  </span>
                </span>
                <span>
                  <span className={`role-badge role-${u.role}`}>
                    {u.role === 'platform_admin' ? 'Platform admin' : 'Tenant admin'}
                  </span>
                </span>
                <span className="cell-meta">
                  {u.tenant_id ? (tenantNames[u.tenant_id] ?? u.tenant_id) : '— all —'}
                </span>
                <span className="status-dot-row" style={{ color: statusColor }}>
                  <span className="dot" style={{ background: statusColor }} />
                  {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1).toLowerCase() : 'Active'}
                </span>
                <span className="cell-mono-time">{fmt(u.last_login_at)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
