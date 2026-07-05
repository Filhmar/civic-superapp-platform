import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AdminApi, errorMessage } from '../lib/api';
import type { Admin, AdminRole, Tenant } from '../lib/types';
import StatusChip from '../components/StatusChip';
import { useToast } from '../components/Toast';
import { useAdmin } from '../components/Layout';

function fmt(ts?: string | null): string {
  return ts ? new Date(ts).toLocaleString() : '—';
}

function CreateAdminForm({ tenants, onCreated }: { tenants: Tenant[]; onCreated: () => void }) {
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
      toast.push(`${role === 'tenant_admin' ? 'Tenant admin' : 'Platform admin'} created: ${email}`);
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
    <section className="card">
      <h3 className="card-title">Create admin</h3>
      <div className="filter-chips role-picker">
        <button
          type="button"
          className={role === 'tenant_admin' ? 'filter-chip active' : 'filter-chip'}
          onClick={() => setRole('tenant_admin')}
        >
          Tenant admin
        </button>
        <button
          type="button"
          className={role === 'platform_admin' ? 'filter-chip active' : 'filter-chip'}
          onClick={() => setRole('platform_admin')}
        >
          Platform admin
        </button>
      </div>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <div className="grid-2">
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        <div className="grid-2">
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
          {role === 'tenant_admin' ? (
            <label className="field">
              <span className="field-label">Tenant</span>
              <select className="input" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="field">
              <span className="field-label">Scope</span>
              <div className="muted static-note">Platform admins have access to every tenant.</div>
            </div>
          )}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="save-bar">
          <span />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : role === 'tenant_admin' ? 'Create tenant admin' : 'Create platform admin'}
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
      .then(setTenants)
      .catch(() => undefined);
  }, [load]);

  return (
    <div className="page">
      <div className="page-head">
        <h2 className="page-title">Admin users</h2>
        <span className="muted">{users ? `${users.length} account${users.length === 1 ? '' : 's'}` : ''}</span>
      </div>
      <div className="stack">
        <section className="card table-card">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th>Last login</th>
                </tr>
              </thead>
              <tbody>
                {!users ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Loading…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      No admin users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.admin_id}>
                      <td className="strong">{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>
                          {u.role === 'platform_admin' ? 'Platform admin' : 'Tenant admin'}
                        </span>
                      </td>
                      <td>
                        {u.tenant_id ? (
                          <span className="chip chip-blue">{tenantNames[u.tenant_id] ?? u.tenant_id}</span>
                        ) : (
                          <span className="chip chip-gray">All tenants</span>
                        )}
                      </td>
                      <td>{u.status ? <StatusChip status={u.status} /> : '—'}</td>
                      <td className="muted">{fmt(u.last_login_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        {me.role === 'platform_admin' ? (
          <CreateAdminForm tenants={tenants} onCreated={load} />
        ) : (
          <section className="card">
            <p className="muted">Creating admin accounts requires a platform administrator.</p>
          </section>
        )}
      </div>
    </div>
  );
}
