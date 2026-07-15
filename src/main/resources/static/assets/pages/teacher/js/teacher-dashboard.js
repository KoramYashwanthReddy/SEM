// ================= AUTH GUARD =================
const AUTH_TOKEN_KEY = "token";
const AUTH_TOKEN_KEYS = ["token", "accessToken", "jwt", "authToken", "access_token"];
const LOGIN_REDIRECT_PAGE = "login.html";

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
      name: "",
      email: "",
      phone: "",
      department: "",
      designation: "",
      experienceYears: 0,
      qualification: "",
      employeeId: "",
      profileImage: "",
      enabled: false,
      accountNonLocked: true,
      createdAt: null,
      updatedAt: null
    },
    settings: {
      notifications: true,
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
  let examModalSubmitting = false;

  const setExamModalSubmitting = (busy) => {
    examModalSubmitting = busy;
    ["mxCancel", "mxDraft", "mxPublish", "mxPrev", "mxNext"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = busy;
    });
    document.querySelectorAll(".stage-chip").forEach((chip) => {
      chip.disabled = busy;
    });
  };

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
  const fmtDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" });
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
      examJumpBtn: "Loading page...",
      exportDashboardBtn: "Exporting dashboard report...",
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
    if (!btn || btn.classList.contains("is-buffering")) return () => { };
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
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch] || ch));
  const normalizeDisplayText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
  const normalizePreviewQuestion = (question, index = 0, examCode = "") => ({
    rowLabel: `Question ${index + 1}`,
    examCode: String(question?.examCode || examCode || "").trim(),
    questionText: normalizeDisplayText(question?.questionText || question?.text || question?.question || ""),
    questionType: normalizeDisplayText(String(question?.questionType || question?.type || "MCQ").replaceAll("_", " ")),
    difficulty: normalizeDisplayText(question?.difficulty || "Easy"),
    topic: normalizeDisplayText(question?.topic || "general"),
    marks: normalizeDisplayText(question?.marks ?? question?.points ?? 0),
    optionA: normalizeDisplayText(question?.optionA || ""),
    optionB: normalizeDisplayText(question?.optionB || ""),
    optionC: normalizeDisplayText(question?.optionC || ""),
    optionD: normalizeDisplayText(question?.optionD || ""),
    optionE: normalizeDisplayText(question?.optionE || ""),
    optionF: normalizeDisplayText(question?.optionF || ""),
    correctAnswer: normalizeDisplayText(question?.correctAnswer || question?.answer || ""),
    sampleInput: normalizeDisplayText(question?.sampleInput || ""),
    sampleOutput: normalizeDisplayText(question?.sampleOutput || "")
  });

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
    const { silent = false } = meta;

    try {
      // Use the centralized API utility
      // Some calls might expect the raw Response object (like for blob/text)
      const useRaw = meta.responseType && meta.responseType !== "auto" && meta.responseType !== "json";

      const config = {
        ...options,
        raw: useRaw,
        silent: silent
      };

      return await API.request(path, config);
    } catch (err) {
      if (!silent) {
        console.error(`Teacher API error [${path}]:`, err);
      }
      throw err;
    }
  }


  const api = {
    async request(path, options = {}, meta = {}) {
      const res = await authFetch(path, options, meta);
      const responseType = meta.responseType || "auto";
      if (responseType === "auto" || responseType === "json") {
        return res;
      }
      return parseResponse(res, responseType);
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
    async teacherExamAttempts(examCode) {
      return this.request(`/api/teacher/exams/${resolveExamRoute(examCode)}/attempts`, { method: "GET" });
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
      try { payload = await parseResponse(response, "json"); } catch (_e) { }
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
    window.TeacherNotificationHub?.push?.(text)?.catch?.(() => { });
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
    dom.modalContainer.classList.remove("exam-modal-host");
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

  function resolveProfileImageSource(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (
      raw.startsWith("data:") ||
      raw.startsWith("blob:") ||
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("/")
    ) {
      return raw;
    }
    return `/${raw.replace(/^\.?\//, "")}`;
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
    const img = resolveProfileImageSource(
      source.profileImage ||
      source.profilePhoto ||
      source.avatar ||
      source.imageUrl ||
      source.url ||
      source.image ||
      source.teacher?.profileImage ||
      source.teacher?.profilePhoto ||
      source.teacher?.avatar ||
      ""
    );
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
    const fallbackAvatar = profileInitialAvatar(state.teacher.name);
    const resolvedImage = resolveProfileImageSource(state.teacher.profileImage);
    dom.teacherNameTop.textContent = state.teacher.name;
    dom.teacherNameMini.textContent = state.teacher.name;
    dom.teacherDeptMini.textContent = state.teacher.department;
    dom.teacherAvatarTop.src = resolvedImage || fallbackAvatar;
    dom.teacherAvatarTop.onerror = () => {
      dom.teacherAvatarTop.onerror = null;
      dom.teacherAvatarTop.src = fallbackAvatar;
    };
    dom.teacherAvatarMini.src = resolvedImage || fallbackAvatar;
    dom.teacherAvatarMini.onerror = () => {
      dom.teacherAvatarMini.onerror = null;
      dom.teacherAvatarMini.src = fallbackAvatar;
    };
    // Legacy hidden form inputs (kept for JS compat)
    if (dom.pfName) dom.pfName.value = state.teacher.name;
    if (dom.pfEmail) dom.pfEmail.value = state.teacher.email;
    if (dom.pfPhone) dom.pfPhone.value = state.teacher.phone;
    if (dom.pfDepartment) dom.pfDepartment.value = state.teacher.department;
    if (dom.pfDesignation) dom.pfDesignation.value = state.teacher.designation;
    if (dom.pfExperience) dom.pfExperience.value = state.teacher.experienceYears;
    if (dom.pfQualification) dom.pfQualification.value = state.teacher.qualification;
    if (dom.pfEmployeeId) dom.pfEmployeeId.value = state.teacher.employeeId;
    if (dom.pfImage) dom.pfImage.value = state.teacher.profileImage;
    // Avatar preview
    if (dom.pfAvatarPreview) {
      dom.pfAvatarPreview.src = resolvedImage || fallbackAvatar;
      dom.pfAvatarPreview.onerror = () => {
        dom.pfAvatarPreview.onerror = null;
        dom.pfAvatarPreview.src = fallbackAvatar;
      };
    }
    // New read-only view fields
    if (dom.pfHeaderName) dom.pfHeaderName.textContent = state.teacher.name || "Teacher";
    if (dom.pfHeaderDesignation) dom.pfHeaderDesignation.textContent = state.teacher.designation || "-";
    if (dom.pfViewDept) dom.pfViewDept.textContent = state.teacher.department || "-";
    if (dom.pfViewEmail) dom.pfViewEmail.textContent = state.teacher.email || "-";
    if (dom.pfViewName) dom.pfViewName.textContent = state.teacher.name || "-";
    if (dom.pfViewEmailField) dom.pfViewEmailField.textContent = state.teacher.email || "-";
    if (dom.pfViewPhone) dom.pfViewPhone.textContent = state.teacher.phone || "-";
    if (dom.pfViewDeptField) dom.pfViewDeptField.textContent = state.teacher.department || "-";
    if (dom.pfViewDesignation) dom.pfViewDesignation.textContent = state.teacher.designation || "-";
    if (dom.pfViewExperience) dom.pfViewExperience.textContent = state.teacher.experienceYears !== undefined ? String(state.teacher.experienceYears) : "-";
    if (dom.pfViewQualification) dom.pfViewQualification.textContent = state.teacher.qualification || "-";
    if (dom.pfViewEmployeeId) dom.pfViewEmployeeId.textContent = state.teacher.employeeId || "-";
    if (dom.pfViewJoining) dom.pfViewJoining.textContent = state.teacher.createdAt ? fmtDate(state.teacher.createdAt) : "-";
    if (dom.pfViewDob) dom.pfViewDob.textContent = state.teacher.dateOfBirth ? fmtDate(state.teacher.dateOfBirth) : "-";
    if (dom.pfViewGender) dom.pfViewGender.textContent = state.teacher.gender || "-";
    if (dom.pfViewAddress) dom.pfViewAddress.textContent = state.teacher.address || "-";
    // Account info
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
      dom.pfAccountStatus.className = `pf-status-badge pf-status-${status.label.toLowerCase()}`;
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
      alerts: Boolean(raw.proctoringAlerts ?? raw.alerts ?? state.settings.alerts)
    };
  }

  function settingsPayload() {
    return {
      enableNotifications: !!state.settings.notifications,
      proctoringAlerts: !!state.settings.alerts
    };
  }

  function setSettingsLoadingUI(active) {
    state.ui.settings.loading = !!active;
    if (dom.settingsLoading) dom.settingsLoading.classList.toggle("hidden", !active);
    [dom.stNotif, dom.stAlerts, dom.stSessionReset, dom.stApiTest, dom.stSave].forEach((el) => {
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
    if (dom.stAlerts) dom.stAlerts.checked = !!state.settings.alerts;
    const baseline = state.ui.settings.baseline || {
      notifications: state.settings.notifications,
      alerts: state.settings.alerts
    };
    const dirty = baseline.notifications !== state.settings.notifications
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
    if (dom.recentExamsBody) {
      const recent = [...state.data.exams].slice(0, 5);
      dom.recentExamsBody.innerHTML = recent.length ? recent.map((e) => `
        <tr><td>${e.examCode}</td><td>${e.title}</td><td><span class="status-pill ${e.status === "Published" ? "status-published" : "status-draft"}">${e.status}</span></td><td>${attemptsForExam(e).length}</td></tr>
      `).join("") : `<tr><td colspan="4"><div class="no-data">No exams available.</div></td></tr>`;
    }
  }

  function renderExams() {
    const exams = filteredExams();
    const { rows, totalPages } = paginate(exams, "exams");
    const rowsHtml = rows.map((e) => {
    const statusClass = e.status === "Published" ? "status-published" : "status-draft";
      const attemptCount = attemptsForExam(e).length;
      const qCount = questionCount(e.id);
      return `
      <article class="exam-card" data-exam-card="${e.id}">

        <!-- ── TOP BAR ── -->
        <div class="ec-top">
          <div class="ec-top-left">
            <span class="status-pill ${statusClass}">${e.status}</span>
            ${e.questionsUploaded
              ? `<span class="ec-q-badge ec-q-ok"><i class="fa-solid fa-circle-check"></i> ${qCount} Questions</span>`
              : `<span class="ec-q-badge ec-q-pending"><i class="fa-regular fa-clock"></i> No Questions</span>`}
          </div>
          <div class="ec-attempts-badge">
            <span>Attempts</span>
            <strong>${attemptCount}</strong>
          </div>
        </div>

        <!-- ── TITLE ── -->
        <div class="ec-title-row">
          <div class="ec-title-block">
            <h3 class="ec-title">${e.title}</h3>
            <p class="ec-subtitle">${e.subject || "General"} &middot; <code class="ec-code-inline">${e.examCode}</code></p>
          </div>
        </div>

        <!-- ── META GRID ── -->
        <div class="ec-meta">
          <div class="ec-meta-item">
            <span>Duration</span>
            <strong>${e.duration} min</strong>
          </div>
          <div class="ec-meta-item">
            <span>Pass Marks</span>
            <strong>${e.passingMarks}</strong>
          </div>
          <div class="ec-meta-item">
            <span>Marks/Q</span>
            <strong>${e.marksPerQuestion || "—"}</strong>
          </div>
          <div class="ec-meta-item">
            <span>Total Marks</span>
            <strong>${e.totalMarks || "—"}</strong>
          </div>
        </div>

        <!-- ── SCHEDULE ── -->
        <div class="ec-schedule">
          <div class="ec-schedule-item">
            <span>Start</span>
            <strong>${fmtDateTime(e.startTime)}</strong>
          </div>
          <div class="ec-schedule-sep">→</div>
          <div class="ec-schedule-item">
            <span>End</span>
            <strong>${fmtDateTime(e.endTime)}</strong>
          </div>
        </div>

        <!-- ── ACTIONS ── -->
        <div class="ec-actions">
          <button class="ec-btn-primary" data-exam-action="view" data-id="${e.id}">View</button>
          <button class="ec-btn-outline" data-exam-action="analytics" data-id="${e.id}">Analytics</button>
          <button class="ec-btn-outline" data-exam-action="questions" data-id="${e.id}">Questions</button>
          <button class="ec-btn-outline" data-exam-action="attempts" data-id="${e.id}">Attempts</button>
          <div class="exam-more">
            <button class="ec-btn-more" data-exam-menu-toggle="${e.id}" aria-label="More actions" aria-expanded="${idKey(state.ui.openExamMenuId) === idKey(e.id) ? "true" : "false"}">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </div>
        </div>

      </article>`;
    }).join("");
    dom.examsCards.innerHTML = rowsHtml || `<div class="no-data exams-empty-state">No exams match your filters.</div>`;
    if (dom.examRecordsCounter) dom.examRecordsCounter.textContent = `${exams.length} records`;
    if (dom.examJumpPage) dom.examJumpPage.value = String(state.ui.pagination.exams.page);
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
    const end   = isEdit ? exam.endTime.slice(0, 16) : "";

    dom.modalContainer.classList.add("exam-modal-host");
    openModal(`
      <div class="ecm-shell">

        <!-- ── LEFT INFO PANEL ── -->
        <div class="ecm-left" id="ecmLeft">
          <div class="ecm-left-inner">
            <div class="ecm-stage-badge" id="ecmStageBadge">1 / 4</div>
            <div class="ecm-left-icon" id="ecmLeftIcon">📋</div>
            <h2 class="ecm-left-title" id="ecmLeftTitle">Basic Info</h2>
            <p class="ecm-left-desc" id="ecmLeftDesc">Give your exam a clear title, subject and description so students know exactly what to expect.</p>
            <ul class="ecm-tips" id="ecmTips">
              <li>Use a descriptive title like "CS101 – Mid-Term 2025"</li>
              <li>Set a realistic duration (most exams: 60–120 min)</li>
              <li>Write a brief description of topics covered</li>
            </ul>
            <div class="ecm-left-dots">
              <span class="ecm-dot is-active" data-dot="1"></span>
              <span class="ecm-dot" data-dot="2"></span>
              <span class="ecm-dot" data-dot="3"></span>
              <span class="ecm-dot" data-dot="4"></span>
            </div>
          </div>
        </div>

        <!-- ── RIGHT FORM PANEL ── -->
        <div class="ecm-right">
          <!-- Header -->
          <div class="ecm-right-header">
            <div>
              <h3 class="ecm-right-title">${isEdit ? "Edit Exam" : "Create New Exam"}</h3>
              <p class="ecm-right-sub">${isEdit ? "Update exam details below." : "Fill in all four stages, then create a draft."}</p>
            </div>
            <button type="button" class="ecm-close-btn" id="mxCancel" title="Close">&#10005;</button>
          </div>

          <!-- Stage Nav -->
          <div class="exam-stage-nav ecm-stage-nav">
            <button type="button" class="stage-chip is-active" data-stage-go="1">
              <span class="stage-num">1</span>
              <span class="stage-label">Basic</span>
            </button>
            <div class="stage-line"></div>
            <button type="button" class="stage-chip" data-stage-go="2">
              <span class="stage-num">2</span>
              <span class="stage-label">Marks</span>
            </button>
            <div class="stage-line"></div>
            <button type="button" class="stage-chip" data-stage-go="3">
              <span class="stage-num">3</span>
              <span class="stage-label">Schedule</span>
            </button>
            <div class="stage-line"></div>
            <button type="button" class="stage-chip" data-stage-go="4">
              <span class="stage-num">4</span>
              <span class="stage-label">Questions</span>
            </button>
          </div>

          <!-- Form panes -->
          <form id="examHoverForm" class="ecm-form">

            <!-- Stage 1: Basic -->
            <div class="ecm-pane is-active" data-stage="1">
              <div class="ecm-field-group">
                <label class="ecm-label ecm-full">
                  <span>Exam Title</span>
                  <input id="mxTitle" class="ecm-input" placeholder="e.g. CS101 – Mid-Term 2025" value="${isEdit ? exam.title : ""}" required>
                </label>
                <label class="ecm-label">
                  <span>Subject</span>
                  <input id="mxSubject" class="ecm-input" placeholder="e.g. Computer Science" value="${isEdit ? exam.subject : ""}" required>
                </label>
                <label class="ecm-label">
                  <span>Duration (min)</span>
                  <input id="mxDuration" class="ecm-input" type="number" min="1" placeholder="90" value="${isEdit ? exam.duration : 90}" required>
                </label>
                <label class="ecm-label ecm-full">
                  <span>Description</span>
                  <textarea id="mxDescription" class="ecm-input ecm-textarea" rows="4" placeholder="Brief description of topics, rules and instructions…" required>${isEdit ? exam.description : ""}</textarea>
                </label>
              </div>
            </div>

            <!-- Stage 2: Marks -->
            <div class="ecm-pane" data-stage="2">
              <div class="ecm-section-label">Marks &amp; Attempts</div>
              <div class="ecm-field-group">
                <label class="ecm-label">
                  <span>Total Marks</span>
                  <input id="mxTotalMarks" class="ecm-input" type="number" min="1" value="${isEdit ? exam.totalMarks : 100}" required>
                </label>
                <label class="ecm-label">
                  <span>Passing Marks</span>
                  <input id="mxPassingMarks" class="ecm-input" type="number" min="0" value="${isEdit ? exam.passingMarks : 40}" required>
                </label>
                <label class="ecm-label">
                  <span>Max Attempts</span>
                  <input id="mxMaxAttempts" class="ecm-input" type="number" min="1" value="${isEdit ? exam.maxAttempts : 1}" required>
                </label>
                <label class="ecm-label">
                  <span>Marks Per Question</span>
                  <input id="mxMarksPerQuestion" class="ecm-input" type="number" min="1" value="${isEdit ? exam.marksPerQuestion : 2}" required>
                </label>
                <label class="ecm-label">
                  <span>Negative Marks</span>
                  <input id="mxNegativeMarks" class="ecm-input" type="number" min="0" value="${isEdit ? exam.negativeMarks : 0}" required>
                </label>
              </div>
              <div class="ecm-section-label">Difficulty Distribution</div>
              <div class="ecm-field-group">
                <label class="ecm-label">
                  <span>Easy Questions</span>
                  <input id="mxEasyCount" class="ecm-input" type="number" min="0" value="${isEdit ? exam.easyCount : 0}" required>
                </label>
                <label class="ecm-label">
                  <span>Medium Questions</span>
                  <input id="mxMediumCount" class="ecm-input" type="number" min="0" value="${isEdit ? exam.mediumCount : 0}" required>
                </label>
                <label class="ecm-label">
                  <span>Hard Questions</span>
                  <input id="mxHardCount" class="ecm-input" type="number" min="0" value="${isEdit ? exam.hardCount : 0}" required>
                </label>
              </div>
            </div>

            <!-- Stage 3: Schedule & Options -->
            <div class="ecm-pane" data-stage="3">
              <div class="ecm-field-group">
                <label class="ecm-label ecm-full">
                  <span>Start Date &amp; Time</span>
                  <input id="mxStartTime" class="ecm-input" type="datetime-local" value="${start}" required>
                </label>
                <label class="ecm-label ecm-full">
                  <span>End Date &amp; Time</span>
                  <input id="mxEndTime" class="ecm-input" type="datetime-local" value="${end}" required>
                </label>
              </div>

              <div class="ecm-section-label" style="margin-top: 14px;">Randomisation</div>
              <div class="ecm-toggle-group">
                <div class="ecm-toggle-card">
                  <div class="ecm-toggle-info">
                    <span class="ecm-toggle-icon">🔀</span>
                    <div>
                      <strong>Shuffle Questions</strong>
                      <small>Every student gets a unique question order</small>
                    </div>
                  </div>
                  <label class="ecm-switch">
                    <input id="mxShuffleQuestions" type="checkbox" ${isEdit && exam.shuffleQuestions ? "checked" : ""}>
                    <span class="ecm-switch-track"></span>
                  </label>
                </div>
                <div class="ecm-toggle-card">
                  <div class="ecm-toggle-info">
                    <span class="ecm-toggle-icon">🎲</span>
                    <div>
                      <strong>Shuffle Options</strong>
                      <small>MCQ answer choices are randomised per student</small>
                    </div>
                  </div>
                  <label class="ecm-switch">
                    <input id="mxShuffleOptions" type="checkbox" ${isEdit && exam.shuffleOptions ? "checked" : ""}>
                    <span class="ecm-switch-track"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Stage 4: Questions Upload -->
            <div class="ecm-pane" data-stage="4">
              <div class="ecm-section-label">Upload Questions File</div>
              <div class="ecm-field-group">
                <div class="upload-file-row" style="display: flex; align-items: center; gap: 12px; margin-top: 10px;">
                  <input id="mxFile" type="file" accept=".csv,.xlsx,.xls" hidden>
                  <button id="mxBrowse" type="button" class="btn ghost small">Choose File</button>
                  <span id="mxFileName" class="file-name" style="font-size: 0.88rem; color: var(--text-secondary);">No file selected</span>
                  <button id="mxRemove" type="button" class="btn ghost small upload-remove-btn" disabled>Remove</button>
                </div>
                <p class="upload-help" style="margin-top: 8px; font-size: 0.8rem; color: var(--text-tertiary);">Supported formats: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong></p>

                <div class="template-download-card" style="margin-top: 16px; padding: 14px; background: rgba(255,255,255,0.03); border: 1px dashed var(--border-subtle); border-radius: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="display: block; font-size: 0.88rem; color: var(--text-primary);">Excel / CSV Template File</strong>
                      <span style="font-size: 0.8rem; color: var(--text-secondary);">Download the standard format to fill in questions easily.</span>
                    </div>
                    <button id="mxDownloadTemplate" type="button" class="btn primary small" style="display: flex; align-items: center; gap: 6px;">
                      <span>📥 Download</span>
                    </button>
                  </div>
                </div>

                <div class="ecm-schedule-hint" style="margin-top: 16px;">
                  <strong style="display: block; font-size: 0.82rem; margin-bottom: 6px; color: var(--text-secondary);">EXPECTED FILE COLUMNS:</strong>
                  <div class="column-badges-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Question Text</span>
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Question Type</span>
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Marks</span>
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Difficulty</span>
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Topic</span>
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Correct Answer</span>
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Option A</span>
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Option B</span>
                    <span style="font-size: 0.76rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); text-align: center; color: var(--text-secondary);">Option C / D</span>
                  </div>
                </div>
              </div>
            </div>

          </form>

          <!-- Footer actions -->
          <div class="ecm-footer">
            <div class="ecm-footer-nav">
              <button id="mxPrev" type="button" class="ecm-nav-btn">&#8592; Previous</button>
              <button id="mxNext" type="button" class="ecm-nav-btn ecm-nav-next">Next &#8594;</button>
            </div>
            <div class="ecm-footer-actions">
              <button id="mxDraft" type="button" class="btn ghost">Save Draft</button>
              <button id="mxPublish" type="button" class="btn primary">${isEdit ? "Update / Publish" : "Create Draft"}</button>
            </div>
          </div>
        </div>
      </div>
    `);

    const STAGE_META = [
      {
        icon: "📋", title: "Basic Info", badge: "1 / 4",
        desc: "Give your exam a clear title, subject and description so students know exactly what to expect.",
        tips: ["Use a descriptive title like 'CS101 – Mid-Term 2025'", "Set a realistic duration (most exams: 60–120 min)", "Write a brief summary of topics covered"]
      },
      {
        icon: "📊", title: "Marks & Scoring", badge: "2 / 4",
        desc: "Define the scoring rules, passing threshold, and how many attempts students are allowed.",
        tips: ["Passing marks should be 30–50% of total", "Enable negative marking to discourage guessing", "Balance difficulty: aim for 40% Easy, 40% Medium, 20% Hard"]
      },
      {
        icon: "📅", title: "Schedule & Options", badge: "3 / 4",
        desc: "Set the start/end window and configure randomisation parameters.",
        tips: ["Allow at least 15 min buffer before start", "Shuffle questions and options to reduce cheating", "End time must exceed start time + duration"]
      },
      {
        icon: "📤", title: "Questions", badge: "4 / 4",
        desc: "Upload a structured CSV/Excel file containing the exam questions. This will automatically import the questions for this exam.",
        tips: ["Supported formats: .csv, .xlsx, .xls", "MCQs require correct answers and choices A-D", "Incorrect values will result in a verification error"]
      }
    ];

    let currentStage = 1;
    const syncStage = () => {
      const meta = STAGE_META[currentStage - 1];
      // Update left panel
      document.getElementById("ecmStageBadge").textContent = meta.badge;
      document.getElementById("ecmLeftIcon").textContent = meta.icon;
      document.getElementById("ecmLeftTitle").textContent = meta.title;
      document.getElementById("ecmLeftDesc").textContent = meta.desc;
      document.getElementById("ecmTips").innerHTML = meta.tips.map(t => `<li>${t}</li>`).join("");
      document.querySelectorAll(".ecm-dot").forEach(d => d.classList.toggle("is-active", Number(d.dataset.dot) === currentStage));
      // Left panel accent colour per stage
      const leftPanel = document.getElementById("ecmLeft");
      leftPanel.dataset.stage = currentStage;

      // Update panes
      document.querySelectorAll(".ecm-pane").forEach(p => p.classList.toggle("is-active", Number(p.dataset.stage) === currentStage));
      // Update chips
      document.querySelectorAll(".stage-chip").forEach(chip => {
        const n = Number(chip.dataset.stageGo);
        chip.classList.toggle("is-active", n === currentStage);
        const isCompleted = n < currentStage;
        chip.classList.toggle("is-completed", isCompleted);
        const numEl = chip.querySelector(".stage-num");
        if (numEl) numEl.innerHTML = isCompleted ? "&#10003;" : String(n);
      });
      // Fill lines
      document.querySelectorAll(".stage-line").forEach((line, idx) => line.classList.toggle("is-filled", idx + 1 < currentStage));
      // Nav buttons
      document.getElementById("mxPrev").disabled = currentStage === 1;
      document.getElementById("mxNext").disabled = currentStage === 4;
    };

    document.getElementById("mxPrev").addEventListener("click", () => { currentStage = Math.max(1, currentStage - 1); syncStage(); });
    document.getElementById("mxNext").addEventListener("click", () => { currentStage = Math.min(4, currentStage + 1); syncStage(); });
    document.querySelectorAll(".stage-chip").forEach(chip => {
      chip.addEventListener("click", () => { currentStage = Number(chip.dataset.stageGo); syncStage(); });
    });

    // File Upload Stage 4 Bindings
    const fileInput = document.getElementById("mxFile");
    const browseBtn = document.getElementById("mxBrowse");
    const removeBtn = document.getElementById("mxRemove");
    const fileNameEl = document.getElementById("mxFileName");

    if (browseBtn && fileInput) {
      browseBtn.addEventListener("click", () => fileInput.click());
    }
    if (removeBtn && fileInput) {
      removeBtn.addEventListener("click", () => {
        fileInput.value = "";
        fileNameEl.textContent = "No file selected";
        removeBtn.disabled = true;
      });
    }
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        fileNameEl.textContent = file ? file.name : "No file selected";
        removeBtn.disabled = !file;
      });
    }

    const downloadBtn = document.getElementById("mxDownloadTemplate");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        const headers = ["Question Text", "Question Type", "Marks", "Difficulty", "Topic", "Option A", "Option B", "Option C", "Option D", "Option E", "Option F", "Correct Answer"];
        const sample = ["What is the value of 2 + 2?", "MCQ", "2", "Easy", "General Math", "1", "2", "3", "4", "5", "6", "4"];
        const content = "data:text/csv;charset=utf-8," + [headers.join(","), sample.join(",")].join("\n");
        const encodedUri = encodeURI(content);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "exam_questions_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    const publishBtn = document.getElementById("mxPublish");
    const requiredFieldIds = [
      "mxTitle", "mxSubject", "mxDescription", "mxDuration",
      "mxTotalMarks", "mxPassingMarks", "mxMaxAttempts", "mxMarksPerQuestion",
      "mxNegativeMarks", "mxEasyCount", "mxMediumCount", "mxHardCount",
      "mxStartTime", "mxEndTime"
    ];
    const validateCreateForm = () => {
      const allFilled = requiredFieldIds.every(id => { const el = document.getElementById(id); return !!el && String(el.value).trim() !== ""; });
      const startVal = document.getElementById("mxStartTime").value;
      const endVal   = document.getElementById("mxEndTime").value;
      const startDate = startVal ? new Date(startVal) : null;
      const endDate   = endVal   ? new Date(endVal)   : null;
      const validRange = Boolean(startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate.getTime() > startDate.getTime());
      publishBtn.disabled = !(allFilled && validRange);
    };
    requiredFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", validateCreateForm);
      el.addEventListener("change", validateCreateForm);
    });

    syncStage();
    validateCreateForm();
    document.getElementById("mxCancel").addEventListener("click", closeModal);
    document.getElementById("mxDraft").addEventListener("click", async () => { await submitExamFromModal("Draft", exam?.id || null); });
    document.getElementById("mxPublish").addEventListener("click", async () => { await submitExamFromModal(isEdit ? "Published" : "Draft", exam?.id || null); });
  }


  async function submitExamFromModal(status, examId = null) {
    if (examModalSubmitting) {
      return;
    }
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
      startTime: document.getElementById("mxStartTime").value,
      endTime: document.getElementById("mxEndTime").value,
      shuffleQuestions: document.getElementById("mxShuffleQuestions").checked,
      shuffleOptions: document.getElementById("mxShuffleOptions").checked,
      status
    };
    if (!payload.title || !payload.subject || !document.getElementById("mxStartTime").value || !document.getElementById("mxEndTime").value) {
      toast("Fill all required exam fields.", "error");
      return;
    }
    const startDateTime = new Date(payload.startTime);
    const endDateTime = new Date(payload.endTime);
    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      toast("Please enter a valid start and end date/time.", "error");
      return;
    }
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      toast("End time must be after start time.", "error");
      return;
    }
    if (payload.passingMarks > payload.totalMarks) {
      toast("Passing marks cannot be greater than total marks.", "error");
      return;
    }
    if (payload.marksPerQuestion <= 0 || payload.negativeMarks < 0 || payload.negativeMarks > payload.marksPerQuestion) {
      toast("Marks per question and negative marking values are not valid.", "error");
      return;
    }
    const plannedQuestionCount = payload.easyQuestionCount + payload.mediumQuestionCount + payload.difficultQuestionCount;
    if (plannedQuestionCount > 0 && plannedQuestionCount * payload.marksPerQuestion > payload.totalMarks) {
      toast("Difficulty distribution exceeds total marks.", "error");
      return;
    }
    const scheduledMinutes = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 60000);
    if (scheduledMinutes < payload.durationMinutes) {
      toast("Exam window must be at least as long as the duration.", "error");
      return;
    }
    const requestPayload = {
      title: payload.title,
      description: payload.description,
      subject: payload.subject,
      durationMinutes: payload.durationMinutes,
      totalMarks: payload.totalMarks,
      passingMarks: payload.passingMarks,
      maxAttempts: payload.maxAttempts,
      marksPerQuestion: payload.marksPerQuestion,
      negativeMarks: payload.negativeMarks,
      easyQuestionCount: payload.easyQuestionCount,
      mediumQuestionCount: payload.mediumQuestionCount,
      difficultQuestionCount: payload.difficultQuestionCount,
      startTime: payload.startTime,
      endTime: payload.endTime,
      shuffleQuestions: payload.shuffleQuestions,
      shuffleOptions: payload.shuffleOptions
    };
    setExamModalSubmitting(true);
    try {
      await withLoading(async () => {
        if (examId) {
          const exam = examById(examId);
          if (!exam) return;
          if (status === "Published" && !exam.questionsUploaded) {
            toast("Publish blocked: upload questions first.", "error");
            return;
          }
          const apiUpdated = await api.updateExam(exam.examCode || examId, requestPayload);
          const updatedData = apiUpdated?.data || apiUpdated?.exam || apiUpdated || {};
          Object.assign(exam, requestPayload, {
            id: updatedData.id != null ? String(updatedData.id) : exam.id,
            examCode: updatedData.examCode || exam.examCode,
            status: String(updatedData.status || payload.status || exam.status || "").toLowerCase() === "published" ? "Published" : "Draft",
            questionsUploaded: updatedData.questionsUploaded != null ? Boolean(updatedData.questionsUploaded) : Boolean(exam.questionsUploaded),
            createdBy: updatedData.createdBy || exam.createdBy,
            createdDate: updatedData.createdAt || exam.createdDate,
            duration: requestPayload.durationMinutes,
            active: updatedData.active != null ? Boolean(updatedData.active) : payload.status === "Published",
            easyCount: requestPayload.easyQuestionCount,
            mediumCount: requestPayload.mediumQuestionCount,
            hardCount: requestPayload.difficultQuestionCount
          });

          // Upload Question File if present (Stage 4)
          const fileInput = document.getElementById("mxFile");
          const file = fileInput ? fileInput.files[0] : null;
          if (file) {
            const parsed = await parseQuestionFile(file);
            const resolvedCode = exam.examCode || examId;
            const imported = (parsed.rows || []).map((row, idx) => ({
              examCode: resolvedCode,
              questionText: String(rowValue(row, ["Question", "Questions", "Question Text", "QuestionText", "question_text", "Q", "Prompt", "Title"]) || "").trim(),
              questionType: normalizeUploadQuestionType(rowValue(row, ["Question Type", "QuestionType", "Type", "question_type"])),
              marks: Number(rowValue(row, ["Marks", "Mark", "Score", "Points"]) || 1),
              difficulty: String(rowValue(row, ["Difficulty", "Level"]) || "Easy").trim(),
              topic: String(rowValue(row, ["Topic", "Section", "Subject", "Category"]) || "Imported").trim(),
              optionA: String(rowValue(row, ["Option A", "OptionA", "Choice A", "ChoiceA", "A", "Option 1", "Option1", "opt_a"]) || "").trim(),
              optionB: String(rowValue(row, ["Option B", "OptionB", "Choice B", "ChoiceB", "B", "Option 2", "Option2", "opt_b"]) || "").trim(),
              optionC: String(rowValue(row, ["Option C", "OptionC", "Choice C", "ChoiceC", "C", "Option 3", "Option3", "opt_c"]) || "").trim(),
              optionD: String(rowValue(row, ["Option D", "OptionD", "Choice D", "ChoiceD", "D", "Option 4", "Option4", "opt_d"]) || "").trim(),
              optionE: String(rowValue(row, ["Option E", "OptionE", "Choice E", "ChoiceE", "E", "Option 5", "Option5", "opt_e"]) || "").trim(),
              optionF: String(rowValue(row, ["Option F", "OptionF", "Choice F", "ChoiceF", "F", "Option 6", "Option6", "opt_f"]) || "").trim(),
              sampleInput: String(rowValue(row, ["Sample Input", "SampleInput", "Input"]) || "").trim(),
              sampleOutput: String(rowValue(row, ["Sample Output", "SampleOutput", "Output"]) || "").trim(),
              correctAnswer: String(rowValue(row, ["Correct Answer", "CorrectAnswer", "Answer", "Correct", "Key"]) || "").trim(),
              shuffleOptions: false,
              displayOrder: idx + 1,
              shuffleGroup: ""
            })).filter((q) => q.questionText);

            if (imported.length > 0) {
              await api.bulkUploadQuestions(resolvedCode, imported);
              exam.questionsUploaded = true;
            }
          }

          toast("Exam updated.");
        } else {
          const apiCreated = await api.createExam(requestPayload);
          const createdData = apiCreated?.data || apiCreated?.exam || apiCreated || {};
          if (!createdData || !createdData.id) {
            throw new Error("Exam create API did not return a persisted exam id");
          }
          const persistedExam = normalizeExam({
            ...requestPayload,
            ...createdData
          });
          state.data.exams.unshift(persistedExam);

          // Upload Question File if present (Stage 4)
          const fileInput = document.getElementById("mxFile");
          const file = fileInput ? fileInput.files[0] : null;
          if (file) {
            const parsed = await parseQuestionFile(file);
            const resolvedCode = createdData.examCode;
            const imported = (parsed.rows || []).map((row, idx) => ({
              examCode: resolvedCode,
              questionText: String(rowValue(row, ["Question", "Questions", "Question Text", "QuestionText", "question_text", "Q", "Prompt", "Title"]) || "").trim(),
              questionType: normalizeUploadQuestionType(rowValue(row, ["Question Type", "QuestionType", "Type", "question_type"])),
              marks: Number(rowValue(row, ["Marks", "Mark", "Score", "Points"]) || 1),
              difficulty: String(rowValue(row, ["Difficulty", "Level"]) || "Easy").trim(),
              topic: String(rowValue(row, ["Topic", "Section", "Subject", "Category"]) || "Imported").trim(),
              optionA: String(rowValue(row, ["Option A", "OptionA", "Choice A", "ChoiceA", "A", "Option 1", "Option1", "opt_a"]) || "").trim(),
              optionB: String(rowValue(row, ["Option B", "OptionB", "Choice B", "ChoiceB", "B", "Option 2", "Option2", "opt_b"]) || "").trim(),
              optionC: String(rowValue(row, ["Option C", "OptionC", "Choice C", "ChoiceC", "C", "Option 3", "Option3", "opt_c"]) || "").trim(),
              optionD: String(rowValue(row, ["Option D", "OptionD", "Choice D", "ChoiceD", "D", "Option 4", "Option4", "opt_d"]) || "").trim(),
              optionE: String(rowValue(row, ["Option E", "OptionE", "Choice E", "ChoiceE", "E", "Option 5", "Option5", "opt_e"]) || "").trim(),
              optionF: String(rowValue(row, ["Option F", "OptionF", "Choice F", "ChoiceF", "F", "Option 6", "Option6", "opt_f"]) || "").trim(),
              sampleInput: String(rowValue(row, ["Sample Input", "SampleInput", "Input"]) || "").trim(),
              sampleOutput: String(rowValue(row, ["Sample Output", "SampleOutput", "Output"]) || "").trim(),
              correctAnswer: String(rowValue(row, ["Correct Answer", "CorrectAnswer", "Answer", "Correct", "Key"]) || "").trim(),
              shuffleOptions: false,
              displayOrder: idx + 1,
              shuffleGroup: ""
            })).filter((q) => q.questionText);

            if (imported.length > 0) {
              await api.bulkUploadQuestions(resolvedCode, imported);
              persistedExam.questionsUploaded = true;
            }
          }

          if (status === "Published" && !persistedExam.questionsUploaded) {
            toast("Exam created as draft. Upload questions before publish.", "error");
          } else {
            toast("Exam created.");
          }
        }
        closeModal();
        renderAll();
        addNotification(`Exam saved (${status}).`);
      });
    } finally {
      setExamModalSubmitting(false);
    }
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
      const token = getAuthToken();
      let dataUrl = "";
      try {
        dataUrl = await readFileAsDataUrl(file);
      } catch (error) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        toast(`Failed to read uploaded file: ${error?.message || "unknown error"}`, "error");
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
        examCode: String(rowValue(row, ["Exam Code", "ExamCode", "exam_code", "Code", "Exam"]) || selectedExamCode).trim(),
        questionText: String(rowValue(row, ["Question", "Questions", "Question Text", "QuestionText", "question_text", "Q", "Prompt", "Title"]) || "").trim(),
        questionType: normalizeUploadQuestionType(rowValue(row, ["Question Type", "QuestionType", "Type", "question_type"])),
        marks: Number(rowValue(row, ["Marks", "Mark", "Score", "Points"]) || 1),
        difficulty: String(rowValue(row, ["Difficulty", "Level"]) || "Easy").trim(),
        topic: String(rowValue(row, ["Topic", "Section", "Subject", "Category"]) || "Imported").trim(),
        optionA: String(rowValue(row, ["Option A", "OptionA", "Choice A", "ChoiceA", "A", "Option 1", "Option1", "opt_a"]) || "").trim(),
        optionB: String(rowValue(row, ["Option B", "OptionB", "Choice B", "ChoiceB", "B", "Option 2", "Option2", "opt_b"]) || "").trim(),
        optionC: String(rowValue(row, ["Option C", "OptionC", "Choice C", "ChoiceC", "C", "Option 3", "Option3", "opt_c"]) || "").trim(),
        optionD: String(rowValue(row, ["Option D", "OptionD", "Choice D", "ChoiceD", "D", "Option 4", "Option4", "opt_d"]) || "").trim(),
        optionE: String(rowValue(row, ["Option E", "OptionE", "Choice E", "ChoiceE", "E", "Option 5", "Option5", "opt_e"]) || "").trim(),
        optionF: String(rowValue(row, ["Option F", "OptionF", "Choice F", "ChoiceF", "F", "Option 6", "Option6", "opt_f"]) || "").trim(),
        sampleInput: String(rowValue(row, ["Sample Input", "SampleInput", "Input"]) || "").trim(),
        sampleOutput: String(rowValue(row, ["Sample Output", "SampleOutput", "Output"]) || "").trim(),
        correctAnswer: String(rowValue(row, ["Correct Answer", "CorrectAnswer", "Answer", "Correct", "Key"]) || "").trim(),
        shuffleOptions: false,
        displayOrder: idx + 1,
        shuffleGroup: ""
      })).filter((q) => q.questionText);

      const invalidRows = imported
        .map((q, idx) => {
          const rowNo = idx + 2;
          const optionCount = [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE, q.optionF].filter((v) => v).length;
          if (!q.questionText) return `Row ${rowNo}: missing question text`;
          if (q.questionType === "MCQ" && optionCount < 2) return `Row ${rowNo}: MCQ needs at least 2 options`;
          return "";
        })
        .filter(Boolean);
      if (invalidRows.length) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
        toast(`Invalid question rows. ${invalidRows[0]}`, "error");
        return;
      }

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

  async function openQuestionsPreviewModal(examId) {
    const exam = examById(examId);
    if (!exam) return;
    const remoteResponse = await api.listQuestions(exam.examCode).catch((error) => {
      console.warn("Failed to fetch live question preview:", error);
      return null;
    });
    const backendQuestions = Array.isArray(remoteResponse?.data) ? remoteResponse.data : [];
    const rawHeaders = ["examCode", "questionType", "difficulty", "questionText", "optionA", "optionB", "optionC", "optionD", "optionE", "optionF", "correctAnswer", "marks", "topic"];
    const rawRows = backendQuestions.length
      ? backendQuestions.map((q, index) => ({
        rowLabel: `Row ${index + 2}`,
        examCode: String(q.examCode || exam.examCode || ""),
        questionType: String(q.questionType || q.type || "MCQ"),
        difficulty: String(q.difficulty || "Easy"),
        questionText: String(q.questionText || q.text || ""),
        optionA: String(q.optionA || ""),
        optionB: String(q.optionB || ""),
        optionC: String(q.optionC || ""),
        optionD: String(q.optionD || ""),
        optionE: String(q.optionE || ""),
        optionF: String(q.optionF || ""),
        correctAnswer: String(q.correctAnswer || q.answer || ""),
        marks: String(q.marks ?? ""),
        topic: String(q.topic || "general")
      }))
      : (exam.questionUpload?.rows || []).map((row, index) => ({ ...row, rowLabel: `Row ${index + 2}` }));
    const sourceLabel = backendQuestions.length
      ? "Live data fetched from the server"
      : (exam.questionUpload?.name ? `Source File: ${exam.questionUpload.name}` : "Uploaded questions for this exam.");
    const rows = backendQuestions.length
      ? backendQuestions.map((q, index) => normalizePreviewQuestion(q, index, exam.examCode))
      : state.data.questions.filter((q) => String(q.examId) === String(examId)).map((q, index) => normalizePreviewQuestion({
        questionText: q.text || q.questionText,
        questionType: q.type || q.questionType,
        difficulty: q.difficulty,
        topic: q.topic,
        marks: q.marks,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        optionE: q.optionE,
        optionF: q.optionF,
        correctAnswer: q.correctAnswer,
        sampleInput: q.sampleInput,
        sampleOutput: q.sampleOutput,
        examCode: exam.examCode
      }, index, exam.examCode));
    // Build accordion-style question list
    const diffColor = (d) => {
      if (!d) return "#6b7280";
      const dl = d.toLowerCase();
      if (dl === "easy") return "#10b981";
      if (dl === "medium") return "#f59e0b";
      if (dl === "hard") return "#ef4444";
      return "#6b7280";
    };
    const typeIcon = (t) => {
      const tl = String(t || "").toLowerCase();
      if (tl === "mcq") return "🔵";
      if (tl === "true/false" || tl === "tf" || tl === "truefalse") return "✅";
      if (tl.includes("code") || tl.includes("program")) return "💻";
      return "📝";
    };
    const optionLabels = ["A", "B", "C", "D", "E", "F"];
    const optionKeys  = ["optionA","optionB","optionC","optionD","optionE","optionF"];

    const accordionItems = rows.map((q, index) => {
      const qText   = normalizeDisplayText(q.questionText || q.text || "");
      const qType   = normalizeDisplayText(q.questionType || q.type || "MCQ");
      const qMarks  = normalizeDisplayText(q.marks || "");
      const qDiff   = normalizeDisplayText(q.difficulty || "");
      const qTopic  = normalizeDisplayText(q.topic || "");
      const correct = normalizeDisplayText(q.correctAnswer || q.answer || "");
      const qNum    = index + 1;

      // Collect options
      const optionsHtml = optionKeys.map((k, i) => {
        const val = normalizeDisplayText(q[k] || "");
        if (!val) return "";
        const isCorrect = correct.trim().toUpperCase() === optionLabels[i] ||
                          (correct.trim().length > 2 && correct.trim().toLowerCase() === val.toLowerCase());
        return `<div class="qac-option ${isCorrect ? "is-correct" : ""}">
          <span class="qac-opt-label">${optionLabels[i]}</span>
          <span class="qac-opt-text">${escapeHtml(val)}</span>
          ${isCorrect ? '<span class="qac-tick">✓</span>' : ""}
        </div>`;
      }).filter(Boolean).join("");

      // True/False or code question fallback
      const answersSection = optionsHtml
        ? `<div class="qac-options">${optionsHtml}</div>`
        : correct
          ? `<div class="qac-direct-answer"><span>Answer:</span><strong>${escapeHtml(correct)}</strong></div>`
          : "";

      return `
        <div class="qac-item" id="qac-item-${qNum}" data-index="${qNum}">
          <button type="button" class="qac-header" aria-expanded="false" data-target="qac-body-${qNum}">
            <span class="qac-num">${qNum}</span>
            <span class="qac-type-icon">${typeIcon(qType)}</span>
            <span class="qac-q-text">${escapeHtml(qText || "—")}</span>
            <div class="qac-chips">
              <span class="qac-chip" style="color:${diffColor(qDiff)};border-color:${diffColor(qDiff)}20;background:${diffColor(qDiff)}12">${escapeHtml(qDiff) || "?"}</span>
              <span class="qac-chip">${escapeHtml(qType) || "?"}</span>
              ${qMarks ? `<span class="qac-chip">⭐ ${escapeHtml(qMarks)}</span>` : ""}
            </div>
            <span class="qac-chevron">▾</span>
          </button>
          <div class="qac-body" id="qac-body-${qNum}" hidden>
            <div class="qac-body-inner">
              ${qTopic || correct ? `
              <div class="qac-meta-row">
                ${qTopic ? `<span class="qac-meta-pill">📚 ${escapeHtml(qTopic)}</span>` : ""}
                ${qDiff  ? `<span class="qac-meta-pill" style="color:${diffColor(qDiff)}">● ${escapeHtml(qDiff)}</span>` : ""}
                ${qMarks ? `<span class="qac-meta-pill">⭐ ${escapeHtml(qMarks)} mark${Number(qMarks)===1?"":"s"}</span>` : ""}
                ${correct && !optionsHtml ? "" : correct ? `<span class="qac-meta-pill is-answer">✓ ${escapeHtml(correct)}</span>` : ""}
              </div>` : ""}
              ${answersSection}
            </div>
          </div>
        </div>`;
    }).join("");

    const accordionHtml = rows.length
      ? `<div class="qac-list">${accordionItems}</div>`
      : `<div class="qac-empty"><div class="qac-empty-icon">📭</div><p>No questions uploaded for this exam yet.</p></div>`;

    openModal(`
      <div class="questions-modal qm-v2">
        <div class="qm-header">
          <div class="qm-header-left">
            <div class="qm-header-icon">📝</div>
            <div>
              <h3>Questions</h3>
              <p>${escapeHtml(exam.examCode)} · ${sourceLabel}</p>
            </div>
          </div>
          <div class="qm-header-right">
            <span class="qm-count-badge">${rows.length} Questions</span>
            <button id="qpCloseIcon" class="upload-close" aria-label="Close">&times;</button>
          </div>
        </div>

        <div class="qm-toolbar">
          <input type="text" id="qmSearch" class="qm-search" placeholder="🔍  Search questions…">
          <div class="qm-filter-chips">
            <button class="qm-filter active" data-diff="all">All</button>
            <button class="qm-filter" data-diff="easy" style="color:#10b981">Easy</button>
            <button class="qm-filter" data-diff="medium" style="color:#f59e0b">Medium</button>
            <button class="qm-filter" data-diff="hard" style="color:#ef4444">Hard</button>
          </div>
          <button class="qm-expand-all" id="qmExpandAll">Expand All</button>
        </div>

        <div class="qm-body" id="qmBody">
          ${accordionHtml}
        </div>

        <div class="qm-footer">
          <span class="qm-footer-info">${rows.length} questions · Click any row to expand</span>
          <button id="qpClose" class="btn ghost">Close</button>
        </div>
      </div>
    `);

    setupQuestionsTableScrollbars();
    dom.modalContainer.classList.add("questions-modal-host");

    // ── Accordion toggle (only one open at a time) ──
    let lastOpen = null;
    document.querySelectorAll(".qac-header").forEach((btn) => {
      btn.addEventListener("click", () => {
        const bodyId = btn.dataset.target;
        const body   = document.getElementById(bodyId);
        const item   = btn.closest(".qac-item");
        const isOpen = btn.getAttribute("aria-expanded") === "true";

        // Close previously open item
        if (lastOpen && lastOpen !== body) {
          lastOpen.hidden = true;
          lastOpen.closest(".qac-item")?.classList.remove("is-open");
          lastOpen.previousElementSibling?.setAttribute("aria-expanded", "false");
        }

        if (isOpen) {
          body.hidden = true;
          item.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
          lastOpen = null;
        } else {
          body.hidden = false;
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          lastOpen = body;
          // Scroll item into view
          setTimeout(() => item.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
        }
      });
    });

    // ── Search ──
    const searchInput = document.getElementById("qmSearch");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase().trim();
        document.querySelectorAll(".qac-item").forEach((item) => {
          const text = item.querySelector(".qac-q-text")?.textContent?.toLowerCase() || "";
          item.style.display = (!q || text.includes(q)) ? "" : "none";
        });
      });
    }

    // ── Difficulty filter ──
    document.querySelectorAll(".qm-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".qm-filter").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const diff = btn.dataset.diff;
        document.querySelectorAll(".qac-item").forEach((item) => {
          if (diff === "all") { item.style.display = ""; return; }
          const chip = item.querySelector(".qac-chip")?.textContent?.trim().toLowerCase() || "";
          item.style.display = chip === diff ? "" : "none";
        });
      });
    });

    // ── Expand All / Collapse All ──
    let allExpanded = false;
    const expandAllBtn = document.getElementById("qmExpandAll");
    if (expandAllBtn) {
      expandAllBtn.addEventListener("click", () => {
        allExpanded = !allExpanded;
        document.querySelectorAll(".qac-item").forEach((item) => {
          const hdr  = item.querySelector(".qac-header");
          const body = item.querySelector(".qac-body");
          if (!hdr || !body) return;
          body.hidden = !allExpanded;
          item.classList.toggle("is-open", allExpanded);
          hdr.setAttribute("aria-expanded", String(allExpanded));
        });
        expandAllBtn.textContent = allExpanded ? "Collapse All" : "Expand All";
        lastOpen = null;
      });
    }

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
            <p><strong>${item.studentName}</strong> Ã¢â‚¬Â¢ ${examName}</p>
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
            <article class="evidence-card sev-${r.sevClass} ${r.imageUrl ? "evidence-card-image" : ""}" data-preview-url="${r.imageUrl || ""}" data-preview-meta="${fmtDateTime(r.timestamp)} Ã¢â‚¬Â¢ ${r.severity}">
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
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    const keys = ["rows", "results", "attempts", "students", "records", "items", "list", "content"];
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  }

  function normalizeAnalyticsRow(raw, idx = 0) {
    const score = Number(raw?.score ?? raw?.obtainedMarks ?? 0);
    const totalQuestions = Number(raw?.totalQuestions ?? 0);
    const correctAnswers = Number(raw?.correctAnswers ?? 0);
    const percentageValue = raw?.percentage ?? (Number.isFinite(Number(raw?.obtainedMarks)) && Number.isFinite(Number(raw?.totalMarks)) && Number(raw?.totalMarks) > 0
      ? (Number(raw?.obtainedMarks) / Number(raw?.totalMarks)) * 100
      : (totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : score));
    const cheatingScore = Number(raw?.cheatingScore ?? 0);
    const flagged = Boolean(raw?.flaggedForCheating ?? raw?.flagged ?? raw?.cheatingFlag ?? cheatingScore > 70);
    return {
      id: String(raw?.attemptId || raw?.id || idx),
      studentName: String(raw?.studentName || raw?.student?.name || `Student ${idx + 1}`),
      score: Number.isFinite(score) ? score : 0,
      percentage: Number.isFinite(percentageValue) ? clamp(Math.round(percentageValue), 0, 100) : 0,
      submittedAt: raw?.submittedAt || raw?.startTime || raw?.createdAt || new Date().toISOString(),
      passed: raw?.passed !== undefined ? Boolean(raw.passed) : (Number.isFinite(percentageValue) ? percentageValue >= 40 : score >= 40),
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
      .map((r) => `${r.studentName} Ã¢â‚¬Â¢ ${fmtDateTime(r.submittedAt)} Ã¢â‚¬Â¢ ${r.score}`);
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
        const [attemptRes, summaryRes] = await Promise.allSettled([
          api.teacherExamAttempts(examCode),
          api.analyticsExam(examCode)
        ]);
        if (attemptRes.status === "rejected" && summaryRes.status === "rejected") throw new Error("both_failed");
        const attemptPayload = attemptRes.status === "fulfilled" ? attemptRes.value : null;
        const summaryPayload = summaryRes.status === "fulfilled" ? summaryRes.value : null;
        const rawRows = analyticsArray(attemptPayload).map((r, idx) => normalizeAnalyticsRow(r, idx));
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
        if (!state.data.analytics.summary && summaryPayload) {
          const avg = Number(summaryPayload?.data?.averageScore ?? summaryPayload?.data?.average ?? 0);
          const highest = Number(summaryPayload?.data?.highest ?? summaryPayload?.data?.highestScore ?? 0);
          const lowest = Number(summaryPayload?.data?.lowest ?? summaryPayload?.data?.lowestScore ?? 0);
          const totalStudents = Number(summaryPayload?.data?.totalStudents ?? summaryPayload?.data?.totalAttempts ?? 0);
          state.data.analytics.summary = {
            avg,
            highest,
            lowest,
            passPct: 0,
            totalStudents,
            passCount: 0,
            failCount: 0,
            distribution: [0, 0, 0, 0, 0],
            trend: [],
            trendLabels: [],
            accuracy: [],
            safeCount: 0,
            flaggedCount: 0,
            difficulty: [0, 0, 0]
          };
        }
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
    const totalParticipants = rows.length;
    const topRow = rows[0] || null;
    const averageScore = totalParticipants ? Math.round(rows.reduce((sum, r) => sum + Number(r.score || 0), 0) / totalParticipants) : 0;
    const topPercentage = topRow ? Number(topRow.percentage || 0) : 0;
    const currentModeLabel = state.ui.leaderboard.mode === "global" ? "Global" : "Exam";

    if (dom.leaderboardSummaryGrid) {
      dom.leaderboardSummaryGrid.innerHTML = topRow ? `
        <article class="card leaderboard-mini-card leaderboard-mini-top">
          <div class="leaderboard-mini-icon"><i class="fa-regular fa-star"></i></div>
          <div class="leaderboard-mini-copy">
            <small>Top Score</small>
            <strong>${topPercentage}%</strong>
            <span>${topRow.studentName}</span>
          </div>
        </article>
        <article class="card leaderboard-mini-card">
          <div class="leaderboard-mini-icon"><i class="fa-solid fa-users"></i></div>
          <div class="leaderboard-mini-copy">
            <small>Total Participants</small>
            <strong>${totalParticipants}</strong>
            <span>${currentModeLabel} cohort</span>
          </div>
        </article>
        <article class="card leaderboard-mini-card">
          <div class="leaderboard-mini-icon"><i class="fa-solid fa-chart-simple"></i></div>
          <div class="leaderboard-mini-copy">
            <small>Average Score</small>
            <strong>${averageScore}%</strong>
            <span>Across current filter</span>
          </div>
        </article>
      ` : `
        <article class="card leaderboard-mini-card leaderboard-mini-empty"><div class="leaderboard-mini-copy"><small>No leaderboard data</small><strong>-</strong><span>Try a different exam</span></div></article>
      `;
    }

    if (dom.leaderboardHeroCard) {
      dom.leaderboardHeroCard.innerHTML = topRow ? `
        <div class="leaderboard-hero-head">
          <div>
            <small>Your Rank</small>
            <h3>#${topRow.rank || 1} ${topRow.studentName}</h3>
            <p>${currentModeLabel} leaderboard position for the active dataset.</p>
          </div>
          <span class="status-pill status-published">Top Performer</span>
        </div>
        <div class="leaderboard-hero-metrics">
          <article class="leaderboard-hero-metric">
            <span>Score</span>
            <strong>${Number(topRow.score || 0)}</strong>
          </article>
          <article class="leaderboard-hero-metric">
            <span>Percentage</span>
            <strong>${topPercentage}%</strong>
          </article>
          <article class="leaderboard-hero-metric">
            <span>Mode</span>
            <strong>${currentModeLabel}</strong>
          </article>
        </div>
      ` : `
        <div class="leaderboard-empty-panel">No leaderboard data available for the selected filters.</div>
      `;
    }

    if (!rows.length) {
      const message = state.ui.leaderboard.mode === "exam"
        ? "Leaderboard not available for selected exam"
        : "Leaderboard not available right now";
      dom.leaderboardBody.innerHTML = `<tr><td colspan="4"><div class="no-data">${message}</div></td></tr>`;
      return;
    }

    dom.leaderboardBody.innerHTML = rows.map((r, idx) => {
      const rank = Number(r.rank || idx + 1);
      const topCls = rank === 1 ? "top-gold" : rank === 2 ? "top-silver" : rank === 3 ? "top-bronze" : "";
      const pct = Number(r.percentage || 0);
      return `
        <tr class="leaderboard-row ${topCls}">
          <td><span class="rank-pill">${rank}</span></td>
          <td>
            <div class="leaderboard-student-cell">
              <span class="leaderboard-avatar">${String(r.studentName || "?").trim().charAt(0).toUpperCase()}</span>
              <div>
                <strong>${r.studentName}</strong>
                ${rank === 1 ? '<span class="leaderboard-tag">Top performer</span>' : ""}
              </div>
            </div>
          </td>
          <td>${r.score}</td>
          <td>
            <div class="leaderboard-pct-wrap">
              <span class="percent-pill ${percentageClass(pct)}">${pct}%</span>
              <div class="leaderboard-progress"><span style="width:${clamp(pct, 0, 100)}%"></span></div>
            </div>
          </td>
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
        <small>Accuracy: ${w.accuracy}% Ã¢â‚¬Â¢ Difficulty: ${w.difficulty} Ã¢â‚¬Â¢ Priority: ${w.priorityScore}</small>
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

  function certificateSummaryCards(certificates) {
    const items = Array.isArray(certificates) ? certificates : [];
    const total = items.length;
    const revoked = items.filter((c) => Boolean(c.revoked)).length;
    const verified = items.filter((c) => !c.revoked && !c.pending).length;
    const pending = items.filter((c) => Boolean(c.pending)).length;

    const cards = [
      {
        label: "Total Certificates",
        value: total,
        caption: "All time issued",
        icon: "fa-file-certificate",
        iconClass: "cert-sum-icon cert-sum-blue"
      },
      {
        label: "Verified",
        value: verified,
        caption: "Successfully verified",
        icon: "fa-shield-check",
        iconClass: "cert-sum-icon cert-sum-green"
      },
      {
        label: "Pending Verification",
        value: pending,
        caption: "Awaiting verification",
        icon: "fa-clock",
        iconClass: "cert-sum-icon cert-sum-orange"
      },
      {
        label: "Revoked",
        value: revoked,
        caption: "Revoked certificates",
        icon: "fa-circle-xmark",
        iconClass: "cert-sum-icon cert-sum-red"
      }
    ];
    return cards.map((card) => `
      <article class="cert-summary-card">
        <div class="${card.iconClass}"><i class="fa-solid ${card.icon}"></i></div>
        <div class="cert-sum-body">
          <p class="cert-sum-label">${card.label}</p>
          <strong class="cert-sum-value">${card.value}</strong>
          <p class="cert-sum-caption">${card.caption}</p>
        </div>
      </article>
    `).join("");
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
        try { data = await res.json(); } catch (_e) { }
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

  function certificateQrMarkup(cert) {
      const value = String(cert.qrCodeData || "").trim();
      if(!value) {
        return "<div class='qr-fallback'>QR Not Available</div>";
      }
    const isImageUrl = /^data:image\//i.test(value)
        || /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(value);
      if(isImageUrl) {
        return `<img src="${value}" alt="QR Code">`;
      }
    return `<div class="qr-fallback"><small>Verification URL</small><code>${value}</code></div>`;
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
            try { data = await res.json(); } catch (_e) { }
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
        try { await api.certificateRevoke(cert.certificateId); } catch (_e) { }
        cert.revoked = true;
        renderCertificates();
        addNotification(`Certificate ${cert.certificateId} revoked.`);
        toast("Certificate revoked.");
      }

  function certificatePreviewMarkup(c) {
        const score = Number.isFinite(Number(c.score)) ? c.score : "-";
        const issued = fmtDateTime(c.issuedAt);
        return `
      <div class="certificate-preview-artwork">
        <!-- Corner brackets -->
        <div class="corner-bracket top-left"></div>
        <div class="corner-bracket top-right"></div>
        <div class="corner-bracket bottom-left"></div>
        <div class="corner-bracket bottom-right"></div>
        
        <!-- Dot grids -->
        <div class="dot-grid left-grid"></div>
        <div class="dot-grid right-grid"></div>
        
        <!-- Background waves SVG -->
        <div class="wave-background">
          <svg viewBox="0 0 200 400" preserveAspectRatio="none">
            <path d="M120 0 C 150 100, 80 200, 160 300 T 120 400" fill="none" stroke="rgba(59, 48, 219, 0.04)" stroke-width="1.5"></path>
            <path d="M140 0 C 170 100, 100 200, 180 300 T 140 400" fill="none" stroke="rgba(59, 48, 219, 0.04)" stroke-width="1.5"></path>
            <path d="M160 0 C 190 100, 120 200, 200 300 T 160 400" fill="none" stroke="rgba(59, 48, 219, 0.04)" stroke-width="1.5"></path>
          </svg>
        </div>

        <div class="certificate-preview-topbar">
          <div class="certificate-brand-lockup">
            <div class="certificate-brand-logo">
              <div class="logo-shield">
                <span class="star">★</span>
                <span class="dot"></span>
              </div>
            </div>
            <div class="brand-text">
              <strong class="brand-name">SEM</strong>
              <span class="brand-title">SMART EXAM MONITOR</span>
              <span class="brand-motto">Examine. Evaluate. Excel.</span>
            </div>
          </div>
          <div class="certificate-badge-pill">
            <div class="badge-icon">★</div>
            <div class="badge-copy">
              <strong>EXAM COMPLETED</strong>
              <span>Successfully Certified</span>
            </div>
          </div>
        </div>

        <div class="certificate-main-content">
          <p class="certificate-preview-subtitle">This is to certify that</p>
          <h2 class="certificate-preview-name">${escapeHtml(c.studentName || 'Student')}</h2>
          
          <div class="name-divider">
            <span class="line"></span>
            <span class="diamond">♦</span>
            <span class="line"></span>
          </div>

          <div class="certificate-preview-title">
            <span>Certificate of</span>
            <strong>Excellence</strong>
          </div>
          
          <p class="certificate-preview-bodycopy">
            has successfully completed the examination in<br>
            <strong class="subject-title">${escapeHtml(c.examTitle || c.examCode || 'Online Examination')}</strong><br>
            with a score of <strong class="score-highlight">${score}/100</strong> on ${escapeHtml(issued)}
          </p>

          <div class="bottom-divider">
            <span class="line"></span>
            <span class="diamond">♦</span>
            <span class="line"></span>
          </div>
        </div>

        <div class="certificate-preview-footer">
          <div class="certificate-footer-qr-col">
            <div class="qr-box-wrapper">
              <img src="/api/certificate/verify/${encodeURIComponent(c.certificateId)}/qr" onerror="this.src='https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=verify:${c.certificateId}'" class="qr-image" alt="QR Code">
            </div>
            <small class="scan-verify-text">SCAN TO VERIFY</small>
          </div>

          <div class="certificate-footer-signature-col">
            <span class="signature-cursive">Exam Authority</span>
            <div class="signature-line"></div>
            <span class="sign-title">EXAM AUTHORITY</span>
            <small class="sign-subtitle">SEM Platform - Examinations</small>
          </div>

          <div class="certificate-footer-id-col">
            <span class="id-label">CERTIFICATE ID</span>
            <strong class="id-value">${escapeHtml(c.certificateId)}</strong>
            <span class="issue-date-label">Issued: ${escapeHtml(issued)}</span>
          </div>
        </div>
      </div>`;
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
          <div class="certificate-preview-shell" style="max-width: 800px; margin: 0 auto 20px;">
            <div class="certificate-preview-frame">
              ${certificatePreviewMarkup(cert)}
            </div>
          </div>
          <div class="certificate-security">
            <h4>Security</h4>
            <div class="security-grid">
              <div class="verify-url-wrap" style="flex: 1; min-width: 250px;">
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
        const certificates = state.data.certificates.map((raw, idx) => normalizeCertificate(raw, idx));
        if (dom.certificatesSummary) dom.certificatesSummary.innerHTML = certificateSummaryCards(certificates);
        if (!dom.certificatesGrid) return;

        // Pagination
        const PAGE_SIZE = 6;
        if (!state.ui.certPage) state.ui.certPage = 1;
        const totalPages = Math.max(1, Math.ceil(certificates.length / PAGE_SIZE));
        if (state.ui.certPage > totalPages) state.ui.certPage = totalPages;
        const start = (state.ui.certPage - 1) * PAGE_SIZE;
        const paginated = certificates.slice(start, start + PAGE_SIZE);

        dom.certificatesGrid.innerHTML = paginated.map((c) => {
          const cid = c.certificateId;
          const score = Number.isFinite(Number(c.score)) ? (c.score % 1 === 0 ? c.score : parseFloat(c.score).toFixed(2)) : "-";
          const issuedDate = fmtDateTime(c.issuedAt);
          return `
      <article class="cert-card ${c.revoked ? "cert-card--revoked" : "cert-card--issued"}">
        <div class="cert-card-top">
          <div class="cert-card-meta">
            <span class="cert-exam-label">${escapeHtml(c.examTitle || "Exam")}</span>
            <div class="cert-id-row">
              <h3 class="cert-id">${escapeHtml(c.certificateId)}</h3>
              ${certificateStatusBadge(c)}
            </div>
          </div>
          <div class="cert-score-box">
            <span class="cert-score-value">${score}</span>
            <span class="cert-score-label">Score</span>
          </div>
        </div>
        <div class="cert-card-info">
          <div class="cert-info-row"><i class="fa-regular fa-user"></i><span>${escapeHtml(c.studentName)}</span></div>
          <div class="cert-info-row"><i class="fa-regular fa-building"></i><span>${escapeHtml(c.collegeName)}</span></div>
          <div class="cert-info-row"><i class="fa-solid fa-book-open"></i><span>${escapeHtml(c.department)}</span></div>
          <div class="cert-info-row"><i class="fa-regular fa-calendar"></i><span>${issuedDate}</span></div>
        </div>
        <div class="cert-card-footer">
          <button class="cert-action-btn" data-cert-action="view" data-id="${cid}" data-no-buffer="true">
            <i class="fa-regular fa-eye"></i>View
          </button>
          <button class="cert-action-btn" data-cert-action="download" data-id="${cid}" data-no-buffer="true">
            <i class="fa-solid fa-download"></i>Download
          </button>
          <button class="cert-action-btn" data-cert-action="verify" data-id="${cid}" data-no-buffer="true">
            <i class="fa-solid fa-circle-check"></i>Verify
          </button>
          ${!c.revoked ? `<button class="cert-action-btn cert-action-btn--danger" data-cert-action="revoke" data-id="${cid}" data-no-buffer="true">
            <i class="fa-solid fa-ban"></i>Revoke
          </button>` : ""}
        </div>
      </article>
    `;
        }).join("") || `<div class="no-data certificate-empty">No certificates available.</div>`;

        // Render pagination
        const paginationEl = document.getElementById("certPagination");
        if (paginationEl) {
          if (totalPages <= 1) {
            paginationEl.innerHTML = "";
          } else {
            paginationEl.innerHTML = `
              <button class="cert-page-btn" ${state.ui.certPage === 1 ? "disabled" : ""} data-cert-page="${state.ui.certPage - 1}">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
                <button class="cert-page-btn ${p === state.ui.certPage ? "cert-page-btn--active" : ""}" data-cert-page="${p}">${p}</button>
              `).join("")}
              <button class="cert-page-btn" ${state.ui.certPage === totalPages ? "disabled" : ""} data-cert-page="${state.ui.certPage + 1}">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            `;
            paginationEl.querySelectorAll("[data-cert-page]").forEach(btn => {
              btn.addEventListener("click", () => {
                state.ui.certPage = Number(btn.dataset.certPage);
                renderCertificates();
              });
            });
          }
        }
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
        try { await navigator.clipboard.writeText(link); } catch (_e) { }
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
          <p>${att.studentName} Ã¢â‚¬Â¢ ${examTitle(att.examId)}</p>
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
          window.TeacherNotificationHub.clear()?.catch?.(() => { });
          return;
        }
        state.data.notifications = [];
        renderNotifications();
      });
      on(dom.markAllNotificationsRead, "click", () => {
        if (window.TeacherNotificationHub?.markAllRead) {
          window.TeacherNotificationHub.markAllRead()?.catch?.(() => { });
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
      }); on(dom.examPageSize, "change", () => {
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

      // ─── Profile Edit: staged popup modal ───────────────────────────────────
      on(dom.profileEditBtn, "click", () => openProfileEditModal());

      function openProfileEditModal() {
        let stage = 1;
        const t = state.teacher;
        let localImg = t.profileImage || "";
        let localImgFile = null;

        function stageChips() {
          return `
            <div class="pf-modal-stages">
              ${[["Personal Info",1],["Professional Info",2],["Photo",3]].map(([label, n]) => `
                <div class="pf-stage-chip ${stage === n ? "active" : stage > n ? "done" : ""}">
                  <div class="pf-stage-dot">${stage > n ? '<i class="fa-solid fa-check"></i>' : n}</div>
                  <span>${label}</span>
                </div>
                ${n < 3 ? '<div class="pf-stage-line ' + (stage > n ? "done" : "") + '"></div>' : ""}
              `).join("")}
            </div>`;
        }

        function stageBody() {
          if (stage === 1) return `
            <div class="pf-modal-stage-body" data-stage="1">
              <div class="pf-edit-grid">
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Full Name <span class="pf-req">*</span></label>
                  <input id="pfmName" class="pf-edit-input" type="text" value="${escapeHtml(t.name || "")}" placeholder="Enter full name" autocomplete="name">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Email</label>
                  <input class="pf-edit-input" type="email" value="${escapeHtml(t.email || "")}" readonly disabled placeholder="Email (read-only)">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Phone Number</label>
                  <input id="pfmPhone" class="pf-edit-input" type="tel" value="${escapeHtml(t.phone || "")}" placeholder="e.g. 9876543210" autocomplete="tel">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Department</label>
                  <input id="pfmDepartment" class="pf-edit-input" type="text" value="${escapeHtml(t.department || "")}" placeholder="e.g. Computer Science" autocomplete="organization">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Gender</label>
                  <select id="pfmGender" class="pf-edit-input pf-edit-select">
                    <option value="">Select Gender</option>
                    ${["Male","Female","Non-binary","Prefer not to say"].map(g => `<option value="${g}" ${(t.gender||"") === g ? "selected" : ""}>${g}</option>`).join("")}
                  </select>
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Address</label>
                  <input id="pfmAddress" class="pf-edit-input" type="text" value="${escapeHtml(t.address || "")}" placeholder="City, State, Country" autocomplete="street-address">
                </div>
              </div>
            </div>`;
          if (stage === 2) return `
            <div class="pf-modal-stage-body" data-stage="2">
              <div class="pf-edit-grid">
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Designation</label>
                  <input id="pfmDesignation" class="pf-edit-input" type="text" value="${escapeHtml(t.designation || "")}" placeholder="e.g. Senior Lecturer">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Experience (Years)</label>
                  <input id="pfmExperience" class="pf-edit-input" type="number" min="0" max="60" value="${t.experienceYears || 0}" placeholder="Years of experience">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Qualification</label>
                  <input id="pfmQualification" class="pf-edit-input" type="text" value="${escapeHtml(t.qualification || "")}" placeholder="e.g. Ph.D in Computer Science">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Employee ID</label>
                  <input class="pf-edit-input" type="text" value="${escapeHtml(t.employeeId || "")}" readonly disabled placeholder="Employee ID (read-only)">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Date of Birth</label>
                  <input id="pfmDob" class="pf-edit-input" type="date" value="${t.dateOfBirth ? String(t.dateOfBirth).slice(0,10) : ""}">
                </div>
                <div class="pf-edit-field">
                  <label class="pf-edit-label">Date of Joining</label>
                  <input class="pf-edit-input" type="text" value="${t.createdAt ? fmtDate(t.createdAt) : "-"}" readonly disabled>
                </div>
              </div>
            </div>`;
          if (stage === 3) return `
            <div class="pf-modal-stage-body" data-stage="3">
              <div class="pf-photo-stage">
                <div class="pf-photo-preview-wrap">
                  <img id="pfmAvatarPreview" src="${localImg || profileInitialAvatar(t.name)}" alt="Profile Photo" class="pf-photo-preview">
                  <div class="pf-photo-overlay" id="pfmPhotoOverlay">
                    <i class="fa-solid fa-camera"></i>
                    <span>Change Photo</span>
                  </div>
                </div>
                <input id="pfmImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
                <p class="pf-photo-hint">Click photo to upload. Supported: JPG, PNG, WEBP. Max 5 MB.</p>
                <div class="pf-photo-actions">
                  <button type="button" class="btn ghost" id="pfmUploadBtn"><i class="fa-solid fa-upload"></i>Upload Photo</button>
                  <button type="button" class="btn ghost pf-remove-btn" id="pfmRemoveBtn"><i class="fa-solid fa-trash-can"></i>Remove</button>
                </div>
              </div>
            </div>`;
          return "";
        }

        function renderModal() {
          const isLast = stage === 3;
          dom.modalContainer.innerHTML = `
            <div class="pf-edit-modal">
              <div class="pf-modal-head">
                <div class="pf-modal-title-wrap">
                  <div class="pf-modal-icon"><i class="fa-regular fa-pen-to-square"></i></div>
                  <div>
                    <h3 class="pf-modal-title">Edit Profile</h3>
                    <p class="pf-modal-sub">Update your personal and professional details</p>
                  </div>
                </div>
                <button class="pf-modal-close" id="pfModalCloseBtn" aria-label="Close">&times;</button>
              </div>
              ${stageChips()}
              <div class="pf-modal-body">
                ${stageBody()}
              </div>
              <div class="pf-modal-footer">
                <button type="button" class="btn ghost" id="pfModalCancelBtn">${stage === 1 ? "Cancel" : "Back"}</button>
                <button type="button" class="btn primary pf-modal-next-btn" id="pfModalNextBtn">
                  ${isLast ? '<i class="fa-solid fa-check"></i>Save Profile' : 'Next <i class="fa-solid fa-arrow-right"></i>'}
                </button>
              </div>
            </div>
          `;
          dom.modalContainer.classList.remove("hidden");
          dom.modalContainer.classList.add("pf-modal-host");

          // Close handlers
          document.getElementById("pfModalCloseBtn").addEventListener("click", closePfModal);
          document.getElementById("pfModalCancelBtn").addEventListener("click", () => {
            if (stage === 1) closePfModal();
            else { stage--; renderModal(); }
          });

          // Next/Save
          document.getElementById("pfModalNextBtn").addEventListener("click", async () => {
            if (!collectStageData()) return;
            if (stage < 3) {
              stage++;
              renderModal();
              return;
            }
            // Final save
            await savePfModal();
          });

          // Photo stage wiring
          if (stage === 3) {
            const overlay = document.getElementById("pfmPhotoOverlay");
            const uploadBtn = document.getElementById("pfmUploadBtn");
            const removeBtn = document.getElementById("pfmRemoveBtn");
            const fileInput = document.getElementById("pfmImageFile");
            const preview = document.getElementById("pfmAvatarPreview");

            const triggerUpload = () => fileInput.click();
            if (overlay) overlay.addEventListener("click", triggerUpload);
            if (uploadBtn) uploadBtn.addEventListener("click", triggerUpload);
            if (removeBtn) removeBtn.addEventListener("click", () => {
              localImg = profileInitialAvatar(t.name);
              localImgFile = null;
              if (preview) preview.src = localImg;
            });
            if (fileInput) fileInput.addEventListener("change", async () => {
              const file = fileInput.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) { toast("File too large. Max 5 MB.", "error"); return; }
              localImgFile = file;
              localImg = await readFileAsDataUrl(file);
              if (preview) preview.src = localImg;
            });
          }
        }

        function collectStageData() {
          if (stage === 1) {
            const name = document.getElementById("pfmName")?.value?.trim();
            if (!name) {
              document.getElementById("pfmName")?.classList.add("pf-edit-error");
              toast("Full name is required.", "error");
              return false;
            }
            document.getElementById("pfmName")?.classList.remove("pf-edit-error");
            t.name = name;
            t.phone = document.getElementById("pfmPhone")?.value?.trim() || t.phone;
            t.department = document.getElementById("pfmDepartment")?.value?.trim() || t.department;
            t.gender = document.getElementById("pfmGender")?.value || t.gender;
            t.address = document.getElementById("pfmAddress")?.value?.trim() || t.address;
          }
          if (stage === 2) {
            t.designation = document.getElementById("pfmDesignation")?.value?.trim() || t.designation;
            t.experienceYears = Number(document.getElementById("pfmExperience")?.value || 0);
            t.qualification = document.getElementById("pfmQualification")?.value?.trim() || t.qualification;
            t.dateOfBirth = document.getElementById("pfmDob")?.value || t.dateOfBirth;
          }
          return true;
        }

        async function savePfModal() {
          const nextBtn = document.getElementById("pfModalNextBtn");
          if (nextBtn) { nextBtn.disabled = true; nextBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Saving...'; }
          try {
            // Upload photo if changed
            if (localImgFile) {
              try {
                const uploaded = await api.userUploadImage(localImgFile);
                const url = String(uploaded?.profileImage || uploaded?.url || uploaded?.imageUrl || "").trim();
                if (url) t.profileImage = url;
                else t.profileImage = localImg;
              } catch (_e) { t.profileImage = localImg; }
            }
            const payload = {
              name: t.name, phone: t.phone, department: t.department,
              designation: t.designation, experienceYears: t.experienceYears,
              qualification: t.qualification, profileImage: t.profileImage,
              gender: t.gender, address: t.address, dateOfBirth: t.dateOfBirth
            };
            const updated = await api.userUpdate(payload);
            state.teacher = normalizeTeacher({ ...state.teacher, ...payload, ...(updated || {}), updatedAt: new Date().toISOString() });
            state.ui.profile.snapshot = { ...state.teacher };
            populateTeacher();
            closePfModal();
            toast("Profile updated successfully.");
            await loadProfileData();
          } catch (_e) {
            toast("Failed to update profile.", "error");
            if (nextBtn) { nextBtn.disabled = false; nextBtn.innerHTML = '<i class="fa-solid fa-check"></i>Save Profile'; }
          }
        }

        function closePfModal() {
          dom.modalContainer.classList.add("hidden");
          dom.modalContainer.classList.remove("pf-modal-host");
          dom.modalContainer.innerHTML = "";
        }

        renderModal();
      }

      // Legacy compat handlers (kept but now no-ops since form is hidden)
      on(dom.profileCancelBtn, "click", () => {
        state.teacher = normalizeTeacher(state.ui.profile.snapshot || state.teacher);
        populateTeacher();
        setProfileEditMode(false);
      });
      on(dom.profileForm, "submit", async (e) => {
        e.preventDefault();
      });
      on(dom.pfName, "input", () => dom.pfName?.classList?.remove("field-error"));

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
        } catch (_e) { }
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
        state.settings.alerts = !!dom.stAlerts?.checked;
        renderSettings();
      };
      [dom.stNotif, dom.stAlerts].forEach((el) => on(el, "change", syncSettingsFromInputs));
      on(dom.stSave, "click", async () => {
        if (!state.ui.settings.dirty || state.ui.settings.saving) return;
        const snapshot = state.ui.settings.baseline || {
          notifications: state.settings.notifications,
          alerts: state.settings.alerts
        };
        state.ui.settings.saving = true;
        [dom.stNotif, dom.stAlerts, dom.stSessionReset, dom.stApiTest, dom.stSave].forEach((el) => {
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
          [dom.stNotif, dom.stAlerts, dom.stSessionReset, dom.stApiTest].forEach((el) => {
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
            window.location.href = "login.html";
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
      // Live updates disabled by request
    }

    async function init() {
      try {
        Object.assign(dom, ids());
        applyTheme(state.ui.themeMode);

        populateTeacher();
        setProfileEditMode(false);

        const attemptsTableCard = dom.attemptsTableBody?.closest(".table-card");
        dom.examMorePortal = document.createElement("div");
        dom.examMorePortal.className = "exam-more-portal";
        document.body.appendChild(dom.examMorePortal);
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
  }) ();
