/**
 * SEM Enterprise API Utility
 * Standardized Fetch Wrapper with JWT, Error Handling and ApiResponse support.
 */
const API = (() => {
  const explicitBase = (window.__API_BASE_URL__ || localStorage.getItem('apiBaseUrl') || '').trim();
  const origin = window.location.origin || '';
  const isLocalFrontend = /:\/\/(localhost|127\.0\.0\.1)(:3000|:5173|:5500)?$/i.test(origin);
  const BASE_URL = explicitBase
    ? explicitBase.replace(/\/+$/, '')
    : (isLocalFrontend || origin.startsWith('file:') ? "http://localhost:8080" : origin);

  /**
   * Get JWT token from storage
   */
  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') ||
           localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
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
    ['token', 'accessToken', 'role', 'user', 'teacher'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    
    const loginPage = role === 'admin' ? '/pages/admin-login.html' : 
                      role === 'teacher' ? '/pages/teacher-login.html' : 
                      '/pages/login.html';
    
    window.location.href = loginPage;
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
          console.warn('Unauthorized request, logging out...');
          if (!window.location.pathname.includes('login')) {
            logout(localStorage.getItem('role')?.toLowerCase());
          }
        }
        
        throw new Error(await readErrorBody(response));
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
