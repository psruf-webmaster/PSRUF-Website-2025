import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './SignInUp.css';

export default function PasswordReset({ reset = false }) {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  return <PasswordResetForm key={`${reset}:${token}`} reset={reset} token={token} />;
}

function PasswordResetForm({ reset, token }) {
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [personalEmail, setEmail] = useState('');
  const [newPassword, setPassword] = useState('');
  const [confirmPassword, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (reset && (!newPassword || !confirmPassword || newPassword !== confirmPassword)) {
      setError('Enter matching passwords in both fields.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${reset ? 'reset-password' : 'forgot-password'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reset ? { token, newPassword } : { personalEmail: personalEmail.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to complete request. Please try again.');
      setMessage(result.message);
      setPassword('');
      setConfirmation('');
    } catch (err) {
      setError(err.message || 'Unable to connect. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signinup-form-container">
      <h1>{reset ? 'Reset password' : 'Forgot password?'}</h1>
      {reset && !validToken ? (
        <p role="alert">This reset link is invalid or missing. Request a new link.</p>
      ) : message ? <p role="status">{message}</p> : (
        <form className="signinup-form" onSubmit={submit}>
          {reset ? <>
            <div className="form-row">
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={6} required value={newPassword} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="form-row">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={e => setConfirmation(e.target.value)} />
            </div>
          </> : <div className="form-row">
            <label htmlFor="personal-email">Registered personal email</label>
            <input id="personal-email" type="email" autoComplete="email" required value={personalEmail} onChange={e => setEmail(e.target.value)} />
          </div>}
          <button type="submit" disabled={busy}>{busy ? 'Submitting...' : reset ? 'Reset password' : 'Send reset link'}</button>
          {error && <p className="error-message" role="alert">{error}</p>}
        </form>
      )}
      <div className="signinup-footer">
        {reset && !message && <p><Link to="/forgot-password">Request a new reset link</Link></p>}
        <p><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
