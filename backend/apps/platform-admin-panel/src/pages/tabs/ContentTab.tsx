import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AdminApi, errorMessage } from '../../lib/api';
import type { FeedbackItem, PostCategory } from '../../lib/types';
import { POST_CATEGORIES } from '../../lib/types';
import StatusChip from '../../components/StatusChip';
import AssetUpload from '../../components/AssetUpload';
import { useToast } from '../../components/Toast';

function fmt(ts: string): string {
  return new Date(ts).toLocaleString();
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
      toast.push('Post published');
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
      <h3 className="card-title">Publish a post</h3>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <div className="grid-2">
          <label className="field">
            <span className="field-label">Title</span>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as PostCategory)}>
              {POST_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="field-label">Body</span>
          <textarea className="input" rows={5} required value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <AssetUpload tenantId={tenantId} label="Hero image (optional)" value={hero} onUploaded={setHero} />
        <div className="save-bar">
          <label className="check-field">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            <span>Pin to top</span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Publishing…' : 'Publish post'}
          </button>
        </div>
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
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Message</th>
              <th>Contact</th>
              <th>User</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {!items ? (
              <tr>
                <td colSpan={5} className="empty">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  No feedback yet.
                </td>
              </tr>
            ) : (
              items.map((f) => (
                <tr key={f.id}>
                  <td className="cell-clip" title={f.message}>
                    {f.message}
                  </td>
                  <td>{f.contact ?? '—'}</td>
                  <td className="mono cell-clip" title={f.user_id}>
                    {f.user_id}
                  </td>
                  <td>
                    <StatusChip status={f.status} />
                  </td>
                  <td className="muted">{fmt(f.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ContentTab({ tenantId }: { tenantId: string }) {
  return (
    <div className="stack">
      <PostComposer tenantId={tenantId} />
      <FeedbackInbox tenantId={tenantId} />
    </div>
  );
}
