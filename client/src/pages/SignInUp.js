import React from 'react';
import './SignInUp.css';
import { Link } from 'react-router-dom';

function SignInUp() {
  return (
    <div className="signinup-container">
      <div className="login-box">
        <h1>LOGIN</h1>
        <form>
          <label>Email</label>
          <input type="email" placeholder="Enter email" />
          <label>Password</label>
          <input type="password" placeholder="Enter password" />
          <button type="submit">Log In</button>
        </form>
      </div>

      <div className="signup-box">
        <h1>SIGN-UP</h1>
        <p>
          New to our website? <Link to="/signup"><u>Sign up here</u></Link>
        </p>
      </div>
    </div>
  );
}

export default SignInUp;
