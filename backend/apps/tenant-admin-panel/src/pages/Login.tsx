import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError, login } from '../lib/api';
import { resetTheme } from '../lib/theme';
import { VolcanoMark } from '../components/Icons';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Pre-login there is no tenant yet — render the neutral fallback theme.
  useEffect(() => {
    resetTheme();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen login-screen">
      <div className="login-grid-overlay" aria-hidden />
      <form className="login-panel" onSubmit={(e) => void handleSubmit(e)}>
        <div className="login-brand">
          <div className="login-mark" aria-hidden>
            <VolcanoMark size={24} spark />
          </div>
          <div>
            <h1 className="login-title">City Console</h1>
            <p className="login-sub">Local government administration</p>
          </div>
        </div>
        <div className="login-divider" />
        <label>
          <span className="field-label">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          <span className="field-label">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <div className="inline-error" data-testid="login-error">
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="login-caption">Local government administration · authorized staff only</div>
      </form>
    </div>
  );
}
