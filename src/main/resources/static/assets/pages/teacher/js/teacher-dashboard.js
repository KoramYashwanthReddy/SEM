// ================= AUTH GUARD =================
const AUTH_TOKEN_KEY = "token";
const AUTH_TOKEN_KEYS = ["token", "accessToken", "jwt", "authToken", "access_token"];
const LOGIN_REDIRECT_PAGE = "teacher-login.html";

function redirectToLogin() {
  window.location.href = LOGIN_REDIRECT_PAGE;
}

function normalizeStoredToken(raw) {
  if (!raw) return "";
  let token = String(raw).trim();
  if (!token) return "";
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1).trim();
  }
  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, "").trim();
  }
  return token;
}

function getAuthToken() {
  for (const key of AUTH_TOKEN_KEYS) {
    const localValue = normalizeStoredToken(localStorage.getItem(key));
    if (localValue) return localValue;
    const sessionValue = normalizeStoredToken(sessionStorage.getItem(key));
    if (sessionValue) return sessionValue;
  }
  return "";
}

function clearAuthStorage() {
  AUTH_TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  localStorage.removeItem("role");
  sessionStorage.removeItem("role");
}

function isLikelyJwt(token) {
  if (!token) return false;
  const parts = String(token).split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}
function ensureAuthGuard() {
  const token = getAuthToken();
  if (!token || !isLikelyJwt(token)) {
    clearAuthStorage();
    redirectToLogin();
    return false;
  }
  return true;
}

ensureAuthGuard();


