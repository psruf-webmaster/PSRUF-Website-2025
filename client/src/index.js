import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Translate email links for the existing HashRouter before rendering.
if (window.location.pathname.replace(/\/$/, '').endsWith('/reset-password')) {
  const basePath = window.location.pathname.replace(/reset-password\/?$/, '');
  window.history.replaceState(null, '', `${basePath}#/reset-password${window.location.search}`);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
