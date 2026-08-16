import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './SignInUp.css';

function Login() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      nav('/dashboard', { replace: true });
    } catch {}
  };

  return (
    <div className="signinup-form-container">
      <h1>Login</h1>
      <form className="signinup-form" onSubmit={submit}>
        <div className="form-row">
          <label>Email<span>*</span></label>
          <input 
            type="email" 
            placeholder="example@gmail.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        <div className="form-row">
          <label>Password<span>*</span></label>
          <input 
            type="password" 
            placeholder="Enter your password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        {error && <p className="error-message" style={{ textAlign: 'center', marginTop: '12px' }}>{error}</p>}
      </form>

      <div className="signinup-footer">
        <p>
          New to our website? <Link to="/signup">Sign up here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;