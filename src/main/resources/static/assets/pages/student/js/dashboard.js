(function () {
  const apiBase = /^https?:/i.test(window.location.origin) ? window.location.origin : "http://localhost:8080";
  const token = () => localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("jwt") || "";
  const unwrap = (payload) => {
    if (payload && typeof payload === "object" && "data" in payload && ("status" in payload || "message" in payload)) {
      return payload.data;
    }
    return payload;
  };
  const txt = (value, fallback = "-") => {
    const out = value == null ? "" : String(value).trim();
    return out || fallback;
  };
  const num = (value, fallback = 0) => {
    const out = Number(value);
    return Number.isFinite(out) ? out : fallback;
  };
  const arr = (value) => Array.isArray(value) ? value : [];
  const fmtDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? txt(value) : d.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" });
  };
  const fmtDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? txt(value) : d.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };
  const initials = (value) => {
    const parts = txt(value, "Student").split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "S";
  };
  const safeSearch = (value) => txt(value, "").toLowerCase();

  const state = {
    me: null,
    profile: null,
    profileCompleted: false,
    dashboard: null,
    stats: null,
    alerts: null,
    trend: [],
    history: null,
    certificates: [],
    leaderboard: [],
    charts: {},
    search: "",
    activeSection: "overview"
  };

  const dom = {};

  function bindDom() {
    [
      "student-loader",
      "student-refresh-btn",
      "hero-reload",
      "student-search",
      "hero-title",
      "hero-desc",
      "hero-status",
      "hero-last-attempt",
      "hero-profile-completion",
      "profile-status-pill",
      "metric-attempted",
      "metric-pending",
      "metric-average",
      "metric-passrate",
      "metric-certs",
      "metric-rank",
      "metric-alerts",
      "metric-last-attempt",
      "metric-weak-topics",
      "exam-grid",
      "attempts-body",
      "weak-topics-list",
      "suggestion-list",
      "certificate-grid",
      "leaderboard-body",
      "sidebar-avatar",
      "sidebar-name",
      "sidebar-dept",
      "profile-avatar",
      "profile-name",
      "profile-email",
      "profile-complete-badge",
      "profile-college",
      "profile-dept",
      "profile-year",
      "profile-roll",
      "profile-section",
      "profile-status",
      "trend-note",
      "performanceChart",
      "passFailChart",
      "toast-root"
    ].forEach((id) => { dom[id] = document.getElementById(id); });
  }

  function isLikelyJwt(value) {
    const parts = txt(value, "").split(".");
    return parts.length === 3 && parts.every(Boolean);
  }

  function ensureAuth() {
    const value = token();
    if (!value || !isLikelyJwt(value)) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("jwt");
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function showLoader(active) {
    dom["student-loader"]?.classList.toggle("active", !!active);
  }

  function showToast(message, kind = "info") {
    const root = dom["toast-root"];
    if (!root) return;
    const node = document.createElement("div");
    node.className = `toast ${kind}`;
    node.textContent = txt(message, "Unexpected error");
    root.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function apiUrl(path) {
    const raw = txt(path, "");
    if (!raw) return apiBase;
    if (/^https?:/i.test(raw)) return raw;
    return `${apiBase}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }

  async function parseResponse(response) {
    const contentType = txt(response.headers.get("content-type")).toLowerCase();
    if (contentType.includes("application/json")) {
      return response.json().catch(() => ({}));
    }
    return response.text().catch(() => "");
  }

  async function request(path, options = {}, meta = {}) {
    if (!ensureAuth()) {
      throw new Error("Missing student session");
    }

    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json,text/plain,*/*");
    const authToken = txt(token(), "");
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

    const reqOptions = { ...options, headers };
    if (reqOptions.body && !(reqOptions.body instanceof FormData) && !(reqOptions.body instanceof Blob) && !(reqOptions.body instanceof URLSearchParams)) {
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (typeof reqOptions.body !== "string") reqOptions.body = JSON.stringify(reqOptions.body);
    }

    const response = await fetch(apiUrl(path), reqOptions);
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("jwt");
      showToast("Your session expired. Please login again.", "error");
      window.location.href = "login.html";
      throw new Error(`Auth ${response.status}`);
    }

    if (!response.ok) {
      let message = response.statusText || `Request failed (${response.status})`;
      try {
        const raw = await response.clone().text();
        if (raw) {
          try {
            const json = JSON.parse(raw);
            message = txt(json.message || json.error || json.cause || json.detail, message);
          } catch (_e) {
            message = txt(raw, message);
          }
        }
      } catch (_e) {}

      if (!meta.silent) showToast(message, "error");
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return parseResponse(response);
  }

  async function fetchRaw(path, options = {}) {
    if (!ensureAuth()) throw new Error("Missing student session");
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json,text/plain,*/*");
    const authToken = txt(token(), "");
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
    const reqOptions = { ...options, headers };
    if (reqOptions.body && !(reqOptions.body instanceof FormData) && !(reqOptions.body instanceof Blob) && !(reqOptions.body instanceof URLSearchParams)) {
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (typeof reqOptions.body !== "string") reqOptions.body = JSON.stringify(reqOptions.body);
    }
    return fetch(apiUrl(path), reqOptions);
  }

  function mapProfile(rawUser, rawProfile) {
    const user = rawUser || {};
    const profile = rawProfile || {};
    const name = txt(profile.fullName || user.name || "Student");
    return {
      name,
      email: txt(profile.email || user.email || "-"),
      phone: txt(profile.phone || user.phone || "-"),
      gender: txt(profile.gender || "-"),
      dateOfBirth: txt(profile.dateOfBirth || "-"),
      collegeName: txt(profile.collegeName || "-"),
      department: txt(profile.department || user.department || "-"),
      year: txt(profile.year || "-"),
      rollNumber: txt(profile.rollNumber || "-"),
      section: txt(profile.section || "-"),
      profilePhoto: profile.profilePhoto || user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`,
      profileCompleted: Boolean(profile.profileCompleted)
    };
  }

  function normalizeLeaderboard(rows) {
    return arr(rows).map((row) => ({
      studentId: num(row.studentId, 0),
      studentName: txt(row.studentName || row.name || `Student-${row.studentId}`),
      score: num(row.score),
      percentage: num(row.percentage),
      rank: num(row.rank)
    }));
  }

  function normalizeCertificates(rows) {
    return arr(rows).map((cert) => ({
      id: txt(cert.certificateId || cert.id),
      studentName: txt(cert.studentName || "Student"),
      examTitle: txt(cert.examTitle || cert.examCode || "Exam"),
      score: num(cert.score),
      grade: txt(cert.grade || "NA"),
      issuedAt: cert.issuedAt || cert.createdAt || null,
      revoked: Boolean(cert.revoked),
      pdfUrl: `/api/certificate/download/${encodeURIComponent(cert.certificateId || cert.id)}`
    }));
  }

  function normalizeAttemptRows(rows) {
    return arr(rows).map((item, index) => ({
      examCode: txt(item.examCode || `Exam-${index + 1}`),
      obtainedMarks: num(item.obtainedMarks),
      totalMarks: num(item.totalMarks),
      percentage: num(item.percentage),
      badge: txt(item.badge || "PARTICIPANT")
    }));
  }

  function renderShell() {
    const name = txt(state.profile?.name || state.me?.name || "Student");
    const dept = txt(state.profile?.department || state.me?.department || "Student");
    const email = txt(state.profile?.email || state.me?.email || "-");
    const avatar = state.profile?.profilePhoto || state.me?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;

    if (dom["sidebar-avatar"]) dom["sidebar-avatar"].src = avatar;
    if (dom["sidebar-name"]) dom["sidebar-name"].textContent = name;
    if (dom["sidebar-dept"]) dom["sidebar-dept"].textContent = dept;
    if (dom["profile-avatar"]) dom["profile-avatar"].src = avatar;
    if (dom["profile-name"]) dom["profile-name"].textContent = name;
    if (dom["profile-email"]) dom["profile-email"].textContent = email;
    if (dom["hero-title"]) dom["hero-title"].textContent = `Welcome back, ${name}.`;
    if (dom["hero-desc"]) {
      dom["hero-desc"].textContent = state.profile?.profileCompleted
        ? "Your profile is complete and your live exam performance is synced from the backend."
        : "Complete your profile to unlock certificates, identity verification, and clean record tracking.";
    }
    if (dom["hero-status"]) dom["hero-status"].textContent = state.profile?.profileCompleted ? "Operational" : "Profile incomplete";
    if (dom["hero-profile-completion"]) dom["hero-profile-completion"].textContent = `${state.profile?.profileCompleted ? 100 : 0}%`;
    if (dom["profile-status-pill"]) {
      dom["profile-status-pill"].textContent = state.profile?.profileCompleted ? "Profile complete" : "Profile requires attention";
    }
    if (dom["profile-complete-badge"]) {
      dom["profile-complete-badge"].textContent = state.profile?.profileCompleted ? "Completed" : "Incomplete";
      dom["profile-complete-badge"].className = `status-pill ${state.profile?.profileCompleted ? "success" : "warning"}`;
    }
    if (dom["profile-college"]) dom["profile-college"].textContent = txt(state.profile?.collegeName || "-");
    if (dom["profile-dept"]) dom["profile-dept"].textContent = dept;
    if (dom["profile-year"]) dom["profile-year"].textContent = txt(state.profile?.year || "-");
    if (dom["profile-roll"]) dom["profile-roll"].textContent = txt(state.profile?.rollNumber || "-");
    if (dom["profile-section"]) dom["profile-section"].textContent = txt(state.profile?.section || "-");
    if (dom["profile-status"]) dom["profile-status"].textContent = state.profile?.profileCompleted ? "Verified" : "Pending";
  }

  function renderMetrics() {
    const dashboard = state.dashboard || {};
    const analytics = dashboard.analytics || {};
    const attempted = num(dashboard.attemptedCount ?? analytics.attemptedExams ?? arr(dashboard.attempted).length);
    const pending = num(dashboard.notAttemptedCount ?? 0);
    const average = num(dashboard.averageScore ?? analytics.averageScore);
    const passRate = num(analytics.passRate ?? 0);
    const certs = num(dashboard.certificatesEarned ?? state.certificates.length);
    const rank = dashboard.leaderboardRank ? `#${dashboard.leaderboardRank}` : "-";

    if (dom["metric-attempted"]) dom["metric-attempted"].textContent = attempted.toLocaleString();
    if (dom["metric-pending"]) dom["metric-pending"].textContent = pending.toLocaleString();
    if (dom["metric-average"]) dom["metric-average"].textContent = `${Math.round(average)}%`;
    if (dom["metric-passrate"]) dom["metric-passrate"].textContent = `${Math.round(passRate)}%`;
    if (dom["metric-certs"]) dom["metric-certs"].textContent = certs.toLocaleString();
    if (dom["metric-rank"]) dom["metric-rank"].textContent = rank;
    if (dom["metric-alerts"]) dom["metric-alerts"].textContent = num(dashboard.cheatingAlerts).toLocaleString();
    if (dom["metric-last-attempt"]) dom["metric-last-attempt"].textContent = fmtDateTime(dashboard.lastAttemptTime);
    if (dom["metric-weak-topics"]) dom["metric-weak-topics"].textContent = arr(dashboard.weakTopics).length.toLocaleString();
    if (dom["hero-last-attempt"]) dom["hero-last-attempt"].textContent = fmtDateTime(dashboard.lastAttemptTime);
    if (dom["trend-note"]) {
      const trendCount = arr(state.trend).length || arr(dashboard.performanceTrend).length;
      dom["trend-note"].textContent = trendCount ? `${trendCount} live points` : "No history yet";
    }
  }

  function renderExams() {
    const grid = dom["exam-grid"];
    if (!grid) return;

    const search = safeSearch(state.search);
    const exams = arr(state.dashboard?.notAttempted);
    const filtered = exams.filter((exam) => !search || txt(exam).toLowerCase().includes(search));

    if (!filtered.length) {
      const message = exams.length
        ? "No exams match your search."
        : "No open exams are currently available in your dashboard summary.";
      grid.innerHTML = `<div class="suggestion-item"><strong>${message}</strong><p>Check back after new exams are published.</p></div>`;
      return;
    }

    grid.innerHTML = filtered.map((exam, index) => `
      <article class="certificate-card exam-card">
        <div>
          <div class="eyebrow">Available Exam</div>
          <h4>${txt(exam, `Exam ${index + 1}`)}</h4>
        </div>
        <div class="certificate-meta">
          <span>Code: ${txt(exam)}</span>
          <span>Status: Ready to attempt</span>
        </div>
        <div class="certificate-actions">
          <span class="badge default">Pending</span>
          <button class="btn btn-ghost btn-sm" type="button" data-exam-code="${txt(exam)}">View details</button>
        </div>
      </article>
    `).join("");

    grid.querySelectorAll("[data-exam-code]").forEach((button) => {
      button.addEventListener("click", () => {
        showToast(`Exam ${button.dataset.examCode} is available in the system.`, "info");
      });
    });
  }

  function destroyChart(key) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  }

  function renderCharts() {
    const performanceCanvas = dom["performanceChart"];
    const passFailCanvas = dom["passFailChart"];
    const trend = arr(state.trend.length ? state.trend : state.dashboard?.performanceTrend);
    const labels = trend.length ? trend.map((_, idx) => `Attempt ${idx + 1}`) : ["No data"];
    const values = trend.length ? trend : [0];
    const passRate = num(state.dashboard?.analytics?.passRate ?? 0);
    const failRate = Math.max(0, 100 - passRate);

    if (window.Chart && performanceCanvas) {
      destroyChart("performance");
      state.charts.performance = new Chart(performanceCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Performance",
            data: values,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.14)",
            pointBackgroundColor: "#3b82f6",
            tension: 0.35,
            fill: true,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue("--text-tertiary") } },
            y: {
              beginAtZero: true,
              suggestedMax: 100,
              grid: { color: "rgba(148, 163, 184, 0.12)" },
              ticks: { color: getComputedStyle(document.documentElement).getPropertyValue("--text-tertiary") }
            }
          }
        }
      });
    }

    if (window.Chart && passFailCanvas) {
      destroyChart("passFail");
      state.charts.passFail = new Chart(passFailCanvas, {
        type: "doughnut",
        data: {
          labels: ["Pass", "Other"],
          datasets: [{
            data: [passRate, failRate],
            backgroundColor: ["#10b981", "#ec4899"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "72%",
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 10 } }
          }
        }
      });
    }
  }

  function renderAttempts() {
    const body = dom["attempts-body"];
    if (!body) return;
    const search = safeSearch(state.search);
    const rows = normalizeAttemptRows(state.dashboard?.attempted || []);
    const filtered = rows.filter((row) => {
      if (!search) return true;
      return `${row.examCode} ${row.badge} ${row.percentage}`.toLowerCase().includes(search);
    });

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="4" class="empty-state">No attempts available.</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map((row) => {
      const badgeClass = row.badge.toLowerCase().includes("gold")
        ? "gold"
        : row.badge.toLowerCase().includes("platinum")
          ? "platinum"
        : row.badge.toLowerCase().includes("silver")
          ? "silver"
          : row.badge.toLowerCase().includes("bronze")
            ? "bronze"
            : "participant";
      return `
        <tr>
          <td>${row.examCode}</td>
          <td>${row.obtainedMarks}/${row.totalMarks}</td>
          <td>${Math.round(row.percentage)}%</td>
          <td><span class="badge ${badgeClass}">${txt(row.badge, "Participant")}</span></td>
        </tr>
      `;
    }).join("");
  }

  function renderWeakTopics() {
    const list = dom["weak-topics-list"];
    if (!list) return;
    const items = arr(state.dashboard?.weakTopics);
    const search = safeSearch(state.search);
    const filtered = items.filter((item) => !search || txt(item).toLowerCase().includes(search));
    if (!filtered.length) {
      list.innerHTML = `<div class="pill">No weak topics detected.</div>`;
      return;
    }
    list.innerHTML = filtered.map((item) => `<div class="pill">${txt(item)}</div>`).join("");
  }

  function renderSuggestions() {
    const list = dom["suggestion-list"];
    if (!list) return;
    const items = arr(state.dashboard?.suggestions);
    if (!items.length) {
      list.innerHTML = `
        <div class="suggestion-item">
          <strong>No suggestions yet</strong>
          <p>Attempt more exams to unlock AI recommendations.</p>
        </div>
      `;
      return;
    }
    list.innerHTML = items.map((item) => `
      <div class="suggestion-item">
        <strong>${txt(item.suggestion || item.recommendedAction || "Suggestion")}</strong>
        <p>${txt(item.type || item.priority || "Live recommendation")}</p>
      </div>
    `).join("");
  }

  function renderCertificates() {
    const grid = dom["certificate-grid"];
    if (!grid) return;
    const search = safeSearch(state.search);
    const certs = state.certificates.filter((cert) => {
      if (!search) return true;
      return `${cert.id} ${cert.examTitle} ${cert.grade}`.toLowerCase().includes(search);
    });

    if (!certs.length) {
      grid.innerHTML = `<div class="suggestion-item"><strong>No certificates yet</strong><p>Complete qualifying exams to generate credentials.</p></div>`;
      return;
    }

    grid.innerHTML = certs.map((cert) => `
      <article class="certificate-card">
        <div>
          <div class="eyebrow">Certificate</div>
          <h4>${txt(cert.examTitle)}</h4>
        </div>
        <div class="certificate-meta">
          <span>ID: ${txt(cert.id)}</span>
          <span>Issued: ${fmtDate(cert.issuedAt)}</span>
          <span>Score: ${cert.score}% | Grade: ${txt(cert.grade)}</span>
        </div>
        <div class="certificate-actions">
          <button class="btn btn-ghost btn-sm" data-cert-action="verify" data-cert-id="${cert.id}">Verify</button>
          <button class="btn btn-primary btn-sm" data-cert-action="download" data-cert-id="${cert.id}">Download</button>
        </div>
      </article>
    `).join("");

    grid.querySelectorAll("[data-cert-action='verify']").forEach((btn) => {
      btn.addEventListener("click", () => verifyCertificate(btn.dataset.certId));
    });
    grid.querySelectorAll("[data-cert-action='download']").forEach((btn) => {
      btn.addEventListener("click", () => downloadCertificate(btn.dataset.certId));
    });
  }

  function renderLeaderboard() {
    const body = dom["leaderboard-body"];
    if (!body) return;
    const search = safeSearch(state.search);
    const rows = normalizeLeaderboard(state.leaderboard).filter((row) => {
      if (!search) return true;
      return `${row.rank} ${row.studentName} ${row.percentage}`.toLowerCase().includes(search);
    });

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="4" class="empty-state">No leaderboard data available.</td></tr>`;
      return;
    }

    body.innerHTML = rows.slice(0, 10).map((row) => {
      const isMe = num(row.studentId) === num(state.me?.id) || txt(row.studentName).toLowerCase() === txt(state.me?.name).toLowerCase();
      return `
        <tr class="${isMe ? "is-me" : ""}">
          <td>#${row.rank}</td>
          <td>${txt(row.studentName)}${isMe ? " <span class='badge default'>You</span>" : ""}</td>
          <td>${Math.round(row.percentage)}%</td>
          <td>${row.score}</td>
        </tr>
      `;
    }).join("");
  }

  function renderProfileSummary() {
    const completed = Boolean(state.profileCompleted || state.profile?.profileCompleted);
    const avatar = state.profile?.profilePhoto || state.me?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(txt(state.me?.name || "Student"))}&background=3b82f6&color=fff`;
    if (dom["profile-avatar"]) dom["profile-avatar"].src = avatar;
    if (dom["profile-complete-badge"]) {
      dom["profile-complete-badge"].textContent = completed ? "Completed" : "Incomplete";
      dom["profile-complete-badge"].className = `status-pill ${completed ? "success" : "warning"}`;
    }
    if (dom["profile-status-pill"]) {
      dom["profile-status-pill"].textContent = completed ? "Profile complete" : "Profile incomplete";
    }
  }

  function updateStateFromSearch(value) {
    state.search = txt(value, "");
    renderExams();
    renderAttempts();
    renderWeakTopics();
    renderSuggestions();
    renderCertificates();
    renderLeaderboard();
  }

  async function downloadCertificate(certificateId) {
    try {
      const response = await fetchRaw(`/api/certificate/download/${encodeURIComponent(certificateId)}`, { method: "GET" });
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${certificateId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Certificate downloaded successfully.", "success");
    } catch (error) {
      showToast(error.message || "Failed to download certificate.", "error");
    }
  }

  async function verifyCertificate(certificateId) {
    try {
      const response = await fetchRaw(`/api/certificate/verify/${encodeURIComponent(certificateId)}`, { method: "GET" });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(txt(payload, `Verification failed (${response.status})`));
      }
      showToast(`Certificate ${certificateId} verified successfully.`, "success");
    } catch (error) {
      showToast(error.message || "Certificate verification failed.", "error");
    }
  }

  async function loadAll() {
    if (!ensureAuth()) return;
    showLoader(true);
    try {
      const meRaw = await request("/api/users/me");
      state.me = unwrap(meRaw) || meRaw || {};

      const studentId = state.me?.id;
      if (!studentId) {
        throw new Error("Student profile missing from authentication response");
      }

      const dashboardReq = request(`/api/student/dashboard/${studentId}`, {}, { silent: true });
      const statsReq = request(`/api/student/stats/${studentId}`, {}, { silent: true });
      const alertsReq = request(`/api/student/alerts/${studentId}`, {}, { silent: true });
      const trendReq = request(`/api/student/performance/${studentId}`, {}, { silent: true });
      const historyReq = request(`/api/student/weak-topics/${studentId}`, {}, { silent: true });
      const profileReq = request("/api/student/profile", {}, { silent: true });
      const profileCompletedReq = request("/api/student/profile/completed", {}, { silent: true });
      const certReq = request(`/api/certificate/student/${studentId}`, {}, { silent: true });
      const leaderboardReq = request("/api/leaderboard/global", {}, { silent: true });

      const results = await Promise.allSettled([
        dashboardReq,
        statsReq,
        alertsReq,
        trendReq,
        historyReq,
        profileReq,
        profileCompletedReq,
        certReq,
        leaderboardReq
      ]);

      const dashboard = results[0].status === "fulfilled" ? unwrap(results[0].value) || {} : {};
      const stats = results[1].status === "fulfilled" ? unwrap(results[1].value) || {} : {};
      const alerts = results[2].status === "fulfilled" ? unwrap(results[2].value) || {} : {};
      const trend = results[3].status === "fulfilled" ? unwrap(results[3].value) || {} : {};
      const weakTopics = results[4].status === "fulfilled" ? unwrap(results[4].value) || {} : {};
      const profile = results[5].status === "fulfilled" ? results[5].value || null : null;
      const profileCompleted = results[6].status === "fulfilled" ? Boolean(results[6].value) : false;
      const certificates = results[7].status === "fulfilled" ? normalizeCertificates(unwrap(results[7].value) || []) : [];
      const leaderboard = results[8].status === "fulfilled" ? normalizeLeaderboard(unwrap(results[8].value) || []) : [];

      state.dashboard = dashboard;
      state.stats = stats;
      state.alerts = alerts;
      state.trend = arr(trend?.trend || dashboard.performanceTrend || []);
      state.history = weakTopics;
      state.profile = mapProfile(state.me, profile);
      state.profileCompleted = profileCompleted || Boolean(state.profile?.profileCompleted);
      state.certificates = certificates;
      state.leaderboard = leaderboard;

      renderShell();
      renderMetrics();
      renderCharts();
      renderExams();
      renderAttempts();
      renderWeakTopics();
      renderSuggestions();
      renderCertificates();
      renderLeaderboard();
      renderProfileSummary();
    } catch (error) {
      showToast(error.message || "Failed to load student workspace.", "error");
      console.error(error);
    } finally {
      showLoader(false);
    }
  }

  function setupNav() {
    const sections = Array.from(document.querySelectorAll(".student-section[data-section]"));
    const links = Array.from(document.querySelectorAll(".sidebar-nav .nav-link[data-section]"));

    const activateSection = (sectionId) => {
      const targetId = txt(sectionId, "overview");
      state.activeSection = targetId;

      links.forEach((item) => item.classList.toggle("active", item.dataset.section === targetId));
      sections.forEach((section) => {
        const isActive = section.dataset.section === targetId;
        section.classList.toggle("is-active", isActive);
        section.hidden = !isActive;
      });

      const target = document.getElementById(targetId);
      if (target) {
        requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    };

    links.forEach((link) => {
      link.addEventListener("click", () => {
        activateSection(link.dataset.section || "overview");
      });
    });

    const initial = document.querySelector(".sidebar-nav .nav-link.active")?.dataset.section || window.location.hash.replace("#", "") || "overview";
    activateSection(initial);
  }

  function setupEvents() {
    dom["student-search"]?.addEventListener("input", (event) => {
      updateStateFromSearch(event.target.value);
    });
    dom["student-refresh-btn"]?.addEventListener("click", () => loadAll());
    dom["hero-reload"]?.addEventListener("click", () => loadAll());
  }

  function init() {
    bindDom();
    if (!ensureAuth()) return;
    setupNav();
    setupEvents();
    if (window.ThemeController?.init) window.ThemeController.init();
    loadAll();
    window.StudentConsole = { refresh: loadAll };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
