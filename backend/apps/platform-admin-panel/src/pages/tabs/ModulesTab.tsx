import { useEffect, useState } from 'react';
import { AdminApi, errorMessage } from '../../lib/api';
import type { ConfigResponse } from '../../lib/types';
import { MODULE_KEYS, MODULE_LABELS } from '../../lib/types';
import { useToast } from '../../components/Toast';
import { useAdmin } from '../../components/Layout';

function buildState(modules: Record<string, boolean>): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  const keys = Array.from(new Set([...MODULE_KEYS, ...Object.keys(modules ?? {})]));
  for (const k of keys) state[k] = Boolean(modules?.[k]);
  return state;
}

interface Props {
  tenantId: string;
  cfg: ConfigResponse;
  refetch: () => Promise<ConfigResponse>;
}

export default function ModulesTab({ tenantId, cfg, refetch }: Props) {
  const toast = useToast();
  const admin = useAdmin();
  const platformAdmin = admin.role === 'platform_admin';
  const [modules, setModules] = useState<Record<string, boolean>>(() => buildState(cfg.config.modules));
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setModules(buildState(cfg.config.modules));
  }, [cfg]);

  const toggle = async (name: string) => {
    const next = !modules[name];
    setModules((m) => ({ ...m, [name]: next })); // optimistic
    setBusy(name);
    try {
      const { version } = await AdminApi.patchModules(tenantId, { [name]: next });
      toast.push(`v${version} saved`);
      await refetch();
    } catch (err) {
      setModules((m) => ({ ...m, [name]: !next })); // revert
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card">
      <h3 className="card-title">Modules</h3>
      {!platformAdmin && (
        <p className="muted">Module changes require a platform administrator — toggles are read-only.</p>
      )}
      <div className="module-list">
        {Object.keys(modules).map((name) => (
          <div key={name} className="module-row">
            <div>
              <div className="strong">{MODULE_LABELS[name] ?? name}</div>
              <div className="muted mono module-key">{name}</div>
            </div>
            <div className="module-state">
              <span className={modules[name] ? 'chip chip-green' : 'chip chip-gray'}>
                {modules[name] ? 'Enabled' : 'Disabled'}
              </span>
              <label className="switch" data-module={name}>
                <input
                  type="checkbox"
                  checked={modules[name]}
                  disabled={!platformAdmin || busy === name}
                  onChange={() => void toggle(name)}
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
