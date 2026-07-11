import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminApi, errorMessage } from '../lib/api';
import type { ConfigResponse, Tenant } from '../lib/types';
import StatusChip from '../components/StatusChip';
import { Icon } from '../components/Icons';
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

  const primary = cfg?.config.brand?.colors?.primary ?? '#5B5BD6';
  const prefix =
    cfg?.config.identifiers?.ticket_prefix?.slice(0, 3) ??
    (tenant ? tenant.name.replace(/^My/, '').slice(0, 3).toUpperCase() : '·');

  return (
    <div className="page">
      <Link to="/" className="ghost-link">
        <Icon name="chevron-left" />
        All tenants
      </Link>

      <div className="tenant-header">
        <span
          className="tenant-avatar"
          style={{ background: primary, boxShadow: `0 8px 20px ${primary}66` }}
        >
          {prefix}
        </span>
        <div className="tenant-header-main">
          <div className="tenant-header-name">
            <h1>{tenant ? tenant.name : tenantId}</h1>
            {tenant && <StatusChip status={tenant.status} />}
          </div>
          <div className="tenant-header-sub">
            {tenantId}
            {tenant ? ` · ${tenant.bundleId}` : ''}
          </div>
        </div>
        <div className="tenant-header-version">
          <span className="card-kicker">Config version</span>
          {cfg ? (
            <span className="version-pill">v{cfg.version}</span>
          ) : (
            <span className="skeleton" style={{ width: 52, display: 'inline-block' }} />
          )}
        </div>
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
          <div className="form-error">
            <Icon name="alert" />
            <span>{loadError}</span>
          </div>
        </div>
      ) : !cfg ? (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton" style={{ width: '82%' }} />
            <div className="skeleton" style={{ width: '64%' }} />
            <div className="skeleton" style={{ width: '92%' }} />
          </div>
        </div>
      ) : (
        <div className="tab-pane" key={tab}>
          {tab === 'overview' && <OverviewTab tenantId={tenantId} cfg={cfg} />}
          {tab === 'modules' && <ModulesTab tenantId={tenantId} cfg={cfg} refetch={refetch} />}
          {tab === 'branding' && <BrandingTab tenantId={tenantId} cfg={cfg} refetch={refetch} />}
          {tab === 'operations' && <OperationsTab tenantId={tenantId} />}
          {tab === 'content' && <ContentTab tenantId={tenantId} />}
          {tab === 'audit' && <AuditTab tenantId={tenantId} />}
        </div>
      )}
    </div>
  );
}
