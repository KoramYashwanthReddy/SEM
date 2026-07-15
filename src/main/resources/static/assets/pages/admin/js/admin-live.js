(function () {
  const apiBase = /^https?:/i.test(window.location.origin) ? window.location.origin : "http://localhost:8080";
  const TOKEN_KEYS = ["token", "accessToken", "jwt", "authToken", "access_token"];
  const normalizeToken = (raw) => {
    if (!raw) return "";
    let value = String(raw).trim();
    if (!value) return "";
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }
    if (/^bearer\s+/i.test(value)) {
      value = value.replace(/^bearer\s+/i, "").trim();
    }
    return value;
  };
  const token = () => {
    for (const key of TOKEN_KEYS) {
      const localValue = normalizeToken(localStorage.getItem(key));
      if (localValue) return localValue;
      const sessionValue = normalizeToken(sessionStorage.getItem(key));
      if (sessionValue) return sessionValue;
    }
    return "";
  };
  const clearSession = () => {
    TOKEN_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    localStorage.removeItem("role");
    sessionStorage.removeItem("role");
  };
  let authRedirectInFlight = false;
  const redirectToLoginOnce = () => {
    if (authRedirectInFlight) return;
    authRedirectInFlight = true;
    clearSession();
    window.location.href = "login.html";
  };
  const txt = (v, d = "") => (v == null ? d : String(v));
  const num = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const normalizeAttemptPercentage = (att) => {
    const direct = Number(att?.percentage);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const obtained = Number(att?.obtainedMarks);
    const total = Number(att?.totalMarks);
    if (Number.isFinite(obtained) && Number.isFinite(total) && total > 0) {
      return (obtained / total) * 100;
    }
    const score = Number(att?.score);
    if (Number.isFinite(score) && score > 0) {
      return score <= 100 ? score : 0;
    }
    return 0;
  };
  const arr = (v) => Array.isArray(v) ? v : [];
  const norm = (v) => txt(v).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const hasToken = () => {
    const value = token();
    return !!value && value.split(".").length === 3;
  };
  const fmt = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? txt(v) : d.toLocaleString();
  };
  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? txt(v) : d.toISOString().split("T")[0];
  };
  const fmtDateTime = (v) => {
    if (!v) return "";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };
  const normalizeAuditLabel = (value) => txt(value).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const mapAuditNotification = (item) => {
    const timestamp = item?.timestamp || item?.createdAt || item?.updatedAt || null;
    const category = normalizeAuditLabel(item?.type || item?.category || "SYSTEM") || "SYSTEM";
    const severity = normalizeAuditLabel(item?.severity || "INFO") || "INFO";
    const title = txt(item?.title || "System event").trim();
    const message = txt(item?.desc || item?.message || "").trim();
    const source = txt(item?.source || "Admin Console").trim();
    return {
      id: item?.id ? `AUD-${item.id}` : `AUD-${Date.now()}`,
      title,
      message,
      event: normalizeAuditLabel(title),
      category,
      module: category,
      severity,
      source,
      user: source,
      email: txt(item?.email || item?.userEmail || "").trim(),
      action: normalizeAuditLabel(title) || category,
      role: "Admin",
      ip: txt(item?.ip || item?.clientIp || item?.sourceIp || "-").trim() || "-",
      status: item?.unread ? "UNREAD" : "READ",
      unread: Boolean(item?.unread),
      targetUrl: txt(item?.targetUrl || "").trim(),
      timestamp: timestamp ? new Date(timestamp).getTime() : 0,
      time: fmtDateTime(timestamp) || "-"
    };
  };
  const mapAuditCheatingEvent = (item) => {
    const timestamp = item?.timestamp || item?.createdAt || null;
    const severityScore = num(item?.severity, 0);
    const score = num(item?.score, 0);
    const category = "PROCTORING";
    const eventType = normalizeAuditLabel(item?.eventType || "PROCTORING_EVENT") || "PROCTORING_EVENT";
    const title = txt(item?.eventType || "Proctoring Event").replace(/_/g, " ");
    const attemptId = item?.attemptId != null ? `Attempt #${item.attemptId}` : "Attempt";
    const details = txt(item?.details || "").trim();
    return {
      id: item?.id ? `PRC-${item.id}` : `PRC-${Date.now()}`,
      title,
      message: details || `${title} recorded for ${attemptId}`,
      event: eventType,
      category,
      module: category,
      severity: severityScore >= 8 || score >= 50 ? "HIGH" : severityScore >= 6 || score >= 30 ? "MEDIUM" : "LOW",
      source: attemptId,
      user: txt(item?.actorName || item?.teacherName || item?.adminName || "System"),
      email: txt(item?.actorEmail || item?.teacherEmail || item?.adminEmail || "").trim(),
      action: eventType,
      role: "System",
      ip: txt(item?.ip || item?.clientIp || item?.sourceIp || "-").trim() || "-",
      status: score >= 30 || severityScore >= 6 ? "FLAGGED" : "INFO",
      unread: score >= 30 || severityScore >= 6,
      targetUrl: "",
      timestamp: timestamp ? new Date(timestamp).getTime() : 0,
      time: fmtDateTime(timestamp) || "-"
    };
  };
  const mapAuditAttempt = (item) => {
    const timestamp = item?.updatedAt || item?.endTime || item?.startTime || item?.createdAt || null;
    const status = txt(item?.status || "STARTED").toUpperCase();
    const cheatingScore = num(item?.cheatingScore, 0);
    const cancelled = Boolean(item?.cancelled);
    const autoSubmitted = Boolean(item?.autoSubmitted);
    const riskLabel = cheatingScore >= 80 ? "CRITICAL" : cheatingScore >= 60 ? "HIGH" : cheatingScore >= 30 ? "MEDIUM" : "LOW";
    const action = cancelled
      ? "ATTEMPT_CANCELLED"
      : autoSubmitted
        ? "ATTEMPT_AUTO_SUBMITTED"
        : status === "EVALUATED" || status === "COMPLETED" || status === "SUBMITTED"
          ? "ATTEMPT_EVALUATED"
          : "ATTEMPT_STARTED";
    const student = txt(item?.studentName || item?.studentId || "Student");
    const exam = txt(item?.examTitle || item?.examCode || "Exam");
    const details = cancelled
      ? `Attempt was cancelled for ${student} in ${exam}`
      : cheatingScore > 0
        ? `${student} scored ${cheatingScore}% risk on ${exam}`
        : `${student} activity recorded for ${exam}`;
    return {
      id: item?.id != null ? `ATT-${item.id}` : `ATT-${Date.now()}`,
      title: action.replace(/_/g, " "),
      message: details,
      event: action,
      category: "ATTEMPT",
      module: "ATTEMPTS",
      severity: riskLabel,
      source: student,
      user: student,
      email: txt(item?.studentEmail || item?.email || "").trim(),
      action,
      role: txt(item?.role || "Student"),
      ip: txt(item?.ip || item?.clientIp || item?.sourceIp || "-").trim() || "-",
      status: cancelled ? "CANCELLED" : (cheatingScore >= 30 ? "FLAGGED" : "INFO"),
      unread: cheatingScore >= 30 || cancelled,
      targetUrl: "",
      timestamp: timestamp ? new Date(timestamp).getTime() : 0,
      time: fmtDateTime(timestamp) || "-"
    };
  };
  const mergeAuditFeeds = (notifications = [], cheating = [], attempts = []) => {
    return [
      ...arr(notifications).map(mapAuditNotification),
      ...arr(cheating).map(mapAuditCheatingEvent),
      ...arr(attempts).map(mapAuditAttempt)
    ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  };

  const stripHtml = (value) => txt(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const fallbackAuditLogsFromDashboard = () => {
    const source = Array.isArray(window.AdminDashboard?.dashLogs) ? window.AdminDashboard.dashLogs : [];
    return source.map((entry, idx) => {
      const label = normalizeAuditLabel(entry?.type || entry?.badge || "DASHBOARD_ACTIVITY") || "DASHBOARD_ACTIVITY";
      const title = stripHtml(entry?.msg || entry?.title || "Dashboard activity");
      return {
        id: `DASH-${idx + 1}`,
        title,
        message: stripHtml(entry?.summary || entry?.msg || title),
        event: label,
        category: label,
        module: label,
        severity: normalizeAuditLabel(entry?.badge || "LOW") || "LOW",
        source: stripHtml(entry?.time || "Admin Dashboard") || "Admin Dashboard",
        user: stripHtml(entry?.user || entry?.source || "System") || "System",
        email: "",
        action: label,
        role: "System",
        ip: "-",
        status: normalizeAuditLabel(entry?.badge || "INFO") || "INFO",
        unread: false,
        targetUrl: "",
        timestamp: Date.now() - (idx * 60000),
        time: txt(entry?.time || "-")
      };
    });
  };

  const fallbackAuditLogsFromLiveData = () => {
    const logs = [];

    const pushLog = (entry) => {
      if (!entry) return;
      logs.push(entry);
    };

    const examSource = arr(window.examsData).length ? arr(window.examsData) : arr(live.exams);
    examSource.slice(0, 50).forEach((exam, idx) => {
      const rawStatus = txt(exam?.status || "PUBLISHED").toUpperCase();
      const timestamp = exam?.updatedAt || exam?.createdAt || exam?.raw?.updatedAt || exam?.raw?.createdAt || null;
      const title = rawStatus === "DRAFT" ? "EXAM DRAFTED" : rawStatus === "SCHEDULED" ? "EXAM SCHEDULED" : rawStatus === "ARCHIVED" ? "EXAM ARCHIVED" : "EXAM UPDATED";
      pushLog({
        id: `EXAM-${exam?.examCode || exam?.id || idx}`,
        title,
        message: `${txt(exam?.title || exam?.examCode || "Exam")} • ${txt(exam?.creator || exam?.createdBy || "Admin")}`,
        event: normalizeAuditLabel(title),
        category: "EXAM",
        module: "EXAMS",
        severity: rawStatus === "ARCHIVED" ? "MEDIUM" : "LOW",
        source: txt(exam?.creator || exam?.createdBy || "Admin"),
        user: txt(exam?.creator || exam?.createdBy || "Admin"),
        email: "",
        action: normalizeAuditLabel(title),
        role: "Admin",
        ip: "-",
        status: rawStatus,
        unread: rawStatus !== "PUBLISHED",
        targetUrl: "",
        timestamp: timestamp ? new Date(timestamp).getTime() : 0,
        time: fmtDateTime(timestamp) || "-"
      });
    });

    const studentSource = arr(window.studentsData).length ? arr(window.studentsData) : arr(live.users).filter((u) => txt(u.role).toUpperCase() === "STUDENT");
    studentSource.slice(0, 50).forEach((student, idx) => {
      const timestamp = student?.updatedAt || student?.createdAt || student?.lastLogin || student?.raw?.updatedAt || student?.raw?.createdAt || null;
      const title = txt(student?.status || "Active").toUpperCase() === "DISABLED" ? "STUDENT DISABLED" : "STUDENT ACTIVE";
      pushLog({
        id: `STU-${student?.id || idx}`,
        title,
        message: `${txt(student?.name || "Student")} • ${txt(student?.email || "")}`,
        event: normalizeAuditLabel(title),
        category: "USER",
        module: "USERS",
        severity: title.includes("DISABLED") ? "MEDIUM" : "LOW",
        source: txt(student?.email || student?.name || "Student"),
        user: txt(student?.name || "Student"),
        email: txt(student?.email || ""),
        action: normalizeAuditLabel(title),
        role: "Student",
        ip: "-",
        status: txt(student?.status || "ACTIVE").toUpperCase(),
        unread: title.includes("DISABLED"),
        targetUrl: "",
        timestamp: timestamp ? new Date(timestamp).getTime() : 0,
        time: fmtDateTime(timestamp) || txt(student?.lastLogin || "-")
      });
    });

    const teacherSource = arr(window.teachersData).length ? arr(window.teachersData) : arr(live.users).filter((u) => txt(u.role).toUpperCase() === "TEACHER");
    teacherSource.slice(0, 50).forEach((teacher, idx) => {
      const timestamp = teacher?.updatedAt || teacher?.createdAt || teacher?.raw?.updatedAt || teacher?.raw?.createdAt || null;
      const title = txt(teacher?.status || "Active").toUpperCase() === "DISABLED" ? "TEACHER DISABLED" : "TEACHER ACTIVE";
      pushLog({
        id: `TCH-${teacher?.id || idx}`,
        title,
        message: `${txt(teacher?.fullName || teacher?.name || "Teacher")} • ${txt(teacher?.department || "N/A")}`,
        event: normalizeAuditLabel(title),
        category: "USER",
        module: "USERS",
        severity: title.includes("DISABLED") ? "MEDIUM" : "LOW",
        source: txt(teacher?.email || teacher?.fullName || "Teacher"),
        user: txt(teacher?.fullName || teacher?.name || "Teacher"),
        email: txt(teacher?.email || ""),
        action: normalizeAuditLabel(title),
        role: "Teacher",
        ip: "-",
        status: txt(teacher?.status || "ACTIVE").toUpperCase(),
        unread: title.includes("DISABLED"),
        targetUrl: "",
        timestamp: timestamp ? new Date(timestamp).getTime() : 0,
        time: fmtDateTime(timestamp) || "-"
      });
    });

    const attemptSource = arr(window.attemptsData).length ? arr(window.attemptsData) : arr(live.attempts).map(mapAttempt);
    attemptSource.slice(0, 100).forEach((attempt, idx) => {
      const score = num(attempt?.cheatingScore, 0);
      const rawStatus = txt(attempt?.status || "INFO").toUpperCase();
      const title = score >= 80 ? "ATTEMPT CRITICAL" : score >= 60 ? "ATTEMPT HIGH RISK" : score >= 30 ? "ATTEMPT REVIEW" : rawStatus === "COMPLETED" ? "ATTEMPT COMPLETED" : "ATTEMPT RECORDED";
      const timestamp = attempt?.startTime || attempt?.updatedAt || attempt?.endTime || attempt?.createdAt || attempt?.date || null;
      pushLog({
        id: `ATT-${attempt?.id || idx}`,
        title,
        message: `${txt(attempt?.studentName || attempt?.name || "Student")} • ${txt(attempt?.examTitle || attempt?.examCode || "Exam")} • ${score}% risk`,
        event: normalizeAuditLabel(title),
        category: "ATTEMPT",
        module: "ATTEMPTS",
        severity: score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW",
        source: txt(attempt?.studentName || attempt?.name || "Student"),
        user: txt(attempt?.studentName || attempt?.name || "Student"),
        email: txt(attempt?.studentEmail || attempt?.email || ""),
        action: normalizeAuditLabel(title),
        role: "Student",
        ip: txt(attempt?.ip || attempt?.ipAddress || attempt?.clientIp || "-"),
        status: rawStatus || "INFO",
        unread: score >= 30 || Boolean(attempt?.cancelled) || Boolean(attempt?.unread),
        targetUrl: "",
        timestamp: timestamp ? new Date(timestamp).getTime() : 0,
        time: fmtDateTime(timestamp) || txt(attempt?.date || "-")
      });
    });

    const certSource = arr(window.allCertificates).length ? arr(window.allCertificates) : arr(live.certificates);
    certSource.slice(0, 50).forEach((cert, idx) => {
      const timestamp = cert?.issuedAt || cert?.createdAt || cert?.raw?.issuedAt || cert?.raw?.createdAt || null;
      const title = cert?.revoked ? "CERTIFICATE REVOKED" : "CERTIFICATE ISSUED";
      pushLog({
        id: `CERT-${cert?.certificateId || cert?.id || idx}`,
        title,
        message: `${txt(cert?.studentName || cert?.name || "Student")} • ${txt(cert?.examTitle || cert?.examCode || "Exam")}`,
        event: normalizeAuditLabel(title),
        category: "CERTIFICATE",
        module: "CERTIFICATES",
        severity: cert?.revoked ? "MEDIUM" : "LOW",
        source: txt(cert?.issuer || "System"),
        user: txt(cert?.issuer || "System"),
        email: "",
        action: normalizeAuditLabel(title),
        role: "System",
        ip: "-",
        status: cert?.revoked ? "REVOKED" : "ISSUED",
        unread: Boolean(cert?.revoked),
        targetUrl: "",
        timestamp: timestamp ? new Date(timestamp).getTime() : 0,
        time: fmtDateTime(timestamp) || "-"
      });
    });

    return logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  };

  const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });

  const parseCsvText = (text) => {
    const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim() !== "");
    if (!lines.length) return { headers: [], rows: [] };
    const splitCsv = (line) => {
      const out = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          out.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
      out.push(current);
      return out.map((value) => value.trim());
    };
    const headers = splitCsv(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const cells = splitCsv(line);
      const row = {};
      headers.forEach((header, idx) => { row[header] = cells[idx] ?? ""; });
      return row;
    });
    return { headers, rows };
  };

  const normalizeUploadQuestionType = (value) => {
    const raw = txt(value).trim().toUpperCase();
    if (!raw) return "MCQ";
    if (raw.includes("COD")) return "CODING";
    if (raw.includes("SHORT") || raw.includes("DESC")) return "DESCRIPTIVE";
    if (raw === "MCQ" || raw.includes("MULTIPLE")) return "MCQ";
    return raw;
  };

  const rowValue = (row, aliases) => {
    const map = {};
    Object.keys(row || {}).forEach((key) => { map[txt(key).trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ")] = row[key]; });
    for (const alias of aliases) {
      const key = txt(alias).trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");
      const hit = map[key];
      if (hit != null && txt(hit).trim() !== "") return hit;
    }
    return "";
  };

  const parseQuestionFile = async (file) => {
    const name = txt(file?.name).toLowerCase();
    if (name.endsWith(".csv")) {
      return parseCsvText(await readFileAsText(file));
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      if (!window.XLSX) throw new Error("Excel parser not loaded");
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });
      return { headers: rows.length ? Object.keys(rows[0]) : [], rows };
    }
    throw new Error("Unsupported file type");
  };

  const mapUploadedQuestionToLive = (question, index = 0) => ({
    id: txt(question?.id || `q-${index + 1}`),
    questionText: txt(question?.questionText || question?.text || ""),
    questionType: txt(question?.questionType || question?.type || "MCQ"),
    marks: num(question?.marks, 0),
    difficulty: txt(question?.difficulty || "Easy"),
    topic: txt(question?.topic || "general"),
    optionA: txt(question?.optionA || question?.options?.[0] || ""),
    optionB: txt(question?.optionB || question?.options?.[1] || ""),
    optionC: txt(question?.optionC || question?.options?.[2] || ""),
    optionD: txt(question?.optionD || question?.options?.[3] || ""),
    optionE: txt(question?.optionE || question?.options?.[4] || ""),
    optionF: txt(question?.optionF || question?.options?.[5] || ""),
    sampleInput: txt(question?.sampleInput || ""),
    sampleOutput: txt(question?.sampleOutput || ""),
    displayOrder: num(question?.displayOrder, index + 1)
  });

  const resolveExactExamCode = (value) => {
    const raw = txt(value).trim();
    if (!raw) return "";
    if (live.byExam.has(raw)) return raw;
    const hit = live.exams.find((exam) => txt(exam.id) === raw || txt(exam.examCode) === raw);
    return hit ? txt(hit.examCode).trim() : "";
  };

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

  const isAuthNoise = (message = "") => {
    const text = String(message || "").toLowerCase();
    return text.includes("unauthorized")
      || text.includes("forbidden")
      || text.includes("401")
      || text.includes("403")
      || text.includes("failed to fetch");
  };

  const emitUiError = (message) => {
    const msg = txt(message, "Unexpected error");
    if (isAuthNoise(msg)) return;
    if (typeof window.showToast === "function") {
      window.showToast(msg, "error");
    } else {
      console.error(msg);
    }
  };

  const installUiErrorHandlers = () => {
    if (window.__adminUiErrorHandlersInstalled) return;
    window.__adminUiErrorHandlersInstalled = true;
    window.addEventListener("error", (event) => {
      if (isUiNoise(event?.message, event?.filename)) return;
      if (isAuthNoise(event?.message)) return;
      emitUiError(event?.message || "Unexpected admin UI error");
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event?.reason;
      const message = typeof reason === "string"
        ? reason
        : reason?.message || reason?.cause || "Unexpected admin UI error";
      if (isUiNoise(message)) return;
      if (isAuthNoise(message)) return;
      emitUiError(message);
    });
  };

  installUiErrorHandlers();

  function safeRender(label, renderer) {
    if (typeof renderer !== "function") return;
    try {
      renderer();
    } catch (error) {
      console.error(`Admin render failed for ${label}:`, error);
      emitUiError(`${label} section failed to render`);
    }
  }

  async function api(path, options = {}) {
    try {
      // Use the centralized API utility
      // Admin-live.js prepends /api manually sometimes, but path here is usually /api/admin/...
      // If path doesn't start with /api, we might need to add it, but looking at usage:
      // api("/api/admin/dashboard")
      // So we can pass it directly to API.request
      return await API.request(path, options);
    } catch (err) {
      if (!options.silent && err?.status !== 401 && err?.status !== 403) {
        emitUiError(err.message);
      }
      throw err;
    }
  }

  const live = {
    dashboard: {},
    exams: [],
    users: [],
    students: [],
    teachers: [],
    attempts: [],
    questions: [],
    certificates: [],
    leaderboard: [],
    byExam: new Map(),
    byUser: new Map(),
    byStudentSummary: new Map(),
    byExamSummary: new Map(),
    questionCounts: new Map()
  };

  function summarizeAttempts(attempts) {
    const byStudent = new Map();
    const byExam = new Map();
    attempts.forEach((att) => {
      const studentKey = txt(att.studentId);
      const examKey = txt(att.examCode);
      const status = txt(att.status).toUpperCase();
      const cancelled = Boolean(att.cancelled);
      const autoSubmitted = Boolean(att.autoSubmitted);
      const score = num(att.obtainedMarks ?? att.score);
      const percentage = normalizeAttemptPercentage(att);
      const completedLike = ["COMPLETED", "AUTO_SUBMITTED", "EVALUATED", "SUBMITTED", "FINISHED"].includes(status);

      const student = byStudent.get(studentKey) || { total: 0, completed: 0, active: 0, cancelled: 0, percentages: [], highestScore: 0, lowestScore: null, lastTime: null };
      student.total += 1;
      if (completedLike || autoSubmitted) student.completed += 1;
      if (status === "STARTED") student.active += 1;
      if (cancelled) student.cancelled += 1;
      student.percentages.push(percentage);
      student.highestScore = Math.max(student.highestScore || 0, score);
      student.lowestScore = student.lowestScore == null ? score : Math.min(student.lowestScore, score);
      student.lastTime = att.updatedAt || att.endTime || att.startTime || student.lastTime;
      byStudent.set(studentKey, student);

      const exam = byExam.get(examKey) || { total: 0, active: 0, completed: 0, cancelled: 0, highRisk: 0 };
      exam.total += 1;
      if (status === "STARTED") exam.active += 1;
      if (completedLike || autoSubmitted) exam.completed += 1;
      if (cancelled || status === "INVALIDATED") exam.cancelled += 1;
      if (num(att.cheatingScore) >= 50 && status === "STARTED") exam.highRisk += 1;
      byExam.set(examKey, exam);
    });
    return { byStudent, byExam };
  }

  function mapExam(exam, stats) {
    const code = txt(exam.examCode || exam.id);
    const statusRaw = txt(exam.status).toUpperCase();
    const status = exam.active === false
      ? "Inactive"
      : (statusRaw === "PUBLISHED" ? "Published" : "Draft");
    return {
      id: code,
      examCode: code,
      title: txt(exam.title || code),
      creator: txt(exam.createdBy || "Admin"),
      duration: num(exam.durationMinutes),
      status,
      questionsUploaded: Boolean(exam.questionsUploaded),
      subject: txt(exam.subject || ""),
      raw: exam,
      liveActiveAttempts: stats?.active || 0
    };
  }

  function normalizeExamRecord(exam) {
    const code = txt(exam?.examCode || exam?.id).trim();
    const fallbackCode = txt(exam?.id).trim();
    return {
      ...exam,
      id: code || fallbackCode,
      examCode: code || fallbackCode,
      title: txt(exam?.title || code || fallbackCode || "Exam"),
      description: txt(exam?.description || ""),
      subject: txt(exam?.subject || ""),
      durationMinutes: num(exam?.durationMinutes ?? exam?.duration, 0),
      totalMarks: num(exam?.totalMarks, 0),
      passingMarks: num(exam?.passingMarks, 0),
      maxAttempts: num(exam?.maxAttempts, 1),
      marksPerQuestion: num(exam?.marksPerQuestion, 1),
      negativeMarks: num(exam?.negativeMarks, 0),
      easyQuestionCount: num(exam?.easyQuestionCount ?? exam?.easyCount, 0),
      mediumQuestionCount: num(exam?.mediumQuestionCount ?? exam?.mediumCount, 0),
      difficultQuestionCount: num(exam?.difficultQuestionCount ?? exam?.hardCount, 0),
      shuffleQuestions: exam?.shuffleQuestions !== false,
      shuffleOptions: exam?.shuffleOptions !== false,
      questionsUploaded: Boolean(exam?.questionsUploaded),
      createdBy: txt(exam?.createdBy || "Admin"),
      active: exam?.active !== false,
      status: txt(exam?.status || ""),
      createdAt: exam?.createdAt || exam?.updatedAt || null,
      updatedAt: exam?.updatedAt || exam?.createdAt || null
    };
  }

  function mapAttempt(att) {
    const user = live.byUser.get(txt(att.studentId));
    const exam = live.byExam.get(txt(att.examCode));
    const cheat = num(att.cheatingScore);
    const status = att.cancelled ? "INVALIDATED" : (att.autoSubmitted ? "AUTO_SUBMITTED" : txt(att.status).toUpperCase() || "STARTED");
    const percentage = normalizeAttemptPercentage(att);
    const obtained = num(att.obtainedMarks ?? att.score);
    return {
      id: txt(att.id),
      studentName: txt(user?.name || `Student ${att.studentId || att.id}`),
      studentEmail: txt(user?.email || ""),
      examTitle: txt(exam?.title || att.examCode || "Exam"),
      examId: txt(att.examCode || exam?.id || ""),
      attemptNumber: num(att.attemptNumber, 1),
      status,
      score: obtained,
      percentage,
      cheatingScore: cheat,
      riskLevel: cheat < 30 ? "LOW" : cheat < 60 ? "MEDIUM" : cheat < 80 ? "HIGH" : "CRITICAL",
      startTime: fmt(att.startTime),
      endTime: fmt(att.endTime),
      duration: att.durationMinutes ? `${att.durationMinutes}m` : (att.timeTakenSeconds ? `${Math.round(num(att.timeTakenSeconds) / 60)}m` : "-"),
      tabSwitches: num(att.tabSwitchCount),
      fullscreenViolations: num(att.fullscreenViolationCount),
      ip: txt(att.ipAddress || "-"),
      device: txt(att.deviceInfo || "-"),
      browser: txt(att.browserInfo || "-"),
      date: fmtDate(att.createdAt || att.startTime)
    };
  }

  function mapCert(cert) {
    return {
      id: txt(cert.certificateId),
      name: txt(cert.studentName || "Unknown Student"),
      college: txt(cert.collegeName || "N/A"),
      dept: txt(cert.department || "N/A"),
      roll: txt(cert.rollNumber || "-"),
      section: txt(cert.section || "-"),
      exam: txt(cert.examTitle || cert.examCode || "Exam"),
      examCode: txt(cert.examCode || ""),
      score: num(cert.score),
      grade: txt(cert.grade || "NA"),
      active: !cert.revoked,
      avatar: cert.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(cert.studentName || "Student")}&background=3b82f6&color=fff`,
      date: fmtDate(cert.issuedAt || cert.createdAt),
      qrCodeData: cert.qrCodeData || `${apiBase}/api/certificate/verify/${cert.certificateId}`
    };
  }

  function applyMetrics() {
    const metrics = document.querySelectorAll("#dash-metrics-container .counter-anim");
    const values = [
      live.dashboard.totalUsers || live.users.length,
      live.dashboard.totalExams || live.exams.length,
      live.dashboard.totalAttempts || live.attempts.length,
      live.dashboard.totalCertificates || live.certificates.length
    ];
    metrics.forEach((el, idx) => {
      const value = values[idx] ?? 0;
      el.setAttribute("data-target", value);
      el.textContent = Number(value).toLocaleString();
    });
  }

  function syncActivityFooter() {
    const examLabel = document.getElementById("last-exam-label");
    const teacherLabel = document.getElementById("last-teacher-label");
    const suspLabel = document.getElementById("last-susp-label");
    const latestExam = [...live.exams].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
    const latestTeacher = [...live.teachers].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
    const riskyAttempt = [...live.attempts]
      .filter((a) => num(a.cheatingScore) > 0)
      .sort((a, b) => num(b.cheatingScore) - num(a.cheatingScore))[0];

    if (examLabel) examLabel.textContent = txt(latestExam?.title || latestExam?.examCode || "No exam activity");
    if (teacherLabel) teacherLabel.textContent = txt(latestTeacher?.name || latestTeacher?.fullName || "No teacher activity");
    if (suspLabel) {
      const score = num(riskyAttempt?.cheatingScore);
      const student = txt(riskyAttempt?.studentName || riskyAttempt?.studentId || "No suspicious attempt");
      suspLabel.textContent = score > 0 ? `${student} (${score}% Risk)` : "No suspicious attempts";
    }
  }

  let attemptsRefreshInFlight = false;

  async function loadAll() {
    if (!hasToken()) {
      window.location.href = "login.html";
      return;
    }
    const endpoints = [
      ["dashboard", "/api/admin/dashboard"],
      ["exams", "/api/admin/exams"],
      ["users", "/api/admin/users"],
      ["students", "/api/admin/users/students"],
      ["teachers", "/api/admin/users/teachers"],
      ["attempts", "/api/admin/attempts"],
      ["cheating", "/api/admin/cheating"],
      ["questions", "/api/admin/questions"],
      ["certs", "/api/certificate/all"],
      ["leaderboard", "/api/leaderboard/global"],
      ["notifications", "/api/admin/notifications?category=all"]
    ];

    const results = await Promise.allSettled(
      endpoints.map(([, path]) => api(path))
    );

    const payload = {};
    const failures = [];
    let authFailure = false;
    let dashboardAuthFailure = false;

    results.forEach((result, index) => {
      const [key, path] = endpoints[index];
      if (result.status === "fulfilled") {
        payload[key] = result.value;
      } else {
        failures.push(`${path}: ${result.reason?.message || result.reason || "Unknown error"}`);
        payload[key] = key === "dashboard" ? {} : [];
        if ((result.reason?.status === 401 || result.reason?.status === 403) && key === "dashboard") {
          dashboardAuthFailure = true;
        }
        if (result.reason?.status === 401 || result.reason?.status === 403) {
          authFailure = true;
        }
      }
    });

    if (dashboardAuthFailure || (authFailure && failures.length === endpoints.length)) {
      redirectToLoginOnce();
      return;
    }

    if (failures.length === endpoints.length) {
      throw new Error(`Admin sync failed for all endpoints. ${failures[0]}`);
    }

    if (failures.length > 0) {
      console.warn("Admin live sync partial failures:", failures);
    }

    live.dashboard = payload.dashboard || {};
    live.exams = arr(payload.exams).map(normalizeExamRecord);
    live.users = arr(payload.users);
    live.students = arr(payload.students);
    live.teachers = arr(payload.teachers);
    live.attempts = arr(payload.attempts);
    live.questions = arr(payload.questions);
    live.certificates = arr(payload.certs).map(mapCert);
    live.leaderboard = arr(payload.leaderboard);
    const notificationSource = arr(payload.notifications?.data || payload.notifications);
    const cheatingSource = arr(payload.cheating?.data || payload.cheating);
    const attemptSource = arr(payload.attempts?.data || payload.attempts);
    const mergedAuditLogs = mergeAuditFeeds(notificationSource, cheatingSource, attemptSource);
    window.allAuditLogs = mergedAuditLogs.length
      ? mergedAuditLogs
      : (fallbackAuditLogsFromLiveData().length ? fallbackAuditLogsFromLiveData() : fallbackAuditLogsFromDashboard());
    window.auditLogsLoaded = true;
    window.renderAuditLogs?.();

    live.byExam = new Map(live.exams.map((e) => [txt(e.examCode), e]));
    live.byUser = new Map(live.users.map((u) => [txt(u.id), u]));
    live.questionCounts = live.questions.reduce((acc, q) => {
      const key = txt(q.examCode);
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    const summary = summarizeAttempts(live.attempts);
    live.byStudentSummary = summary.byStudent;
    live.byExamSummary = summary.byExam;

    window.examsData = live.exams.map((exam) => mapExam(exam, summary.byExam.get(txt(exam.examCode || exam.id))));
    const normalizeRole = (value) => txt(value).replace(/^ROLE_/i, "").toUpperCase();
    const studentSource = live.students.length > 0 ? live.students : live.users.filter((u) => normalizeRole(u.role) === "STUDENT");
    const teacherSource = live.teachers.length > 0 ? live.teachers : live.users.filter((u) => normalizeRole(u.role) === "TEACHER");

    window.studentsData = studentSource.map((u) => {
      const stats = summary.byStudent.get(txt(u.id)) || {};
      const p = stats.percentages || [];
      const avg = p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) : 0;
      const passRate = p.length ? Math.round((p.filter((x) => x >= 60).length / p.length) * 100) : 0;
      return {
        id: txt(u.id),
        name: txt(u.name),
        email: txt(u.email),
        institution: txt(u.department || "N/A"),
        status: u.enabled === false ? "Disabled" : "Active",
        examsAttempted: stats.total || 0,
        avgScore: avg,
        passRate,
        lastLogin: fmt(stats.lastTime || u.updatedAt || u.createdAt),
        attempts: stats.total || 0,
        highestScore: Math.round(stats.highestScore || 0),
        lowestScore: Math.round(stats.lowestScore || 0),
        raw: u
      };
    });
    window.teachersData = teacherSource.map((u) => {
      const teacherKeys = [u.name, u.fullName, u.email, u.employeeId, u.department, u.designation]
        .filter(Boolean)
        .map(norm)
        .filter(Boolean);
      const created = window.examsData.filter((e) => {
        const createdBy = norm(e.creator);
        if (!createdBy) return false;
        return teacherKeys.some((needle) => createdBy.includes(needle) || needle.includes(createdBy));
      });
      const attemptsTotal = created.reduce((acc, ex) => acc + (summary.byExam.get(ex.id)?.total || 0), 0);
      const completed = created.reduce((acc, ex) => acc + (summary.byExam.get(ex.id)?.completed || 0), 0);
      const certCount = live.certificates.filter((c) => created.some((e) => e.id === c.examCode)).length;
      return {
        id: txt(u.id),
        fullName: txt(u.name),
        email: txt(u.email),
        phone: txt(u.phone),
        profileImage: txt(u.profileImage || ""),
        department: txt(u.department || "N/A"),
        designation: txt(u.designation || "N/A"),
        experienceYears: num(u.experienceYears),
        qualification: txt(u.qualification || "N/A"),
        employeeId: txt(u.employeeId || "N/A"),
        status: u.enabled === false ? "Disabled" : "Active",
        examsCreated: created.map((e) => ({ title: e.title, code: e.id, status: e.status, date: fmtDate(e.raw?.createdAt || e.raw?.updatedAt) })),
        questionsUploaded: created.map((e) => ({ exam: e.title, count: live.questionCounts.get(e.id) || 0, date: fmtDate(e.raw?.createdAt || e.raw?.updatedAt) })),
        attemptsHandled: { total: attemptsTotal, avgScore: attemptsTotal ? Math.round((completed / attemptsTotal) * 100) : 0, passRate: attemptsTotal ? Math.round((completed / attemptsTotal) * 100) : 0 },
        cheatingReports: { suspicious: created.reduce((acc, ex) => acc + (summary.byExam.get(ex.id)?.highRisk || 0), 0), flags: created.reduce((acc, ex) => acc + (summary.byExam.get(ex.id)?.cancelled || 0), 0) },
        analytics: { exams: created.length, students: attemptsTotal, certs: certCount },
        raw: u
      };
    });
    window.attemptsData = live.attempts.map(mapAttempt);
    window.filteredAttempts = [...window.attemptsData];
    window.proctoringMonitorData = live.attempts.filter((a) => num(a.cheatingScore) > 0 || a.cancelled).slice(0, 40).map((a, idx) => {
      const mapped = mapAttempt(a);
      return {
        id: `PM_${mapped.id}_${idx}`,
        studentId: mapped.id,
        studentName: mapped.studentName,
        examTitle: mapped.examTitle,
        violationType: num(a.tabSwitchCount) > 0 ? "TAB_SWITCH" : (num(a.fullscreenViolationCount) > 0 ? "FULLSCREEN_VIOLATION" : "CHEATING_SCORE"),
        severity: mapped.riskLevel === "CRITICAL" ? "HIGH" : (mapped.riskLevel === "HIGH" ? "MEDIUM" : "LOW"),
        cheatingScore: mapped.cheatingScore,
        riskLevel: mapped.riskLevel,
        status: mapped.riskLevel === "LOW" ? "SUSPICIOUS" : "FLAGGED",
        timestamp: mapped.startTime,
        date: mapped.date
      };
    });
    window.allCertificates = live.certificates;
    window.filteredCerts = [...window.allCertificates];
    window.allLeaderboard = arr(live.leaderboard).map((row) => {
      const user = live.byUser.get(txt(row.studentId));
      return {
        rank: num(row.rank),
        id: txt(row.studentId),
        name: txt(row.studentName || user?.name || "Student"),
        avatar: user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || row.studentName || "Student")}&background=random`,
        dept: txt(user?.department || "N/A"),
        exam: txt(live.attempts.find((a) => txt(a.studentId) === txt(row.studentId))?.examCode || "Global"),
        score: num(row.score),
        percentage: num(row.percentage),
        attempts: live.attempts.filter((a) => txt(a.studentId) === txt(row.studentId)).length || 1,
        status: num(row.percentage) >= 60 ? "PASS" : "FAIL"
      };
    });
    window.filteredLB = [...window.allLeaderboard];

    const dashExams = window.examsData.slice(0, 6).map((e) => ({ name: e.title, type: e.subject || "Exam", active: summary.byExam.get(e.id)?.active || summary.byExam.get(e.id)?.total || 0, status: e.status === "Published" ? "Live" : e.status }));
    const dashLogs = [];
    if (window.examsData[0]) dashLogs.push({ type: "exams", icon: "fa-file-circle-check", msg: `<strong>${window.examsData[0].creator}</strong> synced "${window.examsData[0].title}"`, time: window.examsData[0].title, badge: window.examsData[0].status.toLowerCase() });
    if (window.attemptsData[0]) dashLogs.push({ type: "proctoring", icon: "fa-user-shield", msg: `<strong>${window.attemptsData[0].studentName}</strong> flagged on "${window.attemptsData[0].examTitle}"`, time: window.attemptsData[0].date, badge: window.attemptsData[0].riskLevel.toLowerCase() });
    if (window.allCertificates[0]) dashLogs.push({ type: "exams", icon: "fa-certificate", msg: `Certificate issued to <strong>${window.allCertificates[0].name}</strong>`, time: window.allCertificates[0].date, badge: window.allCertificates[0].active ? "complete" : "revoked" });
    if (window.teachersData[0]) dashLogs.push({ type: "users", icon: "fa-user-pen", msg: `<strong>${window.teachersData[0].fullName}</strong> profile synchronized`, time: fmtDate(window.teachersData[0].raw?.updatedAt || window.teachersData[0].raw?.createdAt), badge: window.teachersData[0].status.toLowerCase() });

    if (window.AdminDashboard) {
      window.AdminDashboard.dashExams = dashExams;
      window.AdminDashboard.dashLogs = dashLogs;
      window.AdminDashboard.dashAlerts = window.proctoringMonitorData.slice(0, 5).map((item, idx) => ({ id: idx + 1, risk: item.riskLevel === "LOW" ? "low" : item.riskLevel === "MEDIUM" ? "med" : "high", title: item.violationType, user: item.studentName, time: item.date }));
    }

    window.AdminDashboard?.renderDashboardOverview?.();

    safeRender("Exams", window.renderGlobalExams);
    safeRender("Students", window.renderGlobalStudents);
    safeRender("Teachers", window.renderGlobalTeachers);
    safeRender("Attempts", window.renderAttemptsTable);
    safeRender("Certificates", window.renderCertPage);
    safeRender("Leaderboard", window.renderLBSection);
    safeRender("Audit Logs", window.renderAuditLogs);
    safeRender("Reports", window.renderReports);
    syncActivityFooter();
    applyMetrics();
    window.udRender?.();
    if (typeof window.refreshAnalytics === "function") {
      window.refreshAnalytics().catch((error) => {
        console.warn("Admin analytics refresh failed after live sync:", error);
      });
    }
  }

  window.AdminLive = { loadAll, api, live, refreshAuditLogs };
  window.AdminDashboard = window.AdminDashboard || {};
  window.AdminDashboard.populateMockData = () => loadAll();
  window.AdminDashboard.initDashboardEngine = function () {
    this.dashboardState = this.dashboardState || { logFilter: "all", examPage: 1, examSize: 5, examSort: "active", examSortAsc: false, refreshTimer: 30 };
    this.startDashTimer?.();
  };
  window.AdminDashboard.autoLogCycle = () => {};
  window.AdminDashboard.updateActivityFooter = () => syncActivityFooter();
  window.AdminDashboard.refreshOverview = async () => {
    await loadAll();
    window.AdminDashboard?.renderDashboardOverview?.();
  };

  async function refreshAttempts() {
    if (attemptsRefreshInFlight) return;
    attemptsRefreshInFlight = true;
    try {
      live.attempts = arr(await api("/api/admin/attempts"));
      const summary = summarizeAttempts(live.attempts);
      live.byStudentSummary = summary.byStudent;
      live.byExamSummary = summary.byExam;
      window.attemptsData = live.attempts.map(mapAttempt);
      window.filteredAttempts = [...window.attemptsData];
      window.handleAttemptFilters?.();
      window.updateAttemptStats?.();
      window.AdminDashboard?.renderDashboardOverview?.();
    } finally {
      attemptsRefreshInFlight = false;
    }
  }

  async function refreshAuditLogs() {
    try {
      const [notifications, cheating, attempts] = await Promise.all([
        api("/api/admin/notifications?category=all"),
        api("/api/admin/cheating"),
        api("/api/admin/attempts")
      ]);
      const notifData = arr(notifications?.data || notifications);
      const cheatingData = arr(cheating?.data || cheating);
      const attemptData = arr(attempts?.data || attempts);
      const mergedAuditLogs = mergeAuditFeeds(notifData, cheatingData, attemptData);
      window.allAuditLogs = mergedAuditLogs.length
        ? mergedAuditLogs
        : (fallbackAuditLogsFromLiveData().length ? fallbackAuditLogsFromLiveData() : fallbackAuditLogsFromDashboard());
      window.auditLogsLoaded = true;
      window.renderAuditLogs?.();
    window.AdminDashboard?.renderDashboardOverview?.();
    } catch (error) {
      window.allAuditLogs = [];
      window.auditLogsLoaded = false;
      throw error;
    }
  }

  async function refreshProctoring() {
    const [suspicious, liveRisk] = await Promise.all([
      api("/api/admin/attempts/suspicious"),
      api("/api/admin/attempts/live-high-risk")
    ]);
    const merged = [...arr(suspicious), ...arr(liveRisk)];
    const seen = new Set();
    window.proctoringMonitorData = merged.filter((item) => {
      const key = txt(item.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 40).map((att, idx) => {
      const mapped = mapAttempt(att);
      return {
        id: `PM_${mapped.id}_${idx}`,
        studentId: mapped.id,
        studentName: mapped.studentName,
        examTitle: mapped.examTitle,
        violationType: num(att.tabSwitchCount) > 0 ? "TAB_SWITCH" : (num(att.fullscreenViolationCount) > 0 ? "FULLSCREEN_VIOLATION" : "CHEATING_SCORE"),
        severity: mapped.riskLevel === "CRITICAL" ? "HIGH" : (mapped.riskLevel === "HIGH" ? "MEDIUM" : "LOW"),
        cheatingScore: mapped.cheatingScore,
        riskLevel: mapped.riskLevel,
        status: "FLAGGED",
        timestamp: mapped.startTime,
        date: mapped.date
      };
    });
    window.runProctorFilter?.(window.activeProctorFilter || "all");
    window.updateProctorMonitorStats?.();
  }

  async function initCertificatesEngine() {
    live.certificates = arr(await api("/api/certificate/all")).map(mapCert);
    window.allCertificates = live.certificates;
    window.filteredCerts = [...window.allCertificates];
    window.certLoading = false;
    window.renderCertPage?.();
  }

  async function initLeaderboardEngine() {
    const leaderboard = arr(await api("/api/leaderboard/global"));
    window.allLeaderboard = leaderboard.map((row) => {
      const user = live.byUser.get(txt(row.studentId));
      const attempts = live.attempts.filter((a) => txt(a.studentId) === txt(row.studentId));
      return {
        rank: num(row.rank),
        id: txt(row.studentId),
        name: txt(row.studentName || user?.name || "Student"),
        avatar: user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || row.studentName || "Student")}&background=random`,
        dept: txt(user?.department || "N/A"),
        exam: txt(attempts[0]?.examCode || "Global"),
        score: num(row.score),
        percentage: num(row.percentage),
        attempts: attempts.length || 1,
        status: num(row.percentage) >= 60 ? "PASS" : "FAIL"
      };
    });
    window.filteredLB = [...window.allLeaderboard];
    window.handleLeaderboardFilters?.();
  }

  async function openViewQuestions(examCode) {
    const questions = arr(await api(`/api/admin/questions/exam/${encodeURIComponent(examCode)}`));
    const exam = live.byExam.get(examCode);
    const title = document.getElementById("vq-title");
    const list = document.getElementById("vq-list");
    if (title) title.textContent = exam?.title || examCode;
    if (list) {
      list.innerHTML = questions.length
        ? questions.map((q, idx) => `<tr><td>${idx + 1}</td><td>${q.questionText || "-"}</td><td>${q.questionType || "-"}</td><td><span class="status-badge draft">${q.difficulty || "-"}</span></td></tr>`).join("")
        : '<tr><td colspan="4" style="text-align:center; padding: 24px; color:var(--text-secondary)">No questions uploaded yet.</td></tr>';
    }
    openModal("viewQuestionsModal");
  }

  function openUploadQuestions(examCode) {
    const exactCode = resolveExactExamCode(examCode);
    if (!exactCode) {
      window.showToast?.("Invalid exam code. Please open upload from a valid exam.", "error");
      return;
    }
    const exam = live.byExam.get(exactCode);
    document.getElementById("uq-code").value = exactCode;
    const fileInput = document.getElementById("uq-file");
    const uploadBtn = document.getElementById("uqUpload");
    const syncUploadState = () => {
      const uploaded = fileInput?.dataset.uploaded === "true";
      const hasFile = !!fileInput?.files?.[0];
      if (uploadBtn) {
        uploadBtn.disabled = !hasFile || uploaded;
        uploadBtn.textContent = uploaded ? "Uploaded" : "Upload File";
      }
    };
    if (fileInput) {
      fileInput.value = "";
      fileInput.dataset.uploaded = Boolean(exam?.questionsUploaded) ? "true" : "false";
      fileInput.onchange = () => {
        fileInput.dataset.uploaded = Boolean(exam?.questionsUploaded) ? "true" : "false";
        syncUploadState();
      };
    }
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Upload File";
    }
    syncUploadState();
    if (exam?.questionsUploaded) {
      window.showToast?.("Questions are already uploaded for this exam. Upload is blocked.", "error");
    }
    openModal("uploadQuestionsModal");
  }

  async function publishExam(btn, examCode) {
    const exam = live.byExam.get(examCode);
    if (!exam) return;
    if (!exam.questionsUploaded) {
      window.showToast?.("Upload questions first. Publishing without questions is not allowed.", "error");
      return;
    }
    try {
      await handleActionBtn(btn, "Publish", "Publishing...", "Published", async () => {
        await api(`/api/admin/exams/${encodeURIComponent(examCode)}/publish`, { method: "POST" });
        await loadAll();
        return true;
      });
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to publish exam", "error");
    }
  }

  async function submitCreateTeacher(event, btn) {
    event.preventDefault();
    const v = (id) => document.getElementById(id)?.value.trim() || "";
    const id = v("t-id");
    const profileImageFileInput = document.getElementById("t-img-file");
    const profileImageFile = profileImageFileInput?.files?.[0] || null;
    if (profileImageFile) {
      const isImage = String(profileImageFile.type || "").toLowerCase().startsWith("image/");
      const isAllowedSize = profileImageFile.size <= 5 * 1024 * 1024;
      setError("t-img-file", !isImage || !isAllowedSize);
      if (!isImage) {
        window.showToast?.("Profile image must be an image file", "error");
        return;
      }
      if (!isAllowedSize) {
        window.showToast?.("Profile image must be 5MB or less", "error");
        return;
      }
    } else {
      setError("t-img-file", false);
    }

    const payload = {
      fullName: v("t-name"),
      email: v("t-email"),
      password: v("t-pwd"),
      phone: v("t-phone"),
      profileImage: "",
      department: v("t-dept"),
      designation: v("t-designation"),
      experienceYears: v("t-exp") ? parseInt(v("t-exp"), 10) : null,
      qualification: v("t-qual"),
      employeeId: v("t-empid")
    };

    const uniqueState = await checkTeacherUniqueFields({ silent: false });
    if (uniqueState.emailExists || uniqueState.phoneExists || uniqueState.employeeIdExists) {
      window.showToast?.("Resolve duplicate email/mobile number/ID before saving", "error");
      return;
    }

    const formData = new FormData();
    formData.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    if (profileImageFile) {
      formData.append("profileImage", profileImageFile);
    }

    let savedResponse = null;
    try {
      await handleActionBtn(btn, id ? "Save Changes" : "Create Teacher", id ? "Saving..." : "Creating...", id ? "Saved" : "Teacher Created", async () => {
        if (id) {
          savedResponse = await api(`/api/admin/teachers/${encodeURIComponent(id)}`, { method: "PUT", body: formData });
        } else {
          savedResponse = await api("/api/admin/teachers", { method: "POST", body: formData });
        }
        await loadAll();
        document.getElementById("createTeacherForm")?.reset();
        resetTeacherFilePreview();
        closeModal("addTeacherModal");
        return true;
      });
      if (savedResponse && !id) {
        const liveForSeconds = Number(savedResponse.liveFor) || 0;
        const createdId = savedResponse.id ?? "-";
        const createdEmail = savedResponse.email || payload.email;
        const createdMobile = savedResponse.mobileNo || savedResponse.phone || payload.phone || "-";
        window.showToast?.(`Teacher live created: ${createdEmail} | ${createdMobile} (${createdId}) ${liveForSeconds ? `for ${liveForSeconds}s` : ""}`.trim(), "success");
      }
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to save teacher", "error");
    }
  }

  function setTeacherFieldError(fieldId, message, isInvalid) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const errorLabel = input.closest(".form-group")?.querySelector(".error-msg");
    if (errorLabel) {
      errorLabel.textContent = message;
    }
    setError(fieldId, Boolean(isInvalid));
  }

  let teacherUniqueDebounceTimer = null;

  async function checkTeacherUniqueFields(options = {}) {
    const silent = Boolean(options.silent);
    const email = (document.getElementById("t-email")?.value || "").trim();
    const employeeId = (document.getElementById("t-empid")?.value || "").trim();
    const phone = (document.getElementById("t-phone")?.value || "").trim();
    const userIdRaw = (document.getElementById("t-id")?.value || "").trim();
    const excludeUserId = userIdRaw && /^\d+$/.test(userIdRaw) ? userIdRaw : "";
    const emailSyntaxValid = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const phoneSyntaxValid = phone === "" || /^\d{10}$/.test(phone);
    if (!emailSyntaxValid) {
      setTeacherFieldError("t-email", "Valid email required.", true);
      return { emailExists: false, employeeIdExists: false, phoneExists: false };
    }
    if (!phoneSyntaxValid) {
      setTeacherFieldError("t-phone", "Must be exactly 10 digits if provided.", true);
      return { emailExists: false, employeeIdExists: false, phoneExists: false };
    }

    const query = new URLSearchParams();
    if (email) query.set("email", email);
    if (employeeId) query.set("employeeId", employeeId);
    if (phone) query.set("phone", phone);
    if (excludeUserId) query.set("excludeUserId", excludeUserId);

    if (!email && !employeeId && !phone) {
      setTeacherFieldError("t-email", "Valid email required.", false);
      setTeacherFieldError("t-empid", "Employee ID is invalid.", false);
      setTeacherFieldError("t-phone", "Must be exactly 10 digits if provided.", false);
      return { emailExists: false, employeeIdExists: false, phoneExists: false };
    }

    try {
      const data = await api(`/api/admin/teachers/unique-check?${query.toString()}`);
      const emailExists = Boolean(data?.emailExists);
      const employeeIdExists = Boolean(data?.employeeIdExists);
      const phoneExists = Boolean(data?.phoneExists || data?.mobileNoExists);

      setTeacherFieldError(
        "t-email",
        emailExists ? "Email already exists." : "Valid email required.",
        emailExists
      );
      setTeacherFieldError(
        "t-empid",
        employeeIdExists ? "Employee ID already exists." : "Employee ID is invalid.",
        employeeIdExists
      );
      setTeacherFieldError(
        "t-phone",
        phoneExists ? "Mobile number already exists." : "Must be exactly 10 digits if provided.",
        phoneExists
      );

      if (!silent && (emailExists || employeeIdExists || phoneExists)) {
        window.showToast?.("This email / ID / mobile number already exists", "error");
      }

      return { emailExists, employeeIdExists, phoneExists };
    } catch (error) {
      if (!silent) {
        window.showToast?.(error.message || "Failed to validate ID/mobile", "error");
      }
      return { emailExists: false, employeeIdExists: false, phoneExists: false };
    }
  }

  function queueTeacherUniqueCheck() {
    if (teacherUniqueDebounceTimer) {
      clearTimeout(teacherUniqueDebounceTimer);
    }
    teacherUniqueDebounceTimer = setTimeout(() => {
      checkTeacherUniqueFields({ silent: true }).catch(() => {});
    }, 280);
  }

  function resetTeacherFilePreview() {
    const fileNameLabel = document.getElementById("t-img-file-name");
    if (fileNameLabel) fileNameLabel.textContent = "No file selected";
  }

  function initTeacherCreateEnhancements() {
    const employeeIdInput = document.getElementById("t-empid");
    const phoneInput = document.getElementById("t-phone");
    const emailInput = document.getElementById("t-email");
    const fileInput = document.getElementById("t-img-file");
    const fileNameLabel = document.getElementById("t-img-file-name");
    const form = document.getElementById("createTeacherForm");

    emailInput?.addEventListener("input", queueTeacherUniqueCheck);
    emailInput?.addEventListener("blur", () => checkTeacherUniqueFields({ silent: true }));
    employeeIdInput?.addEventListener("input", queueTeacherUniqueCheck);
    employeeIdInput?.addEventListener("blur", () => checkTeacherUniqueFields({ silent: true }));
    phoneInput?.addEventListener("input", queueTeacherUniqueCheck);
    phoneInput?.addEventListener("blur", () => checkTeacherUniqueFields({ silent: true }));

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) {
        if (fileNameLabel) fileNameLabel.textContent = "No file selected";
        return;
      }
      if (fileNameLabel) fileNameLabel.textContent = `${file.name} (${Math.ceil(file.size / 1024)} KB)`;
    });

    form?.addEventListener("reset", () => {
      setTimeout(() => {
        setTeacherFieldError("t-empid", "Employee ID is invalid.", false);
        setTeacherFieldError("t-phone", "Must be exactly 10 digits if provided.", false);
        resetTeacherFilePreview();
      }, 0);
    });
  }

  async function submitCreateExam(event, btn) {
    event.preventDefault();
    const v = (id) => document.getElementById(id)?.value.trim() || "";
    const ni = (id) => parseInt(v(id), 10) || 0;
    const nf = (id) => parseFloat(v(id)) || 0;
    const checked = (id) => Boolean(document.getElementById(id)?.checked);
    const payload = {
      title: v("ex-title"),
      description: v("ex-desc"),
      subject: v("ex-subj"),
      durationMinutes: ni("ex-dur"),
      startTime: v("ex-start") ? `${v("ex-start")}:00` : null,
      endTime: v("ex-end") ? `${v("ex-end")}:00` : null,
      totalMarks: ni("ex-total"),
      passingMarks: ni("ex-pass"),
      marksPerQuestion: nf("ex-perq"),
      negativeMarks: nf("ex-neg"),
      maxAttempts: ni("ex-attempts"),
      easyQuestionCount: ni("ex-easy"),
      mediumQuestionCount: ni("ex-med"),
      difficultQuestionCount: ni("ex-diff"),
      shuffleQuestions: checked("ex-shuffle-q"),
      shuffleOptions: checked("ex-shuffle-o")
    };
    const totalPlannedQuestions = payload.easyQuestionCount + payload.mediumQuestionCount + payload.difficultQuestionCount;
    const start = payload.startTime ? new Date(payload.startTime) : null;
    const end = payload.endTime ? new Date(payload.endTime) : null;
    if (!payload.title || !payload.subject || payload.durationMinutes <= 0 || payload.totalMarks <= 0) {
      window.showToast?.("Fill title, subject, duration, and total marks before creating the exam.", "error");
      return;
    }
    if (payload.passingMarks > payload.totalMarks) {
      window.showToast?.("Passing marks cannot exceed total marks.", "error");
      return;
    }
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      window.showToast?.("Choose a valid exam start and end window.", "error");
      return;
    }
    if (payload.marksPerQuestion <= 0 || payload.negativeMarks < 0 || payload.negativeMarks > payload.marksPerQuestion) {
      window.showToast?.("Marks per question and negative marking values are not valid.", "error");
      return;
    }
    if (totalPlannedQuestions > 0 && totalPlannedQuestions * payload.marksPerQuestion > payload.totalMarks) {
      window.showToast?.("Difficulty distribution exceeds total marks.", "error");
      return;
    }
    try {
      await handleActionBtn(btn, "Create Exam", "Creating...", "Created", async () => {
        await api("/api/admin/exams", { method: "POST", body: payload });
        await loadAll();
        closeModal("createExamModal");
        return true;
      });
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to create exam", "error");
    }
  }

  async function submitEditExam(event, btn) {
    event.preventDefault();
    const examCode = document.getElementById("edit-ex-id")?.value || "";
    const title = document.getElementById("edit-ex-title")?.value.trim() || "";
    const durationMinutes = parseInt(document.getElementById("edit-ex-dur")?.value, 10) || 0;
    const existing = live.byExam.get(examCode);
    if (!existing) return;
    const payload = {
      title,
      description: existing.description || "",
      subject: existing.subject || "",
      durationMinutes,
      totalMarks: existing.totalMarks || 0,
      passingMarks: existing.passingMarks || 0,
      maxAttempts: existing.maxAttempts || 1,
      marksPerQuestion: existing.marksPerQuestion || 1.0,
      negativeMarks: existing.negativeMarks || 0.0,
      shuffleQuestions: existing.shuffleQuestions !== false,
      shuffleOptions: existing.shuffleOptions !== false,
      startTime: existing.startTime || null,
      endTime: existing.endTime || null,
      easyQuestionCount: existing.easyQuestionCount || 0,
      mediumQuestionCount: existing.mediumQuestionCount || 0,
      difficultQuestionCount: existing.difficultQuestionCount || 0
    };
    try {
      await handleActionBtn(btn, "Save Changes", "Saving...", "Saved", async () => {
        await api(`/api/admin/exams/${encodeURIComponent(examCode)}`, { method: "PUT", body: payload });
        await loadAll();
        closeModal("editExamModal");
        return true;
      });
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to update exam", "error");
    }
  }

  async function submitUploadQuestions(btn) {
    const fileInput = document.getElementById("uq-file");
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("uq-file", true);
      window.showToast?.("Please choose a CSV/Excel file first.", "error");
      return;
    }
    setError("uq-file", false);
    const code = document.getElementById("uq-code")?.value || "";
    const exam = live.byExam.get(code);
    if (exam?.questionsUploaded) {
      window.showToast?.("Questions are already uploaded for this exam. Upload is blocked.", "error");
      btn.disabled = true;
      btn.textContent = "Uploaded";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Uploading...";
    try {
      const parsed = await parseQuestionFile(file);
      const selectedExamCode = resolveExactExamCode(code);
      if (!selectedExamCode) {
        throw new Error("Invalid exam code. Please reopen the upload modal from a valid exam.");
      }
      const imported = (parsed.rows || []).map((row, idx) => {
        const optionValues = [
          txt(rowValue(row, ["Option A", "A", "opt_a"]) || ""),
          txt(rowValue(row, ["Option B", "B", "opt_b"]) || ""),
          txt(rowValue(row, ["Option C", "C", "opt_c"]) || ""),
          txt(rowValue(row, ["Option D", "D", "opt_d"]) || ""),
          txt(rowValue(row, ["Option E", "E", "opt_e"]) || ""),
          txt(rowValue(row, ["Option F", "F", "opt_f"]) || "")
        ].filter((value) => value && value.trim() !== "");
        const shouldShuffleOptions = optionValues.length > 4;
        return {
        examCode: txt(rowValue(row, ["Exam Code", "ExamCode", "exam_code", "Code"]) || selectedExamCode),
        questionText: txt(rowValue(row, ["Question", "Question Text", "question_text", "Q", "Prompt"]) || `Question ${idx + 1}`),
        questionType: normalizeUploadQuestionType(rowValue(row, ["Question Type", "Type", "question_type"])),
        marks: num(rowValue(row, ["Marks", "Mark", "Score"]), 1),
        difficulty: txt(rowValue(row, ["Difficulty", "Level"]) || "Easy"),
        topic: txt(rowValue(row, ["Topic", "Section", "Subject"]) || "general"),
        optionA: txt(rowValue(row, ["Option A", "A", "opt_a"]) || ""),
        optionB: txt(rowValue(row, ["Option B", "B", "opt_b"]) || ""),
        optionC: txt(rowValue(row, ["Option C", "C", "opt_c"]) || ""),
        optionD: txt(rowValue(row, ["Option D", "D", "opt_d"]) || ""),
        optionE: txt(rowValue(row, ["Option E", "E", "opt_e"]) || ""),
        optionF: txt(rowValue(row, ["Option F", "F", "opt_f"]) || ""),
        sampleInput: txt(rowValue(row, ["Sample Input", "Input"]) || ""),
        sampleOutput: txt(rowValue(row, ["Sample Output", "Output"]) || ""),
        correctAnswer: txt(rowValue(row, ["Correct Answer", "Answer", "Correct"]) || ""),
        shuffleOptions: shouldShuffleOptions,
        displayOrder: idx + 1,
        shuffleGroup: ""
      };
      }).filter((q) => q.questionText && q.questionText.trim() !== "");
      const fileExamCodes = [...new Set(imported.map((q) => txt(q.examCode).trim()).filter(Boolean))];
      if (fileExamCodes.length && (fileExamCodes.length > 1 || fileExamCodes[0] !== selectedExamCode)) {
        throw new Error(`Exam code mismatch. Selected ${selectedExamCode}, but the file contains ${fileExamCodes.join(", ")}.`);
      }
      if (!imported.length) {
        throw new Error("No valid questions were found in the file. Check the question text and columns.");
      }
      const result = await api(`/api/admin/questions/exam/${encodeURIComponent(selectedExamCode)}/bulk`, {
        method: "POST",
        body: JSON.stringify(imported)
      });
      const questions = arr(result?.data?.questions || result?.questions || imported);
      if (exam) exam.questionsUploaded = true;
      live.questionCounts.set(selectedExamCode, questions.length || imported.length);
      await loadAll();
      if (fileInput) fileInput.dataset.uploaded = "true";
      btn.disabled = true;
      btn.textContent = "Uploaded";
      window.showToast?.(`Questions uploaded successfully. ${questions.length || imported.length} questions saved.`, "success");
      closeModal("uploadQuestionsModal");
    } catch (error) {
      btn.disabled = false;
      btn.textContent = "Upload File";
      window.showToast?.(error.message || "Failed to upload questions", "error");
    }
  }

  async function toggleTeacherStatus(btn, id) {
    try {
      await handleActionBtn(btn, btn.textContent, "Processing...", "Done", async () => {
        await api(`/api/admin/users/${encodeURIComponent(id)}/toggle-enabled`, { method: "POST" });
        await loadAll();
        return true;
      });
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to update teacher status", "error");
    }
  }

  async function toggleStudentStatus(btn, id) {
    try {
      await handleActionBtn(btn, btn.textContent, "Processing...", "Done", async () => {
        await api(`/api/admin/users/${encodeURIComponent(id)}/toggle-enabled`, { method: "POST" });
        await loadAll();
        return true;
      });
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to update student status", "error");
    }
  }

  async function forceSubmit(id) {
    try {
      await api(`/api/admin/attempts/${encodeURIComponent(id)}/force-submit`, { method: "POST" });
      await loadAll();
      window.handleAttemptFilters?.();
      window.updateAttemptStats?.();
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to force submit attempt", "error");
    }
  }

  function requestCancelAttempt(id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    window.attemptToCancelId = id;
    const att = (window.attemptsData || []).find((a) => a.id === txt(id));
    if (typeof window.prepareDeleteConfirmModal === "function") {
      window.prepareDeleteConfirmModal({
        type: "attempt",
        id,
        name: `${att?.studentName || "Student"} • ${att?.examTitle || "Exam"} • ${id}`,
        action: "cancel",
        requireTypedConfirm: true,
        expectedText: "CANCEL ATTEMPT"
      });
    }
    openModal("deleteConfirmModal");
  }

  function cancelProcAttempt(id) {
    requestCancelAttempt(id);
  }

  async function triggerProcAnalysis(id) {
    try {
      await loadAll();
      window.showToast?.(`Analysis refreshed for ${id}`, "info");
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to trigger analysis", "error");
    }
  }

  async function verifyCert(id) {
    try {
      const cert = live.certificates.find((item) => item.id === id);
      if (!cert) return;
      const res = await fetch(`${apiBase}/api/certificate/verify/${encodeURIComponent(id)}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json,text/plain,*/*", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }
      });
      if (res.status === 401 || res.status === 403) {
        redirectToLoginOnce();
        return;
      }
      let result = null;
      try { result = await res.json(); } catch (_e) { result = null; }
      if (!res.ok && res.status !== 410) {
        throw new Error((result && (result.message || result.error)) || `Verify failed (${res.status})`);
      }
      const revoked = res.status === 410 || Boolean(result?.revoked);
      document.getElementById("certVerifyTitle") && (document.getElementById("certVerifyTitle").textContent = `Verifying ID: ${id}`);
      document.getElementById("certVerifyDesc") && (document.getElementById("certVerifyDesc").textContent = revoked ? "Certificate has been revoked" : "Verification successful");
      if (document.getElementById("certVerifyStatus")) {
        document.getElementById("certVerifyStatus").innerHTML = revoked
          ? '<i class="fa-solid fa-circle-xmark" style="color:var(--accent-pink)"></i>'
          : '<i class="fa-solid fa-circle-check" style="color:var(--accent-green)"></i>';
      }
      openModal("certVerifyModal");
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to verify certificate", "error");
    }
  }

  async function downloadCert(id) {
    try {
      const res = await fetch(`${apiBase}/api/certificate/download/${encodeURIComponent(id)}`, {
        credentials: "same-origin",
        headers: { ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }
      });
      if (res.status === 401 || res.status === 403) {
        redirectToLoginOnce();
        return;
      }
      if (res.status === 410) throw new Error("Certificate has been revoked");
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      if (!blob || !blob.size) throw new Error("Download failed");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `certificate-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      window.showToast?.(`Certificate ${id} downloaded`, "success");
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Failed to download certificate", "error");
    }
  }

  function revokeCert(id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = id;
    const cert = (window.allCertificates || []).find((c) => c.id === id);
    if (typeof window.prepareDeleteConfirmModal === "function") {
      window.prepareDeleteConfirmModal({
        type: "certificate",
        id,
        name: cert?.id || id,
        action: "revoke",
        requireTypedConfirm: true,
        expectedText: "REVOKE CERTIFICATE"
      });
    }
    openModal("deleteConfirmModal");
  }

  async function openCertView(id) {
    const cert = live.certificates.find((item) => item.id === id);
    if (!cert) return;
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[ch]);
    const previewFrame = document.getElementById("adminCertPreviewFrame");
    if (previewFrame) {
      const qrValue = txt(cert.qrCodeData).trim();
      const qrSrc = qrValue && (
        qrValue.startsWith("data:image/")
        || /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(qrValue)
      )
        ? qrValue
        : `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrValue || `${apiBase}/api/certificate/verify/${id}`)}`;
      previewFrame.innerHTML = `
        <div class="certificate-preview-artwork">
          <div class="corner-bracket top-left"></div>
          <div class="corner-bracket top-right"></div>
          <div class="corner-bracket bottom-left"></div>
          <div class="corner-bracket bottom-right"></div>
          <div class="dot-grid left-grid"></div>
          <div class="dot-grid right-grid"></div>
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
                  <span class="star">&#9733;</span>
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
              <div class="badge-icon">&#9733;</div>
              <div class="badge-copy">
                <strong>EXAM COMPLETED</strong>
                <span>${cert.active ? "Successfully Certified" : "Revoked Credential"}</span>
              </div>
            </div>
          </div>
          <div class="certificate-main-content">
            <p class="certificate-preview-subtitle">This is to certify that</p>
            <h2 class="certificate-preview-name">${escapeHtml(cert.name || "Student")}</h2>
            <div class="name-divider">
              <span class="line"></span>
              <span class="diamond">&#9830;</span>
              <span class="line"></span>
            </div>
            <div class="certificate-preview-title">
              <span>Certificate of</span>
              <strong>Excellence</strong>
            </div>
            <p class="certificate-preview-bodycopy">
              has successfully completed the examination in<br>
              <strong class="subject-title">${escapeHtml(cert.exam || "Online Examination")}</strong><br>
              with a score of <strong class="score-highlight">${escapeHtml(cert.score ?? "0")}/100</strong> on ${escapeHtml(cert.date)}
            </p>
            <div class="bottom-divider">
              <span class="line"></span>
              <span class="diamond">&#9830;</span>
              <span class="line"></span>
            </div>
          </div>
          <div class="certificate-preview-footer">
            <div class="certificate-footer-qr-col">
              <div class="qr-box-wrapper">
                <img src="${qrSrc}" class="qr-image" alt="QR Code">
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
              <strong class="id-value">${escapeHtml(cert.id)}</strong>
              <span class="issue-date-label">Issued: ${escapeHtml(cert.date)}</span>
            </div>
          </div>
        </div>`;
    }
    const downloadBtn = document.getElementById("certModalDownloadBtn");
    if (downloadBtn) {
      downloadBtn.style.display = cert.active ? "inline-flex" : "none";
      downloadBtn.onclick = () => downloadCert(cert.id);
    }
    if (typeof openModal === "function") {
      openModal("certificateViewModal");
    }
  }

  async function deleteConfirmHandler() {
    const btn = this;
    const id = window.examToDeleteId || window.teacherToDeleteId || window.studentToDeleteId || window.certToRevokeId || window.attemptToCancelId;
    if (!id) return;
    if (window.deleteConfirmRequiresText) {
      const input = document.getElementById("deleteConfirmInput");
      if ((input?.value || "").trim() !== window.deleteConfirmExpectedText) {
        document.getElementById("deleteConfirmError") && (document.getElementById("deleteConfirmError").style.display = "block");
        input && input.classList.add("is-invalid");
        return;
      }
    }
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="btn-spinner"></span> Processing...';
    try {
      if (window.examToDeleteId) await api(`/api/admin/exams/${encodeURIComponent(id)}`, { method: "DELETE" });
      else if (window.teacherToDeleteId || window.studentToDeleteId) await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      else if (window.certToRevokeId) await api(`/api/certificate/revoke/${encodeURIComponent(id)}`, { method: "POST" });
      else if (window.attemptToCancelId) await api(`/api/admin/attempts/${encodeURIComponent(id)}/cancel`, { method: "POST" });
      await loadAll();
      closeDeleteConfirmModal?.();
      window.showToast?.("Action completed successfully", "success");
    } catch (error) {
      console.error(error);
      window.showToast?.(error.message || "Action failed", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = original || "Yes, Delete";
      window.examToDeleteId = null;
      window.teacherToDeleteId = null;
      window.studentToDeleteId = null;
      window.certToRevokeId = null;
      window.attemptToCancelId = null;
    }
  }

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  if (confirmBtn) {
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener("click", deleteConfirmHandler);
  }

  if (window.AdminDashboard) {
    const originalInit = window.AdminDashboard.init ? window.AdminDashboard.init.bind(window.AdminDashboard) : null;
    window.AdminDashboard.init = function () {
      if (originalInit) originalInit();
    };
    window.AdminDashboard.populateMockData = () => loadAll().catch((error) => console.error("Admin live sync failed:", error?.message || error));
  window.AdminDashboard.refreshOverview = async () => {
    try {
      await loadAll();
    } catch (error) {
      console.error(error);
      if (error?.status === 401 || error?.status === 403) {
        redirectToLoginOnce();
        return;
      }
      window.showToast?.(error.message || "Failed to load admin data", "error");
    }
  };
    window.AdminDashboard.initDashboardEngine = function () {
      this.dashboardState = this.dashboardState || { logFilter: "all", examPage: 1, examSize: 5, examSort: "active", examSortAsc: false, refreshTimer: 30 };
      this.startDashTimer?.();
    };
    window.AdminDashboard.autoLogCycle = () => {};
    window.AdminDashboard.updateActivityFooter = window.AdminDashboard.updateActivityFooter || (() => {});
    window.AdminDashboard.renderDashboardOverview = window.AdminDashboard.renderDashboardOverview || (() => {});
    window.AdminDashboard.renderSettings = window.AdminDashboard.renderSettings || (() => {});
    window.AdminDashboard.renderNotifications = window.AdminDashboard.renderNotifications || (() => {});
    window.AdminDashboard.renderAdminProfile = window.AdminDashboard.renderAdminProfile || (() => {});
    window.AdminDashboard.renderCertificates = () => initCertificatesEngine();
    window.AdminDashboard.renderLeaderboard = () => {
      window.renderLBSection?.();
      window.updateLBCharts?.();
    };

    queueMicrotask(() => {
      window.AdminDashboard.refreshOverview?.().catch((error) => {
        console.error("Admin dashboard bootstrap refresh failed:", error);
      });
    });
  }

  window.AdminLive = { loadAll, api, live };
  window.AdminLive.refreshAuditLogs = refreshAuditLogs;
  window.refreshAttempts = refreshAttempts;
  window.refreshProctoring = refreshProctoring;
  window.initCertificatesEngine = initCertificatesEngine;
  window.initLeaderboardEngine = initLeaderboardEngine;
  window.submitAddTeacher = submitCreateTeacher;
  window.submitCreateExam = submitCreateExam;
  window.submitEditExam = submitEditExam;
  window.submitUploadQuestions = submitUploadQuestions;
  window.openViewQuestions = openViewQuestions;
  window.openUploadQuestions = openUploadQuestions;
  window.publishExam = publishExam;
  window.toggleTeacherStatus = toggleTeacherStatus;
  window.toggleStudentStatus = toggleStudentStatus;
  window.forceSubmit = forceSubmit;
  window.requestCancelAttempt = requestCancelAttempt;
  window.cancelProcAttempt = cancelProcAttempt;
  window.triggerProcAnalysis = triggerProcAnalysis;
  window.verifyCert = verifyCert;
  window.downloadCert = downloadCert;
  window.revokeCert = revokeCert;
  window.openCertView = openCertView;

  initTeacherCreateEnhancements();
})();
