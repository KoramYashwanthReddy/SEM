/**
 * Unified SSO Authentication Logic
 * Connected to Spring Boot Backend
 */
const UnifiedLogin = (() => {
  // Elements
  const form = document.getElementById('sso-login-form');
  const submitBtn = document.getElementById('sso-submit-btn');
  const btnText = document.getElementById('btn-text');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.getElementById('remember-me');
  const errorContainer = document.getElementById('sso-error-container');
  const errorMessage = document.getElementById('sso-error-message');
  
  const REMEMBER_KEY = 'remember.sso.identifier';
  const AUTH_KEYS = ['token', 'accessToken', 'jwt', 'authToken', 'access_token'];
  const API_BASE = /^https?:/i.test(window.location.origin)
    ? window.location.origin
    : "http://localhost:8080";

  function init() {
    if (typeof ThemeController !== "undefined") {
      ThemeController.init();
    }
    setupListeners();
    hydrateRemembered();
    console.log("SSO Secure Login Engine Active");
  }

  function setupListeners() {
    // Password visibility toggle
    const toggleBtn = document.getElementById('password-visibility-btn');
    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
      });
    }

    // Clear errors on input
    emailInput?.addEventListener('input', clearError);
    passwordInput?.addEventListener('input', clearError);

    // Form submission
    form?.addEventListener('submit', handleLogin);
  }

  async function readErrorMessage(response) {
    const fallback = response?.statusText || `Request failed (${response?.status || "unknown"})`;
    try {
      const raw = await response.clone().text();
      if (!raw) return fallback;
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const data = JSON.parse(raw);
        return String(data?.message || data?.error || data?.cause || data?.detail || fallback).trim() || fallback;
      }
      return String(raw).trim() || fallback;
    } catch (_e) {
      return fallback;
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearError();

    const email = emailInput?.value.trim();
    const password = passwordInput?.value.trim();
    const remember = Boolean(rememberCheckbox?.checked);

    if (!email || !password) {
      showError("Please enter your account email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const raw = await response.json();
      const data = raw?.data ?? raw;
      
      const token = data.accessToken || data.token || data.jwt;
      if (!token) {
        throw new Error("Invalid response from authorization server.");
      }

      const resolvedRole = String(data.role || "")
        .replace(/^ROLE_/i, "")
        .trim()
        .toUpperCase();
      
      // Save credentials for the authenticated role
      persistAuthData({
        token,
        role: resolvedRole,
        user: sanitizeUserForStorage(data),
        teacher: resolvedRole === 'TEACHER' ? {
          id: data.userId || data.id,
          name: data.name,
          email: data.email,
          department: data.department,
          designation: data.designation,
          qualification: data.qualification,
          employeeId: data.employeeId
        } : null,
        remember
      });

      persistRememberedIdentifier(email, remember);
      setSuccess();

      // Redirect dynamically based on role
      setTimeout(() => {
        if (resolvedRole === 'ADMIN') {
          window.location.href = 'admin-dashboard.html';
        } else if (resolvedRole === 'TEACHER') {
          window.location.href = 'teacher-dashboard.html';
        } else {
          window.location.href = 'student-ui.html';
        }
      }, 1000);

    } catch (error) {
      console.error("Login Failure:", error);
      setLoading(false);
      showError(error.message);
    }
  }

  function sanitizeUserForStorage(raw) {
    const user = raw && typeof raw === "object" ? { ...raw } : {};
    const heavyImage = String(user.profileImage || "").trim();
    if (heavyImage.startsWith("data:")) {
      user.profileImage = "";
    }
    return {
      id: user.userId || user.id || null,
      userId: user.userId || user.id || null,
      name: user.name || "",
      email: user.email || "",
      role: String(user.role || "STUDENT").replace(/^ROLE_/i, "").trim().toUpperCase(),
      phone: user.phone || "",
      department: user.department || "",
      designation: user.designation || "",
      qualification: user.qualification || "",
      employeeId: user.employeeId || "",
      profileImage: user.profileImage || ""
    };
  }

  function persistAuthData({ token, role, user, teacher, remember }) {
    const primary = remember ? localStorage : sessionStorage;
    const secondary = remember ? sessionStorage : localStorage;

    [...AUTH_KEYS, 'role', 'user', 'teacher'].forEach((key) => {
      secondary.removeItem(key);
      primary.removeItem(key);
    });

    primary.setItem('token', token);
    primary.setItem('accessToken', token);
    primary.setItem('jwt', token);
    primary.setItem('role', role);
    primary.setItem('user', JSON.stringify(user));
    if (teacher) {
      primary.setItem('teacher', JSON.stringify(teacher));
    }
  }

  function persistRememberedIdentifier(identifier, remember) {
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, identifier);
      return;
    }
    localStorage.removeItem(REMEMBER_KEY);
  }

  function hydrateRemembered() {
    const remembered = String(localStorage.getItem(REMEMBER_KEY) || '').trim();
    if (!remembered || !emailInput) return;
    emailInput.value = remembered;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn.classList.add('loading');
      if (btnText) btnText.textContent = 'Verifying Credentials...';
    } else {
      submitBtn.classList.remove('loading');
      if (btnText) btnText.textContent = 'Authenticate Credentials';
    }
  }

  function setSuccess() {
    if (submitBtn) {
      submitBtn.classList.remove('loading');
      submitBtn.classList.add('success');
    }
    if (btnText) btnText.textContent = 'Identity Authorized';
  }

  function showError(msg) {
    const cleanMsg = normalizeErrorMessage(msg);
    if (errorMessage) errorMessage.textContent = cleanMsg;
    errorContainer?.removeAttribute('hidden');
  }

  function clearError() {
    errorContainer?.setAttribute('hidden', 'hidden');
    if (errorMessage) errorMessage.textContent = '';
  }

  function normalizeErrorMessage(msg) {
    const txt = String(msg || '').toLowerCase();
    if (txt.includes('invalid credentials') || txt.includes('bad credentials')) {
      return 'Invalid credentials. Check your email/password combination.';
    }
    if (txt.includes('user not found')) {
      return 'User account not found. Verify your email.';
    }
    return msg || 'Unable to connect to the login terminal.';
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', UnifiedLogin.init);
