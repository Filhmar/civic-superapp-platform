import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, errorMessage, setTokens } from '../lib/api';
import { Icon, LogoMark } from '../components/Icons';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await AdminApi.login(email, password);
      setTokens(res.access_token, res.refresh_token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-grid-overlay" aria-hidden />
      <form className="login-card" onSubmit={(e) => void submit(e)}>
        <div className="login-brand">
          <span className="login-tile" aria-hidden>
            <LogoMark size={19} />
          </span>
          <div>
            <h1 className="login-title">Civic Platform Console</h1>
            <div className="login-sub">Operator administration</div>
          </div>
        </div>
        <div className="login-divider" />
        <label className="login-field">
          <span className="field-label">Email</span>
          <input
            className="login-input"
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="login-field">
          <span className="field-label">Password</span>
          <input
            className="login-input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <div className="form-error">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}
        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="login-caption">Protected area · authorized operators only</div>
      </form>
    </div>
  );
}
