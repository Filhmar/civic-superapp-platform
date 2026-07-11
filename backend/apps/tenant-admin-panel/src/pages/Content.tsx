import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import { AssetUpload } from '../components/AssetUpload';
import { catColors, fmtShort } from '../components/CatChip';
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
      toast('success', 'Post published & pushed');
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
      <div className="two-col">
        <section className="panel">
          <h2 className="card-title">Compose post</h2>
          <form onSubmit={(e) => void handlePublish(e)} className="post-form">
            <label>
              <span className="field-label">Title</span>
              <input
                type="text"
                required
                placeholder="Post title…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div>
              <span className="field-label">Category</span>
              <div className="cat-picker" role="radiogroup" aria-label="Category">
                {POST_CATEGORIES.map((c) => {
                  const active = category === c;
                  const colors = catColors(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className="cat-option"
                      style={
                        active
                          ? {
                              background: colors.bg,
                              color: colors.fg,
                              borderColor: colors.fg,
                            }
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
            <label>
              <span className="field-label">Body</span>
              <textarea
                style={{ height: 100 }}
                required
                placeholder="Write the announcement…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div className="compose-extras">
              <div className="toggle-row" onClick={() => setPinned((p) => !p)}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pinned}
                  aria-label="Pin to top"
                  className="toggle"
                />
                Pin to top
              </div>
              <div style={{ minWidth: 220 }}>
                <AssetUpload
                  label="Hero image"
                  hint="Optional cover photo"
                  value={heroImage}
                  tenantId={tenant.id}
                  onChange={setHeroImage}
                />
              </div>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish & push'}
            </button>
          </form>
        </section>
        <section className="panel">
          <h2 className="card-title">Feedback inbox</h2>
          {feedback === null ? (
            <div className="loading">Loading feedback…</div>
          ) : feedback.length === 0 ? (
            <p className="empty">No feedback yet.</p>
          ) : (
            <ul className="feedback-list">
              {feedback.map((f) => (
                <li key={f.id} className="feedback-row">
                  <div className="feedback-head">
                    <span className="feedback-name">{f.contact || 'Anonymous'}</span>
                    <span className="feedback-time">{fmtShort(f.created_at)}</span>
                  </div>
                  <p className="feedback-message">{f.message}</p>
                  <div className="feedback-meta">
                    {f.status.toLowerCase()}
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
