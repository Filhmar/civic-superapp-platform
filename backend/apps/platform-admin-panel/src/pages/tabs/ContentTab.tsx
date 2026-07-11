import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AdminApi, errorMessage } from '../../lib/api';
import type { FeedbackItem, PostCategory } from '../../lib/types';
import { POST_CATEGORIES } from '../../lib/types';
import AssetUpload from '../../components/AssetUpload';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  ADVISORY: { bg: '#FDECEC', fg: '#C0392B' },
  EVENT: { bg: '#FEF3E0', fg: '#B7791F' },
  PROGRAM: { bg: '#F0EBFB', fg: '#6D4BC7' },
  GOVERNANCE: { bg: '#E8EEFB', fg: '#2A5BD7' },
  TOURISM: { bg: '#E6F5EC', fg: '#1E8449' },
  JOBS: { bg: '#E8F5F0', fg: '#1B7F6B' },
};

function fmtShort(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PostComposer({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<PostCategory>('ADVISORY');
  const [pinned, setPinned] = useState(false);
  const [hero, setHero] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await AdminApi.createPost(tenantId, {
        title,
        body,
        category,
        pinned,
        ...(hero ? { hero_image: hero } : {}),
      });
      toast.push('Post published & pushed');
      setTitle('');
      setBody('');
      setCategory('ADVISORY');
      setPinned(false);
      setHero('');
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h3 className="card-title">Compose post</h3>
      <form className="fields-col" style={{ marginTop: 16 }} onSubmit={(e) => void submit(e)}>
        <label className="field">
          <span className="field-label">Title</span>
          <input
            className="input"
            required
            placeholder="Post title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="field">
          <span className="field-label">Category</span>
          <div className="filter-chips">
            {POST_CATEGORIES.map((c) => {
              const colors = CATEGORY_COLORS[c];
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  className="filter-chip"
                  style={
                    active
                      ? { background: colors.bg, color: colors.fg, borderColor: colors.fg }
                      : undefined
                  }
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <label className="field">
          <span className="field-label">Body</span>
          <textarea
            className="input"
            style={{ height: 96 }}
            required
            placeholder="Write the announcement…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <AssetUpload tenantId={tenantId} label="Hero image (optional)" value={hero} onUploaded={setHero} />
        <div className="save-bar">
          <label className="check-field">
            <span className="switch switch-sm">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              <span className="slider" />
            </span>
            <span>Pin to top</span>
          </label>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Publishing…' : 'Publish & push'}
        </button>
      </form>
    </section>
  );
}

function FeedbackInbox({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<FeedbackItem[] | null>(null);

  const load = useCallback(() => {
    AdminApi.feedback(tenantId)
      .then(setItems)
      .catch((err) => {
        setItems([]);
        toast.push(errorMessage(err), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(load, [load]);

  return (
    <section className="card">
      <h3 className="card-title">Feedback inbox</h3>
      {!items ? (
        <div className="empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty">No feedback yet.</div>
      ) : (
        <div className="feedback-list">
          {items.map((f) => (
            <div key={f.id} className="feedback-row">
              <div className="feedback-head">
                <span className="feedback-name">{f.contact || 'Anonymous'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {f.status && f.status !== 'NEW' && <StatusChip status={f.status} />}
                  <span className="feedback-time">{fmtShort(f.created_at)}</span>
                </span>
              </div>
              <p className="feedback-message">{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ContentTab({ tenantId }: { tenantId: string }) {
  return (
    <div className="grid-content">
      <PostComposer tenantId={tenantId} />
      <FeedbackInbox tenantId={tenantId} />
    </div>
  );
}
