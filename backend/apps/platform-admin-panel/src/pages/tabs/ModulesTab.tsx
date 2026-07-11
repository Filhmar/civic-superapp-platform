import { useEffect, useState } from 'react';
import { AdminApi, errorMessage } from '../../lib/api';
import type { ConfigResponse } from '../../lib/types';
import { MODULE_KEYS, MODULE_LABELS, MODULE_DESCRIPTIONS } from '../../lib/types';
import { Icon, MODULE_ICONS } from '../../components/Icons';
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
    <div>
      <div className="module-callout">
        <Icon name="info" />
        <span>
          {platformAdmin
            ? 'Module availability is billing-tier enforcement — platform-operator only. Toggling saves a new config version.'
            : 'Module changes require a platform administrator — toggles are read-only.'}
        </span>
      </div>
      <div className="module-grid">
        {Object.keys(modules).map((name) => (
          <div key={name} className={modules[name] ? 'module-card on' : 'module-card'}>
            <span className="module-icon">
              <Icon name={MODULE_ICONS[name] ?? 'tag'} />
            </span>
            <div className="module-text">
              <div className="module-title">{MODULE_LABELS[name] ?? name}</div>
              <div className="module-desc">{MODULE_DESCRIPTIONS[name] ?? name}</div>
            </div>
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
        ))}
      </div>
    </div>
  );
}
