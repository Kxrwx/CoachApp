import Cookies from 'js-cookie';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';


let refreshPromise: Promise<boolean> | null = null;

export async function api(endpoint: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const token = Cookies.get('access_token');


  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });


  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      triggerLogout('NO_REFRESH_TOKEN');
      return response;
    }

    if (!refreshPromise) {
      refreshPromise = performRefresh(refreshToken).finally(() => {
        refreshPromise = null;
      });
    }

    const success = await refreshPromise;

    if (!success) {
      triggerLogout('REFRESH_FAILED');
      return response;
    }

    const newToken = Cookies.get('access_token');

    const retryHeaders = new Headers(headers);
    if (newToken) {
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
    }

    const retryableMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const method = options.method?.toUpperCase() || 'GET';

    if (retryableMethods.includes(method)) {
      return fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    }
  }

  return response;
}

async function performRefresh(rt: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });

    if (!res.ok) return false;

    const data = await res.json();

    Cookies.set('access_token', data.access_token, {
      expires: 7,
      sameSite: 'strict',
    });

    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('auth_sync', Date.now().toString());

    window.dispatchEvent(new Event('auth-sync'));

    return true;
  } catch {
    return false;
  }
}


export function triggerLogout(reason: string) {
  Cookies.remove('access_token');
  localStorage.removeItem('refresh_token');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('auth-logout', {
        detail: { reason },
      })
    );

    window.location.href = `/auth?reason=${reason}`;
  }
}