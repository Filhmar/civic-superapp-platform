import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import { AssetUpload } from '../components/AssetUpload';
import { StatusChip } from '../components/StatusChip';
import { POST_CATEGORIES } from '../lib/types';
import type { FeedbackItem, PostCategory } from '../lib/types';

export function Content() {
  const { tenant } = useSession();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<PostCategory>('ADVISORY');
  const [heroImage, setHeroImage] = useState('');
  const [pinned, setPinned] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<FeedbackItem[]>(`/admin/tenants/${tenant.id}/feedback`)
      .then((items) => {
        if (!cancelled) setFeedback(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast('error', err instanceof ApiError ? err.message : 'Failed to load feedback');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenant.id, toast]);

  async function handlePublish(e: FormEvent) {
    e.preventDefault();
    setPublishing(true);
    try {
      const payload: Record<string, unknown> = { title, body, category, pinned };
      if (heroImage) payload.hero_image = heroImage;
      await api(`/admin/tenants/${tenant.id}/posts`, { method: 'POST', body: payload });
      toast('success', 'Post published');
      setTitle('');
      setBody('');
      setHeroImage('');
      setPinned(false);
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Content</h2>
          <p className="page-sub">Publish news posts and review resident feedback.</p>
        </div>
      </div>
      <div className="two-col">
        <section className="panel">
          <h2 className="panel-title">New post</h2>
          <form onSubmit={(e) => void handlePublish(e)} className="post-form">
            <label>
              <span className="field-label">Title</span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Body</span>
              <textarea
                rows={6}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div className="field-grid">
              <label>
                <span className="field-label">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PostCategory)}
                >
                  {POST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label pinned-check">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                />
                Pin to top
              </label>
            </div>
            <AssetUpload
              label="Hero image"
              value={heroImage}
              tenantId={tenant.id}
              onChange={setHeroImage}
            />
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish post'}
              </button>
            </div>
          </form>
        </section>
        <section className="panel">
          <h2 className="panel-title">Feedback inbox</h2>
          {feedback === null ? (
            <div className="loading">Loading feedback…</div>
          ) : feedback.length === 0 ? (
            <p className="empty">No feedback yet.</p>
          ) : (
            <ul className="feedback-list">
              {feedback.map((f) => (
                <li key={f.id} className="feedback-row">
                  <div className="feedback-head">
                    <StatusChip status={f.status} />
                    <span className="feedback-time">
                      {new Date(f.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="feedback-message">{f.message}</p>
                  <div className="feedback-meta">
                    {f.contact ? `Contact: ${f.contact}` : 'No contact provided'}
                    {f.user_id ? ` · user ${f.user_id.slice(0, 8)}…` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
