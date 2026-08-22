/**
 * SEM Enterprise API Utility
 * Standardized Fetch Wrapper with JWT, Error Handling and ApiResponse support.
 */
const API = (() => {
  const AUTH_KEYS = ['token', 'accessToken', 'jwt', 'authToken', 'access_token'];
  const explicitBase = (window.__API_BASE_URL__ || localStorage.getItem('apiBaseUrl') || '').trim();
  const origin = window.location.origin || '';
  const isLocalFrontend = /:\/\/(localhost|127\.0\.0\.1)(:3000|:5173|:5500)?$/i.test(origin);
  const BASE_URL = explicitBase
    ? explicitBase.replace(/\/+$/, '')
    : (isLocalFrontend || origin.startsWith('file:') ? "http://localhost:8080" : origin);

  /**
   * Get JWT token from storage
   */
  function normalizeToken(raw) {
    if (!raw) return '';
    let value = String(raw).trim();
    if (!value) return '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }
    return value.replace(/^bearer\s+/i, '').trim();
  }

  function getToken() {
    for (const key of AUTH_KEYS) {
      const localValue = normalizeToken(localStorage.getItem(key));
      if (localValue) return localValue;
      const sessionValue = normalizeToken(sessionStorage.getItem(key));
      if (sessionValue) return sessionValue;
    }
    return '';
  }

  async function readErrorBody(response) {
    const fallback = `Request failed with status ${response.status}`;
    try {
      const cloned = response.clone();
      const raw = await cloned.text();
      if (!raw) return fallback;

      const contentType = String(cloned.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        try {
          const json = JSON.parse(raw);
          return (
            json?.data?.message ||
            json?.data?.error ||
            json?.message ||
            json?.error ||
            raw
          ).toString().trim() || fallback;
        } catch (_err) {
          return raw.trim() || fallback;
        }
      }

      return raw.trim() || fallback;
    } catch (_err) {
      return fallback;
    }
  }

  /**
   * Clear auth and redirect to login
   */
  function logout(role = 'student') {
    [...AUTH_KEYS, 'role', 'user', 'teacher'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    
    window.location.href = '/pages/login.html';
  }

  /**
   * Standard Request Wrapper
   */
  async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    
    const token = getToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const isBinaryBody =
      typeof Blob !== 'undefined' && options.body instanceof Blob ||
      typeof ArrayBuffer !== 'undefined' && options.body instanceof ArrayBuffer ||
      ArrayBuffer.isView?.(options.body);

    const headers = {
      'Accept': 'application/json',
      ...options.headers
    };

    if (!isFormData && !isBinaryBody && options.body != null && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const body = options.body != null && typeof options.body === 'object' && !isFormData && !isBinaryBody
      ? JSON.stringify(options.body)
      : options.body;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      body,
      headers
    };

    try {
      const response = await fetch(url, config);
      
      if (options.raw) return response;

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
          console.warn('Unauthorized request received.');
        }
        const error = new Error(await readErrorBody(response));
        error.status = response.status;
        error.url = url;
        error.endpoint = endpoint;
        throw error;
        
      }

      const json = await response.json();

      // Handle standard ApiResponse wrapper
      if (json && (json.status === "SUCCESS" || json.message) && json.data !== undefined) {
        return json.data;
      }

      return json;
    } catch (error) {
      if (!options.silent) {
        console.error(`API Error [${endpoint}]:`, error);
      }
      throw error;
    }
  }

  return {
    request,
    get: (url, options) => request(url, { ...options, method: 'GET' }),
    post: (url, body, options) => request(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: (url, body, options) => request(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: (url, body, options) => request(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
    logout,
    getToken,
    BASE_URL
  };
})();
