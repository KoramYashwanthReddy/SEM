/**
 * SEM Enterprise API Utility
 * Standardized Fetch Wrapper with JWT, Error Handling and ApiResponse support.
 */
const API = (() => {
  const BASE_URL = /^https?:/i.test(window.location.origin)
    ? window.location.origin
    : "http://localhost:8080";

  /**
   * Get JWT token from storage
   */
  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') ||
           localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
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
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
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
        
        let errorMsg = `Request failed with status ${response.status}`;
        try {
          const json = await response.json();
          errorMsg = json.message || json.error || errorMsg;
        } catch (e) {
             const text = await response.text();
             if(text) errorMsg = text;
        }
        throw new Error(errorMsg);
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
