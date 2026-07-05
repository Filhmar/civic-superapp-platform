import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminApi, errorMessage } from '../lib/api';
import type { ConfigResponse, Tenant } from '../lib/types';
import StatusChip from '../components/StatusChip';
import { useToast } from '../components/Toast';
import OverviewTab from './tabs/OverviewTab';
import ModulesTab from './tabs/ModulesTab';
import BrandingTab from './tabs/BrandingTab';
import OperationsTab from './tabs/OperationsTab';
import ContentTab from './tabs/ContentTab';
import AuditTab from './tabs/AuditTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'modules', label: 'Modules' },
  { key: 'branding', label: 'Branding' },
  { key: 'operations', label: 'Operations' },
  { key: 'content', label: 'Content' },
  { key: 'audit', label: 'Audit' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const tenantId = id ?? '';
  const toast = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cfg, setCfg] = useState<ConfigResponse | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');
  const [loadError, setLoadError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<ConfigResponse> => {
    const fresh = await AdminApi.config(tenantId);
    setCfg(fresh);
    return fresh;
  }, [tenantId]);

  useEffect(() => {
    setCfg(null);
    setTenant(null);
    setLoadError(null);
    setTab('overview');
    AdminApi.tenants()
      .then((list) => setTenant(list.find((t) => t.id === tenantId) ?? null))
      .catch(() => undefined);
    refetch().catch((err) => {
      setLoadError(errorMessage(err));
      toast.push(errorMessage(err), 'error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="breadcrumb">
            <Link to="/">Tenants</Link> <span className="crumb-sep">/</span> <span className="mono">{tenantId}</span>
          </div>
          <h2 className="page-title">
            {tenant ? tenant.name : tenantId}{' '}
            {tenant && <StatusChip status={tenant.status} />}
          </h2>
          {tenant && (
            <div className="muted">
              {tenant.kind} · <span className="mono">{tenant.bundleId}</span>
            </div>
          )}
        </div>
        {cfg && <span className="version-badge">config v{cfg.version}</span>}
      </div>

      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            data-tab={t.key}
            className={tab === t.key ? 'tab active' : 'tab'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className="card">
          <div className="form-error">{loadError}</div>
        </div>
      ) : !cfg ? (
        <div className="card">
          <div className="empty">Loading configuration…</div>
        </div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab tenantId={tenantId} cfg={cfg} />}
          {tab === 'modules' && <ModulesTab tenantId={tenantId} cfg={cfg} refetch={refetch} />}
          {tab === 'branding' && <BrandingTab tenantId={tenantId} cfg={cfg} refetch={refetch} />}
          {tab === 'operations' && <OperationsTab tenantId={tenantId} />}
          {tab === 'content' && <ContentTab tenantId={tenantId} />}
          {tab === 'audit' && <AuditTab tenantId={tenantId} />}
        </>
      )}
    </div>
  );
}
