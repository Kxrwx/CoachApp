let accessToken: string | null = typeof window !== 'undefined' 
  ? localStorage.getItem('access_token') 
  : null;

let refreshPromise: Promise<boolean> | null = null;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }
}

export async function api(endpoint: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = new Headers(options.headers);

  // 1. On évite le cache intempestif (règle le problème du code 304 observé sur /me)
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', 
  });

  // 2. 🔥 CORRECTION : On n'intercepte JAMAIS le 401 pour les routes critiques d'authentification
  const bypassRefreshRoutes = ['/auth/signin', '/auth/signup', '/auth/refresh', '/auth/logout'];
  const shouldBypass = bypassRefreshRoutes.includes(endpoint);

  if (response.status === 401 && !shouldBypass) {
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    const success = await refreshPromise;

    if (!success) {
      triggerLogout('REFRESH_FAILED');
      return response;
    }

    const retryHeaders = new Headers(headers);
    if (accessToken) {
      retryHeaders.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(url, {
      ...options,
      headers: retryHeaders,
      credentials: 'include',
    });
  }

  return response;
}

async function performRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) return false;

    const data = await res.json();

    setAccessToken(data.access_token);

    window.dispatchEvent(new Event('auth-sync'));

    return true;
  } catch {
    return false;
  }
}

export function triggerLogout(reason: string) {
  setAccessToken(null);

  if (typeof window !== 'undefined') {

    const isAuthPage = window.location.pathname.startsWith('/auth');

    if (!isAuthPage) {
      window.location.href = `/auth?reason=${reason}`;
    }
  }
}