import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

// Configure Android Native Safe Area fallback
if (typeof window !== 'undefined') {
  const isCapacitor =
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:' ||
    ((window.location.protocol === 'http:' || window.location.protocol === 'https:') && window.location.hostname === 'localhost' && navigator.userAgent.includes('Android'));

  if (isCapacitor) {
    document.documentElement.style.setProperty('--app-safe-top', '28px');
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
