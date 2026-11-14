/**
 * RoomBites API & WebSocket Configuration Helper
 * Supports Web Localhost, Android Local Device Testing (LAN / ADB Reverse), and Production.
 */

const STORAGE_KEY = 'roombites_api_server';

// Default LAN IP for Android testing when not specified by environment
export const DEFAULT_ANDROID_DEV_SERVER = 'http://172.16.9.243:4000';

export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    ((window.location.protocol === 'http:' || window.location.protocol === 'https:') && window.location.hostname === 'localhost' && navigator.userAgent.includes('Android'))
  );
}

export function getServerBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. Explicit user/tester override in localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, '');
  }

  // 2. Build-time environment variable (e.g. from .env.android or .env.production)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Android Native fallback: points to PC backend on LAN
  if (isNativeAndroidApp()) {
    return DEFAULT_ANDROID_DEV_SERVER;
  }

  // 4. Web browser fallback: relative path (uses Vite proxy or web reverse proxy)
  return '';
}

export function setServerBaseUrl(newUrl: string | null): void {
  if (typeof window === 'undefined') return;
  if (newUrl && newUrl.trim()) {
    localStorage.setItem(STORAGE_KEY, newUrl.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getApiBaseUrl(): string {
  const server = getServerBaseUrl();
  return server ? `${server}/api/v1` : '/api/v1';
}

export function getWebSocketUrl(): string {
  const server = getServerBaseUrl();
  if (server) {
    const wsProto = server.startsWith('https:') ? 'wss:' : 'ws:';
    const hostWithPort = server.replace(/^https?:\/\//, '');
    return `${wsProto}//${hostWithPort}/ws`;
  }

  // Web fallback using current window.location
  if (typeof window !== 'undefined') {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}/ws`;
  }

  return 'ws://localhost:4000/ws';
}
