import React from 'react';
import './SignInUp.css';
import { Link } from 'react-router-dom';

function SignInUp() {
  return (
    <div className="signinup-form-container">
      <h1>Login</h1>
      <form className="signinup-form">
        <div className="form-row">
          <label>Email<span>*</span></label>
          <input 
            type="email" 
            placeholder="example@gmail.com" 
            required 
          />
        </div>

        <div className="form-row">
          <label>Password<span>*</span></label>
          <input 
            type="password" 
            placeholder="Enter your password" 
            required 
          />
        </div>

        <button type="submit">
          Log In
        </button>
      </form>

      <div className="signinup-footer">
        <p>
          New to our website? <Link to="/signup">Sign up here</Link>
        </p>
      </div>
    </div>
  );
}

export default SignInUp;