(() => {
  "use strict";

  const API_BASE = /^https?:/i.test(window.location.origin) ? window.location.origin : "http://localhost:8080";

  const state = {
    teacher: {
      name: "Dr. Aria Morgan",
      email: "aria.morgan@sem.edu",
      phone: "+1 415 555 1099",
      department: "Computer Science",
      designation: "Associate Professor",
      experienceYears: 11,
      qualification: "PhD in AI",
      employeeId: "EMP-TR-2048",
      profileImage: "https://api.dicebear.com/8.x/initials/svg?seed=AM",
      enabled: true,
      accountNonLocked: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    settings: {
      notifications: true,
      autoRefresh: true,
      alerts: true
    },
    ui: {
      activeSection: "dashboard",
      themeMode: localStorage.getItem("teacher-theme-mode") || "dark",
      globalSearch: "",
      profileMenuOpen: false,
      notificationsOpen: false,
      editingExamId: null,
      examTab: "all",
      dashDateRange: "7d",
      selectedExams: new Set(),
      openExamMenuId: null,
      openCertificateMenuId: null,
      selectedExamId: null,
      attempts: {
        search: "",
        sortKey: "attemptDate",
        sortDir: "desc",
        openMenuId: null,
        loading: false
      },
      analytics: {
        examCode: "",
        dateFrom: "",
        dateTo: "",
        loading: false,
        error: "",
        cache: {},
        pendingKey: "",
        pendingPromise: null,
        debounceTimer: null
      },
      aiInsights: {
        studentId: "",
        examCode: "all",
        loading: false,
        error: "",
        cache: {},
        pendingKey: "",
        pendingPromise: null,
        debounceTimer: null
      },
      leaderboard: {
        mode: "exam",
        examCode: "all",
        search: "",
        sortDir: "desc",
        loading: false
      },
      profile: {
        loading: false,
        editing: false,
        snapshot: null
      },
      settings: {
        loading: false,
        saving: false,
        dirty: false,
        baseline: null
      },
      pagination: {
        exams: { page: 1, perPage: 7 },
        attempts: { page: 1, perPage: 8 }
      }
    },
    data: {
      dashboard: null,
      exams: [],
      questions: [],
      attempts: [],
      analytics: {
        rows: [],
        summary: null
      },
      aiInsights: {
        performance: [],
        weakTopics: [],
        overallFeedback: ""
      },
      certificates: [],
      notifications: [],
      leaderboardRows: []
    },
    api: {
      online: false
    }
  };

  const dom = {};

  const ids = () => {
    const map = {};
    document.querySelectorAll("[id]").forEach((el) => { map[el.id] = el; });
    return map;
  };

  const now = () => new Date();
  const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  const idKey = (value) => String(value ?? "");
  const fmtDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const riskFromScore = (cheatScore) => {
    if (cheatScore >= 85) return "CRITICAL";
    if (cheatScore >= 65) return "HIGH";
    if (cheatScore >= 40) return "MEDIUM";
    return "LOW";
  };
  const attemptsRiskFromScore = (score) => {
    const val = Number(score) || 0;
    if (val <= 30) return { key: "LOW", label: "Low", cls: "risk-low" };
    if (val <= 70) return { key: "MEDIUM", label: "Medium", cls: "risk-medium" };
    return { key: "HIGH", label: "High", cls: "risk-high" };
  };
  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
  const normalizeKey = (k) => String(k || "").trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");
  const rowValue = (row, aliases) => {
    const map = {};
    Object.keys(row || {}).forEach((k) => { map[normalizeKey(k)] = row[k]; });
    for (const alias of aliases) {
      const hit = map[normalizeKey(alias)];
      if (hit !== undefined && String(hit).trim() !== "") return hit;
    }
    return "";
  };
  const parseCsvText = (text) => {
    const lines = String(text || "").split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) return { headers: [], rows: [] };
    const splitCsv = (line) => {
      const out = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i += 1; }
          else inQ = !inQ;
        } else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
        else cur += ch;
      }
      out.push(cur);
      return out.map((x) => x.trim());
    };
    const headers = splitCsv(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const cells = splitCsv(line);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ""; });
      return obj;
    });
    return { headers, rows };
  };
  const shouldBufferButton = (btn) => {
    if (!btn || btn.disabled) return false;
    if (btn.dataset.noBuffer === "true") return false;
    if (btn.classList.contains("nav-link")) return false;
    if (btn.classList.contains("tab-btn")) return false;
    if (btn.classList.contains("stage-chip")) return false;
    if (btn.classList.contains("evidence-tab")) return false;
    if (btn.closest(".status-tabs")) return false;
    return true;
  };
  const inferBusyText = (btn) => {
    if (!btn) return "Processing...";
    if (btn.dataset.busyText) return btn.dataset.busyText;
    const id = btn.id || "";
    const examAction = btn.dataset.examAction || "";
    const attemptAction = btn.dataset.attemptAction || "";
    const certAction = btn.dataset.certAction || "";
    if (btn.dataset.examMenuToggle || btn.dataset.certMenuToggle || btn.dataset.proctorMore) return "Loading actions...";

    const examMap = {
      analytics: "Loading analytics...",
      questions: "Opening questions...",
      attempts: "Loading attempts...",
      upload: "Preparing upload...",
      view: "Opening details...",
      publish: "Publishing exam...",
      delete: "Deleting exam...",
      duplicate: "Duplicating exam...",
      results: "Loading results...",
      share: "Creating share link...",
      edit: "Opening editor...",
      downloadq: "Preparing download..."
    };
    if (examMap[examAction]) return examMap[examAction];

    const attemptMap = {
      warn: "Sending warning...",
      evidence: "Loading evidence...",
      cancel: "Cancelling attempt..."
    };
    if (attemptMap[attemptAction]) return attemptMap[attemptAction];

    const certMap = {
      view: "Opening certificate...",
      download: "Downloading certificate...",
      verify: "Verifying certificate...",
      revoke: "Revoking certificate..."
    };
    if (certMap[certAction]) return certMap[certAction];

    const idMap = {
      openExamModalBtn: "Opening exam form...",
      exportExamsBtn: "Exporting exams...",
      bulkPublishBtn: "Publishing selected exams...",
      bulkDeleteBtn: "Deleting selected exams...",
      bulkExportBtn: "Exporting selected exams...",
      examJumpBtn: "Loading page...",
      exportDashboardBtn: "Exporting dashboard report...",
      refreshDashboard: "Refreshing dashboard...",
      stSave: "Saving settings...",
      stSessionReset: "Resetting sessions...",
      stApiTest: "Testing API connectivity...",
      changePasswordBtn: "Opening password form...",
      logoutBtn: "Signing out...",
      profileLogout: "Signing out...",
      uqUpload: "Uploading file...",
      uqBrowse: "Opening file picker...",
      uqRemove: "Removing attached file...",
      uqHelp: "Opening instructions...",
      uqCancel: "Closing form...",
      uqClose: "Closing form..."
    };
    if (idMap[id]) return idMap[id];

    const label = (btn.textContent || "").trim().toLowerCase();
    if (label.includes("download")) return "Downloading...";
    if (label.includes("export")) return "Exporting...";
    if (label.includes("create")) return "Creating...";
    if (label.includes("save")) return "Saving...";
    if (label.includes("update")) return "Updating...";
    if (label.includes("verify")) return "Verifying...";
    if (label.includes("revoke")) return "Revoking...";
    if (label.includes("cancel")) return "Cancelling...";
    if (label.includes("warn")) return "Sending warning...";
    if (label.includes("view")) return "Loading details...";
    if (label.includes("close")) return "Closing...";
    return "Processing...";
  };
  const startButtonBuffer = (btn, busyText = "Processing...") => {
    if (!btn || btn.classList.contains("is-buffering")) return () => {};
    const prev = {
      html: btn.innerHTML,
      width: btn.style.width,
      disabled: btn.disabled
    };
    const fixedW = btn.offsetWidth;
    if (fixedW > 64) btn.style.width = `${fixedW}px`;
    btn.classList.add("is-buffering");
    btn.disabled = true;
    const showText = fixedW >= 128 && !btn.classList.contains("small");
    btn.innerHTML = showText
      ? `<span class="btn-buffer-spinner"></span><span class="btn-buffer-label">${busyText}</span>`
      : `<span class="btn-buffer-spinner"></span>`;
    return () => {
      btn.innerHTML = prev.html;
      btn.style.width = prev.width;
      btn.disabled = prev.disabled;
      btn.classList.remove("is-buffering");
    };
  };
  async function parseQuestionFile(file) {
    const name = String(file.name || "").toLowerCase();
    if (name.endsWith(".csv")) {
      const text = await readFileAsText(file);
      return parseCsvText(text);
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      if (!window.XLSX) throw new Error("Excel parser not loaded");
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const headers = rows.length ? Object.keys(rows[0]) : [];
      return { headers, rows };
    }
    throw new Error("Unsupported file type");
  }

  const normalizeUploadQuestionType = (value) => {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "MCQ";
    if (raw.includes("COD")) return "CODING";
    if (raw.includes("SHORT") || raw.includes("DESC")) return "DESCRIPTIVE";
    if (raw === "MCQ" || raw.includes("MULTIPLE")) return "MCQ";
    return raw;
  };

  const mapUploadedQuestionToLocal = (examId, question, index = 0) => ({
    id: String(question?.id || uid("q")),
    examId,
    text: String(question?.questionText || ""),
    type: String(question?.questionType || "MCQ").replaceAll("_", " "),
    marks: Number(question?.marks || 0),
    difficulty: String(question?.difficulty || "Easy"),
    topic: String(question?.topic || "general"),
    options: [
      String(question?.optionA || ""),
      String(question?.optionB || ""),
      String(question?.optionC || ""),
      String(question?.optionD || ""),
      String(question?.optionE || ""),
      String(question?.optionF || "")
    ],
    sampleInput: String(question?.sampleInput || ""),
    sampleOutput: String(question?.sampleOutput || ""),
    explanation: "",
    shuffleOptions: Boolean(question?.shuffleOptions),
    displayOrder: Number(question?.displayOrder || index + 1)
  });

  const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || ""));
  const isBodySerializable = (body) => body && typeof body === "object"
    && !(body instanceof FormData)
    && !(body instanceof Blob)
    && !(body instanceof ArrayBuffer)
    && !(body instanceof URLSearchParams);
  const apiUrl = (path) => {
    const raw = String(path || "").trim();
    if (!raw) return API_BASE;
    if (isAbsoluteUrl(raw)) return raw;
    return `${API_BASE}${raw.startsWith("/") ? raw : `/${raw}`}`;
  };
  const resolveExamRoute = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return raw;
    const hit = state.data.exams.find((exam) => String(exam.id) === raw || String(exam.examCode) === raw);
    return hit?.examCode || raw;
  };
  const resolveExactExamCode = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const hit = state.data.exams.find((exam) => String(exam.examCode || "").trim() === raw || String(exam.id) === raw);
    return String(hit?.examCode || "").trim();
  };
  const parseResponse = async (res, responseType = "auto") => {
    if (responseType === "blob") return res.blob();
    if (responseType === "text") return res.text();
    if (responseType === "raw") return res;
    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (responseType === "json" || contentType.includes("application/json")) {
      return res.json().catch(() => ({}));
    }
    return res.text().catch(() => "");
  };

  const extractErrorMessage = async (response) => {
    const fallback = response.statusText || `Request failed (${response.status})`;
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
  };

  async function authFetch(path, options = {}, meta = {}) {
    const { useBase = true, includeAuth = true, silent = false, throwOnError = true } = meta;
    const token = getAuthToken();
    if (includeAuth && (!token || !isLikelyJwt(token))) {
      clearAuthStorage();
      redirectToLogin();
      throw new Error("Missing authentication token");
    }

    const reqOptions = { ...options };
    const headers = new Headers(reqOptions.headers || {});
    if (!headers.has("Accept")) headers.set("Accept", "application/json,text/plain,*/*");
    if (includeAuth && token) headers.set("Authorization", `Bearer ${token}`);
    if (isBodySerializable(reqOptions.body) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
      reqOptions.body = JSON.stringify(reqOptions.body);
    }
    reqOptions.headers = headers;

    let response;
    try {
      response = await fetch(useBase ? apiUrl(path) : String(path), { credentials: "same-origin", ...reqOptions });
    } catch (err) {
      if (!silent) toast("Unable to connect to API server.", "error");
      throw err;
    }

    if (response.status === 401 || response.status === 403) {
      if (!silent) toast("Session expired. Please login again.", "error");
      clearAuthStorage();
      redirectToLogin();
      const authErr = new Error(`Auth ${response.status}`);
      authErr.status = response.status;
      throw authErr;
    }

    if (!response.ok && throwOnError) {
      const message = await extractErrorMessage(response);
      if (response.status >= 500) {
        try {
          const errorBody = await response.clone().text();
          const bodySnippet = String(errorBody || "").slice(0, 500);
          console.error("[Teacher API 5xx]", {
            url: useBase ? apiUrl(path) : String(path),
            status: response.status,
            body: bodySnippet
          });
        } catch (_e) {}
      }
      if (!silent) toast(message, "error");
      const apiErr = new Error(message);
      apiErr.status = response.status;
      apiErr.details = message;
      throw apiErr;
    }

    return response;
  }

  const api = {
    async request(path, options = {}, meta = {}) {
      const res = await authFetch(path, options, meta);
      return parseResponse(res, meta.responseType || "auto");
    },
    async ping() {
      try {
        await this.request("/api/teacher/health", {}, { silent: true });
        state.api.online = true;
      } catch (_e) {
        state.api.online = false;
      }
      return state.api.online;
    },
    async dashboardSummary() {
      return this.request("/api/teacher/dashboard", { method: "GET" });
    },
    listExams() { return this.request("/api/teacher/exams"); },
    createExam(payload) { return this.request("/api/teacher/exams", { method: "POST", body: payload }); },
    updateExam(id, payload) { return this.request(`/api/teacher/exams/${resolveExamRoute(id)}`, { method: "PUT", body: payload }); },
    deleteExam(id) { return this.request(`/api/teacher/exams/${resolveExamRoute(id)}`, { method: "DELETE" }); },
    publishExam(id) { return this.request(`/api/teacher/exams/${resolveExamRoute(id)}/publish`, { method: "POST" }); },
    listQuestions(examId) { return this.request(`/api/teacher/exams/${resolveExamRoute(examId)}/questions`); },
    createQuestion(examId, payload) { return this.request(`/api/teacher/exams/${resolveExamRoute(examId)}/questions`, { method: "POST", body: payload }); },
    updateQuestion(examId, qId, payload) { return this.request(`/api/teacher/exams/${resolveExamRoute(examId)}/questions/${qId}`, { method: "PUT", body: payload }); },
    deleteQuestion(examId, qId) { return this.request(`/api/teacher/exams/${resolveExamRoute(examId)}/questions/${qId}`, { method: "DELETE" }); },
    async examAttempts() {
      return this.request("/api/exam/attempts", { method: "GET" });
    },
    async cancelAttempt(attemptId) {
      return this.request(`/api/exam/cancel/${encodeURIComponent(attemptId)}`, { method: "POST" });
    },
    async forceSubmitAttempt(attemptId) {
      return this.request(`/api/exam/force-submit/${encodeURIComponent(attemptId)}`, { method: "POST" });
    },
    async attemptResult(attemptId) {
      return this.request(`/api/exam/result/${encodeURIComponent(attemptId)}`, { method: "GET" });
    },
    async resumeAttempt(attemptId) {
      return this.request(`/api/exam/resume/${encodeURIComponent(attemptId)}`, { method: "GET" });
    },
    async evidenceSummary(attemptId) {
      const routes = [
        `/api/proctoring/evidence/${encodeURIComponent(attemptId)}/summary`,
        `/api/proctoring/summary/${encodeURIComponent(attemptId)}`
      ];
      let lastErr = null;
      for (const url of routes) {
        try {
          return await this.request(url, { method: "GET" }, { silent: true });
        } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error("Evidence summary API unavailable");
    },
    async evidenceTab(attemptId, tab) {
      const safeTab = String(tab || "").toLowerCase();
      const routes = [
        `/api/proctoring/evidence/${encodeURIComponent(attemptId)}/${safeTab}`,
        `/api/proctoring/events/${encodeURIComponent(attemptId)}`
      ];
      let lastErr = null;
      for (const url of routes) {
        try {
          return await this.request(url, { method: "GET" }, { silent: true });
        } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error("Evidence tab API unavailable");
    },
    async warnAttempt(attemptId) {
      const routes = [
        `/api/proctoring/attempt/${encodeURIComponent(attemptId)}/warn`
      ];
      let lastErr = null;
      for (const url of routes) {
        try {
          return await this.request(url, { method: "POST" }, { silent: true });
        } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error("Warn API unavailable");
    },
    async markAttemptSafe(attemptId) {
      const routes = [
        `/api/proctoring/attempt/${encodeURIComponent(attemptId)}/mark-safe`
      ];
      let lastErr = null;
      for (const url of routes) {
        try {
          return await this.request(url, { method: "POST" }, { silent: true });
        } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error("Mark safe API unavailable");
    },
    async evidenceZip(attemptId) {
      const routes = [
        `/api/proctoring/evidence/${encodeURIComponent(attemptId)}/download`
      ];
      let lastErr = null;
      for (const url of routes) {
        try {
          return await this.request(url, { method: "GET" }, { responseType: "blob", silent: true });
        } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error("Evidence download API unavailable");
    },
    async evidenceReport(attemptId) {
      const routes = [
        `/api/proctoring/evidence/${encodeURIComponent(attemptId)}/report`
      ];
      let lastErr = null;
      for (const url of routes) {
        try {
          return await this.request(url, { method: "GET" }, { responseType: "blob", silent: true });
        } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error("Evidence report API unavailable");
    },
    async analyticsExam(examCode) {
      return this.request(`/api/analytics/exam/${encodeURIComponent(examCode)}`, { method: "GET" });
    },
    async analyticsClass(examCode) {
      return this.request(`/api/analytics/class/${encodeURIComponent(examCode)}`, { method: "GET" });
    },
    async aiAnalysisStudent(studentId, examCode = "") {
      const q = examCode && examCode !== "all" ? `?examCode=${encodeURIComponent(examCode)}` : "";
      return this.request(`/api/ai-analysis/student/${encodeURIComponent(studentId)}${q}`, { method: "GET" });
    },
    async userMe() {
      return this.request("/api/users/me", { method: "GET" });
    },
    async userUpdate(payload) {
      return this.request("/api/users/update", { method: "PUT", body: payload });
    },
    async userChangePassword(payload) {
      return this.request("/api/users/change-password", { method: "POST", body: payload });
    },
    async userUploadImage(file) {
      const data = new FormData();
      data.append("file", file);
      const routes = ["/api/users/profile-image", "/api/users/upload-image", "/api/users/profile/upload"];
      let lastErr = null;
      for (const route of routes) {
        try {
          return await this.request(route, { method: "POST", body: data }, { silent: true });
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("Profile image upload API unavailable");
    },
    async settingsGet() {
      return this.request("/api/settings", { method: "GET" });
    },
    async settingsUpdate(payload) {
      return this.request("/api/settings", { method: "PUT", body: payload });
    },
    async settingsResetSessions() {
      return this.request("/api/settings/reset-sessions", { method: "POST" });
    },
    async settingsTestConnection() {
      return this.request("/api/settings/test-connection", { method: "GET" });
    },
    async certificatesAll() {
      return this.request("/api/certificate/all", { method: "GET" });
    },
    async certificateDownload(certificateId) {
      return this.request(`/api/certificate/download/${encodeURIComponent(certificateId)}`, { method: "GET" }, { responseType: "blob" });
    },
    async certificateVerify(certificateId) {
      const response = await authFetch(`/api/certificate/verify/${encodeURIComponent(certificateId)}`, { method: "GET" }, { throwOnError: false, silent: true });
      let payload = {};
      try { payload = await parseResponse(response, "json"); } catch (_e) {}
      return { status: response.status, ok: response.ok, payload };
    },
    async certificateRevoke(certificateId) {
      return this.request(`/api/certificate/revoke/${encodeURIComponent(certificateId)}`, { method: "POST" });
    },
    async leaderboardByExam(examCode) {
      return this.request(`/api/leaderboard/exam/${encodeURIComponent(examCode)}`, { method: "GET" });
    },
    async leaderboardGlobal() {
      return this.request("/api/leaderboard/global", { method: "GET" });
    },
    async bulkUploadQuestions(examCode, questions) {
      return this.request(`/api/teacher/exams/${resolveExamRoute(examCode)}/questions/bulk`, {
        method: "POST",
        body: questions
      });
    }
  };

  function seedData() {
    const start = new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const created = new Date(start.getTime() - 5 * 24 * 60 * 60 * 1000);
    state.data.exams = [
      { id: "e1", examCode: "EXAM-AI-301", title: "AI Foundations", description: "Core AI concepts", subject: "AI", duration: 90, totalMarks: 100, passingMarks: 40, maxAttempts: 2, marksPerQuestion: 2, negativeMarks: 0.25, easyCount: 10, mediumCount: 20, hardCount: 20, shuffleQuestions: true, shuffleOptions: true, status: "Published", active: true, createdBy: "Dr. Aria Morgan", startTime: start.toISOString(), endTime: end.toISOString(), createdDate: created.toISOString() },
      { id: "e2", examCode: "EXAM-ML-112", title: "Machine Learning Basics", description: "Regression and classification", subject: "ML", duration: 120, totalMarks: 120, passingMarks: 50, maxAttempts: 1, marksPerQuestion: 2, negativeMarks: 0, easyCount: 15, mediumCount: 20, hardCount: 25, shuffleQuestions: false, shuffleOptions: true, status: "Published", active: true, createdBy: "Dr. Aria Morgan", startTime: start.toISOString(), endTime: end.toISOString(), createdDate: new Date(created.getTime() + 86400000).toISOString() },
      { id: "e3", examCode: "EXAM-JS-204", title: "Advanced JavaScript", description: "Language deep dive", subject: "Web", duration: 60, totalMarks: 80, passingMarks: 32, maxAttempts: 1, marksPerQuestion: 2, negativeMarks: 0.25, easyCount: 12, mediumCount: 14, hardCount: 14, shuffleQuestions: true, shuffleOptions: false, status: "Draft", active: false, createdBy: "Dr. Aria Morgan", startTime: start.toISOString(), endTime: end.toISOString(), createdDate: new Date(created.getTime() + 2 * 86400000).toISOString() }
    ];

    state.data.questions = [
      { id: "q1", examId: "e1", text: "What is supervised learning?", type: "MCQ", marks: 2, difficulty: "Easy", topic: "Learning", options: ["Uses labeled data", "Uses no data", "Only for NLP", "Only for CV", "", ""], sampleInput: "", sampleOutput: "", explanation: "It learns from labeled examples", shuffleOptions: true, displayOrder: 1 },
      { id: "q2", examId: "e1", text: "Define overfitting", type: "Short Answer", marks: 4, difficulty: "Medium", topic: "Generalization", options: ["", "", "", "", "", ""], sampleInput: "", sampleOutput: "", explanation: "Model memorizes training patterns", shuffleOptions: false, displayOrder: 2 },
      { id: "q3", examId: "e2", text: "Implement linear regression prediction", type: "Coding", marks: 8, difficulty: "Hard", topic: "Regression", options: ["", "", "", "", "", ""], sampleInput: "n=2", sampleOutput: "3.14", explanation: "Use y = mx + c", shuffleOptions: false, displayOrder: 1 }
    ];

    state.data.attempts = Array.from({ length: 22 }).map((_, i) => {
      const exam = state.data.exams[i % state.data.exams.length];
      const score = clamp(40 + Math.round(Math.random() * 60), 0, exam.totalMarks);
      const pct = Math.round((score / exam.totalMarks) * 100);
      const cheat = Math.round(Math.random() * 100);
      return {
        id: uid("att"),
        studentName: `Student ${i + 1}`,
        examId: exam.id,
        score,
        percentage: pct,
        timeTaken: `${40 + (i % 55)} min`,
        status: pct >= 40 ? "COMPLETED" : "STARTED",
        cheatingScore: cheat,
        riskLevel: riskFromScore(cheat),
        severity: riskFromScore(cheat),
        createdAt: new Date(Date.now() - i * 3600000).toISOString()
      };
    });

    state.data.certificates = [
      {
        certificateId: "CERT-9001",
        studentName: "Student 2",
        collegeName: "SEM College of Engineering",
        department: "Computer Science",
        rollNumber: "CSE21-002",
        examTitle: "AI Foundations",
        examId: "e1",
        score: 92,
        grade: "A+",
        issuedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        revoked: false,
        qrCodeData: "https://api.dicebear.com/8.x/identicon/svg?seed=CERT-9001"
      },
      {
        certificateId: "CERT-9002",
        studentName: "Student 9",
        collegeName: "SEM College of Engineering",
        department: "AI & Data Science",
        rollNumber: "AID22-009",
        examTitle: "Machine Learning Basics",
        examId: "e2",
        score: 86,
        grade: "A",
        issuedAt: new Date(Date.now() - 86400000).toISOString(),
        revoked: false,
        qrCodeData: "https://api.dicebear.com/8.x/identicon/svg?seed=CERT-9002"
      },
      {
        certificateId: "CERT-9003",
        studentName: "Student 12",
        collegeName: "SEM College of Engineering",
        department: "Computer Science",
        rollNumber: "CSE20-012",
        examTitle: "AI Foundations",
        examId: "e1",
        score: 64,
        grade: "B",
        issuedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        revoked: true,
        qrCodeData: "https://api.dicebear.com/8.x/identicon/svg?seed=CERT-9003"
      }
    ];

    state.data.notifications = [
      { id: uid("n"), text: "AI Foundations exam started with 12 active students." },
      { id: uid("n"), text: "High risk event detected for Student 7." },
      { id: uid("n"), text: "Certificate CERT-9002 generated successfully." }
    ];
  }

  function setLoading(active) {
    if (dom.loaderOverlay) {
      dom.loaderOverlay.classList.toggle("active", !!active);
    }
  }

  function pulseDashboardSkeleton() {
    const blocks = document.querySelectorAll("#dashboard .card, #dashboard .stat-card");
    blocks.forEach((el) => el.classList.add("skeleton"));
    setTimeout(() => blocks.forEach((el) => el.classList.remove("skeleton")), 500);
  }

  function toast(message, type = "info") {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = `${type === "error" ? "Error: " : ""}${message}`;
    dom.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  const isUiNoise = (message = "", filename = "") => {
    const text = `${message} ${filename}`.toLowerCase();
    return [
      "ses removing unpermitted intrinsics",
      "could not establish connection",
      "receiving end does not exist",
      "the message port closed before a response was received",
      "fetchviaserviceworker production extension not found",
      "smart-bomb.js",
      "usage-monitoring.js",
      "browserpolyfillwrapper",
      "content.js"
    ].some((hit) => text.includes(hit));
  };

  const emitUiError = (message) => {
    toast(String(message || "Unexpected teacher UI error"), "error");
  };

  const installUiErrorHandlers = () => {
    if (window.__teacherUiErrorHandlersInstalled) return;
    window.__teacherUiErrorHandlersInstalled = true;
    window.addEventListener("error", (event) => {
      if (isUiNoise(event?.message, event?.filename)) return;
      emitUiError(event?.message || "Unexpected teacher UI error");
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event?.reason;
      const message = typeof reason === "string"
        ? reason
        : reason?.message || reason?.cause || "Unexpected teacher UI error";
      if (isUiNoise(message)) return;
      emitUiError(message);
    });
  };

  installUiErrorHandlers();

  function addNotification(text) {
    if (!state.settings.notifications) return;
    state.data.notifications.unshift({ id: uid("n"), text });
    state.data.notifications = state.data.notifications.slice(0, 25);
    renderNotifications();
    window.TeacherNotificationHub?.push?.(text)?.catch?.(() => {});
  }

  function openModal(contentHtml) {
    dom.modalContainer.innerHTML = `<div class="modal">${contentHtml}</div>`;
    dom.modalContainer.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    document.body.classList.remove("modal-open");
    dom.modalContainer.classList.remove("no-scroll-modal");
    dom.modalContainer.classList.remove("upload-modal-host");
    dom.modalContainer.classList.remove("questions-modal-host");
    dom.modalContainer.classList.remove("evidence-modal-host");
    dom.modalContainer.classList.remove("certificate-modal-host");
    dom.modalContainer.classList.add("hidden");
    dom.modalContainer.innerHTML = "";
  }

  function confirmDialog({ title, message, actionLabel = "Confirm" }) {
    return new Promise((resolve) => {
      openModal(`
        <div class="confirm-dialog">
          <h3 class="confirm-title">${title}</h3>
          <p class="confirm-message">${message}</p>
          <div class="actions confirm-actions">
            <button id="confirmCancelBtn" class="btn ghost">Cancel</button>
            <button id="confirmOkBtn" class="btn primary">${actionLabel}</button>
          </div>
        </div>
      `);
      const ok = document.getElementById("confirmOkBtn");
      const cancel = document.getElementById("confirmCancelBtn");
      ok.addEventListener("click", () => { closeModal(); resolve(true); });
      cancel.addEventListener("click", () => { closeModal(); resolve(false); });
    });
  }

  function confirmTextDialog({ title, message, expectedText, actionLabel = "Confirm" }) {
    return new Promise((resolve) => {
      const expected = String(expectedText || "").trim();
      openModal(`
        <div class="confirm-dialog">
          <h3 class="confirm-title">${title}</h3>
          <p class="confirm-message">${message}</p>
          <label class="form-label" for="confirmTextInput" style="display:block; margin-top:10px;">Type <strong>${expected}</strong> to continue</label>
          <input id="confirmTextInput" class="form-control-like" type="text" autocomplete="off" spellcheck="false" />
          <p id="confirmTextError" style="display:none; margin-top:8px; color:var(--accent-pink); font-size:12px;">Confirmation text does not match.</p>
          <div class="actions confirm-actions">
            <button id="confirmTextCancelBtn" class="btn ghost">Cancel</button>
            <button id="confirmTextOkBtn" class="btn primary">${actionLabel}</button>
          </div>
        </div>
      `);
      const input = document.getElementById("confirmTextInput");
      const error = document.getElementById("confirmTextError");
      const ok = document.getElementById("confirmTextOkBtn");
      const cancel = document.getElementById("confirmTextCancelBtn");
      if (input) input.focus();

      const validate = () => String(input?.value || "").trim() === expected;
      const submit = () => {
        if (!validate()) {
          if (error) error.style.display = "block";
          input?.classList?.add("is-invalid");
          input?.focus();
          return;
        }
        closeModal();
        resolve(true);
      };

      ok?.addEventListener("click", submit);
      cancel?.addEventListener("click", () => { closeModal(); resolve(false); });
      input?.addEventListener("input", () => {
        if (error) error.style.display = "none";
        input.classList.remove("is-invalid");
      });
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
      });
    });
  }

  function showSection(sectionId) {
    state.ui.activeSection = sectionId;
    document.querySelectorAll(".section").forEach((s) => s.classList.toggle("active", s.id === sectionId));
    document.querySelectorAll(".nav-link").forEach((b) => b.classList.toggle("active", b.dataset.section === sectionId));
    if (window.innerWidth <= 900) dom.sidebar.classList.remove("open");
    if (sectionId === "analytics") {
      requestAnimationFrame(() => {
        renderAnalytics();
      if (!state.data.analytics.summary && state.ui.analytics.examCode) loadAnalyticsData(false);
      });
    }
  }

  function applyTheme(mode) {
    state.ui.themeMode = mode;
    localStorage.setItem("teacher-theme-mode", mode);
    let effective = mode;
    if (mode === "system") {
      effective = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", effective);
    dom.themeToggle.innerHTML = `<i class="fa-solid ${mode === "light" ? "fa-sun" : mode === "system" ? "fa-laptop" : "fa-moon"}"></i>${mode[0].toUpperCase()}${mode.slice(1)}`;
  }

  function toggleTheme() {
    const order = ["dark", "light", "system"];
    const idx = order.indexOf(state.ui.themeMode);
    applyTheme(order[(idx + 1) % order.length]);
    drawAllCharts();
  }

  function paginate(items, key) {
    const p = state.ui.pagination[key];
    const totalPages = Math.max(1, Math.ceil(items.length / p.perPage));
    p.page = clamp(p.page, 1, totalPages);
    const start = (p.page - 1) * p.perPage;
    return { rows: items.slice(start, start + p.perPage), totalPages, page: p.page };
  }

  function upsertPagination(containerId, key, totalPages) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = `
      <button class="btn ghost small" data-page-action="${key}-prev" ${state.ui.pagination[key].page <= 1 ? "disabled" : ""}>Previous</button>
      <span>Page ${state.ui.pagination[key].page} / ${totalPages}</span>
      <button class="btn ghost small" data-page-action="${key}-next" ${state.ui.pagination[key].page >= totalPages ? "disabled" : ""}>Next</button>
    `;
  }

  function examById(id) {
    const key = idKey(id);
    return state.data.exams.find((e) => idKey(e.id) === key);
  }
  function closeExamMoreMenu() {
    state.ui.openExamMenuId = null;
    if (!dom.examMorePortal) return;
    dom.examMorePortal.classList.remove("open");
    dom.examMorePortal.innerHTML = "";
    dom.examMorePortal.style.left = "-9999px";
    dom.examMorePortal.style.top = "-9999px";
  }
  function openExamMoreMenu(anchorEl, examId) {
    const exam = examById(examId);
    if (!exam || !dom.examMorePortal) return;
    state.ui.openExamMenuId = idKey(exam.id);
    dom.examMorePortal.innerHTML = `
      <button data-exam-action="upload" data-id="${exam.id}" ${exam.status === "Published" ? "disabled" : ""}>Upload</button>
      <button data-exam-action="view" data-id="${exam.id}">View</button>
      <button data-exam-action="publish" data-id="${exam.id}" ${exam.status === "Published" || !exam.questionsUploaded ? "disabled" : ""}>Publish</button>
      <button data-exam-action="results" data-id="${exam.id}" ${exam.status !== "Published" ? "disabled" : ""}>Results</button>
      <button data-exam-action="duplicate" data-id="${exam.id}">Duplicate</button>
      <button data-exam-action="downloadq" data-id="${exam.id}">Download Questions</button>
      <button data-exam-action="share" data-id="${exam.id}" ${exam.status !== "Published" || isExamEnded(exam) ? "disabled" : ""}>Share</button>
      <button data-exam-action="edit" data-id="${exam.id}" ${exam.status === "Published" ? "disabled" : ""}>Edit</button>
      <button class="destructive" data-exam-action="delete" data-id="${exam.id}">Delete</button>
    `;
    dom.examMorePortal.classList.add("open");
    dom.examMorePortal.style.visibility = "hidden";
    const rect = anchorEl.getBoundingClientRect();
    const menuW = dom.examMorePortal.offsetWidth || 220;
    const menuH = dom.examMorePortal.offsetHeight || 280;
    const spacing = 8;
    const left = clamp(rect.right - menuW, spacing, window.innerWidth - menuW - spacing);
    const placeAbove = rect.bottom + spacing + menuH > window.innerHeight;
    const top = placeAbove
      ? Math.max(spacing, rect.top - menuH - 6)
      : Math.min(window.innerHeight - menuH - spacing, rect.bottom + 6);
    dom.examMorePortal.style.left = `${left}px`;
    dom.examMorePortal.style.top = `${top}px`;
    dom.examMorePortal.style.visibility = "visible";
  }
  function examTitle(id) { const e = examById(id); return e ? e.title : "-"; }
  function attemptsForExam(exam) {
    if (!exam) return [];
    return state.data.attempts.filter((a) => {
      const byId = a.examId && idKey(a.examId) === idKey(exam.id);
      const byCode = a.examCode && a.examCode === exam.examCode;
      return byId || byCode;
    });
  }
  function questionCount(examId) {
    const localCount = state.data.questions.filter((q) => String(q.examId) === String(examId)).length;
    if (localCount > 0) return localCount;
    const exam = examById(examId);
    if (!exam) return 0;
    const counts = [
      Number(exam.easyCount || 0),
      Number(exam.mediumCount || 0),
      Number(exam.hardCount || 0)
    ];
    const total = counts.reduce((n, value) => n + value, 0);
    return total > 0 ? total : Number(exam.questionsUploaded ? 1 : 0);
  }
  function isExamEnded(exam) { return !!exam?.endTime && new Date(exam.endTime) < new Date(); }

  function safeQuery(query) {
    return (query || "").trim().toLowerCase();
  }

  function normalizeIdentity(value) {
    return String(value || "").trim().toLowerCase();
  }

  function decodeJwtPayload(token) {
    try {
      const parts = String(token || "").split(".");
      if (parts.length !== 3) return {};
      const base64Raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padding = "=".repeat((4 - (base64Raw.length % 4)) % 4);
      const base64 = `${base64Raw}${padding}`;
      const json = atob(base64);
      return JSON.parse(json);
    } catch (_e) {
      return {};
    }
  }

  function teacherIdentityCandidates() {
    const token = getAuthToken();
    const jwt = decodeJwtPayload(token);
    const candidates = new Set();
    [
      state.teacher?.email,
      state.teacher?.name,
      state.teacher?.employeeId,
      jwt?.sub,
      jwt?.email,
      jwt?.username,
      jwt?.preferred_username,
      jwt?.upn,
      jwt?.unique_name,
      jwt?.name
    ].forEach((value) => {
      const normalized = normalizeIdentity(value);
      if (normalized) candidates.add(normalized);
    });
    return candidates;
  }

  function examOwnedByCurrentTeacher(exam) {
    const identities = teacherIdentityCandidates();
    if (!identities.size) return true;
    const owner = normalizeIdentity(exam?.ownerKey || exam?.createdBy);
    if (!owner) return true;
    return identities.has(owner);
  }

  function filterOwnedExams(exams) {
    return (Array.isArray(exams) ? exams : []).filter((exam) => examOwnedByCurrentTeacher(exam));
  }

  function getDashboardAttempts() {
    const nowDt = new Date();
    const range = dom.dashDateRange?.value || state.ui.dashDateRange;
    if (range === "today") {
      return state.data.attempts.filter((a) => new Date(a.createdAt).toDateString() === nowDt.toDateString());
    }
    if (range === "7d") {
      const cutoff = new Date(nowDt.getTime() - 7 * 86400000);
      return state.data.attempts.filter((a) => new Date(a.createdAt) >= cutoff);
    }
    if (range === "30d") {
      const cutoff = new Date(nowDt.getTime() - 30 * 86400000);
      return state.data.attempts.filter((a) => new Date(a.createdAt) >= cutoff);
    }
    if (range === "custom" && dom.dashStartDate?.value && dom.dashEndDate?.value) {
      const s = new Date(dom.dashStartDate.value);
      const e = new Date(dom.dashEndDate.value);
      e.setHours(23, 59, 59, 999);
      return state.data.attempts.filter((a) => {
        const t = new Date(a.createdAt);
        return t >= s && t <= e;
      });
    }
    return state.data.attempts;
  }

  function filteredExams() {
    const q = safeQuery(dom.examSearch.value || state.ui.globalSearch);
    const status = state.ui.examTab || dom.examStatusFilter.value;
    const subject = dom.examSubjectFilter?.value || "all";
    const duration = dom.examDurationFilter?.value || "all";
    const from = dom.examDateFrom?.value;
    const to = dom.examDateTo?.value;
    const createdBy = dom.examCreatedByFilter?.value || "all";
    const active = dom.examActiveFilter?.value || "all";
    return state.data.exams.filter((e) => {
      const passStatus = status === "all" || e.status === status;
      const passSearch = !q || `${e.title} ${e.examCode} ${e.subject}`.toLowerCase().includes(q);
      const passSubject = subject === "all" || e.subject === subject;
      const passDuration = duration === "all"
        || (duration === "short" && e.duration <= 60)
        || (duration === "medium" && e.duration > 60 && e.duration <= 120)
        || (duration === "long" && e.duration > 120);
      const createdAt = new Date(e.createdDate || e.startTime);
      const passFrom = !from || createdAt >= new Date(from);
      const passTo = !to || createdAt <= new Date(`${to}T23:59:59`);
      const passCreator = createdBy === "all" || (e.createdBy || state.teacher.name) === createdBy;
      const passActive = active === "all" || (active === "active" ? e.active !== false : e.active === false);
      return passStatus && passSearch && passSubject && passDuration && passFrom && passTo && passCreator && passActive;
    });
  }

  function normalizeAttempt(raw, idx = 0) {
    const studentName = String(raw?.student?.name || raw?.studentName || raw?.userName || `Student ${idx + 1}`);
    const examObj = raw?.exam || {};
    const examTitleTxt = String(examObj?.title || raw?.examTitle || examTitle(raw?.examId) || "Untitled Exam");
    const examCodeTxt = String(examObj?.examCode || raw?.examCode || "N/A");
    const examIdValue = raw?.examId || examObj?.id || null;
    const score = Number(raw?.score ?? 0);
    const pct = Number(raw?.percentage ?? 0);
    const cheatingScore = clamp(Number(raw?.cheatingScore ?? raw?.riskScore ?? 0), 0, 100);
    const status = String(raw?.status || "STARTED").toUpperCase();
    const inferredSeconds = Number.parseInt(String(raw?.timeTaken || "0").replace(/[^\d]/g, ""), 10) * 60;
    const seconds = Number(raw?.timeTakenSeconds ?? raw?.durationSeconds ?? (Number.isFinite(inferredSeconds) ? inferredSeconds : 0));
    const startTime = raw?.startTime || raw?.createdAt || new Date().toISOString();
    return {
      id: String(raw?.attemptId || raw?.id || uid("att")),
      studentName,
      examId: examIdValue ? String(examIdValue) : null,
      examTitle: examTitleTxt,
      examCode: examCodeTxt,
      score,
      percentage: Number.isFinite(pct) ? pct : 0,
      timeTakenSeconds: Number.isFinite(seconds) ? seconds : 0,
      timeTaken: `${Math.max(1, Math.round((Number.isFinite(seconds) ? seconds : 0) / 60))} min`,
      status,
      cheatingScore,
      riskLevel: attemptsRiskFromScore(cheatingScore).key,
      severity: attemptsRiskFromScore(cheatingScore).key,
      createdAt: startTime,
      startTime
    };
  }

  async function loadAttemptsData() {
    state.ui.attempts.loading = true;
    if (dom.attemptsLoading) dom.attemptsLoading.classList.remove("hidden");
    try {
      const rows = await api.examAttempts();
      const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : Array.isArray(rows?.items) ? rows.items : [];
      state.data.attempts = arr.map((r, idx) => normalizeAttempt(r, idx));
    } catch (_e) {
      state.data.attempts = (state.data.attempts || []).map((r, idx) => normalizeAttempt(r, idx));
    } finally {
      state.ui.attempts.loading = false;
      if (dom.attemptsLoading) dom.attemptsLoading.classList.add("hidden");
      renderAttemptFilters();
      renderAiFilters();
      renderAttempts();
    }
  }

  async function loadExamsData() {
    try {
      const rows = await api.listExams();
      const arr = Array.isArray(rows)
        ? rows
        : Array.isArray(rows?.data)
          ? rows.data
          : Array.isArray(rows?.items)
            ? rows.items
            : [];
      if (arr.length) {
        state.data.exams = filterOwnedExams(arr.map((row, idx) => normalizeExam(row, idx)));
      } else if (!state.data.exams.length) {
        state.data.exams = [];
      }
    } catch (_e) {
      if (!state.data.exams.length) {
        state.data.exams = filterOwnedExams(state.data.exams.map((row, idx) => normalizeExam(row, idx)));
      }
    }
    renderExamSelectors();
    renderAll();
  }

  async function loadDashboardSummary() {
    try {
      const raw = await api.dashboardSummary();
      state.data.dashboard = raw?.data || raw || null;
    } catch (_e) {
      state.data.dashboard = null;
    }
  }

  function filteredAttempts() {
    const examCode = dom.attemptExamFilter?.value || "all";
    const status = dom.attemptStatusFilter?.value || "all";
    const risk = dom.attemptRiskFilter?.value || "all";
    const qLocal = safeQuery(state.ui.attempts.search);
    const qGlobal = safeQuery(state.ui.globalSearch);
    let rows = state.data.attempts.filter((raw, idx) => {
      const a = raw?.examCode ? raw : normalizeAttempt(raw, idx);
      const passExam = examCode === "all" || a.examCode === examCode;
      const passStatus = status === "all" || a.status === status;
      const riskMeta = attemptsRiskFromScore(a.cheatingScore);
      const passRisk = risk === "all" || riskMeta.key === risk;
      const passLocal = !qLocal || String(a.studentName).toLowerCase().includes(qLocal);
      const passGlobal = !qGlobal || `${a.studentName} ${a.examTitle} ${a.examCode}`.toLowerCase().includes(qGlobal);
      return passExam && passStatus && passRisk && passLocal && passGlobal;
    });
    const { sortKey, sortDir } = state.ui.attempts;
    const factor = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "score") return (Number(a.score) - Number(b.score)) * factor;
      if (sortKey === "percentage") return (Number(a.percentage) - Number(b.percentage)) * factor;
      return (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) * factor;
    });
    return rows;
  }

  function profileInitialAvatar(name) {
    const initials = String(name || "Teacher")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "T";
    return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(initials)}`;
  }

  function normalizeTeacher(raw = {}) {
    const source = raw && typeof raw === "object"
      ? (raw.teacher && typeof raw.teacher === "object" ? raw.teacher
        : raw.user && typeof raw.user === "object" ? raw.user
          : raw.data && typeof raw.data === "object" ? raw.data
            : raw)
      : {};
    const resolvedName = String(
      source.name
      || `${source.firstName || ""} ${source.lastName || ""}`.trim()
      || state.teacher.name
      || "Teacher"
    );
    const enabled = Boolean(source.enabled !== false);
    const accountNonLocked = Boolean(source.accountNonLocked !== false);
    const img = String(source.profileImage || source.avatar || "").trim();
    return {
      name: resolvedName,
      email: String(source.email || source.username || state.teacher.email || ""),
      phone: String(source.phone || source.mobile || state.teacher.phone || ""),
      department: String(source.department || state.teacher.department || ""),
      designation: String(source.designation || source.role || state.teacher.designation || ""),
      experienceYears: Number(source.experienceYears ?? source.experience ?? state.teacher.experienceYears ?? 0) || 0,
      qualification: String(source.qualification || state.teacher.qualification || ""),
      employeeId: String(source.employeeId || source.employeeCode || source.staffId || state.teacher.employeeId || ""),
      profileImage: img || profileInitialAvatar(resolvedName),
      enabled,
      accountNonLocked,
      createdAt: source.createdAt || state.teacher.createdAt || new Date().toISOString(),
      updatedAt: source.updatedAt || state.teacher.updatedAt || new Date().toISOString()
    };
  }

  function normalizeExam(raw = {}, idx = 0) {
    const source = raw && typeof raw === "object"
      ? (raw.exam && typeof raw.exam === "object" ? raw.exam
        : raw.data && typeof raw.data === "object" ? raw.data
          : raw)
      : {};
    const id = String(source.id || source.examCode || uid("e"));
    const durationMinutes = Number(source.durationMinutes ?? source.duration ?? source.minutes ?? 60) || 60;
    const createdAt = source.createdAt || source.createdDate || source.updatedAt || new Date().toISOString();
    const status = String(source.status || (source.active === false ? "Draft" : "Published")).toUpperCase();
    const rawCreator = String(source.createdBy || "").trim();
    const ownerKey = normalizeIdentity(rawCreator);
    const creator = rawCreator && rawCreator.toLowerCase() !== String(state.teacher.email || "").toLowerCase()
      ? rawCreator
      : state.teacher.name || rawCreator || "Teacher";
    return {
      id,
      examCode: String(source.examCode || `EXAM-${idx + 1}`),
      title: String(source.title || "Untitled Exam"),
      description: String(source.description || ""),
      subject: String(source.subject || ""),
      duration: durationMinutes,
      durationMinutes,
      totalMarks: Number(source.totalMarks ?? 0),
      passingMarks: Number(source.passingMarks ?? 0),
      maxAttempts: Number(source.maxAttempts ?? 1),
      marksPerQuestion: Number(source.marksPerQuestion ?? 1),
      negativeMarks: Number(source.negativeMarks ?? 0),
      easyCount: Number(source.easyQuestionCount ?? source.easyCount ?? 0),
      mediumCount: Number(source.mediumQuestionCount ?? source.mediumCount ?? 0),
      hardCount: Number(source.difficultQuestionCount ?? source.hardCount ?? 0),
      shuffleQuestions: Boolean(source.shuffleQuestions ?? true),
      shuffleOptions: Boolean(source.shuffleOptions ?? true),
      status: status === "PUBLISHED" ? "Published" : "Draft",
      active: source.active !== false,
      questionsUploaded: Boolean(source.questionsUploaded),
      createdBy: creator,
      ownerKey,
      startTime: source.startTime || null,
      endTime: source.endTime || null,
      createdDate: createdAt,
      updatedAt: source.updatedAt || createdAt
    };
  }

  function profileStatusMeta() {
    if (!state.teacher.enabled) return { label: "Disabled", cls: "status-disabled" };
    if (!state.teacher.accountNonLocked) return { label: "Locked", cls: "status-locked" };
    return { label: "Active", cls: "status-published" };
  }

  function setProfileLoading(active) {
    state.ui.profile.loading = !!active;
    if (dom.profileLoading) dom.profileLoading.classList.toggle("hidden", !active);
    if (dom.profileForm) {
      dom.profileForm.querySelectorAll("input, button").forEach((el) => { el.disabled = !!active; });
      if (!active) setProfileEditMode(state.ui.profile.editing);
    }
  }

  function setProfileEditMode(active) {
    state.ui.profile.editing = !!active;
    const editableIds = ["pfName", "pfPhone", "pfDepartment", "pfDesignation", "pfExperience", "pfQualification"];
    editableIds.forEach((id) => {
      if (dom[id]) dom[id].disabled = !active;
    });
    if (dom.pfEmail) dom.pfEmail.disabled = true;
    if (dom.pfEmployeeId) dom.pfEmployeeId.disabled = true;
    if (dom.profileEditBtn) dom.profileEditBtn.classList.toggle("hidden", active);
    if (dom.profileSaveBtn) dom.profileSaveBtn.classList.toggle("hidden", !active);
    if (dom.profileCancelBtn) dom.profileCancelBtn.classList.toggle("hidden", !active);
    if (dom.changePasswordBtn) dom.changePasswordBtn.disabled = false;
    if (dom.pfUploadImageBtn) dom.pfUploadImageBtn.disabled = !active;
    if (dom.pfRemoveImageBtn) dom.pfRemoveImageBtn.disabled = !active;
  }

  function populateTeacher() {
    dom.teacherNameTop.textContent = state.teacher.name;
    dom.teacherNameMini.textContent = state.teacher.name;
    dom.teacherDeptMini.textContent = state.teacher.department;
    dom.teacherAvatarTop.src = state.teacher.profileImage;
    dom.teacherAvatarMini.src = state.teacher.profileImage;
    dom.pfName.value = state.teacher.name;
    dom.pfEmail.value = state.teacher.email;
    dom.pfPhone.value = state.teacher.phone;
    dom.pfDepartment.value = state.teacher.department;
    dom.pfDesignation.value = state.teacher.designation;
    dom.pfExperience.value = state.teacher.experienceYears;
    dom.pfQualification.value = state.teacher.qualification;
    dom.pfEmployeeId.value = state.teacher.employeeId;
    dom.pfImage.value = state.teacher.profileImage;
    if (dom.pfAvatarPreview) dom.pfAvatarPreview.src = state.teacher.profileImage || profileInitialAvatar(state.teacher.name);
    if (dom.pfHeaderName) dom.pfHeaderName.textContent = state.teacher.name || "Teacher";
    if (dom.pfHeaderDept) dom.pfHeaderDept.textContent = state.teacher.department || "-";
    if (dom.pfHeaderDesignation) dom.pfHeaderDesignation.textContent = state.teacher.designation || "-";
    if (dom.pfAccEmployeeId) dom.pfAccEmployeeId.textContent = state.teacher.employeeId || "-";
    if (dom.pfAccCreatedAt) dom.pfAccCreatedAt.textContent = fmtDateTime(state.teacher.createdAt);
    if (dom.pfAccUpdatedAt) dom.pfAccUpdatedAt.textContent = fmtDateTime(state.teacher.updatedAt);
    if (dom.pfAccEnabled) {
      dom.pfAccEnabled.innerHTML = `<span class="status-pill ${state.teacher.enabled ? "status-published" : "status-disabled"}">${state.teacher.enabled ? "Active" : "Disabled"}</span>`;
    }
    if (dom.pfAccLocked) {
      dom.pfAccLocked.innerHTML = `<span class="status-pill ${state.teacher.accountNonLocked ? "status-published" : "status-locked"}">${state.teacher.accountNonLocked ? "Unlocked" : "Locked"}</span>`;
    }
    const status = profileStatusMeta();
    if (dom.pfAccountStatus) {
      dom.pfAccountStatus.textContent = status.label;
      dom.pfAccountStatus.className = `status-pill ${status.cls}`;
    }
  }

  function collectProfilePayload() {
    return {
      name: dom.pfName?.value?.trim() || "",
      email: dom.pfEmail?.value?.trim() || "",
      phone: dom.pfPhone?.value?.trim() || "",
      department: dom.pfDepartment?.value?.trim() || "",
      designation: dom.pfDesignation?.value?.trim() || "",
      experienceYears: Number(dom.pfExperience?.value || 0),
      qualification: dom.pfQualification?.value?.trim() || "",
      employeeId: dom.pfEmployeeId?.value?.trim() || "",
      profileImage: dom.pfImage?.value?.trim() || state.teacher.profileImage
    };
  }

  async function loadProfileData() {
    setProfileLoading(true);
    try {
      const profile = await api.userMe();
      state.teacher = normalizeTeacher(profile || {});
      state.ui.profile.snapshot = { ...state.teacher };
      populateTeacher();
      setProfileEditMode(false);
    } catch (_e) {
      state.teacher = normalizeTeacher(state.teacher);
      state.ui.profile.snapshot = { ...state.teacher };
      populateTeacher();
      setProfileEditMode(false);
      toast("Failed to load profile. Showing available data.", "error");
    } finally {
      setProfileLoading(false);
    }
  }

  function normalizeSettings(raw = {}) {
    return {
      notifications: Boolean(raw.enableNotifications ?? raw.notifications ?? state.settings.notifications),
      autoRefresh: Boolean(raw.liveAutoRefresh ?? raw.autoRefresh ?? state.settings.autoRefresh),
      alerts: Boolean(raw.proctoringAlerts ?? raw.alerts ?? state.settings.alerts)
    };
  }

  function settingsPayload() {
    return {
      enableNotifications: !!state.settings.notifications,
      liveAutoRefresh: !!state.settings.autoRefresh,
      proctoringAlerts: !!state.settings.alerts
    };
  }

  function setSettingsLoadingUI(active) {
    state.ui.settings.loading = !!active;
    if (dom.settingsLoading) dom.settingsLoading.classList.toggle("hidden", !active);
    [dom.stNotif, dom.stAutoRefresh, dom.stAlerts, dom.stSessionReset, dom.stApiTest, dom.stSave].forEach((el) => {
      if (el) el.disabled = !!active;
    });
  }

  function renderApiStatusPill() {
    if (!dom.stApiStatus) return;
    dom.stApiStatus.classList.remove("hidden");
    dom.stApiStatus.textContent = state.api.online ? "Online" : "Offline";
    dom.stApiStatus.className = `status-pill ${state.api.online ? "status-published" : "status-disabled"}`;
  }

  function renderSettings() {
    if (dom.stNotif) dom.stNotif.checked = !!state.settings.notifications;
    if (dom.stAutoRefresh) dom.stAutoRefresh.checked = !!state.settings.autoRefresh;
    if (dom.stAlerts) dom.stAlerts.checked = !!state.settings.alerts;
    if (dom.dashAutoRefresh) dom.dashAutoRefresh.checked = !!state.settings.autoRefresh;
    const baseline = state.ui.settings.baseline || {
      notifications: state.settings.notifications,
      autoRefresh: state.settings.autoRefresh,
      alerts: state.settings.alerts
    };
    const dirty = baseline.notifications !== state.settings.notifications
      || baseline.autoRefresh !== state.settings.autoRefresh
      || baseline.alerts !== state.settings.alerts;
    state.ui.settings.dirty = dirty;
    if (dom.stSave) dom.stSave.disabled = !dirty || state.ui.settings.loading || state.ui.settings.saving;
  }

  async function loadSettingsData() {
    setSettingsLoadingUI(true);
    try {
      const raw = await api.settingsGet();
      if (dom.settingsError) dom.settingsError.classList.add("hidden");
      state.settings = { ...state.settings, ...normalizeSettings(raw || {}) };
      state.ui.settings.baseline = {
        notifications: state.settings.notifications,
        autoRefresh: state.settings.autoRefresh,
        alerts: state.settings.alerts
      };
      renderSettings();
    } catch (_e) {
      if (dom.settingsError) dom.settingsError.classList.remove("hidden");
      renderSettings();
      toast("Failed to load settings.", "error");
    } finally {
      setSettingsLoadingUI(false);
      renderSettings();
    }
  }

  function renderStats() {
    const dashAttempts = getDashboardAttempts();
    const summary = state.data.dashboard || {};
    const exams = Number(summary.totalExams ?? state.data.exams.length);
    const published = Number(summary.publishedExams ?? state.data.exams.filter((e) => e.status === "Published").length);
    const drafts = Number(summary.draftExams ?? state.data.exams.filter((e) => e.status === "Draft").length);
    const attempts = Number(summary.totalAttempts ?? dashAttempts.length);
    const students = Number(summary.totalStudents ?? new Set(dashAttempts.map((a) => a.studentName)).size);
    const avgScore = Number.isFinite(Number(summary.averageScore))
      ? Math.round(Number(summary.averageScore))
      : (attempts ? Math.round(dashAttempts.reduce((n, a) => n + a.percentage, 0) / attempts) : 0);
    const cheatingFlags = Number(summary.cheatingFlags ?? dashAttempts.filter((a) => a.cheatingScore >= 65).length);
    const active = Number(summary.publishedExams ?? state.data.exams.filter((e) => e.status === "Published").length);

    const cards = [
      ["Total Exams", exams, "fa-file-lines", "exams"],
      ["Published Exams", published, "fa-check-double", ""],
      ["Draft Exams", drafts, "fa-pen-to-square", ""],
      ["Total Attempts", attempts, "fa-list-check", "attempts"],
      ["Total Students", students, "fa-user-group", "students"],
      ["Average Score", `${avgScore}%`, "fa-chart-simple", "analytics"],
      ["Cheating Flags", cheatingFlags, "fa-shield-halved", "proctoring"],
      ["Active Exams", active, "fa-bolt", "exams"]
    ];
    dom.statsGrid.innerHTML = cards.map(([label, val, icon, target]) => `
      <article class="stat-card" ${target ? `data-section-jump="${target}"` : ""}>
        <div class="stat-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="stat-meta"><small>${label}</small><strong>${val}</strong></div>
      </article>
    `).join("");
  }

  function renderDashboardFeeds() {
    const recent = [...state.data.exams].slice(0, 5);
    dom.recentExamsBody.innerHTML = recent.length ? recent.map((e) => `
      <tr><td>${e.examCode}</td><td>${e.title}</td><td><span class="status-pill ${e.status === "Published" ? "status-published" : "status-draft"}">${e.status}</span></td><td>${attemptsForExam(e).length}</td></tr>
    `).join("") : `<tr><td colspan="4"><div class="no-data">No exams available.</div></td></tr>`;

    const risky = state.data.attempts.filter((a) => a.cheatingScore >= 65).slice(0, 6);
    dom.highRiskList.innerHTML = risky.length ? risky.map((a) => `<li><strong>${a.studentName}</strong> - ${a.examTitle || examTitle(a.examId)} <span class="status-pill status-risk">${a.riskLevel}</span></li>`).join("") : "<li class='no-data'>No risk alerts.</li>";
    const liveExams = state.data.exams.filter((e) => e.status === "Published").slice(0, 6);
    dom.liveMonitorList.innerHTML = liveExams.length ? liveExams.map((e) => `<li>${e.title} is live with <strong>${attemptsForExam(e).length}</strong> attempts</li>`).join("") : "<li class='no-data'>No live exams.</li>";
    dom.alertsList.innerHTML = risky.length ? risky.slice(0, 6).map((a) => `<li>Cheating score <strong>${a.cheatingScore}</strong> by ${a.studentName}</li>`).join("") : "<li class='no-data'>No alerts.</li>";

    const upcoming = [...state.data.exams].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).slice(0, 5);
    dom.upcomingExamsList.innerHTML = upcoming.length ? upcoming.map((e) => `<li><strong>${e.title}</strong><br><small>${fmtDateTime(e.startTime)}</small></li>`).join("") : "<li class='no-data'>No upcoming exams.</li>";
    const topStudents = [...state.data.attempts].sort((a, b) => b.percentage - a.percentage).slice(0, 5);
    dom.topStudentsList.innerHTML = topStudents.length ? topStudents.map((a) => `<li><strong>${a.studentName}</strong> - ${a.percentage}%</li>`).join("") : "<li class='no-data'>No student data.</li>";
    const recentAttempts = [...state.data.attempts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    dom.recentAttemptsList.innerHTML = recentAttempts.length ? recentAttempts.map((a) => `<li>${a.studentName} • ${a.examTitle || examTitle(a.examId)} • ${a.score}</li>`).join("") : "<li class='no-data'>No recent attempts.</li>";
    const riskGroups = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((lvl) => `${lvl}: ${state.data.attempts.filter((a) => a.riskLevel === lvl).length}`);
    dom.riskDistributionList.innerHTML = riskGroups.map((x) => `<li>${x}</li>`).join("");
    const avgTime = state.data.attempts.length ? Math.round(state.data.attempts.reduce((n, a) => n + Number.parseInt(a.timeTaken, 10), 0) / state.data.attempts.length) : 0;
    dom.avgTimeTakenBox.textContent = `${avgTime} min`;
    const passPct = state.data.attempts.length ? Math.round((state.data.attempts.filter((a) => a.percentage >= 40).length / state.data.attempts.length) * 100) : 0;
    dom.passPercentageBox.textContent = `${passPct}%`;
  }

  function renderExams() {
    const exams = filteredExams();
    const { rows, totalPages } = paginate(exams, "exams");
    dom.examsTableBody.innerHTML = rows.map((e) => `
      <tr>
        <td><input type="checkbox" class="exam-row-check" data-exam-check="${e.id}" ${state.ui.selectedExams.has(e.id) ? "checked" : ""}></td>
        <td class="exam-title-cell"><strong>${e.title}</strong>${e.questionsUploaded ? `<small><i class="fa-solid fa-check"></i> Questions Uploaded (${questionCount(e.id)})</small>` : ""}</td>
        <td>${e.examCode}</td>
        <td>${e.createdBy || state.teacher.name}</td>
        <td>${e.duration} min</td>
        <td>${questionCount(e.id)}</td>
        <td>${e.passingMarks}</td>
        <td>${attemptsForExam(e).length}</td>
        <td>${fmtDateTime(e.startTime)}</td>
        <td>${fmtDateTime(e.endTime)}</td>
        <td>${fmtDateTime(e.createdDate || e.startTime)}</td>
        <td><span class="status-pill ${e.status === "Published" ? "status-published" : "status-draft"}">${e.status}</span></td>
        <td>
          <div class="exam-actions-inline">
            <button class="btn small action-primary" data-exam-action="analytics" data-id="${e.id}">Analytics</button>
            <button class="btn small action-outline" data-exam-action="questions" data-id="${e.id}">Questions</button>
            <button class="btn small action-outline" data-exam-action="attempts" data-id="${e.id}">Attempts</button>
            <div class="exam-more">
              <button class="btn small action-more" data-exam-menu-toggle="${e.id}" aria-label="More actions" aria-expanded="${idKey(state.ui.openExamMenuId) === idKey(e.id) ? "true" : "false"}">
                <i class="fa-solid fa-ellipsis-vertical"></i>
              </button>
            </div>
          </div>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="13"><div class="no-data">No exams match your filters.</div></td></tr>`;
    if (dom.examRecordsCounter) dom.examRecordsCounter.textContent = `${exams.length} records`;
    if (dom.examJumpPage) dom.examJumpPage.value = String(state.ui.pagination.exams.page);
    if (dom.selectedCountLabel) dom.selectedCountLabel.textContent = `${state.ui.selectedExams.size} selected`;
    if (dom.selectAllExams) dom.selectAllExams.checked = exams.length > 0 && exams.every((e) => state.ui.selectedExams.has(e.id));
    if (dom.headExamCheck && dom.selectAllExams) dom.headExamCheck.checked = dom.selectAllExams.checked;
    if (dom.bulkPublishBtn) dom.bulkPublishBtn.disabled = state.ui.selectedExams.size === 0;
    if (dom.bulkDeleteBtn) dom.bulkDeleteBtn.disabled = state.ui.selectedExams.size === 0;
    if (dom.bulkExportBtn) dom.bulkExportBtn.disabled = state.ui.selectedExams.size === 0;
    upsertPagination("examsPagination", "exams", totalPages);
    renderExamSelectors();
  }

  function renderExamSelectors() {
    renderAttemptFilters();
    renderAiFilters();
    if (dom.analyticsExamFilter) {
      const opts = ['<option value="">Select Exam</option>'].concat(
        state.data.exams.map((e) => `<option value="${e.examCode}">${e.title} (${e.examCode})</option>`)
      ).join("");
      dom.analyticsExamFilter.innerHTML = opts;
      if (!state.ui.analytics.examCode && state.data.exams.length) state.ui.analytics.examCode = state.data.exams[0].examCode;
      const codes = ["", ...state.data.exams.map((e) => e.examCode)];
      dom.analyticsExamFilter.value = codes.includes(state.ui.analytics.examCode) ? state.ui.analytics.examCode : "";
    }
    if (dom.leaderboardExamFilter) {
      const lbOpts = ['<option value="all">Select Exam</option>'].concat(
        state.data.exams.map((e) => `<option value="${e.examCode}">${e.title} (${e.examCode})</option>`)
      ).join("");
      let current = state.ui.leaderboard.examCode;
      if ((!current || current === "all") && state.data.exams.length) {
        current = state.data.exams[0].examCode;
        state.ui.leaderboard.examCode = current;
      }
      dom.leaderboardExamFilter.innerHTML = lbOpts;
      const codes = ["all", ...state.data.exams.map((e) => e.examCode)];
      dom.leaderboardExamFilter.value = codes.includes(current) ? current : "all";
      dom.leaderboardExamFilter.disabled = state.ui.leaderboard.mode === "global";
    }
    const currentSubject = dom.examSubjectFilter.value || "all";
    const currentCreator = dom.examCreatedByFilter.value || "all";
    const subjects = ["all", ...new Set(state.data.exams.map((e) => e.subject))];
    dom.examSubjectFilter.innerHTML = subjects.map((s) => `<option value="${s}">${s === "all" ? "All Subjects" : s}</option>`).join("");
    dom.examCreatedByFilter.innerHTML = ["all", ...new Set(state.data.exams.map((e) => e.createdBy || state.teacher.name))]
      .map((c) => `<option value="${c}">${c === "all" ? "All Creators" : c}</option>`).join("");
    dom.examSubjectFilter.value = subjects.includes(currentSubject) ? currentSubject : "all";
    const creators = ["all", ...new Set(state.data.exams.map((e) => e.createdBy || state.teacher.name))];
    dom.examCreatedByFilter.value = creators.includes(currentCreator) ? currentCreator : "all";
  }

  function openExamFormModal(exam = null) {
    const isEdit = !!exam;
    const start = isEdit ? exam.startTime.slice(0, 16) : "";
    const end = isEdit ? exam.endTime.slice(0, 16) : "";
    openModal(`
      <div class="exam-create-wrap">
        <h3>${isEdit ? "Edit Exam" : "Create New Exam"}</h3>
        <p>${isEdit ? "Update exam details below." : "Fill details and save as draft or publish."}</p>
        <div class="exam-stage-nav">
          <button class="stage-chip is-active" data-stage-go="1">1. Basic</button>
          <button class="stage-chip" data-stage-go="2">2. Marks</button>
          <button class="stage-chip" data-stage-go="3">3. Schedule</button>
        </div>
        <form id="examHoverForm" class="exam-form-grid">
          <div class="exam-stage-pane is-active" data-stage="1">
            <div class="exam-form-title">Basic Information</div>
            <label class="wide">Title<input id="mxTitle" class="form-control-like" value="${isEdit ? exam.title : ""}" required></label>
            <label>Subject<input id="mxSubject" class="form-control-like" value="${isEdit ? exam.subject : ""}" required></label>
            <label>Duration (min)<input id="mxDuration" class="form-control-like" type="number" min="1" value="${isEdit ? exam.duration : 90}" required></label>
            <label class="wide">Description<textarea id="mxDescription" class="form-control-like" rows="3" required>${isEdit ? exam.description : ""}</textarea></label>
          </div>

          <div class="exam-stage-pane" data-stage="2">
            <div class="exam-form-title">Marks & Attempts</div>
            <label>Total Marks<input id="mxTotalMarks" class="form-control-like" type="number" min="1" value="${isEdit ? exam.totalMarks : 100}" required></label>
            <label>Passing Marks<input id="mxPassingMarks" class="form-control-like" type="number" min="0" value="${isEdit ? exam.passingMarks : 40}" required></label>
            <label>Max Attempts<input id="mxMaxAttempts" class="form-control-like" type="number" min="1" value="${isEdit ? exam.maxAttempts : 1}" required></label>
            <label>Marks Per Question<input id="mxMarksPerQuestion" class="form-control-like" type="number" min="1" value="${isEdit ? exam.marksPerQuestion : 2}" required></label>
            <label>Negative Marks<input id="mxNegativeMarks" class="form-control-like" type="number" min="0" value="${isEdit ? exam.negativeMarks : 0}" required></label>
            <div class="exam-form-title">Difficulty Distribution</div>
            <label>Easy Count<input id="mxEasyCount" class="form-control-like" type="number" min="0" value="${isEdit ? exam.easyCount : 0}" required></label>
            <label>Medium Count<input id="mxMediumCount" class="form-control-like" type="number" min="0" value="${isEdit ? exam.mediumCount : 0}" required></label>
            <label>Hard Count<input id="mxHardCount" class="form-control-like" type="number" min="0" value="${isEdit ? exam.hardCount : 0}" required></label>
          </div>

          <div class="exam-stage-pane" data-stage="3">
            <div class="exam-form-title">Schedule & Options</div>
            <label>Start Time<input id="mxStartTime" class="form-control-like" type="datetime-local" value="${start}" required></label>
            <label>End Time<input id="mxEndTime" class="form-control-like" type="datetime-local" value="${end}" required></label>
            <label class="toggle wide">Shuffle Questions<input id="mxShuffleQuestions" type="checkbox" ${isEdit && exam.shuffleQuestions ? "checked" : ""}><span></span></label>
            <label class="toggle wide">Shuffle Options<input id="mxShuffleOptions" type="checkbox" ${isEdit && exam.shuffleOptions ? "checked" : ""}><span></span></label>
          </div>
        </form>
        <div class="exam-stage-actions">
          <button id="mxPrev" class="btn ghost">Previous</button>
          <button id="mxNext" class="btn ghost">Next</button>
        </div>
      </div>
      <div class="actions exam-create-actions">
        <button id="mxCancel" class="btn ghost">Cancel</button>
        <button id="mxDraft" class="btn ghost">Save Draft</button>
        <button id="mxPublish" class="btn primary">${isEdit ? "Update / Publish" : "Create / Publish"}</button>
      </div>
    `);
    let currentStage = 1;
    const syncStage = () => {
      document.querySelectorAll(".exam-stage-pane").forEach((pane) => pane.classList.toggle("is-active", Number(pane.dataset.stage) === currentStage));
      document.querySelectorAll(".stage-chip").forEach((chip) => chip.classList.toggle("is-active", Number(chip.dataset.stageGo) === currentStage));
      document.getElementById("mxPrev").disabled = currentStage === 1;
      document.getElementById("mxNext").disabled = currentStage === 3;
    };
    document.getElementById("mxPrev").addEventListener("click", () => { currentStage = Math.max(1, currentStage - 1); syncStage(); });
    document.getElementById("mxNext").addEventListener("click", () => { currentStage = Math.min(3, currentStage + 1); syncStage(); });
    document.querySelectorAll(".stage-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        currentStage = Number(chip.dataset.stageGo);
        syncStage();
      });
    });
    const publishBtn = document.getElementById("mxPublish");
    const requiredFieldIds = [
      "mxTitle", "mxSubject", "mxDescription", "mxDuration",
      "mxTotalMarks", "mxPassingMarks", "mxMaxAttempts", "mxMarksPerQuestion",
      "mxNegativeMarks", "mxEasyCount", "mxMediumCount", "mxHardCount",
      "mxStartTime", "mxEndTime"
    ];
    const validateCreateForm = () => {
      const allFilled = requiredFieldIds.every((id) => {
        const el = document.getElementById(id);
        return !!el && String(el.value).trim() !== "";
      });
      const startVal = document.getElementById("mxStartTime").value;
      const endVal = document.getElementById("mxEndTime").value;
      const validRange = startVal && endVal ? new Date(endVal) > new Date(startVal) : false;
      publishBtn.disabled = !(allFilled && validRange);
    };
    requiredFieldIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", validateCreateForm);
      el.addEventListener("change", validateCreateForm);
    });
    syncStage();
    validateCreateForm();
    document.getElementById("mxCancel").addEventListener("click", closeModal);
    document.getElementById("mxDraft").addEventListener("click", async () => {
      await submitExamFromModal("Draft", exam?.id || null);
    });
    document.getElementById("mxPublish").addEventListener("click", async () => {
      await submitExamFromModal("Published", exam?.id || null);
    });
  }

  async function submitExamFromModal(status, examId = null) {
    const requiredFieldIds = [
      "mxTitle", "mxSubject", "mxDescription", "mxDuration",
      "mxTotalMarks", "mxPassingMarks", "mxMaxAttempts", "mxMarksPerQuestion",
      "mxNegativeMarks", "mxEasyCount", "mxMediumCount", "mxHardCount",
      "mxStartTime", "mxEndTime"
    ];
    const allFilled = requiredFieldIds.every((id) => {
      const el = document.getElementById(id);
      return !!el && String(el.value).trim() !== "";
    });
    if (!allFilled) {
      toast("Fill all fields before creating/publishing the exam.", "error");
      return;
    }
    const payload = {
      title: document.getElementById("mxTitle").value.trim(),
      description: document.getElementById("mxDescription").value.trim(),
      subject: document.getElementById("mxSubject").value.trim(),
      durationMinutes: Number(document.getElementById("mxDuration").value),
      totalMarks: Number(document.getElementById("mxTotalMarks").value),
      passingMarks: Number(document.getElementById("mxPassingMarks").value),
      maxAttempts: Number(document.getElementById("mxMaxAttempts").value),
      marksPerQuestion: Number(document.getElementById("mxMarksPerQuestion").value),
      negativeMarks: Number(document.getElementById("mxNegativeMarks").value),
      easyQuestionCount: Number(document.getElementById("mxEasyCount").value || 0),
      mediumQuestionCount: Number(document.getElementById("mxMediumCount").value || 0),
      difficultQuestionCount: Number(document.getElementById("mxHardCount").value || 0),
      startTime: `${document.getElementById("mxStartTime").value}:00`,
      endTime: `${document.getElementById("mxEndTime").value}:00`,
      shuffleQuestions: document.getElementById("mxShuffleQuestions").checked,
      shuffleOptions: document.getElementById("mxShuffleOptions").checked,
      status
    };
    if (!payload.title || !payload.subject || !document.getElementById("mxStartTime").value || !document.getElementById("mxEndTime").value) {
      toast("Fill all required exam fields.", "error");
      return;
    }
    if (payload.endTime <= payload.startTime) {
      toast("End time must be after start time.", "error");
      return;
    }
    await withLoading(async () => {
      if (examId) {
        const exam = examById(examId);
        if (!exam) return;
        if (status === "Published" && !exam.questionsUploaded) {
          toast("Publish blocked: upload questions first.", "error");
          return;
        }
        const apiUpdated = await api.updateExam(exam.examCode || examId, payload);
        const updatedData = apiUpdated?.data || apiUpdated?.exam || apiUpdated || {};
        Object.assign(exam, payload, {
          id: updatedData.id != null ? String(updatedData.id) : exam.id,
          examCode: updatedData.examCode || exam.examCode,
          status: String(updatedData.status || payload.status || exam.status || "").toLowerCase() === "published" ? "Published" : "Draft",
          questionsUploaded: updatedData.questionsUploaded != null ? Boolean(updatedData.questionsUploaded) : Boolean(exam.questionsUploaded),
          createdBy: updatedData.createdBy || exam.createdBy,
          createdDate: updatedData.createdAt || exam.createdDate,
          duration: payload.durationMinutes,
          active: payload.status === "Published",
          easyCount: payload.easyQuestionCount,
          mediumCount: payload.mediumQuestionCount,
          hardCount: payload.difficultQuestionCount
        });
        toast("Exam updated.");
      } else {
        const created = {
          id: uid("e"),
          examCode: `EXAM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          createdBy: state.teacher.name,
          createdDate: new Date().toISOString(),
          active: status === "Published",
          duration: payload.durationMinutes,
          easyCount: payload.easyQuestionCount,
          mediumCount: payload.mediumQuestionCount,
          hardCount: payload.difficultQuestionCount,
          ...payload
        };
        if (status === "Published") {
          created.status = "Draft";
          toast("Exam created as draft. Upload questions before publish.", "error");
        }
        const apiCreated = await api.createExam(created);
        const createdData = apiCreated?.data || apiCreated?.exam || apiCreated || {};
        if (!createdData || !createdData.id) {
          throw new Error("Exam create API did not return a persisted exam id");
        }
        const persistedExam = normalizeExam({
          ...created,
          ...createdData
        });
        state.data.exams.unshift(persistedExam);
        toast("Exam created.");
      }
      closeModal();
      renderAll();
      addNotification(`Exam saved (${status}).`);
    });
  }

  function openQuestionUploadModal(examId) {
    const exam = examById(examId);
    if (!exam) return;
    openModal(`
      <div class="upload-modal">
        <div class="upload-head">
          <div>
            <h3>Upload Questions</h3>
            <p class="upload-subtitle">Import questions from a structured CSV or Excel file.</p>
          </div>
          <div class="upload-head-actions">
            <button id="uqHelp" type="button" class="btn ghost small upload-help-btn"><i class="fa-solid fa-circle-info"></i>Instructions</button>
            <button id="uqClose" class="upload-close" aria-label="Close">&times;</button>
          </div>
        </div>
        <div class="upload-divider"></div>
        <div id="uqInstructions" class="upload-instructions hidden">
          <h4>Upload Instructions</h4>
          <p>Follow these guidelines to import questions successfully.</p>
          <ul>
            <li>Choose file type: <code>.csv</code>, <code>.xlsx</code>, or <code>.xls</code>.</li>
            <li>Keep one question per row.</li>
            <li>Recommended columns: <code>Question Text</code>, <code>Question Type</code>, <code>Marks</code>, <code>Difficulty</code>, <code>Topic</code>.</li>
            <li>Optional option columns: <code>Option A</code>, <code>Option B</code>, <code>Option C</code>, <code>Option D</code>, <code>Option E</code>, <code>Option F</code>.</li>
            <li>For coding questions, optional columns: <code>Sample Input</code>, <code>Sample Output</code>, <code>Explanation</code>.</li>
            <li>Use <code>MCQ</code>, <code>Short Answer</code>, or <code>Coding</code> in <code>Question Type</code> for best mapping.</li>
            <li>After selecting a file, click <strong>Upload File</strong> to import and map questions.</li>
          </ul>
        </div>
        <form id="uploadQuestionForm" class="upload-form">
          <div class="upload-field">
            <label for="uqExamCode">Exam Code</label>
            <input id="uqExamCode" type="text" value="${exam.examCode}" readonly>
          </div>
          <div class="upload-field">
            <label for="uqFile">Question File <span class="required-mark">*</span></label>
            <div class="upload-file-row">
              <input id="uqFile" type="file" accept=".csv,.xlsx,.xls" required hidden>
              <button id="uqBrowse" type="button" class="btn ghost small">Choose File</button>
              <span id="uqFileName" class="file-name">No file selected</span>
              <button id="uqRemove" type="button" class="btn ghost small upload-remove-btn" disabled>Remove</button>
            </div>
            <p class="upload-help">Supported formats: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong></p>
          </div>
        </form>
        <div class="upload-actions">
          <button id="uqCancel" class="btn ghost">Cancel</button>
          <button id="uqUpload" class="upload-submit" disabled>Upload File</button>
        </div>
      </div>
    `);
    dom.modalContainer.classList.add("no-scroll-modal");
    dom.modalContainer.classList.add("upload-modal-host");
    document.getElementById("uqClose").addEventListener("click", closeModal);
    document.getElementById("uqCancel").addEventListener("click", closeModal);
    const helpBtn = document.getElementById("uqHelp");
    const instructionsPanel = document.getElementById("uqInstructions");
    const fileInput = document.getElementById("uqFile");
    const browseBtn = document.getElementById("uqBrowse");
    const removeBtn = document.getElementById("uqRemove");
    const fileNameEl = document.getElementById("uqFileName");
    const uploadBtn = document.getElementById("uqUpload");
    const alreadyUploaded = Boolean(exam.questionsUploaded);
    fileInput.dataset.uploaded = "false";
    helpBtn.addEventListener("click", () => {
      instructionsPanel.classList.toggle("hidden");
      helpBtn.innerHTML = instructionsPanel.classList.contains("hidden")
        ? '<i class="fa-solid fa-circle-info"></i>Instructions'
        : '<i class="fa-solid fa-xmark"></i>Hide Instructions';
    });
    const syncFileState = () => {
      const file = fileInput.files && fileInput.files[0];
      fileNameEl.textContent = file ? `${file.name}` : "No file selected";
      uploadBtn.disabled = !file;
      removeBtn.disabled = !file;
      uploadBtn.textContent = "Upload File";
    };
    browseBtn.addEventListener("click", () => fileInput.click());
    removeBtn.addEventListener("click", () => {
      fileInput.value = "";
      syncFileState();
    });
    fileInput.addEventListener("change", () => {
      syncFileState();
    });
    syncFileState();
    if (alreadyUploaded) {
      toast("Questions already exist for this exam. Upload will replace existing questions.", "info");
    }
    document.getElementById("uqUpload").addEventListener("click", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        toast("Please choose a CSV/Excel file first.", "error");
        return;
      }
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";
      const targetExam = examById(examId);
      if (!targetExam) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        toast("Invalid exam selected. Please reopen the upload modal from a valid exam.", "error");
        return;
      }
      const selectedExamCode = resolveExactExamCode(targetExam.examCode || examId);
      if (!selectedExamCode) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        toast("Invalid exam code. Please reopen the upload modal from a valid exam.", "error");
        return;
      }
      let dataUrl = "";
      try {
        dataUrl = await readFileAsDataUrl(file);
      } catch (_e) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        toast("Failed to read uploaded file.", "error");
        return;
      }
      let parsed;
      try {
        parsed = await parseQuestionFile(file);
      } catch (e) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        toast(`Could not parse file: ${e.message}`, "error");
        return;
      }
      const imported = (parsed.rows || []).map((row, idx) => ({
        examCode: String(rowValue(row, ["Exam Code", "ExamCode", "exam_code", "Code"]) || selectedExamCode),
        questionText: String(rowValue(row, ["Question", "Question Text", "question_text", "Q", "Prompt"]) || `Question ${idx + 1}`),
        questionType: normalizeUploadQuestionType(rowValue(row, ["Question Type", "Type", "question_type"])),
        marks: Number(rowValue(row, ["Marks", "Mark", "Score"]) || 1),
        difficulty: String(rowValue(row, ["Difficulty", "Level"]) || "Easy"),
        topic: String(rowValue(row, ["Topic", "Section", "Subject"]) || "Imported"),
        optionA: String(rowValue(row, ["Option A", "A", "opt_a"]) || ""),
        optionB: String(rowValue(row, ["Option B", "B", "opt_b"]) || ""),
        optionC: String(rowValue(row, ["Option C", "C", "opt_c"]) || ""),
        optionD: String(rowValue(row, ["Option D", "D", "opt_d"]) || ""),
        optionE: String(rowValue(row, ["Option E", "E", "opt_e"]) || ""),
        optionF: String(rowValue(row, ["Option F", "F", "opt_f"]) || ""),
        sampleInput: String(rowValue(row, ["Sample Input", "Input"]) || ""),
        sampleOutput: String(rowValue(row, ["Sample Output", "Output"]) || ""),
        correctAnswer: String(rowValue(row, ["Correct Answer", "Answer", "Correct"]) || ""),
        shuffleOptions: false,
        displayOrder: idx + 1,
        shuffleGroup: ""
      })).filter((q) => q.questionText && q.questionText.trim() !== "");

      const fileExamCodes = [...new Set(imported.map((q) => String(q.examCode || "").trim()).filter(Boolean))];
      if (fileExamCodes.length && (fileExamCodes.length > 1 || fileExamCodes[0] !== selectedExamCode)) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        toast(`Exam code mismatch. Selected ${selectedExamCode}, but the file contains ${fileExamCodes.join(", ")}.`, "error");
        return;
      }

      if (!imported.length) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        toast("No valid questions were found in the file. Check the question text and columns.", "error");
        return;
      }

      try {
        await api.bulkUploadQuestions(selectedExamCode, imported);
        const refreshed = await api.listQuestions(selectedExamCode);
        const backendQuestions = Array.isArray(refreshed?.data) ? refreshed.data : [];
        targetExam.questionUpload = {
          name: file.name,
          type: file.type || "application/octet-stream",
          dataUrl,
          headers: parsed.headers || [],
          rows: parsed.rows || [],
          uploadedAt: new Date().toISOString()
        };
        state.data.questions = state.data.questions.filter((q) => q.examId !== examId);
        state.data.questions.push(...backendQuestions.map((q, idx) => mapUploadedQuestionToLocal(examId, q, idx)));
        exam.questionsUploaded = true;
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        closeModal();
        renderAll();
        addNotification(`Questions uploaded for ${exam.examCode}: ${file.name}`);
        toast(`${backendQuestions.length || imported.length} questions uploaded successfully.`);
      } catch (error) {
        toast(error.message || "Failed to upload questions.", "error");
        fileInput.dataset.uploaded = "false";
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
      }
    });
  }

  function openQuestionsPreviewModal(examId) {
    const exam = examById(examId);
    if (!exam) return;
    const rawRows = exam.questionUpload?.rows || [];
    const rawHeaders = exam.questionUpload?.headers || [];
    const rows = state.data.questions.filter((q) => q.examId === examId);
    const rawTable = rawRows.length
      ? `<div class="questions-table-wrap raw-scroll">
          <table>
            <thead><tr>${rawHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>${rawRows.map((r) => `<tr>${rawHeaders.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>`
      : "";
    openModal(`
      <div class="questions-modal">
        <div class="questions-modal-head">
          <div>
            <h3>Questions - ${exam.examCode}</h3>
            <p>${exam.questionUpload?.name ? `Source File: ${exam.questionUpload.name}` : "Uploaded questions for this exam."}</p>
          </div>
          <button id="qpCloseIcon" class="upload-close" aria-label="Close">&times;</button>
        </div>
        <div class="questions-modal-body">
          ${rawRows.length ? `
            <div class="questions-block">
              <div class="questions-block-head">
                <strong>File Data Preview</strong>
                <span>${rawRows.length} rows</span>
              </div>
              ${rawTable}
            </div>
          ` : ""}
          <div class="questions-block">
            <div class="questions-block-head">
              <strong>Mapped Questions</strong>
              <span>${rows.length} questions</span>
            </div>
            <div class="questions-table-wrap mapped-scroll">
              <table>
                <thead><tr><th>Question</th><th>Type</th><th>Marks</th><th>Difficulty</th><th>Topic</th></tr></thead>
                <tbody>
                  ${rows.length ? rows.map((q) => `<tr><td>${q.text}</td><td>${q.type}</td><td>${q.marks}</td><td>${q.difficulty}</td><td>${q.topic}</td></tr>`).join("") : `<tr><td colspan="5"><div class="no-data">No uploaded questions found for this exam.</div></td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="actions questions-modal-actions">
          <button id="qpClose" class="btn ghost">Close</button>
        </div>
      </div>
    `);
    setupQuestionsTableScrollbars();
    dom.modalContainer.classList.add("questions-modal-host");
    document.getElementById("qpCloseIcon").addEventListener("click", closeModal);
    document.getElementById("qpClose").addEventListener("click", closeModal);
  }

  function severityMeta(level, fallbackScore = 0) {
    const keyRaw = String(level || "").trim().toUpperCase();
    const key = keyRaw || (Number(fallbackScore) > 85 ? "CRITICAL" : Number(fallbackScore) > 70 ? "HIGH" : Number(fallbackScore) > 30 ? "MEDIUM" : "LOW");
    if (key === "LOW") return { key: "LOW", label: "Low", cls: "low" };
    if (key === "MEDIUM") return { key: "MEDIUM", label: "Medium", cls: "medium" };
    if (key === "HIGH") return { key: "HIGH", label: "High", cls: "high" };
    return { key: "CRITICAL", label: "Critical", cls: "critical" };
  }

  function evidenceRiskBand(score) {
    const s = Number(score || 0);
    if (s <= 30) return severityMeta("LOW");
    if (s <= 70) return severityMeta("MEDIUM");
    if (s <= 90) return severityMeta("HIGH");
    return severityMeta("CRITICAL");
  }

  function evidenceRowsFromPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.rows)) return payload.rows;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.events)) return payload.data.events;
    if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
    if (Array.isArray(payload?.events)) return payload.events;
    if (Array.isArray(payload?.logs)) return payload.logs;
    if (Array.isArray(payload?.screenshots)) return payload.screenshots;
    if (Array.isArray(payload?.webcam)) return payload.webcam;
    if (Array.isArray(payload?.audio)) return payload.audio;
    if (Array.isArray(payload?.analysis)) return payload.analysis;
    return [];
  }

  function normalizeEvidenceRow(raw, tab, idx = 0) {
    const score = Number(raw?.score ?? raw?.riskScore ?? raw?.cheatingScore ?? 0);
    const sev = severityMeta(raw?.severity || raw?.riskLevel, score);
    return {
      id: String(raw?.id || raw?.eventId || `${tab}-${idx}`),
      timestamp: raw?.timestamp || raw?.createdAt || raw?.submittedAt || new Date().toISOString(),
      description: String(raw?.description || raw?.message || raw?.event || "Evidence event"),
      severity: sev.label,
      sevClass: sev.cls,
      imageUrl: raw?.imageUrl || raw?.url || raw?.screenshotUrl || raw?.frameUrl || "",
      type: String(raw?.eventType || raw?.type || tab)
    };
  }

  function evidenceIconClass(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("screenshot") || t.includes("image")) return "fa-image";
    if (t.includes("webcam") || t.includes("camera") || t.includes("face")) return "fa-camera";
    if (t.includes("audio") || t.includes("noise") || t.includes("voice")) return "fa-wave-square";
    if (t.includes("analysis") || t.includes("ai")) return "fa-brain";
    if (t.includes("warn")) return "fa-triangle-exclamation";
    return "fa-list-check";
  }

  function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function openEvidenceModal(item) {
    const exam = examById(item.examId);
    const examName = exam ? exam.title : (item.examTitle || "Unknown Exam");
    const riskBand = evidenceRiskBand(item.cheatingScore);
    const context = {
      item,
      examName,
      currentTab: "screenshots",
      tabCache: {},
      tabCounts: { screenshots: 0, webcam: 0, audio: 0, analysis: 0, logs: 0 }
    };
    openModal(`
      <div class="evidence-modal">
        <div class="evidence-head">
          <div>
            <h3>Cheating Evidence</h3>
            <p><strong>${item.studentName}</strong> • ${examName}</p>
          </div>
          <button id="evCloseIcon" class="upload-close" aria-label="Close">&times;</button>
        </div>
        <div class="evidence-body">
          <section class="evidence-meta-grid">
            <div class="meta-item"><small>Student Name</small><strong>${item.studentName}</strong></div>
            <div class="meta-item"><small>Exam Title</small><strong>${examName}</strong></div>
            <div class="meta-item"><small>Attempt ID</small><strong>${item.id}</strong></div>
            <div class="meta-item"><small>Cheating Score</small><strong><span id="evScoreLabel" class="risk-score-label ${riskBand.cls}">${item.cheatingScore}</span> <span class="risk-pill ${riskBand.cls}" id="evRiskPill">${riskBand.label.toUpperCase()}</span></strong></div>
            <div class="meta-item"><small>Risk Level</small><strong><span id="evRiskText">${riskBand.label}</span></strong></div>
            <div class="meta-item"><small>Timestamp</small><strong>${fmtDateTime(item.createdAt)}</strong></div>
            <div class="meta-item"><small>Duration</small><strong>${item.timeTaken}</strong></div>
          </section>
          <section class="evidence-tabs-wrap">
            <div class="evidence-tabs">
              <button class="evidence-tab active" data-evidence-tab="screenshots"><i class="fa-solid fa-image"></i>Screenshots <span class="tab-count" id="evCountScreenshots">0</span></button>
              <button class="evidence-tab" data-evidence-tab="webcam"><i class="fa-solid fa-camera"></i>Webcam Frames <span class="tab-count" id="evCountWebcam">0</span></button>
              <button class="evidence-tab" data-evidence-tab="audio"><i class="fa-solid fa-wave-square"></i>Audio Flags <span class="tab-count" id="evCountAudio">0</span></button>
              <button class="evidence-tab" data-evidence-tab="analysis"><i class="fa-solid fa-brain"></i>AI Analysis <span class="tab-count" id="evCountAnalysis">0</span></button>
              <button class="evidence-tab" data-evidence-tab="logs"><i class="fa-solid fa-list-check"></i>Logs <span class="tab-count" id="evCountLogs">0</span></button>
            </div>
            <div id="evidenceTabPanel" class="evidence-tab-panel"></div>
          </section>
        </div>
        <div class="evidence-actions">
          <button id="evWarn" class="btn ghost">Warn Student</button>
          <button id="evCancel" class="btn ghost danger">Cancel Attempt</button>
          <button id="evDownload" class="btn ghost">Download Evidence</button>
          <button id="evExport" class="btn ghost">Export Report</button>
          <button id="evSafe" class="btn primary">Mark Safe</button>
        </div>
        <div id="evidencePreview" class="evidence-preview hidden">
          <div class="evidence-preview-head">
            <strong id="evidencePreviewMeta">Preview</strong>
            <div class="evidence-preview-actions">
              <button id="evidenceZoomOut" class="btn ghost small" data-no-buffer="true">-</button>
              <button id="evidenceZoomIn" class="btn ghost small" data-no-buffer="true">+</button>
              <button id="evidenceDownloadImage" class="btn ghost small" data-no-buffer="true">Download</button>
              <button id="evidencePreviewClose" class="btn ghost small" data-no-buffer="true">Close</button>
            </div>
          </div>
          <div class="evidence-preview-body"><img id="evidencePreviewImg" alt="Screenshot Preview"></div>
        </div>
      </div>
    `);
    dom.modalContainer.classList.add("evidence-modal-host");
    const panel = document.getElementById("evidenceTabPanel");
    const actionButtons = ["evWarn", "evCancel", "evDownload", "evExport", "evSafe"].map((id) => document.getElementById(id));
    let previewZoom = 1;
    let previewUrl = "";

    const setActionsDisabled = (disabled) => actionButtons.forEach((btn) => { if (btn) btn.disabled = !!disabled; });
    const updateRiskMeta = (score) => {
      const band = evidenceRiskBand(score);
      const riskPill = document.getElementById("evRiskPill");
      const riskText = document.getElementById("evRiskText");
      const scoreLabel = document.getElementById("evScoreLabel");
      if (riskPill) riskPill.className = `risk-pill ${band.cls}`;
      if (riskPill) riskPill.textContent = band.label.toUpperCase();
      if (riskText) riskText.textContent = band.label;
      if (scoreLabel) {
        scoreLabel.textContent = String(score);
        scoreLabel.className = `risk-score-label ${band.cls}`;
      }
    };
    const tabCountEl = {
      screenshots: document.getElementById("evCountScreenshots"),
      webcam: document.getElementById("evCountWebcam"),
      audio: document.getElementById("evCountAudio"),
      analysis: document.getElementById("evCountAnalysis"),
      logs: document.getElementById("evCountLogs")
    };
    const setTabCount = (tab, value) => { if (tabCountEl[tab]) tabCountEl[tab].textContent = String(value); };
    const setPanelLoading = () => {
      panel.innerHTML = `<div class="evidence-loading"><span class="btn-buffer-spinner"></span><span>Loading evidence...</span></div>`;
    };
    const setPanelError = (tab) => {
      panel.innerHTML = `<div class="evidence-error">Failed to load evidence.<button id="evTabRetry" class="btn ghost small" data-no-buffer="true">Retry</button></div>`;
      const retry = document.getElementById("evTabRetry");
      if (retry) retry.addEventListener("click", () => loadTab(tab, true));
    };
    const setPanelEmpty = () => {
      panel.innerHTML = `<div class="evidence-empty">No evidence available</div>`;
    };

    const renderTimeline = (rows) => {
      if (!rows.length) return setPanelEmpty();
      panel.innerHTML = `
        <div class="evidence-timeline">
          ${rows.map((r) => `
            <article class="evidence-card sev-${r.sevClass} ${r.imageUrl ? "evidence-card-image" : ""}" data-preview-url="${r.imageUrl || ""}" data-preview-meta="${fmtDateTime(r.timestamp)} • ${r.severity}">
              <div class="evidence-card-head">
                <span class="evidence-icon"><i class="fa-solid ${evidenceIconClass(r.type)}"></i></span>
                <span class="evidence-time">${fmtDateTime(r.timestamp)}</span>
                <span class="sev-pill sev-${r.sevClass}">${String(r.severity).toUpperCase()}</span>
              </div>
              <p>${r.description}</p>
            </article>
          `).join("")}
        </div>
      `;
      panel.querySelectorAll(".evidence-card-image").forEach((card) => {
        card.addEventListener("click", () => {
          const url = card.dataset.previewUrl;
          if (!url) return;
          previewUrl = url;
          previewZoom = 1;
          const meta = card.dataset.previewMeta || "Screenshot";
          document.getElementById("evidencePreviewMeta").textContent = meta;
          const img = document.getElementById("evidencePreviewImg");
          img.src = url;
          img.style.transform = "scale(1)";
          document.getElementById("evidencePreview").classList.remove("hidden");
        });
      });
    };

    const renderAnalysis = (rows) => {
      const first = rows[0] || {};
      panel.innerHTML = `
        <div class="analysis-grid">
          <article><small>AI Risk Score</small><strong>${Number(first.riskScore ?? item.cheatingScore) || 0}</strong></article>
          <article><small>Confidence</small><strong>${Number(first.confidence ?? 0)}%</strong></article>
          <article><small>Detected Behavior</small><strong>${first.behavior || first.description || "-"}</strong></article>
          <article><small>Recommendation</small><strong>${first.recommendation || "-"}</strong></article>
        </div>
      `;
      const timelineRows = rows.map((r, idx) => normalizeEvidenceRow(r, "analysis", idx));
      if (timelineRows.length) {
        panel.insertAdjacentHTML("beforeend", `
          <div class="evidence-timeline">
            ${timelineRows.map((r) => `
              <article class="evidence-card sev-${r.sevClass}">
                <div class="evidence-card-head">
                  <span class="evidence-icon"><i class="fa-solid ${evidenceIconClass(r.type)}"></i></span>
                  <span class="evidence-time">${fmtDateTime(r.timestamp)}</span>
                  <span class="sev-pill sev-${r.sevClass}">${String(r.severity).toUpperCase()}</span>
                </div>
                <p>${r.description}</p>
              </article>
            `).join("")}
          </div>
        `);
      }
    };

    const loadTab = async (tab, force = false) => {
      context.currentTab = tab;
      document.querySelectorAll(".evidence-tab").forEach((b) => b.classList.toggle("active", b.dataset.evidenceTab === tab));
      panel.classList.remove("fade-in");
      if (!force && Array.isArray(context.tabCache[tab])) {
        const cached = context.tabCache[tab];
        if (tab === "analysis") renderAnalysis(cached); else renderTimeline(cached.map((r, idx) => normalizeEvidenceRow(r, tab, idx)));
        requestAnimationFrame(() => panel.classList.add("fade-in"));
        return;
      }
      setPanelLoading();
      setActionsDisabled(true);
      try {
        const payload = await api.evidenceTab(item.id, tab);
        const rows = evidenceRowsFromPayload(payload);
        context.tabCache[tab] = rows;
        setTabCount(tab, rows.length);
        if (tab === "analysis") renderAnalysis(rows);
        else renderTimeline(rows.map((r, idx) => normalizeEvidenceRow(r, tab, idx)));
        requestAnimationFrame(() => panel.classList.add("fade-in"));
      } catch (_e) {
        setPanelError(tab);
      } finally {
        setActionsDisabled(false);
      }
    };

    const refreshEvidenceData = async () => {
      setActionsDisabled(true);
      let hasSummaryCounts = false;
      try {
        const summary = await api.evidenceSummary(item.id);
        const counts = summary?.counts || summary?.tabCounts || {};
        const score = Number(summary?.cheatingScore ?? item.cheatingScore ?? 0);
        updateRiskMeta(score);
        item.cheatingScore = score;
        item.riskLevel = evidenceRiskBand(score).key;
        item.severity = item.riskLevel;
        context.tabCounts = {
          screenshots: Number(counts.screenshots ?? summary?.screenshotsCount ?? 0),
          webcam: Number(counts.webcam ?? summary?.webcamCount ?? 0),
          audio: Number(counts.audio ?? summary?.audioCount ?? 0),
          analysis: Number(counts.analysis ?? summary?.analysisCount ?? 0),
          logs: Number(counts.logs ?? summary?.logsCount ?? 0)
        };
        hasSummaryCounts = Object.values(context.tabCounts).some((v) => Number(v) > 0);
        Object.keys(context.tabCounts).forEach((k) => setTabCount(k, context.tabCounts[k]));
      } catch (_e) {
        // Keep existing UI; tabs may still load independently.
      } finally {
        setActionsDisabled(false);
      }
      if (!hasSummaryCounts) {
        const tabs = ["screenshots", "webcam", "audio", "analysis", "logs"];
        const settled = await Promise.allSettled(tabs.map((tab) => api.evidenceTab(item.id, tab)));
        settled.forEach((res, idx) => {
          if (res.status !== "fulfilled") return;
          const tab = tabs[idx];
          const rows = evidenceRowsFromPayload(res.value);
          context.tabCache[tab] = rows;
          setTabCount(tab, rows.length);
        });
      }
      await loadTab(context.currentTab, true);
    };

    document.querySelectorAll(".evidence-tab").forEach((b) => b.addEventListener("click", () => loadTab(b.dataset.evidenceTab, true)));
    document.getElementById("evCloseIcon").addEventListener("click", closeModal);
    document.getElementById("evidencePreviewClose").addEventListener("click", () => document.getElementById("evidencePreview").classList.add("hidden"));
    document.getElementById("evidenceZoomIn").addEventListener("click", () => {
      previewZoom = Math.min(3, Number((previewZoom + 0.2).toFixed(2)));
      document.getElementById("evidencePreviewImg").style.transform = `scale(${previewZoom})`;
    });
    document.getElementById("evidenceZoomOut").addEventListener("click", () => {
      previewZoom = Math.max(0.5, Number((previewZoom - 0.2).toFixed(2)));
      document.getElementById("evidencePreviewImg").style.transform = `scale(${previewZoom})`;
    });
    document.getElementById("evidenceDownloadImage").addEventListener("click", async () => {
      if (!previewUrl) return;
      try {
        const res = await authFetch(previewUrl, { method: "GET" }, { useBase: false, includeAuth: false, silent: true });
        const blob = await res.blob();
        downloadBlob(blob, `evidence-image-${item.id}.png`);
      } catch (_e) { toast("Failed to download image.", "error"); }
    });

    document.getElementById("evWarn").addEventListener("click", async () => {
      const ok = await confirmTextDialog({
        title: "Warn Student",
        message: `Send warning to ${item.studentName}. Type WARN to continue.`,
        expectedText: "WARN",
        actionLabel: "Warn Student"
      });
      if (!ok) return;
      try {
        await api.warnAttempt(item.id);
        addNotification(`Warning sent to ${item.studentName}.`);
        toast("Warning sent.");
      } catch (_e) {
        toast("Failed to warn student.", "error");
      }
      await refreshEvidenceData();
      renderAttempts();
      renderProctoring();
    });
    document.getElementById("evSafe").addEventListener("click", async () => {
      const ok = await confirmTextDialog({
        title: "Mark Attempt Safe",
        message: `Mark ${item.studentName}'s attempt as safe. Type SAFE to continue.`,
        expectedText: "SAFE",
        actionLabel: "Mark Safe"
      });
      if (!ok) return;
      try {
        await api.markAttemptSafe(item.id);
        item.cheatingScore = Math.min(item.cheatingScore, 30);
        item.riskLevel = "LOW";
        item.severity = "LOW";
        toast("Attempt marked safe.");
      } catch (_e) {
        toast("Failed to mark safe.", "error");
      }
      await refreshEvidenceData();
      renderAttempts();
      renderProctoring();
      renderAiInsights();
    });
    document.getElementById("evCancel").addEventListener("click", async () => {
      const ok = await confirmTextDialog({
        title: "Cancel Attempt",
        message: `This will invalidate ${item.studentName}'s attempt. Type CANCEL to continue.`,
        expectedText: "CANCEL",
        actionLabel: "Cancel Attempt"
      });
      if (!ok) return;
      try {
        await api.cancelAttempt(item.id);
        item.status = "INVALIDATED";
        item.riskLevel = "CRITICAL";
        item.severity = "CRITICAL";
        toast("Attempt cancelled.");
      } catch (_e) {
        toast("Failed to cancel attempt.", "error");
      }
      await refreshEvidenceData();
      renderAttempts();
      renderProctoring();
    });
    document.getElementById("evDownload").addEventListener("click", async () => {
      setActionsDisabled(true);
      try {
        const blob = await api.evidenceZip(item.id);
        downloadBlob(blob, `evidence-${item.id}.zip`);
        toast("Evidence ZIP downloaded.");
      } catch (_e) {
        toast("Failed to download evidence.", "error");
      } finally { setActionsDisabled(false); }
    });
    document.getElementById("evExport").addEventListener("click", async () => {
      setActionsDisabled(true);
      try {
        const blob = await api.evidenceReport(item.id);
        downloadBlob(blob, `evidence-report-${item.id}.pdf`);
        toast("Evidence report downloaded.");
      } catch (_e) {
        toast("Failed to export report.", "error");
      } finally { setActionsDisabled(false); }
    });
    refreshEvidenceData();
  }

  function setupQuestionsTableScrollbars() {
    const wraps = document.querySelectorAll(".questions-table-wrap");
    wraps.forEach((wrap) => {
      const table = wrap.querySelector("table");
      if (!table) return;
      const proxy = document.createElement("div");
      proxy.className = "questions-hscroll";
      const inner = document.createElement("div");
      inner.className = "questions-hscroll-inner";
      proxy.appendChild(inner);
      wrap.insertAdjacentElement("afterend", proxy);

      const syncWidth = () => {
        inner.style.width = `${Math.max(table.scrollWidth, wrap.clientWidth)}px`;
      };
      syncWidth();

      const syncFromWrap = () => { proxy.scrollLeft = wrap.scrollLeft; };
      const syncFromProxy = () => { wrap.scrollLeft = proxy.scrollLeft; };
      wrap.addEventListener("scroll", syncFromWrap);
      proxy.addEventListener("scroll", syncFromProxy);

      if (window.ResizeObserver) {
        const ro = new ResizeObserver(syncWidth);
        ro.observe(wrap);
        ro.observe(table);
      } else {
        window.addEventListener("resize", syncWidth, { once: true });
      }
    });
  }

  function attemptStatusBadge(status) {
    const s = String(status || "").toUpperCase();
    if (s === "COMPLETED") return `<span class="status-pill attempt-status status-completed">COMPLETED</span>`;
    if (s === "STARTED") return `<span class="status-pill attempt-status status-started">STARTED</span>`;
    if (s === "AUTO_SUBMITTED") return `<span class="status-pill attempt-status status-auto-submitted">AUTO_SUBMITTED</span>`;
    if (s === "INVALIDATED") return `<span class="status-pill attempt-status status-invalidated">INVALIDATED</span>`;
    if (s === "CANCELLED") return `<span class="status-pill attempt-status status-cancelled">CANCELLED</span>`;
    return `<span class="status-pill attempt-status">${s || "UNKNOWN"}</span>`;
  }

  function attemptSortIcon(key) {
    if (state.ui.attempts.sortKey !== key) return "fa-sort";
    return state.ui.attempts.sortDir === "asc" ? "fa-arrow-up-short-wide" : "fa-arrow-down-wide-short";
  }

  function renderAttemptFilters() {
    if (!dom.attemptExamFilter) return;
    const current = dom.attemptExamFilter.value || "all";
    const fromAttempts = state.data.attempts.map((a, idx) => {
      const n = a?.examCode ? a : normalizeAttempt(a, idx);
      return { code: n.examCode, title: n.examTitle };
    });
    const fromExams = state.data.exams.map((e) => ({ code: e.examCode, title: e.title }));
    const map = new Map();
    [...fromExams, ...fromAttempts].forEach((x) => {
      if (!x.code || x.code === "N/A") return;
      if (!map.has(x.code)) map.set(x.code, x.title || x.code);
    });
    const opts = ['<option value="all">All Exams</option>'].concat(
      [...map.entries()].map(([code, title]) => `<option value="${code}">${title} (${code})</option>`)
    ).join("");
    dom.attemptExamFilter.innerHTML = opts;
    dom.attemptExamFilter.value = map.has(current) || current === "all" ? current : "all";
  }

  function renderAttemptsRowsLazy(rows) {
    dom.attemptsTableBody.innerHTML = "";
    const total = rows.length;
    if (!total) return;
    const chunkSize = 30;
    let cursor = 0;
    const pushChunk = () => {
      const frag = document.createDocumentFragment();
      const end = Math.min(total, cursor + chunkSize);
      for (let i = cursor; i < end; i += 1) {
        const a = rows[i];
        const riskMeta = attemptsRiskFromScore(a.cheatingScore);
        const tr = document.createElement("tr");
        tr.className = `attempt-row ${riskMeta.key === "HIGH" ? "attempt-row-high" : ""}`;
        tr.innerHTML = `
          <td>${a.studentName}</td>
          <td>${a.examTitle}</td>
          <td>${a.score}</td>
          <td>${a.percentage}%</td>
          <td>${a.timeTaken}</td>
          <td>${attemptStatusBadge(a.status)}</td>
          <td><span class="status-pill attempt-risk ${riskMeta.cls}">${riskMeta.label}</span> <small class="attempt-risk-score">${a.cheatingScore}</small></td>
          <td>${fmtDateTime(a.startTime)}</td>
          <td>
            <div class="attempt-actions-inline">
              <button class="btn small action-primary" data-attempt-action="evidence" data-id="${a.id}" data-no-buffer="true" title="Open evidence details">View Evidence</button>
              <button class="btn small action-outline" data-attempt-action="warn" data-id="${a.id}" data-no-buffer="true" title="Warn student for suspicious behavior">Warn Student</button>
              <div class="attempt-more ${state.ui.attempts.openMenuId === a.id ? "open" : ""}">
                <button class="btn small action-more" data-attempt-menu-toggle="${a.id}" data-no-buffer="true" aria-label="More actions" title="More actions">
                  <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
                <div class="attempt-more-menu">
                  <button data-attempt-action="cancel" data-id="${a.id}" ${a.status === "CANCELLED" ? "disabled" : ""}>Cancel Attempt</button>
                  <button data-attempt-action="force-submit" data-id="${a.id}">Force Submit</button>
                  <button data-attempt-action="view-result" data-id="${a.id}">View Result</button>
                  <button data-attempt-action="resume" data-id="${a.id}">Resume Attempt</button>
                  <button data-attempt-action="analytics" data-id="${a.id}">View Analytics</button>
                </div>
              </div>
            </div>
          </td>
        `;
        frag.appendChild(tr);
      }
      dom.attemptsTableBody.appendChild(frag);
      cursor = end;
      if (cursor < total) requestAnimationFrame(pushChunk);
    };
    requestAnimationFrame(pushChunk);
  }

  function renderAttempts() {
    const attempts = filteredAttempts();
    const { rows, totalPages } = paginate(attempts, "attempts");
    if (dom.attemptSortScore) dom.attemptSortScore.querySelector("i").className = `fa-solid ${attemptSortIcon("score")}`;
    if (dom.attemptSortPercentage) dom.attemptSortPercentage.querySelector("i").className = `fa-solid ${attemptSortIcon("percentage")}`;
    renderAttemptsRowsLazy(rows);
    if (dom.attemptsEmptyState) dom.attemptsEmptyState.classList.toggle("hidden", attempts.length > 0);
    if (!attempts.length) dom.attemptsTableBody.innerHTML = `<tr><td colspan="9"><div class="no-data">No attempts found for selected filters.</div></td></tr>`;
    upsertPagination("attemptsPagination", "attempts", totalPages);
  }

  function analyticsArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const keys = ["rows", "results", "attempts", "students", "records", "items", "data", "list", "content"];
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  }

  function normalizeAnalyticsRow(raw, idx = 0) {
    const score = Number(raw?.score ?? 0);
    const percentage = Number(raw?.percentage ?? (Number(raw?.totalQuestions) > 0 ? ((Number(raw?.correctAnswers) || 0) / Number(raw?.totalQuestions)) * 100 : score));
    const cheatingScore = Number(raw?.cheatingScore ?? 0);
    const flagged = Boolean(raw?.flaggedForCheating ?? raw?.flagged ?? cheatingScore > 70);
    const totalQuestions = Number(raw?.totalQuestions ?? 0);
    const correctAnswers = Number(raw?.correctAnswers ?? 0);
    return {
      id: String(raw?.attemptId || raw?.id || idx),
      studentName: String(raw?.studentName || raw?.student?.name || `Student ${idx + 1}`),
      score: Number.isFinite(score) ? score : 0,
      percentage: Number.isFinite(percentage) ? clamp(Math.round(percentage), 0, 100) : 0,
      submittedAt: raw?.submittedAt || raw?.startTime || raw?.createdAt || new Date().toISOString(),
      passed: raw?.passed !== undefined ? Boolean(raw.passed) : percentage >= 40,
      flaggedForCheating: flagged,
      easyCorrect: Number(raw?.easyCorrect ?? 0),
      mediumCorrect: Number(raw?.mediumCorrect ?? 0),
      difficultCorrect: Number(raw?.difficultCorrect ?? raw?.hardCorrect ?? 0),
      totalQuestions,
      correctAnswers
    };
  }

  function applyAnalyticsDateFilter(rows) {
    const from = state.ui.analytics.dateFrom ? new Date(`${state.ui.analytics.dateFrom}T00:00:00`) : null;
    const to = state.ui.analytics.dateTo ? new Date(`${state.ui.analytics.dateTo}T23:59:59`) : null;
    return rows.filter((r) => {
      const t = new Date(r.submittedAt);
      if (from && t < from) return false;
      if (to && t > to) return false;
      return true;
    });
  }

  function buildAnalyticsSummary(rows) {
    const percentages = rows.map((r) => Number(r.percentage || 0));
    const avg = percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;
    const highest = percentages.length ? Math.max(...percentages) : 0;
    const lowest = percentages.length ? Math.min(...percentages) : 0;
    const passCount = rows.filter((r) => r.passed).length;
    const passPct = rows.length ? Math.round((passCount / rows.length) * 100) : 0;
    const totalStudents = new Set(rows.map((r) => r.studentName)).size;
    const distribution = [0, 0, 0, 0, 0];
    rows.forEach((r) => {
      const s = Number(r.score || 0);
      if (s <= 20) distribution[0] += 1;
      else if (s <= 40) distribution[1] += 1;
      else if (s <= 60) distribution[2] += 1;
      else if (s <= 80) distribution[3] += 1;
      else distribution[4] += 1;
    });
    const trend = [...rows]
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .map((r) => Number(r.score || 0));
    const trendLabels = [...rows]
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .map((r) => `${r.studentName} • ${fmtDateTime(r.submittedAt)} • ${r.score}`);
    const accuracy = [...rows]
      .map((r) => ({
        name: r.studentName,
        value: r.totalQuestions > 0 ? Math.round((r.correctAnswers / r.totalQuestions) * 100) : Number(r.percentage || 0)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const safeCount = rows.filter((r) => !r.flaggedForCheating).length;
    const flaggedCount = rows.filter((r) => r.flaggedForCheating).length;
    const difficulty = [
      rows.reduce((n, r) => n + Number(r.easyCorrect || 0), 0),
      rows.reduce((n, r) => n + Number(r.mediumCorrect || 0), 0),
      rows.reduce((n, r) => n + Number(r.difficultCorrect || 0), 0)
    ];
    return {
      avg,
      highest,
      lowest,
      passPct,
      totalStudents,
      passCount,
      failCount: Math.max(0, rows.length - passCount),
      distribution,
      trend,
      trendLabels,
      accuracy,
      safeCount,
      flaggedCount,
      difficulty
    };
  }

  function setAnalyticsLoadingUI(active) {
    if (dom.analyticsLoading) dom.analyticsLoading.classList.toggle("hidden", !active);
    if (dom.analyticsExamFilter) dom.analyticsExamFilter.disabled = !!active;
    if (dom.analyticsDateFrom) dom.analyticsDateFrom.disabled = !!active;
    if (dom.analyticsDateTo) dom.analyticsDateTo.disabled = !!active;
    if (dom.analyticsRefreshBtn) dom.analyticsRefreshBtn.disabled = !!active;
    if (dom.analyticsExportCsvBtn) dom.analyticsExportCsvBtn.disabled = !!active;
    if (dom.analyticsExportPdfBtn) dom.analyticsExportPdfBtn.disabled = !!active;
    document.querySelectorAll("#analytics .chart-card").forEach((card) => card.classList.toggle("is-loading", !!active));
  }

  async function loadAnalyticsData(force = false) {
    const examCode = state.ui.analytics.examCode;
    if (!examCode) {
      state.data.analytics.rows = [];
      state.data.analytics.summary = null;
      state.ui.analytics.error = "";
      renderAnalytics();
      return;
    }
    const key = `${examCode}|${state.ui.analytics.dateFrom || ""}|${state.ui.analytics.dateTo || ""}`;
    if (!force && state.ui.analytics.cache[key]) {
      state.data.analytics.rows = state.ui.analytics.cache[key].rows;
      state.data.analytics.summary = state.ui.analytics.cache[key].summary;
      state.ui.analytics.error = "";
      renderAnalytics();
      return;
    }
    if (!force && state.ui.analytics.pendingKey === key && state.ui.analytics.pendingPromise) {
      await state.ui.analytics.pendingPromise;
      return;
    }
    state.ui.analytics.loading = true;
    state.ui.analytics.error = "";
    setAnalyticsLoadingUI(true);
    const runner = (async () => {
      try {
        const [examReq, classReq] = await Promise.allSettled([api.analyticsExam(examCode), api.analyticsClass(examCode)]);
        if (examReq.status === "rejected" && classReq.status === "rejected") throw new Error("both_failed");
        const examRes = examReq.status === "fulfilled" ? examReq.value : null;
        const classRes = classReq.status === "fulfilled" ? classReq.value : null;
        const rawRows = analyticsArray(examRes).concat(analyticsArray(classRes)).map((r, idx) => normalizeAnalyticsRow(r, idx));
        const seen = new Set();
        const rows = rawRows.filter((r) => {
          const rowKey = `${r.id}|${r.studentName}|${r.submittedAt}`;
          if (seen.has(rowKey)) return false;
          seen.add(rowKey);
          return true;
        });
        const dateFiltered = applyAnalyticsDateFilter(rows);
        state.data.analytics.rows = dateFiltered;
        state.data.analytics.summary = dateFiltered.length ? buildAnalyticsSummary(dateFiltered) : null;
        state.ui.analytics.cache[key] = {
          rows: state.data.analytics.rows,
          summary: state.data.analytics.summary,
          ts: Date.now()
        };
        state.ui.analytics.error = "";
      } catch (_e) {
        state.data.analytics.rows = [];
        state.data.analytics.summary = null;
        state.ui.analytics.error = "Failed to load analytics";
        toast("Failed to load analytics.", "error");
      } finally {
        state.ui.analytics.pendingKey = "";
        state.ui.analytics.pendingPromise = null;
      }
    })();
    state.ui.analytics.pendingKey = key;
    state.ui.analytics.pendingPromise = runner;
    try {
      await runner;
    } finally {
      state.ui.analytics.loading = false;
      setAnalyticsLoadingUI(false);
      renderAnalytics();
    }
  }

  function exportAnalyticsCsv() {
    const rows = state.data.analytics.rows || [];
    if (!rows.length) return toast("No analytics data to export.", "error");
    const headers = ["Student Name", "Score", "Percentage", "Submitted At", "Passed", "Flagged", "Easy Correct", "Medium Correct", "Hard Correct"];
    const body = rows.map((r) => [
      r.studentName,
      r.score,
      `${r.percentage}%`,
      fmtDateTime(r.submittedAt),
      r.passed ? "Yes" : "No",
      r.flaggedForCheating ? "Yes" : "No",
      r.easyCorrect,
      r.mediumCorrect,
      r.difficultCorrect
    ]);
    const csv = [headers, ...body].map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-${state.ui.analytics.examCode}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Analytics CSV exported.");
  }

  function exportAnalyticsPdf() {
    const summary = state.data.analytics.summary;
    if (!summary) return toast("No analytics data to export.", "error");
    const win = window.open("", "_blank", "width=980,height=760");
    if (!win) return toast("Popup blocked. Enable popups to export PDF.", "error");
    win.document.write(`
      <html><head><title>Analytics Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;color:#0f172a}h1{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;font-size:12px}</style>
      </head><body>
      <h1>Analytics Report</h1>
      <p><strong>Exam:</strong> ${state.ui.analytics.examCode}</p>
      <p><strong>Average:</strong> ${summary.avg}% | <strong>Highest:</strong> ${summary.highest}% | <strong>Lowest:</strong> ${summary.lowest}% | <strong>Pass:</strong> ${summary.passPct}% | <strong>Total Students:</strong> ${summary.totalStudents}</p>
      <table><thead><tr><th>Student</th><th>Score</th><th>Percentage</th><th>Date</th></tr></thead><tbody>
      ${(state.data.analytics.rows || []).slice(0, 200).map((r) => `<tr><td>${r.studentName}</td><td>${r.score}</td><td>${r.percentage}%</td><td>${fmtDateTime(r.submittedAt)}</td></tr>`).join("")}
      </tbody></table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  function renderAnalytics() {
    const summary = state.data.analytics.summary;
    const hasData = !!summary && (state.data.analytics.rows || []).length > 0;
    if (dom.analyticsNoData) dom.analyticsNoData.classList.toggle("hidden", hasData || state.ui.analytics.loading || !!state.ui.analytics.error);
    if (dom.analyticsError) dom.analyticsError.classList.toggle("hidden", !state.ui.analytics.error || state.ui.analytics.loading);
    if (!dom.analyticsCards) return;
    if (!hasData) {
      dom.analyticsCards.innerHTML = "";
      drawBarChart(dom.scoreDistChart, [], ["#60a5fa"], { emptyText: "No analytics data available" });
      drawLineChart(dom.perfTrendChart, [], "rgba(16,185,129,0.95)");
      drawBarChart(dom.accuracyChart, [], ["#06b6d4"], { emptyText: "No analytics data available" });
      drawPieChart(dom.analyticsPassFailChart, [0, 0], ["rgba(16,185,129,.8)", "rgba(239,68,68,.8)"], { showPercentLabels: true });
      drawBarChart(dom.analyticsCheatingChart, [0, 0], ["#10b981", "#f59e0b"], { labels: ["Safe", "Flagged"], showValues: true, emptyText: "No analytics data available" });
      drawStackedBarChart(dom.analyticsDifficultyChart, [0, 0, 0], ["#60a5fa", "#f59e0b", "#ef4444"], ["Easy", "Medium", "Hard"]);
      setLegend(dom.analyticsScoreLegend, [{ label: "0-20", color: "#93c5fd" }, { label: "21-40", color: "#60a5fa" }, { label: "41-60", color: "#3b82f6" }, { label: "61-80", color: "#2563eb" }, { label: "81-100", color: "#1d4ed8" }]);
      setLegend(dom.analyticsPassLegend, [{ label: "Passed", color: "#10b981" }, { label: "Failed", color: "#ef4444" }]);
      setLegend(dom.analyticsCheatLegend, [{ label: "Safe", color: "#10b981" }, { label: "Flagged", color: "#f59e0b" }]);
      setLegend(dom.analyticsDifficultyLegend, [{ label: "Easy", color: "#60a5fa" }, { label: "Medium", color: "#f59e0b" }, { label: "Hard", color: "#ef4444" }]);
      return;
    }
    dom.analyticsCards.innerHTML = [
      ["Average Score", `${summary.avg}%`, "fa-chart-line", "kpi-a"],
      ["Highest Score", `${summary.highest}%`, "fa-trophy", "kpi-b"],
      ["Lowest Score", `${summary.lowest}%`, "fa-arrow-down", "kpi-c"],
      ["Pass Percentage", `${summary.passPct}%`, "fa-circle-check", "kpi-d"],
      ["Total Students", String(summary.totalStudents), "fa-user-group", "kpi-e"]
    ].map(([label, value, icon, cls]) => `
      <article class="stat-card analytics-kpi-card ${cls}">
        <div class="stat-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="stat-meta"><small>${label}</small><strong>${value}</strong></div>
      </article>
    `).join("");
    drawBarChart(dom.scoreDistChart, summary.distribution, ["#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"], { labels: ["0-20", "21-40", "41-60", "61-80", "81-100"] });
    drawLineChart(dom.perfTrendChart, summary.trend, "rgba(16,185,129,0.95)");
    drawBarChart(dom.accuracyChart, summary.accuracy.map((x) => x.value), ["#06b6d4"], { showValues: true });
    drawPieChart(dom.analyticsPassFailChart, [summary.passCount, summary.failCount], ["rgba(16,185,129,.9)", "rgba(239,68,68,.9)"], { showPercentLabels: true });
    drawBarChart(dom.analyticsCheatingChart, [summary.safeCount, summary.flaggedCount], ["#10b981", "#f59e0b"], { labels: ["Safe", "Flagged"], showValues: true });
    drawStackedBarChart(dom.analyticsDifficultyChart, summary.difficulty, ["#60a5fa", "#f59e0b", "#ef4444"], ["Easy", "Medium", "Hard"]);
    setLegend(dom.analyticsScoreLegend, [{ label: "0-20", color: "#93c5fd" }, { label: "21-40", color: "#60a5fa" }, { label: "41-60", color: "#3b82f6" }, { label: "61-80", color: "#2563eb" }, { label: "81-100", color: "#1d4ed8" }]);
    setLegend(dom.analyticsPassLegend, [{ label: "Passed", color: "#10b981" }, { label: "Failed", color: "#ef4444" }]);
    setLegend(dom.analyticsCheatLegend, [{ label: "Safe", color: "#10b981" }, { label: "Flagged", color: "#f59e0b" }]);
    setLegend(dom.analyticsDifficultyLegend, [{ label: "Easy", color: "#60a5fa" }, { label: "Medium", color: "#f59e0b" }, { label: "Hard", color: "#ef4444" }]);
    attachCanvasTooltip(dom.scoreDistChart, [`0-20: ${summary.distribution[0]}`, `21-40: ${summary.distribution[1]}`, `41-60: ${summary.distribution[2]}`, `61-80: ${summary.distribution[3]}`, `81-100: ${summary.distribution[4]}`]);
    attachCanvasTooltip(dom.perfTrendChart, summary.trendLabels);
    attachCanvasTooltip(dom.accuracyChart, summary.accuracy.map((s) => `${s.name}: ${s.value}%`));
    attachCanvasTooltip(dom.analyticsCheatingChart, [`Safe: ${summary.safeCount}`, `Flagged: ${summary.flaggedCount}`]);
    attachCanvasTooltip(dom.analyticsPassFailChart, [`Pass: ${summary.passCount}`, `Fail: ${summary.failCount}`]);
    attachCanvasTooltip(dom.analyticsDifficultyChart, [`Easy Correct: ${summary.difficulty[0]}`, `Medium Correct: ${summary.difficulty[1]}`, `Hard Correct: ${summary.difficulty[2]}`]);
  }

  function leaderboardFallbackRows() {
    const mode = state.ui.leaderboard.mode;
    const examCode = state.ui.leaderboard.examCode;
    const candidates = mode === "global"
      ? state.data.attempts
      : state.data.attempts.filter((a) => {
        const ex = examById(a.examId);
        return ex && ex.examCode === examCode;
      });
    const best = {};
    candidates.forEach((a) => {
      if (!best[a.studentName] || a.percentage > best[a.studentName].percentage) best[a.studentName] = a;
    });
    return Object.values(best)
      .sort((a, b) => b.score - a.score)
      .map((r, idx) => ({
        rank: idx + 1,
        studentName: r.studentName,
        score: r.score,
        percentage: r.percentage
      }));
  }

  function percentageClass(pct) {
    if (pct >= 90) return "pct-green";
    if (pct >= 70) return "pct-blue";
    if (pct >= 50) return "pct-orange";
    return "pct-red";
  }

  function renderLeaderboard() {
    if (!dom.leaderboardBody) return;
    const q = safeQuery(state.ui.leaderboard.search);
    const sortDir = state.ui.leaderboard.sortDir;
    let rows = [...(state.data.leaderboardRows || [])];
    if (q) rows = rows.filter((r) => String(r.studentName || "").toLowerCase().includes(q));
    rows.sort((a, b) => sortDir === "asc" ? Number(a.score) - Number(b.score) : Number(b.score) - Number(a.score));
    const icon = sortDir === "asc" ? "fa-arrow-up-short-wide" : "fa-arrow-down-wide-short";
    if (dom.leaderboardSortIcon) dom.leaderboardSortIcon.className = `fa-solid ${icon}`;
    if (dom.leaderboardModeExam) dom.leaderboardModeExam.classList.toggle("active", state.ui.leaderboard.mode === "exam");
    if (dom.leaderboardModeGlobal) dom.leaderboardModeGlobal.classList.toggle("active", state.ui.leaderboard.mode === "global");

    if (!rows.length) {
      const message = state.ui.leaderboard.mode === "exam"
        ? "Leaderboard not available for selected exam"
        : "Leaderboard not available right now";
      dom.leaderboardBody.innerHTML = `<tr><td colspan="4"><div class="no-data">${message}</div></td></tr>`;
      return;
    }

    dom.leaderboardBody.innerHTML = rows.map((r) => {
      const rank = Number(r.rank || 0);
      const topCls = rank === 1 ? "top-gold" : rank === 2 ? "top-silver" : rank === 3 ? "top-bronze" : "";
      const pct = Number(r.percentage || 0);
      return `
        <tr class="leaderboard-row ${topCls}">
          <td><span class="rank-pill">${rank}</span></td>
          <td>${r.studentName}</td>
          <td>${r.score}</td>
          <td><span class="percent-pill ${percentageClass(pct)}">${pct}%</span></td>
        </tr>
      `;
    }).join("");
  }

  async function loadLeaderboardData() {
    state.ui.leaderboard.loading = true;
    if (dom.leaderboardLoading) dom.leaderboardLoading.classList.remove("hidden");
    try {
      let rows = [];
      if (state.ui.leaderboard.mode === "global") {
        rows = await api.leaderboardGlobal();
      } else if (state.ui.leaderboard.examCode && state.ui.leaderboard.examCode !== "all") {
        rows = await api.leaderboardByExam(state.ui.leaderboard.examCode);
      }
      const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : Array.isArray(rows?.items) ? rows.items : [];
      state.data.leaderboardRows = arr.map((r, i) => ({
        rank: Number(r.rank ?? (i + 1)),
        studentName: String(r.studentName ?? r.name ?? "Unknown"),
        score: Number(r.score ?? 0),
        percentage: Number(r.percentage ?? 0)
      }));
    } catch (_e) {
      state.data.leaderboardRows = leaderboardFallbackRows();
      toast("Failed to load leaderboard.", "error");
    } finally {
      state.ui.leaderboard.loading = false;
      if (dom.leaderboardLoading) dom.leaderboardLoading.classList.add("hidden");
      renderLeaderboard();
    }
  }

  function renderProctoring() {
    const rows = [...state.data.attempts].sort((a, b) => b.cheatingScore - a.cheatingScore).slice(0, 25);
    dom.proctoringBody.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.studentName}</td><td>${r.examTitle || examTitle(r.examId)}</td><td>${r.score}</td>
        <td><span class="status-pill status-risk">${r.severity}</span></td><td>${r.status}</td>
        <td>
          <div class="action-row">
            <button class="btn ghost small" data-attempt-action="evidence" data-id="${r.id}">Evidence</button>
            <button class="btn ghost small" data-attempt-action="warn" data-id="${r.id}">Warn</button>
            <button class="btn ghost small" data-proctor-more="${r.id}"><i class="fa-solid fa-ellipsis-vertical"></i></button>
          </div>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6">No live proctoring data.</td></tr>`;
  }

  function aiRows(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.list)) return data.list;
    return [];
  }

  function aiWeaknessMeta(levelRaw, priorityScore = 0, accuracy = 0) {
    const level = String(levelRaw || "").toUpperCase();
    if (level === "LOW" || (priorityScore <= 40 && accuracy >= 65)) return { key: "LOW", cls: "status-published" };
    if (level === "MEDIUM" || (priorityScore <= 70 && accuracy >= 40)) return { key: "MEDIUM", cls: "status-draft" };
    return { key: "HIGH", cls: "status-invalidated" };
  }

  function aiRiskBand(score) {
    const n = Number(score || 0);
    if (n <= 40) return { key: "LOW", color: "#10b981" };
    if (n <= 70) return { key: "MEDIUM", color: "#f59e0b" };
    return { key: "HIGH", color: "#ef4444" };
  }

  function normalizeAiInsights(raw) {
    const performanceRaw = aiRows(raw?.performance);
    const weakRaw = aiRows(raw?.weakTopics);
    const performance = performanceRaw.map((r, idx) => {
      const totalQuestions = Number(r?.totalQuestions ?? r?.total ?? 0);
      const correctAnswers = Number(r?.correctAnswers ?? r?.correct ?? 0);
      const wrongAnswers = Number(r?.wrongAnswers ?? (totalQuestions - correctAnswers));
      const accuracy = Number(r?.accuracy ?? (totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0));
      return {
        topic: String(r?.topic || r?.topicName || `Topic ${idx + 1}`),
        totalQuestions,
        correctAnswers,
        wrongAnswers: Math.max(0, wrongAnswers),
        accuracy: clamp(Math.round(accuracy), 0, 100),
        difficulty: String(r?.difficulty || "MEDIUM"),
        performanceLevel: String(r?.performanceLevel || (accuracy >= 75 ? "GOOD" : accuracy >= 50 ? "AVERAGE" : "WEAK")),
        recommendation: String(r?.recommendation || "Practice additional targeted questions.")
      };
    });
    const weakTopics = weakRaw.map((r, idx) => {
      const accuracy = Number(r?.accuracy ?? r?.accuracyPercentage ?? 0);
      const priorityScore = Number(r?.priorityScore ?? r?.priority ?? (100 - accuracy));
      const meta = aiWeaknessMeta(r?.weaknessLevel, priorityScore, accuracy);
      return {
        topic: String(r?.topic || r?.topicName || `Topic ${idx + 1}`),
        accuracy: clamp(Math.round(accuracy), 0, 100),
        weaknessLevel: meta.key,
        weaknessClass: meta.cls,
        difficulty: String(r?.difficulty || "MEDIUM"),
        recommendation: String(r?.recommendation || "Revise fundamentals and solve topic quizzes."),
        priorityScore
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
    const feedback = String(raw?.overallFeedback || raw?.feedback || "");
    const riskScore = weakTopics.length
      ? Math.round(weakTopics.reduce((n, w) => n + Math.max(0, 100 - w.accuracy), 0) / weakTopics.length)
      : 0;
    return { performance, weakTopics, overallFeedback: feedback, riskScore };
  }

  function setAiLoadingUI(active) {
    if (dom.aiLoading) dom.aiLoading.classList.toggle("hidden", !active);
    if (dom.aiStudentFilter) dom.aiStudentFilter.disabled = !!active;
    if (dom.aiExamFilter) dom.aiExamFilter.disabled = !!active;
    if (dom.aiRefreshBtn) dom.aiRefreshBtn.disabled = !!active;
  }

  function renderAiFilters() {
    if (dom.aiExamFilter) {
      const prev = dom.aiExamFilter.value || state.ui.aiInsights.examCode || "all";
      dom.aiExamFilter.innerHTML = ['<option value="all">All Exams</option>']
        .concat(state.data.exams.map((e) => `<option value="${e.examCode}">${e.title} (${e.examCode})</option>`))
        .join("");
      dom.aiExamFilter.value = state.data.exams.some((e) => e.examCode === prev) || prev === "all" ? prev : "all";
      state.ui.aiInsights.examCode = dom.aiExamFilter.value;
    }
    if (dom.aiStudentFilter) {
      const map = new Map();
      (state.data.attempts || []).forEach((a, idx) => {
        const rawId = a.studentId ?? a.student?.id ?? a.userId;
        const numericId = Number(rawId);
        if (!Number.isFinite(numericId) || numericId <= 0) return;
        const id = String(numericId);
        const name = String(a.studentName || a.student?.name || `Student ${idx + 1}`);
        if (!map.has(id)) map.set(id, name);
      });
      const opts = ['<option value="">Select Student</option>']
        .concat([...map.entries()].map(([id, name]) => `<option value="${id}">${name}</option>`))
        .join("");
      const prev = state.ui.aiInsights.studentId;
      dom.aiStudentFilter.innerHTML = opts;
      if (!prev && map.size) state.ui.aiInsights.studentId = [...map.keys()][0];
      dom.aiStudentFilter.value = map.has(state.ui.aiInsights.studentId) ? state.ui.aiInsights.studentId : "";
    }
  }

  async function loadAiInsightsData(force = false) {
    const studentId = state.ui.aiInsights.studentId;
    const numericStudentId = Number(studentId);
    if (!Number.isFinite(numericStudentId) || numericStudentId <= 0) {
      state.data.aiInsights = { performance: [], weakTopics: [], overallFeedback: "" };
      state.ui.aiInsights.error = "";
      renderAiInsights();
      return;
    }
    const key = `${numericStudentId}|${state.ui.aiInsights.examCode || "all"}`;
    if (!force && state.ui.aiInsights.cache[key]) {
      state.data.aiInsights = state.ui.aiInsights.cache[key];
      state.ui.aiInsights.error = "";
      renderAiInsights();
      return;
    }
    if (!force && state.ui.aiInsights.pendingKey === key && state.ui.aiInsights.pendingPromise) {
      await state.ui.aiInsights.pendingPromise;
      return;
    }
    state.ui.aiInsights.loading = true;
    state.ui.aiInsights.error = "";
    setAiLoadingUI(true);
    const runner = (async () => {
      try {
        const res = await api.aiAnalysisStudent(numericStudentId, state.ui.aiInsights.examCode);
        const normalized = normalizeAiInsights(res || {});
        state.data.aiInsights = normalized;
        state.ui.aiInsights.cache[key] = normalized;
      } catch (_e) {
        state.data.aiInsights = { performance: [], weakTopics: [], overallFeedback: "" };
        state.ui.aiInsights.error = "Failed to load AI insights";
        toast("Failed to load AI insights.", "error");
      } finally {
        state.ui.aiInsights.pendingKey = "";
        state.ui.aiInsights.pendingPromise = null;
      }
    })();
    state.ui.aiInsights.pendingKey = key;
    state.ui.aiInsights.pendingPromise = runner;
    await runner;
    state.ui.aiInsights.loading = false;
    setAiLoadingUI(false);
    renderAiInsights();
  }

  function renderAiInsights() {
    if (!dom.weakTopics || !dom.recommendations || !dom.aiTopicPerformanceBody || !dom.aiAccuracyChart) return;
    const model = state.data.aiInsights || { performance: [], weakTopics: [], overallFeedback: "", riskScore: 0 };
    const hasData = model.performance.length > 0 || model.weakTopics.length > 0 || !!model.overallFeedback;
    if (dom.aiError) dom.aiError.classList.toggle("hidden", !state.ui.aiInsights.error || state.ui.aiInsights.loading);
    if (dom.aiEmpty) dom.aiEmpty.classList.toggle("hidden", hasData || state.ui.aiInsights.loading || !!state.ui.aiInsights.error);

    dom.weakTopics.innerHTML = model.weakTopics.map((w) => `
      <li class="ai-weak-item">
        <div><strong>${w.topic}</strong> <span class="status-pill ${w.weaknessClass}">${w.weaknessLevel}</span></div>
        <small>Accuracy: ${w.accuracy}% • Difficulty: ${w.difficulty} • Priority: ${w.priorityScore}</small>
        <p>${w.recommendation}</p>
      </li>
    `).join("") || "<li class='no-data'>No weak topics available.</li>";

    dom.recommendations.innerHTML = model.weakTopics.map((w, idx) => `
      <li class="ai-rec-item">
        <button class="ai-rec-toggle" data-ai-rec-toggle="${idx}" data-no-buffer="true"><i class="fa-solid fa-lightbulb"></i> ${w.topic}</button>
        <div class="ai-rec-body hidden" id="aiRecBody${idx}">${w.recommendation}</div>
      </li>
    `).join("") || "<li class='no-data'>No recommendations available.</li>";
    dom.recommendations.querySelectorAll("[data-ai-rec-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.aiRecToggle;
        const body = document.getElementById(`aiRecBody${id}`);
        if (body) body.classList.toggle("hidden");
      });
    });

    const accValues = model.performance.map((p) => p.accuracy);
    drawBarChart(dom.aiAccuracyChart, accValues, ["#3b82f6"], { showValues: true, emptyText: "No AI insights available" });
    attachCanvasTooltip(dom.aiAccuracyChart, model.performance.map((p) => `${p.topic}: ${p.accuracy}%`));

    const riskBand = aiRiskBand(model.riskScore || 0);
    dom.riskScoreCard.style.background = `linear-gradient(90deg, ${riskBand.color} ${model.riskScore || 0}%, rgba(226,232,240,.5) ${model.riskScore || 0}%)`;
    dom.riskScoreCard.textContent = `${model.riskScore || 0}%`;
    dom.aiRiskBadge.textContent = riskBand.key;
    dom.aiRiskBadge.className = `status-pill ${riskBand.key === "LOW" ? "status-published" : riskBand.key === "MEDIUM" ? "status-draft" : "status-invalidated"}`;
    dom.aiFeedback.textContent = model.overallFeedback || "No overall feedback available.";
    dom.aiOverallFeedback.textContent = model.overallFeedback || "No overall feedback available.";
    dom.aiOverallFeedback.className = `ai-overall-feedback ${riskBand.key === "LOW" ? "low" : riskBand.key === "MEDIUM" ? "medium" : "high"}`;

    dom.aiTopicPerformanceBody.innerHTML = model.performance.map((p) => `
      <tr>
        <td>${p.topic}</td>
        <td>${p.totalQuestions}</td>
        <td>${p.correctAnswers}</td>
        <td>${p.wrongAnswers}</td>
        <td>${p.accuracy}%</td>
        <td>${p.difficulty}</td>
        <td>${p.performanceLevel}</td>
        <td>${p.recommendation}</td>
      </tr>
    `).join("") || `<tr><td colspan="8"><div class="no-data">No AI insights available</div></td></tr>`;
  }

  function renderStudentsPerformance() {
    const rows = state.data.attempts.slice(0, 40);
    dom.studentsPerfBody.innerHTML = rows.map((a) => `<tr><td>${a.studentName}</td><td>${examTitle(a.examId)}</td><td>${a.score}</td><td>${a.percentage}%</td><td>${a.status}</td></tr>`).join("") || `<tr><td colspan="5">No student performance data.</td></tr>`;
  }

  function normalizeCertificate(raw, idx = 0) {
    return {
      certificateId: String(raw.certificateId || raw.id || `CERT-${1000 + idx}`),
      studentName: String(raw.studentName || "Unknown Student"),
      collegeName: String(raw.collegeName || "N/A"),
      department: String(raw.department || "N/A"),
      rollNumber: String(raw.rollNumber || "N/A"),
      examTitle: String(raw.examTitle || examTitle(raw.examId) || "N/A"),
      examId: raw.examId || null,
      score: Number(raw.score ?? 0),
      grade: String(raw.grade || "-"),
      issuedAt: raw.issuedAt || raw.createdAt || new Date().toISOString(),
      revoked: Boolean(raw.revoked || String(raw.status || "").toLowerCase() === "revoked"),
      qrCodeData: String(raw.qrCodeData || "")
    };
  }

  function certificateStatusBadge(cert) {
    return cert.revoked
      ? `<span class="status-pill cert-status cert-revoked">Revoked</span>`
      : `<span class="status-pill cert-status cert-issued">Issued</span>`;
  }

  function certificateQrMarkup(cert) {
    const value = String(cert.qrCodeData || "").trim();
    if (!value) {
      return "<div class='qr-fallback'>QR Not Available</div>";
    }
    const isImageUrl = /^data:image\//i.test(value)
      || /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(value);
    if (isImageUrl) {
      return `<img src="${value}" alt="QR Code">`;
    }
    return `<div class="qr-fallback"><small>Verification URL</small><code>${value}</code></div>`;
  }

  function certVerificationUrl(certificateId) {
    return `${API_BASE}/api/certificate/verify/${encodeURIComponent(certificateId)}`;
  }

  async function loadCertificatesData() {
    try {
      const rows = await api.certificatesAll();
      const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : Array.isArray(rows?.items) ? rows.items : [];
      if (arr.length) state.data.certificates = arr.map((r, idx) => normalizeCertificate(r, idx));
      else state.data.certificates = [];
    } catch (_e) {
      state.data.certificates = (state.data.certificates || []).map((c, idx) => normalizeCertificate(c, idx));
      toast("Failed to load certificates.", "error");
    }
    renderCertificates();
  }

  function certificateById(certificateId) {
    const cert = state.data.certificates.find((c) => String(c.certificateId || c.id) === String(certificateId));
    return cert ? normalizeCertificate(cert) : null;
  }

  function setDownloadButtonState(btn, active) {
    if (!btn) return;
    if (active) {
      if (!btn.dataset.prevHtml) btn.dataset.prevHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-buffer-spinner"></span><span class="btn-buffer-label">Downloading PDF...</span>`;
      btn.classList.add("is-buffering");
      return;
    }
    btn.disabled = false;
    if (btn.dataset.prevHtml) btn.innerHTML = btn.dataset.prevHtml;
    btn.classList.remove("is-buffering");
    delete btn.dataset.prevHtml;
  }

  function unwrapCertificatePayload(payload) {
    if (!payload || typeof payload !== "object") return {};
    if (payload.certificate && typeof payload.certificate === "object") return payload.certificate;
    if (payload.data && typeof payload.data === "object") return payload.data;
    if (payload.result && typeof payload.result === "object") return payload.result;
    return payload;
  }

  async function verifyCertificate(certificateId) {
    const fallbackCert = certificateById(certificateId) || { certificateId: String(certificateId) };
    try {
      const { status, ok, payload } = await api.certificateVerify(certificateId);
      if (status === 410) {
        toast("Certificate revoked", "error");
      }
      if (!ok && status !== 410) {
        toast("Invalid Certificate", "error");
        return;
      }
      const info = unwrapCertificatePayload(payload);
      const data = normalizeCertificate({ ...fallbackCert, ...info, certificateId });
      const payloadStatus = String(info?.status || payload?.status || "").toLowerCase();
      const isRevoked = status === 410 || Boolean(data.revoked || payloadStatus === "revoked");
      if (isRevoked && status !== 410) toast("Certificate revoked", "error");
      const badgeClass = isRevoked ? "cert-revoked" : "cert-issued";
      const badgeText = isRevoked ? "Certificate Revoked" : "Valid Certificate";
      const sourceIdx = state.data.certificates.findIndex((c) => String(c.certificateId || c.id) === String(certificateId));
      if (sourceIdx >= 0) state.data.certificates[sourceIdx] = { ...state.data.certificates[sourceIdx], revoked: isRevoked };
      openModal(`
        <h3>Certificate Verified</h3>
        <div class="certificate-grid" style="margin-top:10px">
          <div><small>Certificate ID</small><strong>${data.certificateId}</strong></div>
          <div><small>Student Name</small><strong>${data.studentName || "-"}</strong></div>
          <div><small>Exam Title</small><strong>${data.examTitle || "-"}</strong></div>
          <div><small>Score</small><strong>${Number.isFinite(Number(data.score)) ? data.score : "-"}</strong></div>
          <div><small>Grade</small><strong>${data.grade || "-"}</strong></div>
          <div><small>Issued Date</small><strong>${fmtDateTime(data.issuedAt)}</strong></div>
          <div><small>Status</small><strong><span class="status-pill cert-status ${badgeClass}">${badgeText}</span></strong></div>
        </div>
        <div class="actions">
          <button class="btn ghost" id="verifyCloseBtn">Close</button>
        </div>
      `);
      document.getElementById("verifyCloseBtn").addEventListener("click", closeModal);
      renderCertificates();
    } catch (_e) {
      toast("Invalid Certificate", "error");
    }
  }

  async function downloadCertificate(certificateId, triggerBtn = null) {
    setDownloadButtonState(triggerBtn, true);
    try {
      const res = await authFetch(
        `/api/certificate/download/${encodeURIComponent(certificateId)}`,
        { method: "GET", headers: { Accept: "application/pdf,application/octet-stream,*/*" } },
        { throwOnError: false, silent: true }
      );
      if (res.status === 410) {
        toast("Certificate revoked", "error");
        return;
      }
      if (!res.ok) {
        toast("Download failed", "error");
        return;
      }
      const contentType = String(res.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        let data = {};
        try { data = await res.json(); } catch (_e) {}
        if (String(data?.status || "").toLowerCase() === "revoked" || data?.revoked === true) {
          toast("Certificate revoked", "error");
        } else {
          toast("Download failed", "error");
        }
        return;
      }
      const blob = await res.blob();
      if (!blob || !blob.size) {
        toast("Download failed", "error");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `certificate-${certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (_e) {
      toast("Download failed", "error");
    } finally {
      setDownloadButtonState(triggerBtn, false);
    }
  }

  async function handleCertificateRevoke(cert) {
    if (cert.revoked) return;
    const ok = await confirmTextDialog({
      title: "Revoke Certificate",
      message: `Type REVOKE ${cert.certificateId} to revoke this certificate.`,
      expectedText: `REVOKE ${cert.certificateId}`,
      actionLabel: "Revoke"
    });
    if (!ok) return;
    try { await api.certificateRevoke(cert.certificateId); } catch (_e) {}
    cert.revoked = true;
    renderCertificates();
    addNotification(`Certificate ${cert.certificateId} revoked.`);
    toast("Certificate revoked.");
  }

  function openCertificateDetailsModal(cert) {
    const verifyUrl = certVerificationUrl(cert.certificateId);
    openModal(`
      <div class="certificate-modal">
        <div class="certificate-head">
          <h3>Certificate Details</h3>
          <button id="certModalCloseIcon" class="upload-close" aria-label="Close">&times;</button>
        </div>
        <div class="certificate-body">
          <div class="certificate-grid">
            <div><small>Certificate ID</small><strong>${cert.certificateId}</strong></div>
            <div><small>Student Name</small><strong>${cert.studentName}</strong></div>
            <div><small>College Name</small><strong>${cert.collegeName}</strong></div>
            <div><small>Department</small><strong>${cert.department}</strong></div>
            <div><small>Roll Number</small><strong>${cert.rollNumber}</strong></div>
            <div><small>Exam Title</small><strong>${cert.examTitle}</strong></div>
            <div><small>Score</small><strong>${cert.score}</strong></div>
            <div><small>Grade</small><strong>${cert.grade}</strong></div>
            <div><small>Issued Date</small><strong>${fmtDateTime(cert.issuedAt)}</strong></div>
            <div><small>Status</small><strong>${cert.revoked ? "Revoked" : "Issued"}</strong></div>
          </div>
          <div class="certificate-security">
            <h4>Security</h4>
            <div class="security-grid">
              <div class="qr-preview">
                ${certificateQrMarkup(cert)}
              </div>
              <div class="verify-url-wrap">
                <small>Verification URL</small>
                <code id="certVerifyUrlText">${verifyUrl}</code>
                <button id="certCopyLinkBtn" class="btn ghost small">Copy Link</button>
              </div>
            </div>
          </div>
        </div>
        <div class="certificate-actions">
          <button id="certDownloadBtn" class="btn ghost" data-no-buffer="true">Download PDF</button>
          <button id="certVerifyBtn" class="btn ghost" data-no-buffer="true">Verify</button>
          ${cert.revoked ? "" : `<button id="certRevokeBtn" class="btn ghost danger">Revoke</button>`}
          <button id="certCloseBtn" class="btn primary">Close</button>
        </div>
      </div>
    `);
    dom.modalContainer.classList.add("certificate-modal-host");
    document.getElementById("certModalCloseIcon").addEventListener("click", closeModal);
    document.getElementById("certCloseBtn").addEventListener("click", closeModal);
    document.getElementById("certDownloadBtn").addEventListener("click", (e) => downloadCertificate(cert.certificateId, e.currentTarget));
    document.getElementById("certVerifyBtn").addEventListener("click", () => verifyCertificate(cert.certificateId));
    const revokeBtn = document.getElementById("certRevokeBtn");
    if (revokeBtn) revokeBtn.addEventListener("click", async () => { await handleCertificateRevoke(cert); closeModal(); });
    document.getElementById("certCopyLinkBtn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(verifyUrl);
        toast("Verification link copied.");
      } catch (_e) {
        toast("Unable to copy link.", "error");
      }
    });
  }

  function renderCertificates() {
    dom.certificatesBody.innerHTML = state.data.certificates.map((raw, idx) => {
      const c = normalizeCertificate(raw, idx);
      const cid = c.certificateId;
      return `
      <tr>
        <td>${c.certificateId}</td>
        <td>${c.studentName}</td>
        <td>${c.examTitle}</td>
        <td>${c.score}</td>
        <td>${c.grade}</td>
        <td>${fmtDateTime(c.issuedAt)}</td>
        <td>${certificateStatusBadge(c)}</td>
        <td>
          <div class="cert-actions">
            <button class="btn ghost small" data-cert-action="view" data-id="${cid}" data-no-buffer="true">View</button>
            <button class="btn ghost small" data-cert-action="download" data-id="${cid}" data-no-buffer="true">Download</button>
            <div class="cert-more ${state.ui.openCertificateMenuId === cid ? "open" : ""}">
              <button class="btn ghost small cert-more-btn" data-cert-menu-toggle="${cid}" aria-label="More actions">
                <i class="fa-solid fa-ellipsis-vertical"></i>
              </button>
              <div class="cert-more-menu">
                <button data-cert-action="verify" data-id="${cid}" data-no-buffer="true">Verify Certificate</button>
                <button class="destructive" data-cert-action="revoke" data-id="${cid}" ${c.revoked ? "disabled" : ""} data-no-buffer="true">Revoke Certificate</button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
    }).join("") || `<tr><td colspan="8"><div class="no-data">No certificates available.</div></td></tr>`;
  }

  function renderNotifications() {
    dom.notificationList.innerHTML = state.data.notifications.map((n) => `<li>${n.text}</li>`).join("") || "<li>No notifications.</li>";
    dom.notifCount.textContent = String(state.data.notifications.length);
  }

  window.TeacherDashboardBridge = {
    getNotifications() {
      return state.data.notifications.slice();
    },
    setNotifications(items) {
      state.data.notifications = Array.isArray(items) ? items.slice(0, 25) : [];
      renderNotifications();
    },
    clearNotifications() {
      state.data.notifications = [];
      renderNotifications();
    }
  };

  function drawLineChart(canvas, values, color) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    ctx.clearRect(0, 0, cw, ch);
    if (!values.length) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = 20;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--chart-grid");
    for (let i = 0; i < 5; i += 1) {
      const y = pad + ((ch - pad * 2) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(cw - pad, y);
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad + ((cw - pad * 2) * i) / Math.max(1, values.length - 1);
      const y = ch - pad - ((v - min) / Math.max(1, max - min)) * (ch - pad * 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function drawBarChart(canvas, values, color, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    ctx.clearRect(0, 0, cw, ch);
    if (!values?.length || values.every((v) => Number(v || 0) === 0)) {
      if (options.emptyText) {
        ctx.fillStyle = "rgba(100,116,139,.9)";
        ctx.font = "13px DM Sans";
        ctx.textAlign = "center";
        ctx.fillText(options.emptyText, cw / 2, ch / 2);
      }
      return;
    }
    const max = Math.max(1, ...values);
    const pad = 20;
    const bw = (cw - pad * 2) / Math.max(1, values.length) - 8;
    values.forEach((v, i) => {
      const x = pad + i * (bw + 8);
      const hh = ((ch - pad * 2) * v) / max;
      const palette = Array.isArray(color) ? color : null;
      ctx.fillStyle = palette ? (palette[i % palette.length]) : color;
      ctx.fillRect(x, ch - pad - hh, bw, hh);
      if (options.showValues) {
        ctx.fillStyle = "rgba(51,65,85,.9)";
        ctx.font = "11px DM Sans";
        ctx.textAlign = "center";
        ctx.fillText(String(v), x + (bw / 2), ch - pad - hh - 6);
      }
      if (options.labels?.[i]) {
        ctx.fillStyle = "rgba(71,85,105,.9)";
        ctx.font = "10px DM Sans";
        ctx.textAlign = "center";
        ctx.fillText(String(options.labels[i]), x + (bw / 2), ch - 6);
      }
    });
  }

  function drawPieChart(canvas, values, colors, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    ctx.clearRect(0, 0, cw, ch);
    const total = values.reduce((a, b) => a + b, 0) || 1;
    let start = -Math.PI / 2;
    values.forEach((v, i) => {
      const angle = (v / total) * Math.PI * 2;
      const mid = start + (angle / 2);
      ctx.beginPath();
      ctx.moveTo(cw / 2, ch / 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.arc(cw / 2, ch / 2, Math.min(cw, ch) * 0.34, start, start + angle);
      ctx.closePath();
      ctx.fill();
      if (options.showPercentLabels && v > 0) {
        const pct = Math.round((v / total) * 100);
        const rx = (cw / 2) + Math.cos(mid) * (Math.min(cw, ch) * 0.23);
        const ry = (ch / 2) + Math.sin(mid) * (Math.min(cw, ch) * 0.23);
        ctx.fillStyle = "#0f172a";
        ctx.font = "700 12px DM Sans";
        ctx.textAlign = "center";
        ctx.fillText(`${pct}%`, rx, ry);
      }
      start += angle;
    });
  }

  function drawStackedBarChart(canvas, values, colors, labels = []) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    ctx.clearRect(0, 0, cw, ch);
    const rawTotal = values.reduce((n, v) => n + Number(v || 0), 0);
    const total = Math.max(1, rawTotal);
    if (!rawTotal) {
      ctx.fillStyle = "rgba(100,116,139,.9)";
      ctx.font = "13px DM Sans";
      ctx.textAlign = "center";
      ctx.fillText("No difficulty data available", cw / 2, ch / 2);
      return;
    }
    const x = 28;
    const y = Math.round(ch * 0.42);
    const w = cw - 56;
    const h = 28;
    let offset = x;
    values.forEach((val, i) => {
      const segW = Math.round((Number(val || 0) / total) * w);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(offset, y, segW, h);
      offset += segW;
    });
    ctx.strokeStyle = "rgba(148,163,184,.45)";
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "rgba(71,85,105,.9)";
    ctx.font = "12px DM Sans";
    labels.forEach((label, i) => {
      const ly = y + h + 22 + (i * 16);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, ly - 9, 9, 9);
      ctx.fillStyle = "rgba(71,85,105,.9)";
      ctx.fillText(`${label}: ${values[i] || 0}`, x + 14, ly);
    });
  }

  function setLegend(container, items) {
    if (!container) return;
    container.innerHTML = items.map((it) => `<span style="--legend:${it.color};"><i style="background:${it.color}"></i>${it.label}</span>`).join("");
    container.querySelectorAll("span").forEach((s) => {
      const i = s.querySelector("i");
      if (i) {
        i.style.display = "inline-block";
        i.style.width = "10px";
        i.style.height = "10px";
        i.style.borderRadius = "50%";
        i.style.marginRight = "6px";
      }
    });
  }

  function attachCanvasTooltip(canvas, points) {
    if (!canvas || !dom.chartTooltip) return;
    canvas.onmousemove = (ev) => {
      if (!points?.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const idx = Math.max(0, Math.min(points.length - 1, Math.round((x / rect.width) * (points.length - 1))));
      dom.chartTooltip.textContent = points[idx];
      dom.chartTooltip.style.left = `${ev.clientX + 12}px`;
      dom.chartTooltip.style.top = `${ev.clientY + 12}px`;
      dom.chartTooltip.classList.remove("hidden");
    };
    canvas.onmouseleave = () => dom.chartTooltip.classList.add("hidden");
  }

  function drawAllCharts() {
    const dashAttempts = getDashboardAttempts();
    const percentages = dashAttempts.map((a) => a.percentage);
    drawLineChart(dom.performanceTrendChart, percentages.slice(0, 12), "rgba(59,130,246,0.95)");
    const countByExam = state.data.exams.map((e) => dashAttempts.filter((a) => a.examId === e.id).length);
    drawBarChart(dom.attemptsChart, countByExam, "rgba(16,185,129,0.85)");
    const pass = dashAttempts.filter((a) => a.percentage >= 40).length;
    const fail = dashAttempts.length - pass;
    drawPieChart(dom.passFailChart, [pass, fail], ["rgba(16,185,129,0.85)", "rgba(236,72,153,0.85)"]);
    const diff = state.data.questions.reduce((acc, q) => { acc[q.difficulty] = (acc[q.difficulty] || 0) + 1; return acc; }, {});
    drawBarChart(dom.difficultyChart, [diff.Easy || 0, diff.Medium || 0, diff.Hard || 0], "rgba(139,92,246,0.85)");
    drawLineChart(dom.aiAccuracyChart, [70, 74, 78, 80, 82, 84], "rgba(16,185,129,0.95)");
    setLegend(dom.legendPerformance, [{ label: "Avg Performance", color: "#3b82f6" }]);
    setLegend(dom.legendAttempts, [{ label: "Attempts", color: "#10b981" }]);
    setLegend(dom.legendPassFail, [{ label: "Pass", color: "#10b981" }, { label: "Fail", color: "#ec4899" }]);
    setLegend(dom.legendDifficulty, [{ label: "Easy", color: "#60a5fa" }, { label: "Medium", color: "#8b5cf6" }, { label: "Hard", color: "#f59e0b" }]);
    attachCanvasTooltip(dom.performanceTrendChart, percentages.slice(0, 12).map((v, i) => `Point ${i + 1}: ${v}%`));
    attachCanvasTooltip(dom.attemptsChart, state.data.exams.map((e) => `${e.title}: ${attemptsForExam(e).length}`));
    attachCanvasTooltip(dom.passFailChart, [`Pass: ${pass}`, `Fail: ${fail}`]);
    attachCanvasTooltip(dom.difficultyChart, [`Easy: ${diff.Easy || 0}`, `Medium: ${diff.Medium || 0}`, `Hard: ${diff.Hard || 0}`]);
  }

  async function withLoading(fn) {
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      toast(e.message || "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleExamAction(action, examId) {
    const exam = examById(examId);
    if (!exam) return;
    if (exam.status === "Published" && (action === "upload" || action === "edit")) {
      toast(`${action === "upload" ? "Upload" : "Edit"} is blocked after exam is published.`, "error");
      return;
    }
    if (exam.status !== "Published" && (action === "results" || action === "share")) {
      toast(`${action === "results" ? "Results" : "Share"} is available only after exam is published.`, "error");
      return;
    }
    const downloadUploadedQuestionFile = () => {
      if (!exam.questionUpload?.dataUrl) {
        toast("No uploaded question file found for this exam.", "error");
        return false;
      }
      const a = document.createElement("a");
      a.href = exam.questionUpload.dataUrl;
      a.download = exam.questionUpload.name || `${exam.examCode}-questions`;
      a.click();
      toast("Uploaded question file downloaded.");
      return true;
    };
    if (action === "view") {
      openModal(`<h3>${exam.title}</h3><p>${exam.description}</p><p><strong>Code:</strong> ${exam.examCode}</p><p><strong>Status:</strong> ${exam.status}</p><div class="actions"><button class="btn ghost" id="closeModalBtn">Close</button></div>`);
      document.getElementById("closeModalBtn").addEventListener("click", closeModal);
      return;
    }
    if (action === "edit") {
      openExamFormModal(exam);
      return;
    }
    if (action === "publish") {
      if (!exam.questionsUploaded) {
        toast("Publish blocked: upload questions first.", "error");
        return;
      }
      await withLoading(async () => {
        await api.publishExam(exam.examCode || exam.id);
        exam.status = "Published";
        renderAll();
        addNotification(`Exam ${exam.examCode} published.`);
        toast("Exam published.");
      });
      return;
    }
    if (action === "delete") {
      const ok = await confirmTextDialog({
        title: "Delete Exam",
        message: `This permanently deletes ${exam.title}. Type DELETE ${exam.examCode} to confirm.`,
        expectedText: `DELETE ${exam.examCode}`,
        actionLabel: "Delete"
      });
      if (!ok) return;
      await withLoading(async () => {
        await api.deleteExam(exam.examCode || exam.id);
        state.data.exams = state.data.exams.filter((e) => e.id !== exam.id);
        state.data.questions = state.data.questions.filter((q) => q.examId !== exam.id);
        state.data.attempts = state.data.attempts.filter((a) => a.examId !== exam.id);
        state.data.certificates = state.data.certificates.filter((c) => c.examId !== exam.id);
        renderAll();
        addNotification(`Exam ${exam.examCode} deleted.`);
      });
      return;
    }
    if (action === "upload") {
      openQuestionUploadModal(exam.id);
      return;
    }
    if (action === "questions") {
      openQuestionsPreviewModal(exam.id);
      return;
    }
    if (action === "analytics") {
      showSection("analytics");
      addNotification(`Opened analytics for ${exam.examCode}.`);
      return;
    }
    if (action === "attempts") {
      showSection("attempts");
      dom.attemptExamFilter.value = exam.examCode || "all";
      renderAttempts();
      return;
    }
    if (action === "duplicate") {
      const dupe = { ...exam, id: uid("e"), examCode: `${exam.examCode}-COPY`, status: "Draft", createdDate: new Date().toISOString(), active: false };
      state.data.exams.unshift(dupe);
      toast("Exam duplicated.");
      renderAll();
      return;
    }
    if (action === "results") {
      showSection("attempts");
      dom.attemptExamFilter.value = exam.examCode || "all";
      renderAttempts();
      toast(`Viewing results for ${exam.examCode}.`);
      return;
    }
    if (action === "downloadq") {
      if (downloadUploadedQuestionFile()) return;
      const qRows = state.data.questions.filter((q) => q.examId === exam.id);
      if (!qRows.length) {
        toast("No questions found to download.", "error");
        return;
      }
      const csv = [["Question Text", "Type", "Marks", "Difficulty", "Topic"], ...qRows.map((q) => [q.text, q.type, q.marks, q.difficulty, q.topic])]
        .map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${exam.examCode}-questions.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Questions CSV downloaded.");
      return;
    }
    if (action === "share") {
      if (isExamEnded(exam)) {
        toast("Share is blocked because exam end date/time is completed.", "error");
        return;
      }
      const link = `${window.location.origin}/exam/${exam.id}`;
      try { await navigator.clipboard.writeText(link); } catch (_e) {}
      toast("Share link copied.");
      addNotification(`Exam share link created for ${exam.examCode}.`);
    }
  }

  function renderAll() {
    renderStats();
    renderDashboardFeeds();
    renderExams();
    renderAttempts();
    renderAnalytics();
    renderLeaderboard();
    renderProctoring();
    renderAiInsights();
    renderCertificates();
    renderNotifications();
    drawAllCharts();
  }

  function bindEvents() {
    const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!shouldBufferButton(btn)) return;
      if (btn.dataset.bufferReady === "1") {
        btn.dataset.bufferReady = "";
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      const busyText = inferBusyText(btn);
      const restore = startButtonBuffer(btn, busyText);
      setTimeout(() => {
        restore();
        if (!document.body.contains(btn)) return;
        btn.dataset.bufferReady = "1";
        btn.click();
      }, 280);
    }, true);

    document.addEventListener("click", async (e) => {
      const menuToggle = e.target.closest("[data-exam-menu-toggle]");
      if (menuToggle) {
        const id = idKey(menuToggle.dataset.examMenuToggle);
        if (idKey(state.ui.openExamMenuId) === id) {
          closeExamMoreMenu();
        } else {
          openExamMoreMenu(menuToggle, id);
        }
        return;
      }
      if (!e.target.closest(".exam-more") && !e.target.closest(".exam-more-portal") && state.ui.openExamMenuId) {
        closeExamMoreMenu();
      }
      if (!e.target.closest(".cert-more") && state.ui.openCertificateMenuId) {
        state.ui.openCertificateMenuId = null;
        renderCertificates();
      }
      if (!e.target.closest(".attempt-more") && state.ui.attempts.openMenuId) {
        state.ui.attempts.openMenuId = null;
        renderAttempts();
      }

      const nav = e.target.closest(".nav-link");
      if (nav) return showSection(nav.dataset.section);

      const jump = e.target.closest("[data-section-jump]");
      if (jump) return showSection(jump.dataset.sectionJump);

      const examBtn = e.target.closest("[data-exam-action]");
      if (examBtn) {
        closeExamMoreMenu();
        return handleExamAction(examBtn.dataset.examAction, examBtn.dataset.id);
      }

      const examCheck = e.target.closest("[data-exam-check]");
      if (examCheck) {
        const id = examCheck.dataset.examCheck;
        if (examCheck.checked) state.ui.selectedExams.add(id); else state.ui.selectedExams.delete(id);
        renderExams();
        return;
      }

      const attemptBtn = e.target.closest("[data-attempt-action]");
      if (attemptBtn) {
        const id = attemptBtn.dataset.id;
        const item = state.data.attempts.find((a) => a.id === id);
        if (!item) return;
        state.ui.attempts.openMenuId = null;
        if (attemptBtn.dataset.attemptAction === "warn") {
          addNotification(`Warning sent to ${item.studentName}.`);
          toast("Warning sent.");
          renderAttempts();
          return;
        }
        if (attemptBtn.dataset.attemptAction === "evidence") {
          openEvidenceModal(item);
          return;
        }
        if (attemptBtn.dataset.attemptAction === "cancel") {
          if (String(item.status).toUpperCase() === "CANCELLED") {
            toast("Attempt already cancelled.", "error");
            return;
          }
          const ok = await confirmTextDialog({
            title: "Cancel Attempt",
            message: `This will invalidate ${item.studentName}'s attempt. Type CANCEL to continue.`,
            expectedText: "CANCEL",
            actionLabel: "Cancel Attempt"
          });
          if (!ok) return;
          try {
            await api.cancelAttempt(item.id);
            item.status = "CANCELLED";
          } catch (_e) {
            toast("Failed to cancel attempt.", "error");
            return;
          }
          addNotification(`Attempt invalidated for ${item.studentName}.`);
          toast("Attempt cancelled.");
          renderAttempts();
          renderProctoring();
          return;
        }
        if (attemptBtn.dataset.attemptAction === "force-submit") {
          try {
            await api.forceSubmitAttempt(item.id);
            item.status = "AUTO_SUBMITTED";
            toast("Attempt force submitted.");
            addNotification(`Attempt force submitted for ${item.studentName}.`);
          } catch (_e) {
            toast("Force submit failed.", "error");
          }
          renderAttempts();
          return;
        }
        if (attemptBtn.dataset.attemptAction === "view-result") {
          try {
            const result = await api.attemptResult(item.id);
            openModal(`
              <h3>Attempt Result</h3>
              <p><strong>Student:</strong> ${item.studentName}</p>
              <p><strong>Exam:</strong> ${item.examTitle || examTitle(item.examId)}</p>
              <p><strong>Score:</strong> ${result?.score ?? item.score}</p>
              <p><strong>Percentage:</strong> ${result?.percentage ?? item.percentage}%</p>
              <p><strong>Status:</strong> ${result?.status || item.status}</p>
              <div class="actions"><button id="attemptResultClose" class="btn ghost">Close</button></div>
            `);
            document.getElementById("attemptResultClose").addEventListener("click", closeModal);
          } catch (_e) {
            toast("Unable to load attempt result.", "error");
          }
          return;
        }
        if (attemptBtn.dataset.attemptAction === "resume") {
          try {
            await api.resumeAttempt(item.id);
            item.status = "STARTED";
            toast("Attempt resumed.");
          } catch (_e) {
            toast("Resume attempt failed.", "error");
          }
          renderAttempts();
          return;
        }
        if (attemptBtn.dataset.attemptAction === "analytics") {
          showSection("analytics");
          toast("Opened analytics for selected attempt.");
          return;
        }
      }

      const attemptMenuToggle = e.target.closest("[data-attempt-menu-toggle]");
      if (attemptMenuToggle) {
        const id = attemptMenuToggle.dataset.attemptMenuToggle;
        state.ui.attempts.openMenuId = state.ui.attempts.openMenuId === id ? null : id;
        renderAttempts();
        return;
      }

      const certBtn = e.target.closest("[data-cert-action]");
      if (certBtn) {
        const cert = state.data.certificates.find((c) => String(c.certificateId || c.id) === String(certBtn.dataset.id));
        if (!cert) return;
        state.ui.openCertificateMenuId = null;
        if (certBtn.dataset.certAction === "view") {
          openCertificateDetailsModal(normalizeCertificate(cert));
          return;
        }
        if (certBtn.dataset.certAction === "download") {
          await downloadCertificate(String(cert.certificateId || cert.id), certBtn);
          return;
        }
        if (certBtn.dataset.certAction === "verify") {
          await verifyCertificate(String(cert.certificateId || cert.id));
          return;
        }
        if (certBtn.dataset.certAction === "revoke") {
          await handleCertificateRevoke(cert);
          renderCertificates();
          return;
        }
      }

      const certMenuToggle = e.target.closest("[data-cert-menu-toggle]");
      if (certMenuToggle) {
        const id = certMenuToggle.dataset.certMenuToggle;
        state.ui.openCertificateMenuId = state.ui.openCertificateMenuId === id ? null : id;
        renderCertificates();
        return;
      }

      const proctorMore = e.target.closest("[data-proctor-more]");
      if (proctorMore) {
        const att = state.data.attempts.find((a) => a.id === proctorMore.dataset.proctorMore);
        if (!att) return;
        openModal(`
          <h3>Action Menu</h3>
          <p>${att.studentName} • ${examTitle(att.examId)}</p>
          <div class="actions" style="justify-content:flex-start;flex-wrap:wrap">
            <button class="btn ghost" id="pmWarn">Warn Student</button>
            <button class="btn ghost" id="pmCancel">Cancel Attempt</button>
            <button class="btn ghost" id="pmEvidence">View Evidence</button>
            <button class="btn ghost" id="pmClose">Close</button>
          </div>
        `);
        document.getElementById("pmWarn").addEventListener("click", () => { addNotification(`Warning sent to ${att.studentName}.`); closeModal(); });
        document.getElementById("pmCancel").addEventListener("click", () => { att.status = "INVALIDATED"; closeModal(); renderAll(); });
        document.getElementById("pmEvidence").addEventListener("click", () => { closeModal(); toast("Evidence opened."); });
        document.getElementById("pmClose").addEventListener("click", closeModal);
      }

      const pageBtn = e.target.closest("[data-page-action]");
      if (pageBtn) {
        const [key, dir] = pageBtn.dataset.pageAction.split("-");
        state.ui.pagination[key].page += dir === "next" ? 1 : -1;
        if (key === "exams") renderExams();
        if (key === "attempts") renderAttempts();
      }
    });

    on(dom.modalContainer, "click", (e) => {
      if (e.target === dom.modalContainer) closeModal();
    });
    window.addEventListener("resize", closeExamMoreMenu);
    window.addEventListener("scroll", closeExamMoreMenu, true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !dom.modalContainer.classList.contains("hidden")) closeModal();
      if (e.key === "Escape" && state.ui.openExamMenuId) closeExamMoreMenu();
    });

    on(dom.sidebarToggle, "click", () => {
      if (window.innerWidth <= 900) dom.sidebar.classList.toggle("open");
      else dom.sidebar.classList.toggle("collapsed");
    });
    on(dom.themeToggle, "click", toggleTheme);
    on(dom.notifBtn, "click", () => {
      state.ui.notificationsOpen = !state.ui.notificationsOpen;
      dom.notificationPanel.classList.toggle("open", state.ui.notificationsOpen);
    });
    on(dom.clearNotifications, "click", () => {
      if (window.TeacherNotificationHub?.clear) {
        window.TeacherNotificationHub.clear()?.catch?.(() => {});
        return;
      }
      state.data.notifications = [];
      renderNotifications();
    });
    on(dom.markAllNotificationsRead, "click", () => {
      if (window.TeacherNotificationHub?.markAllRead) {
        window.TeacherNotificationHub.markAllRead()?.catch?.(() => {});
        return;
      }
      renderNotifications();
    });
    on(dom.profileMenuBtn, "click", () => {
      state.ui.profileMenuOpen = !state.ui.profileMenuOpen;
      dom.profileMenu.classList.toggle("open", state.ui.profileMenuOpen);
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".profile-dd")) {
        state.ui.profileMenuOpen = false;
        dom.profileMenu.classList.remove("open");
      }
    });

    on(dom.globalSearch, "input", () => {
      state.ui.globalSearch = dom.globalSearch.value;
      renderExams();
      renderAttempts();
      renderProctoring();
    });
    on(dom.dashAutoRefresh, "change", () => {
      state.settings.autoRefresh = dom.dashAutoRefresh.checked;
      toast(`Auto refresh ${state.settings.autoRefresh ? "enabled" : "disabled"}.`);
      renderSettings();
    });
    on(dom.dashDateRange, "change", () => {
      state.ui.dashDateRange = dom.dashDateRange.value;
      const custom = state.ui.dashDateRange === "custom";
      dom.dashStartDate.classList.toggle("hidden", !custom);
      dom.dashEndDate.classList.toggle("hidden", !custom);
      pulseDashboardSkeleton();
      renderStats();
      renderDashboardFeeds();
      drawAllCharts();
    });
    [dom.dashStartDate, dom.dashEndDate].forEach((el) => on(el, "change", () => {
      if (dom.dashDateRange.value === "custom") {
        renderStats();
        renderDashboardFeeds();
        drawAllCharts();
      }
    }));
    on(dom.exportDashboardBtn, "click", () => {
      const attempts = getDashboardAttempts();
      const csv = [["Metric", "Value"], ["Total Exams", state.data.exams.length], ["Total Attempts", attempts.length], ["Average Score", attempts.length ? Math.round(attempts.reduce((n, a) => n + a.percentage, 0) / attempts.length) : 0]]
        .map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `dashboard-report-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Dashboard report exported.");
    });
    on(dom.examSearch, "input", () => { state.ui.pagination.exams.page = 1; renderExams(); });
    on(dom.examStatusFilter, "change", () => {
      state.ui.examTab = dom.examStatusFilter.value;
      state.ui.pagination.exams.page = 1;
      document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.examTab === state.ui.examTab));
      renderExams();
    });
    on(dom.attemptStatusFilter, "change", () => { state.ui.pagination.attempts.page = 1; renderAttempts(); });
    on(dom.attemptRiskFilter, "change", () => { state.ui.pagination.attempts.page = 1; renderAttempts(); });
    on(dom.attemptExamFilter, "change", () => { state.ui.pagination.attempts.page = 1; renderAttempts(); });
    let attemptSearchTimer = null;
    on(dom.attemptSearchInput, "input", () => {
      clearTimeout(attemptSearchTimer);
      attemptSearchTimer = setTimeout(() => {
        state.ui.attempts.search = dom.attemptSearchInput.value || "";
        state.ui.pagination.attempts.page = 1;
        renderAttempts();
      }, 220);
    });
    on(dom.attemptResetFilters, "click", () => {
      if (dom.attemptExamFilter) dom.attemptExamFilter.value = "all";
      if (dom.attemptStatusFilter) dom.attemptStatusFilter.value = "all";
      if (dom.attemptRiskFilter) dom.attemptRiskFilter.value = "all";
      if (dom.attemptSearchInput) dom.attemptSearchInput.value = "";
      state.ui.attempts.search = "";
      state.ui.attempts.sortKey = "attemptDate";
      state.ui.attempts.sortDir = "desc";
      state.ui.pagination.attempts.page = 1;
      renderAttempts();
    });
    on(dom.attemptSortScore, "click", () => {
      if (state.ui.attempts.sortKey === "score") state.ui.attempts.sortDir = state.ui.attempts.sortDir === "asc" ? "desc" : "asc";
      else { state.ui.attempts.sortKey = "score"; state.ui.attempts.sortDir = "desc"; }
      renderAttempts();
    });
    on(dom.attemptSortPercentage, "click", () => {
      if (state.ui.attempts.sortKey === "percentage") state.ui.attempts.sortDir = state.ui.attempts.sortDir === "asc" ? "desc" : "asc";
      else { state.ui.attempts.sortKey = "percentage"; state.ui.attempts.sortDir = "desc"; }
      renderAttempts();
    });
    const scheduleAnalyticsReload = (force = false) => {
      clearTimeout(state.ui.analytics.debounceTimer);
      state.ui.analytics.debounceTimer = setTimeout(() => { loadAnalyticsData(force); }, force ? 20 : 220);
    };
    on(dom.analyticsExamFilter, "change", () => {
      state.ui.analytics.examCode = dom.analyticsExamFilter.value || "";
      scheduleAnalyticsReload(false);
    });
    on(dom.analyticsDateFrom, "change", () => {
      state.ui.analytics.dateFrom = dom.analyticsDateFrom.value || "";
      scheduleAnalyticsReload(false);
    });
    on(dom.analyticsDateTo, "change", () => {
      state.ui.analytics.dateTo = dom.analyticsDateTo.value || "";
      scheduleAnalyticsReload(false);
    });
    on(dom.analyticsRefreshBtn, "click", async () => {
      await loadAnalyticsData(true);
      toast("Analytics refreshed.");
    });
    on(dom.analyticsRetryBtn, "click", async () => {
      await loadAnalyticsData(true);
    });
    on(dom.analyticsExportCsvBtn, "click", exportAnalyticsCsv);
    on(dom.analyticsExportPdfBtn, "click", exportAnalyticsPdf);
    const scheduleAiReload = (force = false) => {
      clearTimeout(state.ui.aiInsights.debounceTimer);
      state.ui.aiInsights.debounceTimer = setTimeout(() => { loadAiInsightsData(force); }, force ? 20 : 220);
    };
    on(dom.aiStudentFilter, "change", () => {
      state.ui.aiInsights.studentId = dom.aiStudentFilter.value || "";
      scheduleAiReload(false);
    });
    on(dom.aiExamFilter, "change", () => {
      state.ui.aiInsights.examCode = dom.aiExamFilter.value || "all";
      scheduleAiReload(false);
    });
    on(dom.aiRefreshBtn, "click", async () => {
      await loadAiInsightsData(true);
      toast("AI insights refreshed.");
    });
    on(dom.aiRetryBtn, "click", async () => {
      await loadAiInsightsData(true);
    });
    on(dom.leaderboardModeExam, "click", async () => {
      state.ui.leaderboard.mode = "exam";
      if (dom.leaderboardExamFilter) dom.leaderboardExamFilter.disabled = false;
      renderLeaderboard();
      await loadLeaderboardData();
    });
    on(dom.leaderboardModeGlobal, "click", async () => {
      state.ui.leaderboard.mode = "global";
      if (dom.leaderboardExamFilter) dom.leaderboardExamFilter.disabled = true;
      renderLeaderboard();
      await loadLeaderboardData();
    });
    on(dom.leaderboardExamFilter, "change", async () => {
      state.ui.leaderboard.examCode = dom.leaderboardExamFilter.value;
      await loadLeaderboardData();
    });
    on(dom.leaderboardStudentSearch, "input", () => {
      state.ui.leaderboard.search = dom.leaderboardStudentSearch.value;
      renderLeaderboard();
    });
    on(dom.leaderboardScoreSort, "click", () => {
      state.ui.leaderboard.sortDir = state.ui.leaderboard.sortDir === "asc" ? "desc" : "asc";
      renderLeaderboard();
    });
    [dom.examSubjectFilter, dom.examDurationFilter, dom.examDateFrom, dom.examDateTo, dom.examCreatedByFilter, dom.examActiveFilter]
      .forEach((el) => on(el, "change", () => { state.ui.pagination.exams.page = 1; renderExams(); }));
    on(dom.openExamModalBtn, "click", () => openExamFormModal());
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.ui.examTab = btn.dataset.examTab;
        dom.examStatusFilter.value = state.ui.examTab;
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
        state.ui.pagination.exams.page = 1;
        renderExams();
      });
    });

    on(dom.exportExamsBtn, "click", () => {
      const tableRows = filteredExams();
      const headers = ["Exam Title", "Exam Code", "Created By", "Duration", "Total Questions", "Passing Marks", "Attempts Count", "Start Time", "End Time", "Created Date", "Status"];
      const rows = tableRows.map((e) => [
        e.title,
        e.examCode,
        e.createdBy || state.teacher.name,
        `${e.duration} min`,
        questionCount(e.id),
        e.passingMarks,
        attemptsForExam(e).length,
        fmtDateTime(e.startTime),
        fmtDateTime(e.endTime),
        fmtDateTime(e.createdDate || e.startTime),
        e.status,
      ]);
      const csv = [headers, ...rows].map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "exam-management-table.csv";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("CSV exported.");
    });
    on(dom.selectAllExams, "change", () => {
      state.ui.selectedExams.clear();
      if (dom.selectAllExams.checked) filteredExams().forEach((e) => state.ui.selectedExams.add(e.id));
      renderExams();
    });
    on(dom.headExamCheck, "change", () => {
      state.ui.selectedExams.clear();
      if (dom.headExamCheck.checked) filteredExams().forEach((e) => state.ui.selectedExams.add(e.id));
      renderExams();
    });
    on(dom.bulkPublishBtn, "click", () => {
      state.data.exams.forEach((e) => {
        if (state.ui.selectedExams.has(e.id) && e.questionsUploaded) {
          e.status = "Published";
        }
      });
      toast("Bulk publish completed.");
      renderAll();
    });
    on(dom.bulkDeleteBtn, "click", async () => {
      if (state.ui.selectedExams.size === 0) return;
      const ok = await confirmTextDialog({ title: "Bulk Delete", message: "Type BULK DELETE to remove selected exams.", expectedText: "BULK DELETE", actionLabel: "Delete" });
      if (!ok) return;
      state.data.exams = state.data.exams.filter((e) => !state.ui.selectedExams.has(e.id));
      state.data.questions = state.data.questions.filter((q) => !state.ui.selectedExams.has(q.examId));
      state.ui.selectedExams.clear();
      renderAll();
      toast("Selected exams deleted.");
    });
    on(dom.bulkExportBtn, "click", () => {
      const selectedRows = state.data.exams.filter((e) => state.ui.selectedExams.has(e.id));
      if (!selectedRows.length) return;
      const csv = [["Exam Title", "Exam Code", "Status"], ...selectedRows.map((e) => [e.title, e.examCode, e.status])]
        .map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "bulk-selected-exams.csv";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Selected exams exported.");
    });
    on(dom.examPageSize, "change", () => {
      state.ui.pagination.exams.perPage = Number(dom.examPageSize.value);
      state.ui.pagination.exams.page = 1;
      renderExams();
    });
    on(dom.examJumpBtn, "click", () => {
      const target = Number(dom.examJumpPage.value || 1);
      state.ui.pagination.exams.page = Math.max(1, target);
      renderExams();
    });
    on(dom.viewLiveMonitor, "click", () => { showSection("proctoring"); });
    on(dom.investigateAlertsBtn, "click", () => { showSection("proctoring"); toast("Investigate high-risk alerts in Proctoring."); });
    document.querySelectorAll(".collapse-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".collapsible");
        if (!card) return;
        card.classList.toggle("collapsed");
        btn.textContent = card.classList.contains("collapsed") ? "Expand" : "Collapse";
      });
    });

    on(dom.refreshDashboard, "click", async () => {
      await withLoading(async () => {
        pulseDashboardSkeleton();
        await api.ping();
        renderApiStatusPill();
        await loadDashboardSummary();
        await loadExamsData();
        await loadAttemptsData();
        await loadAnalyticsData();
        await loadAiInsightsData(true);
        await loadCertificatesData();
        addNotification(`Dashboard refreshed (${state.api.online ? "API live" : "mock mode"}).`);
        renderAll();
      });
    });

    on(dom.profileEditBtn, "click", () => {
      state.ui.profile.snapshot = { ...state.teacher };
      setProfileEditMode(true);
    });
    on(dom.profileCancelBtn, "click", () => {
      state.teacher = normalizeTeacher(state.ui.profile.snapshot || state.teacher);
      populateTeacher();
      setProfileEditMode(false);
    });
    on(dom.profileForm, "submit", async (e) => {
      e.preventDefault();
      if (!state.ui.profile.editing) return;
      const payload = collectProfilePayload();
      const restore = startButtonBuffer(dom.profileSaveBtn, "Saving profile...");
      if (dom.profileForm) dom.profileForm.querySelectorAll("input,button").forEach((el) => { el.disabled = true; });
      try {
        const updated = await api.userUpdate(payload);
        state.teacher = normalizeTeacher({ ...state.teacher, ...payload, ...(updated || {}), updatedAt: new Date().toISOString() });
        state.ui.profile.snapshot = { ...state.teacher };
        populateTeacher();
        setProfileEditMode(false);
        await loadProfileData();
        toast("Profile updated successfully.");
      } catch (_e) {
        toast("Failed to update profile.", "error");
        if (dom.pfName && !dom.pfName.value.trim()) dom.pfName.classList.add("field-error");
      } finally {
        if (dom.profileForm) dom.profileForm.querySelectorAll("input,button").forEach((el) => { el.disabled = false; });
        setProfileEditMode(state.ui.profile.editing);
        restore();
      }
    });
    on(dom.pfName, "input", () => dom.pfName.classList.remove("field-error"));
    on(dom.pfUploadImageBtn, "click", () => {
      if (!state.ui.profile.editing) return;
      dom.pfImageFile?.click();
    });
    on(dom.pfImageFile, "change", async () => {
      const file = dom.pfImageFile?.files?.[0];
      if (!file) return;
      try {
        const localPreview = await readFileAsDataUrl(file);
        if (dom.pfAvatarPreview) dom.pfAvatarPreview.src = localPreview;
        if (dom.pfImage) dom.pfImage.value = localPreview;
      } catch (_e) {}
      try {
        const uploaded = await api.userUploadImage(file);
        const url = String(uploaded?.profileImage || uploaded?.url || uploaded?.imageUrl || "").trim();
        if (url) {
          state.teacher.profileImage = url;
          if (dom.pfImage) dom.pfImage.value = url;
          populateTeacher();
          toast("Profile image updated.");
        } else {
          toast("Image uploaded, but no preview URL returned.", "error");
        }
      } catch (_e) {
        const fallback = state.teacher.profileImage || profileInitialAvatar(state.teacher.name);
        if (dom.pfAvatarPreview) dom.pfAvatarPreview.src = fallback;
        if (dom.pfImage) dom.pfImage.value = fallback;
        toast("Image upload failed.", "error");
      } finally {
        if (dom.pfImageFile) dom.pfImageFile.value = "";
      }
    });
    on(dom.pfRemoveImageBtn, "click", () => {
      if (!state.ui.profile.editing) return;
      const fallback = profileInitialAvatar(state.teacher.name);
      if (dom.pfAvatarPreview) dom.pfAvatarPreview.src = fallback;
      if (dom.pfImage) dom.pfImage.value = fallback;
      state.teacher.profileImage = fallback;
    });
    on(dom.changePasswordBtn, "click", () => {
      openModal(`
        <h3>Change Password</h3>
        <p>Enter your current password and set a new password.</p>
        <input id="pwCurrent" class="form-control-like" placeholder="Current Password" type="password">
        <small id="pwCurrentErr" class="form-error hidden"></small>
        <input id="pwNew" class="form-control-like" style="margin-top:8px" placeholder="New Password" type="password">
        <small id="pwNewErr" class="form-error hidden"></small>
        <input id="pwConfirm" class="form-control-like" style="margin-top:8px" placeholder="Confirm Password" type="password">
        <small id="pwConfirmErr" class="form-error hidden"></small>
        <div class="actions"><button id="pwCancel" class="btn ghost">Cancel</button><button id="pwSave" class="btn primary">Update Password</button></div>
      `);
      document.getElementById("pwCancel").addEventListener("click", closeModal);
      document.getElementById("pwSave").addEventListener("click", async () => {
        const current = document.getElementById("pwCurrent");
        const next = document.getElementById("pwNew");
        const confirm = document.getElementById("pwConfirm");
        const currentErr = document.getElementById("pwCurrentErr");
        const nextErr = document.getElementById("pwNewErr");
        const confirmErr = document.getElementById("pwConfirmErr");
        [currentErr, nextErr, confirmErr].forEach((el) => { el.classList.add("hidden"); el.textContent = ""; });
        let invalid = false;
        if (!current.value.trim()) { currentErr.textContent = "Current password is required."; currentErr.classList.remove("hidden"); invalid = true; }
        if (String(next.value || "").length < 8) { nextErr.textContent = "New password must be at least 8 characters."; nextErr.classList.remove("hidden"); invalid = true; }
        if (next.value !== confirm.value) { confirmErr.textContent = "Passwords do not match."; confirmErr.classList.remove("hidden"); invalid = true; }
        if (invalid) return;
        const restore = startButtonBuffer(document.getElementById("pwSave"), "Updating...");
        try {
          await api.userChangePassword({
            currentPassword: current.value,
            newPassword: next.value,
            confirmPassword: confirm.value
          });
          closeModal();
          toast("Password changed successfully.");
        } catch (_e) {
          toast("Failed to change password.", "error");
        } finally {
          restore();
        }
      });
    });

    const syncSettingsFromInputs = () => {
      state.settings.notifications = !!dom.stNotif?.checked;
      state.settings.autoRefresh = !!dom.stAutoRefresh?.checked;
      state.settings.alerts = !!dom.stAlerts?.checked;
      renderSettings();
    };
    [dom.stNotif, dom.stAutoRefresh, dom.stAlerts].forEach((el) => on(el, "change", syncSettingsFromInputs));
    on(dom.stSave, "click", async () => {
      if (!state.ui.settings.dirty || state.ui.settings.saving) return;
      const snapshot = state.ui.settings.baseline || {
        notifications: state.settings.notifications,
        autoRefresh: state.settings.autoRefresh,
        alerts: state.settings.alerts
      };
      state.ui.settings.saving = true;
      [dom.stNotif, dom.stAutoRefresh, dom.stAlerts, dom.stSessionReset, dom.stApiTest, dom.stSave].forEach((el) => {
        if (el) el.disabled = true;
      });
      const restore = startButtonBuffer(dom.stSave, "Saving settings...");
      try {
        const payload = settingsPayload();
        const res = await api.settingsUpdate(payload);
        const normalized = normalizeSettings({ ...payload, ...(res || {}) });
        state.settings = { ...state.settings, ...normalized };
        state.ui.settings.baseline = {
          notifications: state.settings.notifications,
          autoRefresh: state.settings.autoRefresh,
          alerts: state.settings.alerts
        };
        renderSettings();
        toast("Settings saved successfully.");
      } catch (_e) {
        state.settings = { ...state.settings, ...snapshot };
        renderSettings();
        toast("Failed to save settings.", "error");
      } finally {
        state.ui.settings.saving = false;
        [dom.stNotif, dom.stAutoRefresh, dom.stAlerts, dom.stSessionReset, dom.stApiTest].forEach((el) => {
          if (el) el.disabled = false;
        });
        renderSettings();
        restore();
      }
    });
    on(dom.stSessionReset, "click", async () => {
      const ok = await confirmTextDialog({
        title: "Reset Sessions",
        message: "This will invalidate active sessions. Type RESET to continue.",
        expectedText: "RESET",
        actionLabel: "Reset Sessions"
      });
      if (!ok) return;
      const restore = startButtonBuffer(dom.stSessionReset, "Resetting sessions...");
      try {
        await api.settingsResetSessions();
        toast("Active sessions reset successfully.");
      } catch (_e) {
        toast("Failed to reset sessions.", "error");
      } finally {
        restore();
      }
    });
    on(dom.stApiTest, "click", async () => {
      const restore = startButtonBuffer(dom.stApiTest, "Testing...");
      try {
        const res = await api.settingsTestConnection();
        const signal = res?.connected ?? res?.ok ?? res?.status ?? res?.message;
        const ok = typeof signal === "string"
          ? /connected|success|ok|healthy/i.test(signal)
          : Boolean(signal ?? true);
        state.api.online = !!ok;
        renderApiStatusPill();
        toast(ok ? "API connectivity successful." : "API connectivity failed.", ok ? "info" : "error");
      } catch (_e) {
        state.api.online = false;
        renderApiStatusPill();
        toast("API connectivity failed.", "error");
      } finally {
        restore();
      }
    });
    on(dom.settingsRetryBtn, "click", async () => {
      await loadSettingsData();
    });

    [dom.logoutBtn, dom.profileLogout].forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await confirmDialog({
          title: "Logout",
          message: "Do you want to exit your teacher dashboard?",
          actionLabel: "Logout"
        });
        if (ok) {
          toast("Logged out.");
          localStorage.clear();
          window.location.href = "role-selection.html";
        }
      });
    });

    window.addEventListener("resize", () => drawAllCharts());
  }

  function startLiveClock() {
    const tick = () => {
      const t = new Date();
      dom.liveClock.textContent = `LIVE ${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  function startLiveUpdates() {
    setInterval(() => {
      if (!state.settings.autoRefresh) return;
      const idx = Math.floor(Math.random() * state.data.attempts.length);
      const item = state.data.attempts[idx];
      if (!item) return;
      item.cheatingScore = clamp(item.cheatingScore + Math.round((Math.random() - 0.4) * 16), 0, 100);
      item.riskLevel = riskFromScore(item.cheatingScore);
      item.severity = item.riskLevel;
      if (item.cheatingScore > 80 && state.settings.alerts) addNotification(`Critical proctoring flag: ${item.studentName} (${item.cheatingScore})`);
      renderDashboardFeeds();
      renderAttempts();
      renderProctoring();
      renderAiInsights();
      drawAllCharts();
    }, 12000);
  }

  async function init() {
    try {
      Object.assign(dom, ids());
      applyTheme(state.ui.themeMode);
      seedData();
      populateTeacher();
      setProfileEditMode(false);

      const examsTableCard = dom.examsTableBody?.closest(".table-card");
      const attemptsTableCard = dom.attemptsTableBody?.closest(".table-card");
      dom.examMorePortal = document.createElement("div");
      dom.examMorePortal.className = "exam-more-portal";
      document.body.appendChild(dom.examMorePortal);
      if (examsTableCard && !document.getElementById("examsPagination")) {
        const pg = document.createElement("div");
        pg.id = "examsPagination";
        pg.className = "pagination";
        examsTableCard.appendChild(pg);
      }
      if (attemptsTableCard && !document.getElementById("attemptsPagination")) {
        const pg = document.createElement("div");
        pg.id = "attemptsPagination";
        pg.className = "pagination";
        attemptsTableCard.appendChild(pg);
      }

      bindEvents();
      await api.ping();
      renderApiStatusPill();
      await loadProfileData();
      await loadSettingsData();
      await loadDashboardSummary();
      await loadExamsData();
      await loadAttemptsData();
      await loadAnalyticsData();
      await loadAiInsightsData();
      await loadCertificatesData();
      await loadLeaderboardData();
      const apiModeNote = state.api.online ? "Connected to REST API." : "REST API not reachable. Running in local demo mode.";
      addNotification(apiModeNote);
      renderAll();
      showSection("dashboard");
      startLiveClock();
      startLiveUpdates();
    } catch (error) {
      toast(error?.message || "Failed to initialize teacher workspace.", "error");
      console.error("Teacher dashboard init failed:", error);
      renderAll();
      showSection("dashboard");
      startLiveClock();
    } finally {
      setTimeout(() => setLoading(false), 550);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
