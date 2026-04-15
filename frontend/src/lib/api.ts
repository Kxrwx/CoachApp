let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function api(endpoint: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${endpoint}`;

  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', 
  });

  if (response.status === 401 && endpoint !== '/auth/refresh'){


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
    window.dispatchEvent(
      new CustomEvent('auth-logout', {
        detail: { reason },
      })
    );

    window.location.href = `/auth?reason=${reason}`;
  }
}