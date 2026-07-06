(() => {
  const K = { p:'student-ui-profile', s:'student-ui-settings', sec:'student-ui-section', q:'student-ui-search', t:'student-ui-theme', er:'student-ui-exam-reg', es:'student-ui-exam-sessions', ea:'student-ui-exam-attempts', ev:'student-ui-exam-verification', nn:'student-ui-notifications' };
  const API_BASE = /^https?:/i.test(window.location.origin) ? window.location.origin : 'http://localhost:8080';
  const AUTH_KEYS = ['token', 'accessToken', 'jwt', 'authToken', 'access_token'];
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pct = (n) => `${Number(n).toFixed(1)}%`;
  const fmtScore = (n) => `${Number(n).toFixed(1)}`;
  const load = (k, f) => { try { return Object.assign({}, f, JSON.parse(localStorage.getItem(k) || '{}')); } catch { return f; } };
  const loadArray = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return Array.isArray(v) ? v : f; } catch { return f; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const leaderboardStudentKey = (value) => String(value ?? '').trim();
  const normalizeLeaderboardRows = (rows) => {
    const bestByStudent = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const studentId = leaderboardStudentKey(row?.studentId);
      if (!studentId) return;
      const current = {
        ...row,
        studentId,
        studentName: row?.studentName || `Student-${studentId}`,
        score: Number(row?.score || 0),
        percentage: Number(row?.percentage || 0),
        rank: Number(row?.rank || 0)
      };
      const existing = bestByStudent.get(studentId);
      if (!existing) {
        bestByStudent.set(studentId, current);
        return;
      }
      const better =
        current.percentage > existing.percentage ||
        (current.percentage === existing.percentage && current.score > existing.score) ||
        (current.percentage === existing.percentage && current.score === existing.score && current.rank > 0 && (existing.rank <= 0 || current.rank < existing.rank));
      if (better) {
        bestByStudent.set(studentId, current);
      }
    });
    return Array.from(bestByStudent.values())
      .sort((a, b) => a.rank - b.rank || b.percentage - a.percentage || b.score - a.score || a.studentName.localeCompare(b.studentName))
      .map((row, index) => ({
        ...row,
        rank: index + 1,
        score: Number(row.score || 0),
        percentage: Number(row.percentage || 0)
      }));
  };
  const normalizeToken = (raw) => {
    if (!raw) return '';
    let value = String(raw).trim();
    if (!value) return '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }
    if (/^bearer\s+/i.test(value)) {
      value = value.replace(/^bearer\s+/i, '').trim();
    }
    return value;
  };
  const clearAuthStorage = () => {
    AUTH_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    localStorage.removeItem('role');
    sessionStorage.removeItem('role');
  };
  const redirectToLogin = () => { window.location.href = 'role-selection.html'; };
  const getToken = () => {
    for (const key of AUTH_KEYS) {
      const localValue = normalizeToken(localStorage.getItem(key));
      if (localValue) return localValue;
      const sessionValue = normalizeToken(sessionStorage.getItem(key));
      if (sessionValue) return sessionValue;
    }
    return '';
  };
  const apiRequest = async (path, options = {}) => {
    try {
      // Use the centralized API utility
      // student-ui.js prepends /api manually, but API.js handles the base part
      // So if path starts with /, we use it as is
      return await API.request(`/api${path}`, options);
    } catch (err) {
      if (!options.silent) {
        // toast is a global or accessible function in student-ui.js via toastStack
        console.error('API Error:', err.message);
        // showToast is defined later in student-ui.js
        if (typeof showToast === 'function') showToast(err.message, 'danger');
      }
      throw err;
    }
  };
  async function isActiveAttempt(attemptId) {
    if (!attemptId) return false;
    try {
      const attempt = await apiRequest(`/exam/resume/${attemptId}`, { method: 'GET', silent: true });
      return Boolean(
        attempt &&
        Number(attempt.id || attempt.attemptId) === Number(attemptId) &&
        String(attempt.status || '').toUpperCase() === 'STARTED' &&
        !Boolean(attempt.cancelled) &&
        attempt.active !== false
      );
    } catch (error) {
      return false;
    }
  }
  const toIsoOrEmpty = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    return '';
  };
  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const resolvePercentage = (score, percentage, totalMarks = 0) => {
    const pctValue = Number(percentage);
    if (Number.isFinite(pctValue) && pctValue > 0) return pctValue;
    const total = Number(totalMarks);
    const obtained = Number(score);
    if (Number.isFinite(total) && total > 0 && Number.isFinite(obtained)) {
      return (obtained * 100.0) / total;
    }
    if (Number.isFinite(obtained) && obtained > 0) return Math.min(100, obtained);
    return 0;
  };
  const leaderboardRows = (rows) => rows.map(([studentId, studentName, score, percentage, rank], idx) => ({
    studentId,
    studentName,
    score,
    percentage,
    rank: rank || idx + 1
  }));
  const st = {
    sec: localStorage.getItem(K.sec) || 'dashboard',
    q: localStorage.getItem(K.q) || '',
    theme: localStorage.getItem(K.t) || 'light',
    currentUserId: '',
    results: {
      page: 1,
      pageSize: 10
    },
      leaderboard: {
        mode: 'global',
        sort: 'rank',
        q: ''
      },
      analytics: {
        trendFilter: 'this-month',
        passFilter: 'all-exams',
        mixFilter: 'all-exams'
      },
      profile: load(K.p, { fullName:'', email:'', phone:'', collegeName:'', department:'', year:'', rollNumber:'', section:'' }),
    settings: load(K.s, { emailAlerts:true, examReminders:true, compactDensity:false, highContrast:false }),
    examRegistration: load(K.er, {}),
    examSessions: load(K.es, {}),
    examAttemptIds: load(K.ea, {}),
    examVerification: load(K.ev, {}),
    profileEditorPhotoDraft: '',
    examUi: {
      minuteToken: '',
      secondToken: '',
      countdownTimer: null,
      activeCode: null,
      mode: 'start',
      step: 1,
      imageData: '',
      imageName: '',
      form: {},
      currentStepValid: false
    },
    data: {
      dash: { totalExams:0, attemptedCount:0, averageScore:0, certificatesEarned:0, trend:[], attempts:[] },
      exams: [],
      results: [],
      certs: [],
      leaderboard: {
        global: [],
        exam: []
      },
      analytics: { attemptedExams:0, averageScore:0, highestScore:0, lowestScore:0, passRate:0 },
      notifications: [],
      supportFaq: [
        { question:'How do I start an exam?', answer:'Open the Exam section, verify the access window, and complete pre-exam verification when prompted.' },
        { question:'Why is my exam locked?', answer:'Exams can be locked because registration is required, the window is closed, or the live timer has not started yet.' },
        { question:'What happens if proctoring fails?', answer:'The session is paused or flagged according to policy, and you should contact support immediately.' },
        { question:'How do I download certificates?', answer:'Go to the Certificates section and open a verified certificate to download it securely.' }
      ],
      proctoring: {
        cameraEnabled: true,
        micEnabled: true,
        fullscreenActive: true,
        faceDetected: true,
        violationsCount: 0,
        aiMonitoringActive: true
      }
    }

  };
  async function hydrateFromBackend() {
    const token = getToken();
    if (!token) return;

    const payload = await apiRequest('/student/bootstrap');
    if (!payload || typeof payload !== 'object') return;

    const profile = payload.profile || {};
    st.currentUserId = payload.studentId ? String(payload.studentId) : st.currentUserId;
    st.profile = {
      fullName: profile.fullName || st.profile.fullName || '',
      email: profile.email || st.profile.email || '',
      phone: profile.phone || st.profile.phone || '',
      collegeName: profile.collegeName || st.profile.collegeName || '',
      department: profile.department || st.profile.department || '',
      year: profile.year || st.profile.year || '',
      rollNumber: profile.rollNumber || st.profile.rollNumber || '',
      section: profile.section || st.profile.section || '',
      profilePhoto: profile.profilePhoto || st.profile.profilePhoto || ''
    };

    const dashboard = payload.dashboard || {};
    const dashAttempts = Array.isArray(dashboard.attempted) ? dashboard.attempted : [];
    st.data.dash = {
      totalExams: Number(dashboard.totalExams || 0),
      attemptedCount: Number(dashboard.attemptedCount || 0),
      averageScore: Number(dashboard.averageScore || 0),
      certificatesEarned: Number(dashboard.certificatesEarned || 0),
      trend: Array.isArray(dashboard.performanceTrend) ? dashboard.performanceTrend : [],
      attempts: dashAttempts.map((item) => ({
        examCode: item.examCode,
        obtainedMarks: item.obtainedMarks || 0,
        totalMarks: item.totalMarks || 0,
        percentage: Number(item.percentage || 0),
        badge: item.badge || 'PARTICIPANT',
        status: 'Completed',
        date: 'Recent',
        duration: '-'
      }))
    };
    const backendAttempts = Array.isArray(payload.attempts) ? payload.attempts : [];
    const attemptSummaryByCode = new Map();
    backendAttempts.forEach((attempt) => {
      const examCode = String(attempt?.examCode || '').trim();
      if (!examCode) return;
      const current = attemptSummaryByCode.get(examCode) || {
        count: 0,
        maxAttemptNumber: 0,
        hasActive: false,
        resumeAttemptId: null
      };
      current.count += 1;
      current.maxAttemptNumber = Math.max(current.maxAttemptNumber, toNumber(attempt?.attemptNumber, 0));
      const status = String(attempt?.status || '').toUpperCase();
      const active = status === 'STARTED' && !Boolean(attempt?.cancelled);
      if (active) {
        current.hasActive = true;
        if (attempt?.id != null) current.resumeAttemptId = attempt.id;
      }
      attemptSummaryByCode.set(examCode, current);
    });

    st.data.exams = Array.isArray(payload.exams) ? payload.exams.map((exam) => {
      const startAt = toIsoOrEmpty(exam.startAt || exam.startTime || exam.examStartTime);
      const endAt = toIsoOrEmpty(exam.examEndTime || exam.endTime);
      const easyCount = toNumber(exam.easyQuestionCount);
      const mediumCount = toNumber(exam.mediumQuestionCount);
      const difficultCount = toNumber(exam.difficultQuestionCount);
      const summary = attemptSummaryByCode.get(String(exam?.examCode || '').trim()) || null;
      const attemptsUsed = Math.max(
        toNumber(exam.attemptsUsed, 0),
        toNumber(summary?.maxAttemptNumber, 0),
        toNumber(summary?.count, 0)
      );
      const resumeAttemptId = exam?.resumeAttemptId ?? summary?.resumeAttemptId ?? null;
      const examStatus = summary?.hasActive ? 'resume' : (exam.status || 'available');
      return {
        ...exam,
        startAt,
        examStartTime: startAt || exam.examStartTime || '',
        examEndTime: endAt || exam.examEndTime || '',
        durationMinutes: toNumber(exam.durationMinutes),
        totalMarks: toNumber(exam.totalMarks),
        passingMarks: toNumber(exam.passingMarks),
        maxAttempts: toNumber(exam.maxAttempts, 1),
        negativeMarks: toNumber(exam.negativeMarks),
        easyQuestionCount: easyCount,
        mediumQuestionCount: mediumCount,
        difficultQuestionCount: difficultCount,
        totalQuestions: toNumber(exam.totalQuestions, easyCount + mediumCount + difficultCount),
        instructions: Array.isArray(exam.instructions) ? exam.instructions : [],
        attemptsUsed,
        resumeAttemptId,
        status: examStatus,
        registered: Boolean(exam?.registered)
      };
    }) : st.data.exams;
    const registeredFromBackend = new Set();
    st.data.exams.forEach((exam) => {
      const code = String(exam?.examCode || '').trim();
      if (!code) return;
      if (Boolean(exam?.registered)) {
        registeredFromBackend.add(code);
      }
    });
    if (Array.isArray(payload.registeredExamCodes)) {
      payload.registeredExamCodes
        .map((code) => String(code || '').trim())
        .filter(Boolean)
        .forEach((code) => registeredFromBackend.add(code));
    }
    const nextRegistrationMap = {};
    st.data.exams.forEach((exam) => {
      const code = String(exam?.examCode || '').trim();
      if (!code) return;
      nextRegistrationMap[code] = registeredFromBackend.has(code);
    });
    st.examRegistration = nextRegistrationMap;
    st.data.exams.forEach((exam) => {
      if (exam?.examCode && exam?.resumeAttemptId) {
        st.examAttemptIds[exam.examCode] = exam.resumeAttemptId;
      }
    });
    st.data.results = Array.isArray(payload.results) ? payload.results.map((result) => {
      const linkedExam = st.data.exams.find((exam) => exam.examCode === result.examCode);
      const totalQuestions = toNumber(
        result.totalQuestions,
        toNumber(linkedExam?.totalQuestions, toNumber(linkedExam?.easyQuestionCount) + toNumber(linkedExam?.mediumQuestionCount) + toNumber(linkedExam?.difficultQuestionCount))
      );
      const correctAnswers = toNumber(result.correctAnswers);
      const wrongAnswers = toNumber(result.wrongAnswers);
      const unansweredQuestions = toNumber(result.unansweredQuestions, Math.max(totalQuestions - correctAnswers - wrongAnswers, 0));
      const score = toNumber(result.score, toNumber(result.obtainedMarks));
      const percentage = resolvePercentage(score, result.percentage, toNumber(linkedExam?.totalMarks || totalQuestions));
      return {
        id: result.id,
        attemptId: result.attemptId,
        examCode: result.examCode,
        score,
        percentage,
        resultStatus: result.resultStatus || (percentage >= 40 ? 'Pass' : 'Fail'),
        passed: Boolean(result.passed) || percentage >= 40,
        correctAnswers,
        wrongAnswers,
        unansweredQuestions,
        timeTakenSeconds: toNumber(result.timeTakenSeconds),
        grade: result.grade || (percentage >= 90 ? 'O' : percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B+' : percentage >= 50 ? 'B' : 'F'),
        submittedAt: result.submittedAt || result.updatedAt || result.createdAt || null,
        evaluatedAt: result.evaluatedAt || null,
        totalQuestions,
        easyCorrect: toNumber(result.easyCorrect),
        mediumCorrect: toNumber(result.mediumCorrect),
        difficultCorrect: toNumber(result.difficultCorrect ?? result.hardCorrect),
        hardCorrect: toNumber(result.hardCorrect ?? result.difficultCorrect),
        easyWrong: toNumber(result.easyWrong),
        mediumWrong: toNumber(result.mediumWrong),
        difficultWrong: toNumber(result.difficultWrong ?? result.hardWrong),
        hardWrong: toNumber(result.hardWrong ?? result.difficultWrong)
      };
    }) : (Array.isArray(payload.attempts) ? payload.attempts.map((attempt) => {
      const linkedExam = st.data.exams.find((exam) => exam.examCode === attempt.examCode);
      const totalQuestions = toNumber(
        attempt.totalQuestions,
        toNumber(linkedExam?.totalQuestions, toNumber(linkedExam?.easyQuestionCount) + toNumber(linkedExam?.mediumQuestionCount) + toNumber(linkedExam?.difficultQuestionCount))
      );
      const correctAnswers = toNumber(attempt.correctAnswers);
      const wrongAnswers = toNumber(attempt.wrongAnswers);
      const unansweredQuestions = toNumber(attempt.unansweredQuestions, Math.max(totalQuestions - correctAnswers - wrongAnswers, 0));
      const score = toNumber(attempt.obtainedMarks, toNumber(attempt.score));
      const percentage = resolvePercentage(score, attempt.percentage, toNumber(attempt.totalMarks, linkedExam?.totalMarks || 0));
      return {
        examCode: attempt.examCode,
        score,
        percentage,
        resultStatus: percentage >= 40 ? 'Pass' : 'Fail',
        passed: percentage >= 40,
        correctAnswers,
        wrongAnswers,
        unansweredQuestions,
        timeTakenSeconds: toNumber(attempt.timeTakenSeconds),
        grade: attempt.grade || (percentage >= 90 ? 'O' : percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B+' : percentage >= 50 ? 'B' : 'F'),
        submittedAt: attempt.endTime || attempt.updatedAt || attempt.createdAt || null,
        totalQuestions,
        easyCorrect: toNumber(attempt.easyCorrect),
        mediumCorrect: toNumber(attempt.mediumCorrect),
        difficultCorrect: toNumber(attempt.difficultCorrect ?? attempt.hardCorrect),
        hardCorrect: toNumber(attempt.hardCorrect ?? attempt.difficultCorrect),
        easyWrong: toNumber(attempt.easyWrong),
        mediumWrong: toNumber(attempt.mediumWrong),
        difficultWrong: toNumber(attempt.difficultWrong ?? attempt.hardWrong),
        hardWrong: toNumber(attempt.hardWrong ?? attempt.difficultWrong)
      };
    }) : st.data.results);
    st.data.certs = Array.isArray(payload.certificates) ? payload.certificates.map((cert) => ({
      ...cert,
      revoked: Boolean(cert.revoked),
      examTitle: cert.examTitle || cert.examCode || 'Exam Certificate',
      issuedAt: cert.issuedAt || cert.updatedAt || cert.createdAt || null
    })) : st.data.certs;
    if (Array.isArray(payload.leaderboardGlobal)) {
      st.data.leaderboard.global = normalizeLeaderboardRows(payload.leaderboardGlobal);
    }
    st.data.analytics = normalizeAnalyticsSnapshot(payload.analytics || dashboard.analytics || st.data.analytics, st.data.results);

    save(K.p, st.profile);
    save(K.ea, st.examAttemptIds);
  }

  let booting = true;
  const el = {};
  const ico = {
    menu:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/></svg>',
    filter:'<svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7v5l-4 2v-7z"/></svg>',
    bell:'<svg viewBox="0 0 24 24"><path d="M15 17H5l1.4-2.1A2 2 0 0 0 7 13.7V10a5 5 0 0 1 10 0v3.7c0 .4.1.8.3 1.1L18 17h-3"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>',
    chevron:'<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    collapse:'<svg viewBox="0 0 24 24"><path d="M10 5 4 12l6 7"/><path d="M20 12H4"/><path d="M14 5v14"/></svg>',
    sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1"/></svg>',
    moon:'<svg viewBox="0 0 24 24"><path d="M20 13.5A8.5 8.5 0 1 1 10.5 4 7 7 0 0 0 20 13.5z"/></svg>',
    system:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M8 19h8M12 16v3"/></svg>',
    refresh:'<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v6h-6"/></svg>',
    spark:'<svg viewBox="0 0 24 24"><path d="M13 2l1.8 6.2L21 10l-6.2 1.8L13 18l-1.8-6.2L5 10l6.2-1.8L13 2z"/><path d="M4 20h16"/></svg>',
    dashboard:'<svg viewBox="0 0 24 24"><path d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z"/></svg>',
    exams:'<svg viewBox="0 0 24 24"><path d="M7 4h10v16H7z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    results:'<svg viewBox="0 0 24 24"><path d="M5 20V4"/><path d="M5 20h14"/><path d="M8 15l3-3 2 2 4-5"/></svg>',
    certificates:'<svg viewBox="0 0 24 24"><path d="M6 3h12v14H6z"/><path d="M10 17v4l2-1.5L14 21v-4"/><path d="M9 8h6M9 11h6"/></svg>',
    leaderboard:'<svg viewBox="0 0 24 24"><path d="M5 20h14"/><path d="M8 20V9h3v11"/><path d="M13 20V4h3v16"/></svg>',
    profile:'<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/></svg>',
    analytics:'<svg viewBox="0 0 24 24"><path d="M5 19V5"/><path d="M5 19h14"/><path d="M8 16v-4M12 16V8M16 16v-6"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-1.8 3.1-.1-.1a1.8 1.8 0 0 0-2-.4l-.3.1a1.8 1.8 0 0 0-1.1 1.6V22H9.4v-.6a1.8 1.8 0 0 0-1.1-1.6l-.3-.1a1.8 1.8 0 0 0-2 .4l-.1.1L4.1 17l.1-.1a1.8 1.8 0 0 0 .4-2l-.1-.3A1.8 1.8 0 0 0 2.9 13H2V11h.6a1.8 1.8 0 0 0 1.6-1.1l.1-.3a1.8 1.8 0 0 0-.4-2l-.1-.1L5.6 4.4l.1.1a1.8 1.8 0 0 0 2 .4l.3-.1A1.8 1.8 0 0 0 9.1 3.2V2h5.8v.6a1.8 1.8 0 0 0 1.1 1.6l.3.1a1.8 1.8 0 0 0 2-.4l.1-.1L20.9 7l-.1.1a1.8 1.8 0 0 0-.4 2l.1.3A1.8 1.8 0 0 0 21.1 11h.9v2h-.6a1.8 1.8 0 0 0-1.6 1.1z"/></svg>',
    logout:'<svg viewBox="0 0 24 24"><path d="M10 17l-1.5-1.5L11 13H4V11h7l-2.5-2.5L10 7l5 5z"/><path d="M20 4v16H9"/></svg>',
    star:'<svg viewBox="0 0 24 24"><path d="m12 3 2.9 6 6.6.9-4.8 4.7 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6-4.8-4.7 6.6-.9z"/></svg>',
    calendar:'<svg viewBox="0 0 24 24"><path d="M7 3v3M17 3v3"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/></svg>',
    shield:'<svg viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V6l8-3z"/><path d="M9.5 12.2 11.2 14 15 10.2"/></svg>',
    help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.8 2.8 0 1 1 4.4 2.3c-.8.5-1.4 1-1.4 2.2"/><path d="M12 17h.01"/></svg>',
    brain:'<svg viewBox="0 0 24 24"><path d="M9 5a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 3 3"/><path d="M15 5a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-3 3"/><path d="M12 4v16"/><path d="M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z"/></svg>'
  };
  const badge = { PLATINUM:'success', GOLD:'warning', SILVER:'neutral', BRONZE:'danger' };
  const statusClass = { available:'available', upcoming:'upcoming', resume:'resume', closed:'closed' };
  const statusLabel = { available:'AVAILABLE', upcoming:'UPCOMING', resume:'RESUME', closed:'CLOSED' };
  const examTabMap = { all: 'all', available: 'available', upcoming: 'upcoming', completed: 'completed', resume: 'resume' };
  const leaderboardBadge = (pctValue) => {
    const value = Number(pctValue) || 0;
    if (value >= 90) return { label: 'Top Performer', tone: 'top' };
    if (value >= 75) return { label: 'Excellent', tone: 'excellent' };
    if (value >= 60) return { label: 'Good', tone: 'good' };
    return { label: 'Needs Improvement', tone: 'needs' };
  };
  const svg = (n) => `<span class="svg-icon">${ico[n] || icoExt[n] || ico.spark}</span>`;
  const initials = (n) => (n || 'Student').split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase();
  const avatar = (n) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#g)"/><text x="48" y="57" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#fff">${initials(n)}</text></svg>`)}`;
  const isMobile = () => matchMedia('(max-width: 768px)').matches;
  const themeQuery = matchMedia('(prefers-color-scheme: dark)');
  const progressWidth = (difficulty, exam) => {
    const total = Math.max((exam.easyQuestionCount || 0) + (exam.mediumQuestionCount || 0) + (exam.difficultQuestionCount || 0), 1);
    const value = difficulty === 'easy'
      ? exam.easyQuestionCount || 0
      : difficulty === 'medium'
        ? exam.mediumQuestionCount || 0
        : exam.difficultQuestionCount || 0;
    return clamp((value / total) * 100, 8, 100);
  };
  const formatDuration = (seconds = 0) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };
  const formatDate = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value || '-';
    return d.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
  };
  const examWindowSeed = {
    'CS-201': { registered: false, offsetMinutes: 12 },
    'CC-118': { registered: false, offsetMinutes: 18 },
    'CY-104': { registered: false, offsetMinutes: 42 },
    'TC-107': { registered: false, offsetMinutes: 84 },
    'DV-330': { registered: false, offsetMinutes: 126 },
    'MD-208': { registered: false, offsetMinutes: 168 },
    'CS-214': { registered: true, offsetMinutes: 48 },
    'CS-225': { registered: true, offsetMinutes: 22 },
    'CS-238': { registered: true, offsetMinutes: -5 },
    'AI-301': { registered: true, offsetMinutes: 1560 },
    'SE-210': { registered: true, offsetMinutes: 4500 },
    'MA-109': { registered: true, offsetMinutes: 7260 },
    'CS-101': { registered: true, offsetMinutes: -24 },
    'AI-302': { registered: true, offsetMinutes: -90 }
  };
  const getExamDate = (exam) => {
    const d = new Date(exam?.startAt || exam?.startTime || exam?.examStartTime || 0);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };
  const getExamEndDate = (exam) => {
    const rawEnd = exam?.endAt || exam?.endTime || exam?.examEndTime;
    if (rawEnd) {
      const parsed = new Date(rawEnd);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date(getExamDate(exam).getTime() + (Number(exam?.durationMinutes || 0) * 60000));
  };
  const formatExamTime = (exam) => getExamDate(exam).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatExamDateTime = (exam) => getExamDate(exam).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatFullDateTime = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const bestResultForExam = (examCode) => {
    const code = String(examCode || '').trim();
    if (!code) return null;
    const resultRows = Array.isArray(st.data.results) ? st.data.results : [];
    const dashRows = Array.isArray(st.data.dash?.attempts) ? st.data.dash.attempts : [];
    const sourceRows = [...resultRows, ...dashRows];
    const rows = sourceRows.filter((row) => String(row?.examCode || '').trim() === code);
    if (!rows.length) return null;
    return rows.slice().sort((a, b) => {
      const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const pctDiff = Number(b.percentage || 0) - Number(a.percentage || 0);
      if (pctDiff !== 0) return pctDiff;
      const aTime = new Date(a.submittedAt || a.evaluatedAt || a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.submittedAt || b.evaluatedAt || b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0] || null;
  };
  function examRuntimeState(exam) {
    const startAt = getExamDate(exam);
    const endAt = getExamEndDate(exam);
    const now = Date.now();
    const registered = !!st.examRegistration[exam.examCode];
    const result = bestResultForExam(exam.examCode);
    const attemptsRemaining = calculateAttemptsRemaining(exam);
    const attemptsUsed = Number(exam?.attemptsUsed || 0);
    const hasAttemptHistory = Boolean(
      attemptsUsed > 0
      || exam?.resumeAttemptId
      || st.examSessions[exam.examCode]
      || result
    );
    const expired = now > endAt.getTime() || String(exam?.status || '').toLowerCase() === 'closed';
    const attemptsDepleted = attemptsRemaining <= 0;
    const closed = expired || attemptsDepleted;
    const passed = !!(result && (result.passed || String(result.result || '').toUpperCase() === 'PASS'));
    const failed = !!(result && !passed);
    const resumeEligible = !closed && (
      !!exam.resumeAttemptId
      || !!st.examSessions[exam.examCode]
      || (hasAttemptHistory && !result)
      || String(exam?.status || '').toLowerCase() === 'resume'
    );
    const sessionStarted = !closed && (
      !!exam.resumeAttemptId
      || !!st.examSessions[exam.examCode]
      || (hasAttemptHistory && !result)
      || resumeEligible
      || String(exam?.status || '').toLowerCase() === 'resume'
    );
    const reexamEligible = !closed && failed && attemptsRemaining > 0;

    // Use backend-provided registration phase times
    const registrationStartTime = exam.registrationStartTime ? new Date(exam.registrationStartTime) : null;
    const phase1EndTime = exam.phase1EndTime ? new Date(exam.phase1EndTime) : null;
    const phase2StartTime = exam.phase2StartTime ? new Date(exam.phase2StartTime) : null;

    // Registration closes when exam starts. Phase-2 opens before start.
    const registrationCloseAt = startAt.getTime();
    const verificationOpenAt = phase2StartTime
      ? phase2StartTime.getTime()
      : (phase1EndTime ? phase1EndTime.getTime() : (startAt.getTime() - (30 * 60000)));
    const inPhase2Window = now >= verificationOpenAt && now < registrationCloseAt;

    const registrationOpen = !!exam.registrationOpen
      && (!registrationStartTime || now >= registrationStartTime.getTime())
      && now < registrationCloseAt;
    const preStartLock = false;
    const verificationOpen = now >= verificationOpenAt && now < startAt.getTime();
    const live = now >= startAt.getTime() && now <= endAt.getTime();
    const upcoming = now < startAt.getTime();
    const completed = closed || (passed && !live);
    const minutesUntil = Math.ceil((startAt.getTime() - now) / 60000);
    const minutesUntilVerification = Math.ceil((verificationOpenAt - now) / 60000);
    const minutesUntilRegistrationClose = Math.ceil((registrationCloseAt - now) / 60000);

    return {
      registered,
      sessionStarted,
      result,
      failed,
      completed,
      resumeEligible,
      reexamEligible,
      attemptsRemaining,
      registrationOpen,
      preStartLock,
      verificationOpen,
      minutesUntilVerification,
      minutesUntilRegistrationClose,
      live,
      upcoming,
      expired,
      minutesUntil,
      startAt,
      endAt,
      registrationDeadline: new Date(registrationCloseAt),
      verificationOpenAt: new Date(verificationOpenAt),
      currentPhase: exam.currentRegistrationPhase || 'CLOSED',
      requiresPhase2Verification: !!exam.requiresPhase2Verification || inPhase2Window
    };
  }
  const icoExt = {
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V6l8-3z"/><path d="M9.5 12.2 11.2 14 15 10.2"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="11" rx="2"/><path d="M9 7l1.5-3h3L15 7"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V8a4 4 0 1 1 8 0v2"/></svg>',
    ai: '<svg viewBox="0 0 24 24"><path d="M8 5h8M6 9h12M8 13h8M10 17h4"/><path d="M4 4h16v16H4z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>'
  };
  function examActionForView(exam, view = 'catalog') {
    const state = examRuntimeState(exam);
    if (view === 'my') {
      if (!state.registered) return null;
      if (state.resumeEligible || state.sessionStarted) {
        return { label: 'Resume Exam', action: 'exam-access', tone: 'primary', hint: 'Saved session ready to continue.', disabled: false };
      }
      if (state.reexamEligible) {
        return { label: 'Re-Exam', action: 'exam-reexam-ready', tone: 'primary', hint: 'Eligible for another verified attempt.', disabled: false };
      }
      if (state.completed) {
        return { label: state.expired ? 'Closed' : 'Completed', action: 'exam-detail', tone: 'ghost', hint: state.expired ? 'Session closed.' : 'Attempt limit reached or result finalized.', disabled: true };
      }
      if (state.live) {
        return { label: 'Enter Exam', action: 'exam-access', tone: 'primary', hint: 'Exam is live now.', disabled: false };
      }
      if (state.expired) {
        return { label: 'Expired', action: 'exam-detail', tone: 'ghost', hint: 'Session closed.', disabled: true };
      }
      if (state.verificationOpen) {
        return { label: 'Enter Exam', action: 'exam-access', tone: 'primary', hint: 'You are registered. Open the exam access hover.', disabled: false };
      }
      if (state.preStartLock) {
        return {
          label: 'Verification Soon',
          action: 'exam-detail',
          tone: 'ghost',
          hint: `Verification opens in ${Math.max(state.minutesUntilVerification, 0)} min.`,
          disabled: true
        };
      }
      return { label: `Starts at ${formatExamTime(exam)}`, action: 'exam-start', tone: 'ghost', hint: `Opens in ${state.minutesUntil} min.`, disabled: true };
    }

    if (!state.registered) {
      if (state.registrationOpen) {
        if (state.currentPhase === 'PHASE2' || state.requiresPhase2Verification) {
          return {
            label: 'Register (Phase 2)',
            action: 'exam-register-phase2',
            tone: 'warning',
            hint: `Additional verification required. Closes in ${Math.max(state.minutesUntilRegistrationClose, 0)} min.`,
            disabled: false
          };
        }
        return {
          label: 'Register (Phase 1)',
          action: 'exam-register',
          tone: 'primary',
          hint: `Registration open. Closes in ${Math.max(state.minutesUntilRegistrationClose, 0)} min.`,
          disabled: false
        };
      }
      if (state.upcoming && !state.expired && !state.result) {
        return {
          label: 'Upcoming',
          action: 'exam-detail',
          tone: 'warning',
          hint: `Registration opens in ${Math.max(state.minutesUntil, 0)} min.`,
          disabled: true
        };
      }
      if (state.preStartLock || state.verificationOpen || state.live) {
        return {
          label: 'Registration Closed',
          action: 'exam-detail',
          tone: 'ghost',
          hint: state.preStartLock
            ? `Registration closed. Verification opens in ${Math.max(state.minutesUntilVerification, 0)} min.`
            : 'Registration closed for this exam window.',
          disabled: true
        };
      }
      return { label: 'Closed', action: 'exam-detail', tone: 'ghost', hint: 'Registration closed.', disabled: true };
    }
    if (state.live) {
      return { label: 'Enter Exam', action: 'exam-access', tone: 'primary', hint: 'Exam is live now.', disabled: false };
    }
    if (state.expired || state.result) {
      return { label: 'Closed', action: 'exam-detail', tone: 'ghost', hint: 'Expired or completed.', disabled: true };
    }
    if (state.sessionStarted) {
      return { label: 'Waiting for Start', action: 'exam-detail', tone: 'ghost', hint: `The exam opens at ${formatExamDateTime(exam)}.`, disabled: true };
    }
    if (state.verificationOpen) {
      return { label: 'Verified', action: 'exam-detail', tone: 'ghost', hint: 'Verification completed. The exam will open at the scheduled start time.', disabled: true };
    }
    if (state.preStartLock) {
      return {
        label: 'Verification Soon',
        action: 'exam-detail',
        tone: 'ghost',
        hint: `Opens in ${Math.max(state.minutesUntilVerification, 0)} min.`,
        disabled: true
      };
    }
    return { label: `Starts at ${formatExamTime(exam)}`, action: 'exam-start', tone: 'ghost', hint: `Opens in ${state.minutesUntil} min.`, disabled: true };
  }
  function examCatalogGroup(exam) {
    const state = examRuntimeState(exam);
    if (state.registered) return null;
    if (state.expired || state.result) return 'closed';
    if (state.registrationOpen) return 'unregistered';
    if (state.upcoming) return 'upcoming';
    return 'closed';
  }
  function myExamGroup(exam) {
    const state = examRuntimeState(exam);
    if (!state.registered) return null;
    if (state.sessionStarted || state.resumeEligible) return 'resume';
    if (state.reexamEligible) return 'reexam';
    if (state.completed || state.expired) return 'completed';
    return 'registered';
  }
  function examVisibleLabel(exam, view = 'catalog') {
    const state = examRuntimeState(exam);
    if (view === 'my') {
      if (state.sessionStarted || state.resumeEligible) return 'SESSION SAVED';
      if (state.reexamEligible || state.failed) return 'RE-EXAM';
      if (state.completed) return state.expired ? 'CLOSED' : 'COMPLETED';
      if (state.live) return 'LIVE';
      if (state.preStartLock) return 'VERIFICATION SOON';
      return 'REGISTERED';
    }
    if (!state.registered) return state.registrationOpen ? 'UNREGISTERED' : state.upcoming ? 'UPCOMING' : 'REG CLOSED';
    if (state.expired || state.result) return 'CLOSED';
    if (state.live) return 'LIVE';
    return state.verificationOpen ? 'START SOON' : state.preStartLock ? 'VERIFICATION SOON' : 'UPCOMING';
  }
  function examGroupTone(exam, view = 'catalog') {
    const state = examRuntimeState(exam);
    if (view === 'my') {
      if (state.sessionStarted || state.resumeEligible) return 'warning';
      if (state.reexamEligible || state.failed) return 'danger';
      if (state.completed) return 'neutral';
      if (state.live) return 'success';
      if (state.preStartLock) return 'neutral';
      return 'success';
    }
    if (!state.registered) return state.registrationOpen ? 'danger' : state.upcoming ? 'warning' : 'neutral';
    if (state.expired || state.result) return 'neutral';
    if (state.live) return 'success';
    return state.verificationOpen ? 'warning' : 'neutral';
  }
  function calculateAttemptsRemaining(exam) {
    const max = Number(exam?.maxAttempts || 0);
    const used = Number(exam?.attemptsUsed || 0);
    return Math.max(max - used, 0);
  }
  function calculateTimeRemaining(exam) {
    const state = examRuntimeState(exam);
    const remainingMs = Math.max(state.endAt.getTime() - Date.now(), 0);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return { remainingMs, minutes, seconds, urgent: remainingMs > 0 && remainingMs <= 5 * 60000 };
  }
  function closeExamCardMenus() {
    $$('.exam-card-menu.is-open').forEach((menu) => {
      menu.classList.remove('is-open');
      const btn = $('.exam-card-menu-btn', menu);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }
  function toggleExamCardMenu(btn) {
    const menu = btn?.closest('.exam-card-menu');
    if (!menu) return;
    const open = menu.classList.contains('is-open');
    closeExamCardMenus();
    if (!open) {
      menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
  }
  function openExamDetailModal(exam) {
    const totalQuestions = toNumber(exam?.totalQuestions, toNumber(exam?.easyQuestionCount) + toNumber(exam?.mediumQuestionCount) + toNumber(exam?.difficultQuestionCount));
    const state = examRuntimeState(exam);
    const startAt = getExamDate(exam);
    const endAt = state.endAt;
    const detailAction = examActionForView(exam, st.examRegistration[exam.examCode] ? 'my' : 'catalog');
    const accessLabel = state.live ? 'Live' : state.expired ? 'Closed' : exam?.registrationOpen ? 'Registration Open' : 'Registration Closed';
    const infoTone = exam?.status === 'closed' ? 'locked' : exam?.status === 'resume' ? 'resume' : exam?.status === 'available' ? 'live' : 'warning';
    const infoLabel = exam?.status === 'closed' ? 'Closed' : exam?.status === 'resume' ? 'Resume' : exam?.status === 'available' ? 'Available' : 'Upcoming';
    const sessionSummary = state.sessionStarted ? `
      <div class="result-modal-panel exam-detail-panel">
        <div class="exam-detail-section-head">
          <span>Session Summary</span>
          <small>Saved attempt</small>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span>Attempt</span><strong>#${exam.attemptNumber || 1}</strong></div>
          <div class="detail-item"><span>Score</span><strong>${exam.percentage || 0}%</strong></div>
          <div class="detail-item"><span>Obtained</span><strong>${exam.obtainedMarks || 0}/${exam.totalMarks}</strong></div>
          <div class="detail-item"><span>Time Taken</span><strong>${formatDuration(exam.timeTakenSeconds || 0)}</strong></div>
        </div>
      </div>` : '';
    modal({
      kicker: 'Exam Details',
      title: `${exam.examCode} - ${exam.title}`,
      body: `
        <div class="exam-detail-shell">
          <div class="result-modal-hero exam-detail-hero exam-detail-hero--animated">
            <div class="result-modal-hero-copy">
              <span class="result-modal-code">${exam.examCode}</span>
              <h4>${exam.subject}</h4>
              <p>Duration ${toNumber(exam.durationMinutes)} min | Total Marks ${toNumber(exam.totalMarks)} | Passing Marks ${toNumber(exam.passingMarks)}</p>
              <div class="exam-detail-metrics">
                <span class="exam-detail-metric"><strong>${toNumber(exam.durationMinutes)}</strong><small>Minutes</small></span>
                <span class="exam-detail-metric"><strong>${toNumber(exam.totalMarks)}</strong><small>Total Marks</small></span>
                <span class="exam-detail-metric"><strong>${toNumber(exam.passingMarks)}</strong><small>Passing Marks</small></span>
              </div>
            </div>
            <span class="result-badge ${infoTone}">${infoLabel}</span>
          </div>
          <div class="result-modal-grid exam-detail-grid">
            <div class="result-modal-panel exam-detail-panel">
              <div class="exam-detail-section-head">
                <span>Exam Info</span>
                <small>Question distribution</small>
              </div>
              <div class="detail-grid">
                <div class="detail-item"><span>Easy</span><strong>${toNumber(exam.easyQuestionCount)}</strong></div>
                <div class="detail-item"><span>Medium</span><strong>${toNumber(exam.mediumQuestionCount)}</strong></div>
                <div class="detail-item"><span>Hard</span><strong>${toNumber(exam.difficultQuestionCount)}</strong></div>
                <div class="detail-item"><span>Total</span><strong>${totalQuestions}</strong></div>
                <div class="detail-item"><span>Negative Marks</span><strong>${toNumber(exam.negativeMarks)}</strong></div>
                <div class="detail-item"><span>Attempts</span><strong>${toNumber(exam.maxAttempts)}</strong></div>
              </div>
            </div>
          <div class="result-modal-panel exam-detail-panel">
            <div class="exam-detail-section-head">
              <span>Schedule</span>
              <small>Window and access</small>
            </div>
            <div class="detail-grid">
              <div class="detail-item"><span>Exam Start</span><strong>${formatFullDateTime(startAt)}</strong></div>
              <div class="detail-item"><span>Exam End</span><strong>${formatFullDateTime(endAt)}</strong></div>
              <div class="detail-item"><span>Window</span><strong>${accessLabel}</strong></div>
              <div class="detail-item"><span>Access</span><strong>${exam?.registrationOpen ? 'Registration Open' : 'Registration Closed'}</strong></div>
            </div>
          </div>
          ${sessionSummary}
          </div>
          <div class="result-modal-note exam-detail-note">
            <strong>Description</strong>
            <p>${exam.description || 'No description available.'}</p>
          </div>
        </div>
      `,
      foot: `
        ${detailAction && !detailAction.disabled && detailAction.action !== 'exam-detail'
          ? `<button class="btn primary" type="button" data-action="${detailAction.action}" data-code="${exam.examCode}">${escapeHtml(detailAction.label)}</button>`
          : ''}
        <button class="btn ghost" data-close-modal type="button">Close</button>`
    });
  }
  function renderVerificationBadge(exam) {
    if (!exam?.verificationRequired) return '';
    if (isExamVerificationComplete(exam.examCode)) {
      return `
        <div class="exam-pill verification-badge verification-badge--complete" title="Identity verification completed">
          ${svg('shield')}
          <span>Verification Completed</span>
        </div>`;
    }
    return `
      <div class="exam-pill verification-badge" data-action="exam-start" data-code="${exam.examCode}" title="Complete identity verification before starting exam">
        ${svg('shield')}
        <span>Verification Required</span>
      </div>`;
  }
  function renderProctoringIndicator(exam) {
    if (!exam?.proctoringEnabled) return '';
    const chips = [
      [exam.cameraRequired, 'camera', 'Camera'],
      [exam.microphoneRequired, 'ai', 'AI'],
      [exam.fullscreenRequired, 'lock', 'Fullscreen']
    ].filter(([enabled]) => enabled);
    return `
      <div class="proctoring-indicator" title="AI Proctoring enabled: camera, microphone, and fullscreen checks remain active.">
        <span class="proctoring-label">${svg('ai')}<span>AI Proctoring Enabled</span></span>
        <div class="proctoring-icons">${chips.map(([, icon, label]) => `<span class="proctoring-chip" aria-label="${label} required">${svg(icon)}</span>`).join('')}</div>
      </div>`;
  }
  function renderAttemptCounter(exam) {
    const remaining = calculateAttemptsRemaining(exam);
    const max = Number(exam?.maxAttempts || 0);
    const used = Number(exam?.attemptsUsed || 0);
    const tone = remaining > 1 ? 'good' : remaining === 1 ? 'warn' : 'bad';
    const leftLabel = remaining > 1 ? `${remaining} attempts left` : remaining === 1 ? '1 attempt left' : 'No attempts left';
    return `
      <div class="attempt-counter ${tone}" title="Attempts remaining for this exam">
        <strong>Attempts: ${used} / ${max}</strong>
        <span>${leftLabel}</span>
      </div>`;
  }
  function renderTimeRemainingBadge(exam) {
    const state = examRuntimeState(exam);
    if (!state.live || state.expired) return '';
    const remaining = calculateTimeRemaining(exam);
    const label = remaining.minutes <= 0 ? `Ends in ${remaining.seconds}s` : `Ends in ${remaining.minutes} min`;
    return `
      <div class="time-remaining-badge ${remaining.urgent ? 'urgent' : ''}" title="Live exam countdown">
        ${svg('clock')}
        <span>${label}</span>
      </div>`;
  }
  function renderStatusLegend() {
    if (!el.examStatusLegend) return;
    const items = [
      ['Live', 'live'],
      ['Upcoming', 'upcoming'],
      ['Closed', 'closed'],
      ['Registered', 'registered'],
      ['Verification Required', 'verification'],
      ['Proctoring Enabled', 'proctoring']
    ];
    el.examStatusLegend.innerHTML = items.map(([label, tone]) => `
      <div class="legend-item">
        <span class="legend-dot ${tone}"></span>
        <span>${label}</span>
      </div>
    `).join('');
  }
  function startCountdownTimer() {
    if (st.examUi.countdownTimer) return;
    st.examUi.countdownTimer = setInterval(() => {
      if (st.sec === 'exams') renderExamCatalog();
      if (st.sec === 'my-exams') renderMyExams();
      if (st.sec === 'schedule') renderSchedule();
    }, 1000);
  }
  const sortExamStartAsc = (a, b) => getExamDate(a).getTime() - getExamDate(b).getTime();
  const sortExamEndDesc = (a, b) => getExamEndDate(b).getTime() - getExamEndDate(a).getTime();
  function hydrateExamSchedule() {
    const now = Date.now();
    st.data.exams.forEach((exam) => {
      const seed = examWindowSeed[exam.examCode] || { registered: true, offsetMinutes: 60 };
      if (!exam.startAt) exam.startAt = new Date(now + (seed.offsetMinutes * 60000)).toISOString();
      if (!exam.examStartTime) exam.examStartTime = exam.startAt;
      if (!exam.examEndTime) exam.examEndTime = getExamEndDate(exam).toISOString();
      if (typeof exam.examStatus !== 'string') exam.examStatus = exam.status || 'available';
      if (typeof exam.verificationRequired !== 'boolean') exam.verificationRequired = true;
      if (typeof exam.proctoringEnabled !== 'boolean') exam.proctoringEnabled = true;
      if (typeof exam.cameraRequired !== 'boolean') exam.cameraRequired = true;
      if (typeof exam.microphoneRequired !== 'boolean') exam.microphoneRequired = true;
      if (typeof exam.fullscreenRequired !== 'boolean') exam.fullscreenRequired = true;
      if (typeof exam.attemptsUsed !== 'number') {
        exam.attemptsUsed = exam.status === 'closed' ? Number(exam.maxAttempts || 0) : exam.status === 'resume' ? Math.max(0, Number(exam.maxAttempts || 1) - 1) : 0;
      }
      if (typeof st.examRegistration[exam.examCode] !== 'boolean') st.examRegistration[exam.examCode] = !!seed.registered;
      if (typeof st.examSessions[exam.examCode] !== 'number') st.examSessions[exam.examCode] = 0;
    });
    save(K.er, st.examRegistration);
    save(K.es, st.examSessions);
  }
  function examAccessState(exam) {
    const startAt = getExamDate(exam);
    const now = Date.now();
    const registered = !!st.examRegistration[exam.examCode];
    const result = bestResultForExam(exam.examCode);
    const attemptsRemaining = calculateAttemptsRemaining(exam);
    const expired = now > getExamEndDate(exam).getTime() || String(exam?.status || '').toLowerCase() === 'closed';
    const completed = expired || attemptsRemaining <= 0;
    const sessionStarted = !completed && !!st.examSessions[exam.examCode];
    const started = !completed && ((sessionStarted && now >= startAt.getTime()) || now >= startAt.getTime());
    const minutesUntil = Math.ceil((startAt.getTime() - now) / 60000);
    const registrationCloseAt = startAt.getTime();
    const verificationOpenAt = startAt.getTime() - (30 * 60000);
    const registrationOpen = now < registrationCloseAt;
    const verificationOpen = now >= verificationOpenAt && now < startAt.getTime();
    const preStartLock = false;

    if (!registered) {
      if (!registrationOpen) {
        return {
          registered,
          started: false,
          minutesUntil,
          tone: 'ghost',
          disabled: true,
          label: 'Registration Closed',
          action: 'exam-detail',
          hint: preStartLock
            ? `Closed. Verification opens in ${Math.max(Math.ceil((verificationOpenAt - now) / 60000), 0)} min.`
            : 'Registration closed for this exam window.'
        };
      }
      return {
        registered,
        started: false,
        minutesUntil,
        tone: 'primary',
        label: 'Register',
        action: 'exam-register',
        hint: 'Registration is required before verification can begin.'
      };
    }

    if (started) {
      return {
        registered,
        started: true,
        minutesUntil,
        tone: 'primary',
        label: 'Enter Exam',
        action: 'exam-enter',
        hint: sessionStarted ? 'Verified session ready to continue.' : 'Exam window is live.'
      };
    }

    if (completed) {
      return {
        registered,
        started: false,
        minutesUntil,
        tone: 'ghost',
        disabled: true,
        label: 'Completed',
        action: 'exam-detail',
        hint: result ? 'Result finalized for this exam.' : 'Attempt limit reached.'
      };
    }

    if (verificationOpen) {
      return {
        registered,
        started: false,
        minutesUntil,
        tone: 'primary',
        label: 'Start Exam',
        action: 'exam-start',
        hint: 'Verification is available now.'
      };
    }
    if (preStartLock) {
      return {
        registered,
        started: false,
        minutesUntil,
        tone: 'ghost',
        disabled: true,
        label: 'Verification Soon',
        action: 'exam-detail',
        hint: `Opens in ${Math.max(Math.ceil((verificationOpenAt - now) / 60000), 0)} min.`
      };
    }

    return {
      registered,
      started: false,
      minutesUntil,
      tone: 'ghost',
      disabled: true,
      label: `Starts at ${formatExamTime(exam)}`,
      action: 'exam-start',
      hint: `Opens in ${minutesUntil} min.`
    };
  }
  const verificationRules = [
    'Webcam monitoring enabled',
    'Microphone monitoring enabled',
    'Fullscreen mandatory',
    'Tab switching prohibited',
    'AI cheating detection active',
    'Auto submission on violation'
  ];
  const verificationTerms = [
    'Identity verification consent',
    'Recording consent',
    'Data usage policy',
    'Academic integrity policy'
  ];
  const securityIndicators = [
    'AI Proctoring Enabled',
    'Face Verification Required',
    'Session will be recorded',
    'Identity match enforced'
  ];
  function createDefaultExamForm(exam) {
    return {
      fullName: st.profile.fullName || '',
      registrationNumber: st.profile.rollNumber || '',
      email: st.profile.email || '',
      department: st.profile.department || '',
      academicYear: st.profile.year || '',
      examName: exam?.title || '',
      examStartTime: formatExamDateTime(exam),
      mobileNumber: st.profile.phone || '',
      emergencyContact: '',
      currentLocation: '',
      idConfirmationNumber: '',
      rulesAccepted: false,
      termsAccepted: false,
      declarationAccepted: false,
      registrationConfirmed: false,
      phase2VerificationCode: '',
      phase2Confirmed: false
    };
  }
  const activeLeaderboardRows = () => st.data.leaderboard[st.leaderboard.mode] || [];
  const sortBySubmittedAtDesc = (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  const busyCopy = {
    'exam-instructions': 'Loading instructions...',
    'exam-start': 'Preparing exam...',
    'exam-access': 'Opening exam access...',
    'exam-register': 'Registering student...',
    'exam-reexam-ready': 'Preparing re-exam...',
    'exam-enter': 'Opening exam...',
    'exam-enter-confirm': 'Entering exam...',
    'exam-schedule': 'Opening schedule...',
    'result-view': 'Opening result...',
    'certificate-preview': 'Fetching certificate...',
    'certificate-download': 'Preparing download...',
    'certificate-verify': 'Verifying certificate...',
    'refresh-dashboard': 'Refreshing dashboard...',
    'results-reset': 'Resetting filters...',
    'edit-profile': 'Opening editor...',
    'save-profile': 'Saving changes...'
  };
  const isBusy = (btn) => btn?.classList.contains('is-loading');
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  function setButtonBusy(btn, text) {
    if (!btn) return;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.classList.add('is-loading');
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span class="btn-label">${escapeHtml(text)}</span>`;
  }
  function restoreButton(btn) {
    if (!btn || !btn.classList.contains('is-loading')) return;
    if (btn.dataset.originalHtml != null) btn.innerHTML = btn.dataset.originalHtml;
    btn.classList.remove('is-loading');
    btn.disabled = false;
    delete btn.dataset.originalHtml;
  }
  function actionLoadingText(type, code, btn) {
    if (btn?.dataset.loadingText) return btn.dataset.loadingText;
    return busyCopy[type] || 'Please wait...';
  }
  function bind() { Object.assign(el, { sidebar:$('sidebar'), toggle:$('toggle-sidebar'), logout:$('logoutBtn'), sideNav:$('sideNav'), sidebarAvatar:$('sidebarAvatar'), sidebarName:$('sidebarName'), sidebarRole:$('sidebarRole'), topAvatar:$('topAvatar'), topName:$('topName'), topSearch:$('top-nav-search'), notifBtn:$('notifBtn'), notifCount:$('notifCount'), notifNavCount:$('notifNavCount'), notifyDrop:$('notifyDrop'), notifyDropCount:$('notifyDropCount'), notifyList:$('notifyList'), notificationTypeFilter:$('notificationTypeFilter'), markAllReadBtn:$('markAllReadBtn'), clearNotificationsBtn:$('clearNotificationsBtn'), unreadNotificationCount:$('unreadNotificationCount'), notificationStream:$('notificationStream'), scheduleDateFilter:$('scheduleDateFilter'), scheduleList:$('scheduleList'), scheduleTimeline:$('scheduleTimeline'), scheduleTodayLabel:$('scheduleTodayLabel'), proctoringStatusGrid:$('proctoringStatusGrid'), proctoringSummaryPanel:$('proctoringSummaryPanel'), faqAccordion:$('faqAccordion'), contactSupportForm:$('contactSupportForm'), reportIssueForm:$('reportIssueForm'), supportTabs:$$('[data-support-tab]'), supportPanels:$$('[data-support-panel]'), profileDd:$('profileDd'), profileMenuBtn:$('profileMenuBtn'), profileMenu:$('profileMenu'), profileLogout:$('profileLogout'), themeToggle:$('themeToggle'), themeButtons:$$('[data-theme-mode]', $('themeToggle')), dashStatsGrid:$('dashStatsGrid'), recentAttemptsBody:$('recentAttemptsBody'), performanceTrendChart:$('performanceTrendChart'), chartPlaceholder:$('chartPlaceholder'), refreshDashboard:$('refreshDashboard'), dashboardActionBtn:$('dashboardActionBtn'), attemptsResetBtn:$('attemptsResetBtn'), examSearch:$('examSearch'), examFilter:$('examFilter'), refreshExamsBtn:$('refreshExamsBtn'), examTabs:$$('[data-tab]'), summaryPill:$('summaryPill'), examStatusLegend:$('examStatusLegend'), unregisteredGrid:$('unregisteredGrid'), upcomingGrid:$('upcomingGrid'), closedGrid:$('closedGrid'), unregisteredCount:$('unregisteredCount'), upcomingCount:$('upcomingCount'), closedCount:$('closedCount'), myExamSearch:$('myExamSearch'), myExamFilter:$('myExamFilter'), myExamTabs:$$('[data-my-tab]'), myExamSummaryPill:$('myExamSummaryPill'), registeredGrid:$('registeredGrid'), resumeMyGrid:$('resumeMyGrid'), completedGrid:$('completedGrid'), reexamGrid:$('reexamGrid'), registeredCount:$('registeredCount'), resumeMyCount:$('resumeMyCount'), completedMyCount:$('completedMyCount'), reexamCount:$('reexamCount'), resultsSummaryGrid:$('resultsSummaryGrid'), resultsFilter:$('resultsFilter'), resultsFilterBtn:$('resultsFilterBtn'), resultsSearch:$('resultsSearch'), resultsResetBtn:$('resultsResetBtn'), resultsBody:$('resultsBody'), resultsPageInfo:$('resultsPageInfo'), resultsPagination:$('resultsPagination'), certificatesSummaryGrid:$('certificatesSummaryGrid'), certificatesFilter:$('certificatesFilter'), certificatesSearch:$('certificatesSearch'), certificatesResetBtn:$('certificatesResetBtn'), certificatesGrid:$('certificatesGrid'), leaderboardModeToggle:$('leaderboardModeToggle'), leaderboardModeButtons:$$('[data-leaderboard-mode]', $('leaderboardModeToggle')), leaderboardSearch:$('leaderboardSearch'), leaderboardSort:$('leaderboardSort'), leaderboardRefresh:$('leaderboardRefresh'), leaderboardSummaryGrid:$('leaderboardSummaryGrid'), yourRankCard:$('yourRankCard'), podiumGrid:$('podiumGrid'), leaderboardBody:$('leaderboardBody'), analyticsCards:$('analyticsCards'), analyticsLineChart:$('analyticsLineChart'), analyticsBarChart:$('analyticsBarChart'), analyticsDonutChart:$('analyticsDonutChart'), analyticsTrendFilter:$('analyticsTrendFilter'), analyticsPassFilter:$('analyticsPassFilter'), analyticsMixFilter:$('analyticsMixFilter'), editProfileBtn:$('editProfileBtn'), profileForm:$('profileForm'), profilePhotoPreview:$('profilePhotoPreview'), profilePhotoName:$('profilePhotoName'), profileEditorModal:$('profileEditorModal'), profileEditorClose:$('profileEditorClose'), profileEditorForm:$('profileEditorForm'), profileEditorCancel:$('profileEditorCancel'), profileEditorSave:$('profileEditorSave'), profileEditorPhotoInput:$('profileEditorPhotoInput'), profileEditorPhotoUploadBtn:$('profileEditorPhotoUploadBtn'), profileEditorPhotoRemoveBtn:$('profileEditorPhotoRemoveBtn'), profileEditorPhotoPreview:$('profileEditorPhotoPreview'), profileEditorPhotoCircle:$('profileEditorPhotoCircle'), profileEditorPhotoName:$('profileEditorPhotoName'), detailModal:$('detailModal'), detailModalKicker:$('detailModalKicker'), detailModalTitle:$('detailModalTitle'), detailModalBody:$('detailModalBody'), detailModalFoot:$('detailModalFoot'), detailModalClose:$('detailModalClose'), examVerificationModal:$('examVerificationModal'), examVerificationClose:$('examVerificationClose'), examVerificationTitle:$('examVerificationTitle'), examVerificationSubtitle:$('examVerificationSubtitle'), examVerificationBody:$('examVerificationBody'), examVerificationFoot:$('examVerificationFoot'), examStepper:$('examStepper'), examSecurityIndicators:$('examSecurityIndicators'), toastStack:$('toastStack'), liveClock:$('liveClock') }); }
  function hydrateIcons(root = document) {
    $$('[data-icon]', root).forEach((node) => {
      const name = node.dataset.icon;
      const icon = ico[name];
      if (icon) node.innerHTML = icon;
    });
  }
  function toast(t, m, tone='info') { const n = document.createElement('div'); n.className = `toast ${tone}`; n.innerHTML = `<strong>${t}</strong><span>${m}</span>`; el.toastStack.appendChild(n); setTimeout(() => { n.style.opacity = '0'; n.style.transform = 'translateY(8px)'; setTimeout(() => n.remove(), 220); }, 3200); }
  function modal({ kicker='Student Detail', title='', body='', foot='' }) { el.detailModalKicker.textContent = kicker; el.detailModalTitle.textContent = title; el.detailModalBody.innerHTML = body; el.detailModalFoot.innerHTML = foot; el.detailModal.classList.remove('hidden'); el.detailModal.setAttribute('aria-hidden', 'false'); }
  function closeModal() { el.detailModal.classList.add('hidden'); el.detailModal.setAttribute('aria-hidden', 'true'); }
  function openReexamReadyModal(exam) {
    modal({
      kicker: 'Exam Ready',
      title: `${exam.examCode} - ${exam.title}`,
      body: `
        <div class="reexam-ready-shell">
          <div class="reexam-ready-topline">
            <span class="reexam-ready-icon"><span class="svg-icon" data-icon="shield"></span></span>
            <span class="reexam-ready-kicker">Exam Ready</span>
          </div>
          <div class="reexam-ready-titleblock">
            <h4>${escapeHtml(exam.examCode)} - ${escapeHtml(exam.title)}</h4>
          </div>
          <div class="reexam-ready-summary">
            <div class="reexam-ready-card-head">
              <span class="code-badge">${escapeHtml(exam.examCode)}</span>
              <span class="status-badge available">VERIFIED</span>
            </div>
            <div class="reexam-ready-name">${escapeHtml(exam.title)}</div>
            <div class="reexam-ready-meta">
              <span><span class="svg-icon" data-icon="clock"></span>${escapeHtml(exam.subject)}</span>
              <span><span class="svg-icon" data-icon="clock"></span>${toNumber(exam.durationMinutes)} min</span>
              <span><span class="svg-icon" data-icon="calendar"></span>Start ${escapeHtml(formatExamDateTime(exam))}</span>
            </div>
          </div>
          <div class="reexam-ready-grid">
            <div class="reexam-ready-tile">
              <div class="reexam-ready-tile-icon"><span class="svg-icon" data-icon="shield"></span></div>
              <div>
                <span>AI Proctoring</span>
                <strong>Enabled</strong>
              </div>
            </div>
            <div class="reexam-ready-tile">
              <div class="reexam-ready-tile-icon"><span class="svg-icon" data-icon="camera"></span></div>
              <div>
                <span>Face Match</span>
                <strong>Required</strong>
              </div>
            </div>
            <div class="reexam-ready-tile">
              <div class="reexam-ready-tile-icon"><span class="svg-icon" data-icon="camera"></span></div>
              <div>
                <span>Recording</span>
                <strong>On</strong>
              </div>
            </div>
            <div class="reexam-ready-tile">
              <div class="reexam-ready-tile-icon"><span class="svg-icon" data-icon="shield"></span></div>
              <div>
                <span>Identity</span>
                <strong>Enforced</strong>
              </div>
            </div>
          </div>
          <div class="reexam-ready-note">
            <span class="reexam-ready-note-icon"><span class="svg-icon" data-icon="shield"></span></span>
            <div>
              <strong>Your verification has been accepted.</strong>
              <p>Use the action below to enter the exam workspace.</p>
            </div>
          </div>
        </div>
      `,
      foot: `
        <button class="btn ghost" data-close-modal type="button">Close</button>
        <button class="btn primary" data-action="exam-reexam-enter" data-code="${exam.examCode}" type="button">Enter Exam</button>`
    });
    hydrateIcons(el.detailModalBody);
  }
  function openExamAccess(exam) {
    modal({
      kicker: 'Exam Ready',
      title: `${exam.examCode} - ${exam.title}`,
      body: `
        <div class="exam-access-panel">
          <div class="result-modal-hero">
            <div>
              <span class="result-modal-code">${exam.examCode}</span>
              <h4>${exam.title}</h4>
              <p>${exam.subject} | ${exam.durationMinutes} min | Start ${formatExamDateTime(exam)}</p>
            </div>
            <span class="status-badge ${st.examSessions[exam.examCode] ? 'available' : 'resume'}">${st.examSessions[exam.examCode] ? 'VERIFIED' : 'READY'}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><span>AI Proctoring</span><strong>Enabled</strong></div>
            <div class="detail-item"><span>Face Match</span><strong>Required</strong></div>
            <div class="detail-item"><span>Recording</span><strong>On</strong></div>
            <div class="detail-item"><span>Identity</span><strong>Enforced</strong></div>
          </div>
          <p class="card-copy">Your verification has been accepted. Use the action below to enter the exam workspace.</p>
        </div>
      `,
      foot: `
        <button class="btn ghost" data-close-modal type="button">Close</button>
        <button class="btn primary" data-action="exam-enter-confirm" data-code="${exam.examCode}" type="button">Enter Exam</button>`
    });
  }
  function closeExamVerification() {
    if (!el.examVerificationModal) return;
    el.examVerificationModal.classList.add('hidden');
    el.examVerificationModal.setAttribute('aria-hidden', 'true');
  }
  function openExamVerification(exam, mode = 'start') {
    if (!exam) return;
    if ((mode || 'start') === 'start' && isExamVerificationComplete(exam.examCode)) {
      toast('Verification completed', 'This exam has already been verified. You can continue with the exam flow.', 'info');
      return;
    }
    st.examUi.activeCode = exam.examCode;
    st.examUi.mode = mode;
    st.examUi.step = 1;
    st.examUi.imageData = '';
    st.examUi.imageName = '';
    st.examUi.form = createDefaultExamForm(exam);
    if (el.examVerificationTitle) el.examVerificationTitle.textContent = `${exam.examCode} - ${exam.title}`;
    if (el.examVerificationSubtitle) {
      const isPhase2 = mode === 'register-phase2';
      el.examVerificationSubtitle.textContent = mode === 'register'
        ? `Secure registration verification for ${exam.subject} opens at ${formatExamDateTime(exam)}.`
        : isPhase2
        ? `Phase 2 registration with enhanced verification for ${exam.subject} starts at ${formatExamDateTime(exam)}.`
        : `Secure verification for ${exam.subject} starts at ${formatExamDateTime(exam)}.`;
    }
    el.examVerificationModal.classList.remove('hidden');
    el.examVerificationModal.setAttribute('aria-hidden', 'false');
    updateExamVerificationUi();
  }
  function getActiveVerificationExam() {
    return st.data.exams.find((exam) => exam.examCode === st.examUi.activeCode) || null;
  }
  function verificationKey(code) {
    return String(code || '').trim();
  }
  function isExamVerificationComplete(code) {
    const key = verificationKey(code);
    if (!key) return false;
    const hasLocalMarker = Boolean(st.examVerification[key]);
    const hasAttemptMarker = Boolean(st.examAttemptIds[key]);
    const hasSessionMarker = Boolean(st.examSessions[key]);
    const exam = st.data.exams.find((item) => String(item.examCode || '').trim() === key);
    const hasResumeMarker = Boolean(exam?.resumeAttemptId);
    return hasLocalMarker || hasAttemptMarker || hasSessionMarker || hasResumeMarker;
  }
  function markExamVerificationComplete(code) {
    const key = verificationKey(code);
    if (!key) return;
    st.examVerification[key] = true;
    save(K.ev, st.examVerification);
  }
  function isStep1Valid() {
    const f = st.examUi.form || {};
    return !!(String(f.mobileNumber || '').trim() && String(f.emergencyContact || '').trim() && String(f.currentLocation || '').trim() && String(f.idConfirmationNumber || '').trim());
  }
  function isStep2Valid() {
    return !!st.examUi.imageData;
  }
  function isStep3Valid() {
    return !!st.examUi.form.rulesAccepted;
  }
  function isStep4Valid() {
    return !!st.examUi.form.termsAccepted;
  }
  function isStep5Valid() {
    return !!st.examUi.form.declarationAccepted;
  }
  function isStep6Valid() {
    return !!st.examUi.form.registrationConfirmed;
  }
  function isStep7Valid() {
    return /^\d{6}$/.test(String(st.examUi.form.phase2VerificationCode || '').trim());
  }
  function isStep8Valid() {
    return !!st.examUi.form.phase2Confirmed;
  }
  function canStartExam() {
    const isPhase2 = (st.examUi.mode || 'start') === 'register-phase2';
    const isRegistration = (st.examUi.mode || 'start') === 'register';
    const baseValid = isStep1Valid() && isStep2Valid() && isStep3Valid() && isStep4Valid() && isStep5Valid();
    if (isPhase2) {
      return baseValid && isStep7Valid() && isStep8Valid();
    }
    if (isRegistration) {
      return baseValid && isStep6Valid();
    }
    return baseValid;
  }
  function renderExamStepper() {
    if (!el.examStepper) return;
    const steps = [
      'Student Details',
      'Image Verification',
      'Exam Rules',
      'Terms & Conditions',
      'Declaration'
    ];
    const isPhase2 = (st.examUi.mode || 'start') === 'register-phase2';
    if ((st.examUi.mode || 'start') === 'register' || isPhase2) {
      steps.push('Registration Review');
      if (isPhase2) steps.push('Phase 2 Verification', 'Final Confirmation');
      else steps.push('Final Confirmation');
    }
    el.examStepper.innerHTML = steps.map((label, index) => {
      const step = index + 1;
      const active = st.examUi.step === step;
      const complete = st.examUi.step > step || (step === 1 && isStep1Valid()) || (step === 2 && isStep2Valid()) || (step === 3 && isStep3Valid()) || (step === 4 && isStep4Valid());
      return `
        <div class="exam-step ${active ? 'active' : ''} ${complete ? 'complete' : ''}" data-step="${step}">
          <span class="exam-step-index">${step}</span>
          <span class="exam-step-label">${label}</span>
        </div>`;
    }).join('');
  }
  function renderExamSecurityIndicators() {
    if (!el.examSecurityIndicators) return;
    el.examSecurityIndicators.innerHTML = securityIndicators.map((label) => `<span class="security-chip">${label}</span>`).join('');
  }
  function renderVerificationStep1(exam) {
    const form = st.examUi.form || createDefaultExamForm(exam);
    return `
      <div class="exam-step-panel">
        <div class="verification-grid">
          <div class="detail-item readonly"><span>Full Name</span><strong>${escapeHtml(form.fullName)}</strong></div>
          <div class="detail-item readonly"><span>Registration Number</span><strong>${escapeHtml(form.registrationNumber)}</strong></div>
          <div class="detail-item readonly"><span>Email</span><strong>${escapeHtml(form.email)}</strong></div>
          <div class="detail-item readonly"><span>Department</span><strong>${escapeHtml(form.department)}</strong></div>
          <div class="detail-item readonly"><span>Academic Year</span><strong>${escapeHtml(form.academicYear)}</strong></div>
          <div class="detail-item readonly"><span>Exam Name</span><strong>${escapeHtml(form.examName)}</strong></div>
          <div class="detail-item readonly"><span>Exam Start Time</span><strong>${escapeHtml(form.examStartTime)}</strong></div>
          <label class="verification-field ${form.mobileNumber ? 'valid' : ''}">
            <span>Mobile Number</span>
            <input id="examMobileNumber" type="text" value="${escapeHtml(form.mobileNumber || '')}" placeholder="Enter mobile number" required>
            <small id="examMobileError" class="field-error">Mobile number is required.</small>
          </label>
          <label class="verification-field ${form.emergencyContact ? 'valid' : ''}">
            <span>Emergency Contact</span>
            <input id="examEmergencyContact" type="text" value="${escapeHtml(form.emergencyContact || '')}" placeholder="Enter emergency contact" required>
            <small id="examEmergencyError" class="field-error">Emergency contact is required.</small>
          </label>
          <label class="verification-field ${form.currentLocation ? 'valid' : ''}">
            <span>Current Location</span>
            <input id="examCurrentLocation" type="text" value="${escapeHtml(form.currentLocation || '')}" placeholder="Enter current location" required>
            <small id="examLocationError" class="field-error">Current location is required.</small>
          </label>
          <label class="verification-field ${form.idConfirmationNumber ? 'valid' : ''}">
            <span>ID Confirmation Number</span>
            <input id="examIdConfirmationNumber" type="text" value="${escapeHtml(form.idConfirmationNumber || '')}" placeholder="Enter ID confirmation number" required>
            <small id="examIdError" class="field-error">ID confirmation number is required.</small>
          </label>
        </div>
      </div>`;
  }
  function renderVerificationStep2() {
    const preview = st.examUi.imageData ? `<img src="${st.examUi.imageData}" alt="Verification preview">` : `<div class="verification-preview-empty"><strong>No image uploaded</strong><span>Upload or capture a clear face image to continue.</span></div>`;
    return `
      <div class="exam-step-panel">
        <div class="verification-image-copy">
          <strong>This image will be used for identity verification during exam</strong>
          <p>Upload a clear, well-lit photo or capture one directly from your camera.</p>
        </div>
        <div class="verification-upload-row">
          <button class="btn ghost" type="button" data-verification-action="upload">Upload Image</button>
          <button class="btn ghost" type="button" data-verification-action="capture">Camera Capture</button>
          <input id="examImageUploadInput" type="file" accept="image/*" hidden>
          <input id="examImageCaptureInput" type="file" accept="image/*" capture="environment" hidden>
        </div>
        <div class="verification-preview-box">${preview}</div>
      </div>`;
  }
  function renderVerificationStep3() {
    return `
      <div class="exam-step-panel">
        <div class="verification-scroll">
          <ul class="rules-list">${verificationRules.map((rule) => `<li>${rule}</li>`).join('')}</ul>
        </div>
        <label class="verification-check">
          <input id="examRulesAccepted" type="checkbox" ${st.examUi.form.rulesAccepted ? 'checked' : ''}>
          <span>I have read and understood all exam rules</span>
        </label>
      </div>`;
  }
  function renderVerificationStep4() {
    return `
      <div class="exam-step-panel">
        <div class="verification-scroll">
          <ul class="terms-list">${verificationTerms.map((term) => `<li>${term}</li>`).join('')}</ul>
        </div>
        <label class="verification-check">
          <input id="examTermsAccepted" type="checkbox" ${st.examUi.form.termsAccepted ? 'checked' : ''}>
          <span>I agree to terms and conditions</span>
        </label>
      </div>`;
  }
  function renderVerificationStep5(exam) {
    const mode = st.examUi.mode || 'start';
    const declaration = mode === 'register'
      ? `I, ${escapeHtml(st.profile.fullName || 'Student Name')}, confirm that the details entered for registration are accurate. I agree that my uploaded image will be used for identity verification, and I understand that any false information may cancel my registration.`
      : `I, ${escapeHtml(st.profile.fullName || 'Student Name')}, confirm that I am the registered candidate. I agree that my uploaded image will be matched during the exam. I understand that any violation will result in disqualification.`;
    return `
      <div class="exam-step-panel">
        <div class="declaration-panel">
          <strong>${declaration}</strong>
        </div>
        <label class="verification-check verification-check-strong">
          <input id="examDeclarationAccepted" type="checkbox" ${st.examUi.form.declarationAccepted ? 'checked' : ''}>
          <span>${mode === 'register' ? 'I digitally confirm this registration declaration' : 'I digitally confirm this declaration'}</span>
        </label>
        <div class="verification-summary">
          <div class="detail-grid">
            <div class="detail-item"><span>Student</span><strong>${escapeHtml(st.profile.fullName || '-')}</strong></div>
            <div class="detail-item"><span>Exam</span><strong>${escapeHtml(exam?.title || '-')}</strong></div>
            <div class="detail-item"><span>Image</span><strong>${st.examUi.imageName ? escapeHtml(st.examUi.imageName) : 'Uploaded'}</strong></div>
            <div class="detail-item"><span>Status</span><strong>${canStartExam() ? (mode === 'register' ? 'Ready to Register' : 'Ready to Start') : 'Incomplete'}</strong></div>
          </div>
        </div>
      </div>`;
  }
  function renderVerificationStep6(exam) {
    const form = st.examUi.form || createDefaultExamForm(exam);
    return `
      <div class="exam-step-panel">
        <div class="registration-review-panel">
          <strong>Review the captured details before the final confirmation step.</strong>
          <p>This enterprise review ensures the information is correct before we ask for your final registration confirmation.</p>
        </div>
        <div class="verification-summary registration-summary">
          <div class="detail-grid">
            <div class="detail-item"><span>Full Name</span><strong>${escapeHtml(form.fullName)}</strong></div>
            <div class="detail-item"><span>Registration Number</span><strong>${escapeHtml(form.registrationNumber)}</strong></div>
            <div class="detail-item"><span>Email</span><strong>${escapeHtml(form.email)}</strong></div>
            <div class="detail-item"><span>Department</span><strong>${escapeHtml(form.department)}</strong></div>
            <div class="detail-item"><span>Academic Year</span><strong>${escapeHtml(form.academicYear)}</strong></div>
            <div class="detail-item"><span>Exam Name</span><strong>${escapeHtml(form.examName)}</strong></div>
            <div class="detail-item"><span>Mobile Number</span><strong>${escapeHtml(form.mobileNumber || '-')}</strong></div>
            <div class="detail-item"><span>Emergency Contact</span><strong>${escapeHtml(form.emergencyContact || '-')}</strong></div>
            <div class="detail-item"><span>Current Location</span><strong>${escapeHtml(form.currentLocation || '-')}</strong></div>
            <div class="detail-item"><span>ID Confirmation Number</span><strong>${escapeHtml(form.idConfirmationNumber || '-')}</strong></div>
            <div class="detail-item"><span>Image</span><strong>${st.examUi.imageName ? escapeHtml(st.examUi.imageName) : 'Uploaded'}</strong></div>
            <div class="detail-item"><span>Status</span><strong>Ready for final confirmation</strong></div>
          </div>
        </div>
        <div class="registration-review-panel">
          <strong>Next step</strong>
          <p>Click continue to open the final confirmation screen. There you will explicitly confirm the reviewed registration details.</p>
        </div>
      </div>`;
  }
  function renderVerificationStep7Regular(exam) {
    const form = st.examUi.form || createDefaultExamForm(exam);
    return `
      <div class="exam-step-panel">
        <div class="registration-review-panel">
          <strong>Final confirmation</strong>
          <p>Please confirm the reviewed registration details below. Once confirmed, this exam will be added to <strong>My Exams</strong>.</p>
        </div>
        <div class="verification-summary registration-summary">
          <div class="detail-grid">
            <div class="detail-item"><span>Full Name</span><strong>${escapeHtml(form.fullName)}</strong></div>
            <div class="detail-item"><span>Registration Number</span><strong>${escapeHtml(form.registrationNumber)}</strong></div>
            <div class="detail-item"><span>Email</span><strong>${escapeHtml(form.email)}</strong></div>
            <div class="detail-item"><span>Department</span><strong>${escapeHtml(form.department)}</strong></div>
            <div class="detail-item"><span>Academic Year</span><strong>${escapeHtml(form.academicYear)}</strong></div>
            <div class="detail-item"><span>Exam Name</span><strong>${escapeHtml(form.examName)}</strong></div>
            <div class="detail-item"><span>Mobile Number</span><strong>${escapeHtml(form.mobileNumber || '-')}</strong></div>
            <div class="detail-item"><span>Emergency Contact</span><strong>${escapeHtml(form.emergencyContact || '-')}</strong></div>
            <div class="detail-item"><span>Current Location</span><strong>${escapeHtml(form.currentLocation || '-')}</strong></div>
            <div class="detail-item"><span>ID Confirmation Number</span><strong>${escapeHtml(form.idConfirmationNumber || '-')}</strong></div>
            <div class="detail-item"><span>Image</span><strong>${st.examUi.imageName ? escapeHtml(st.examUi.imageName) : 'Uploaded'}</strong></div>
            <div class="detail-item"><span>Status</span><strong>${isStep6Valid() ? 'Ready to Register' : 'Awaiting Confirmation'}</strong></div>
          </div>
        </div>
        <label class="verification-check verification-check-strong">
          <input id="examRegistrationConfirmed" type="checkbox" ${st.examUi.form.registrationConfirmed ? 'checked' : ''}>
          <span>I confirm that these registration details are correct</span>
        </label>
      </div>`;
  }
  function renderVerificationStep7Phase2(exam) {
    const form = st.examUi.form || createDefaultExamForm(exam);
    return `
      <div class="exam-step-panel">
        <div class="registration-review-panel phase2-panel">
          <strong>Phase 2 Verification Required</strong>
          <p>This is the final registration window with enhanced security verification. Please enter the verification code sent to your registered email/mobile.</p>
        </div>
        <div class="verification-summary phase2-summary">
          <label class="verification-field ${form.phase2VerificationCode ? 'valid' : ''}">
            <span>Verification Code</span>
            <input id="examPhase2Code" type="text" value="${escapeHtml(form.phase2VerificationCode || '')}" placeholder="Enter 6-digit verification code" maxlength="6" required>
            <small id="examPhase2CodeError" class="field-error">Valid verification code is required for phase 2 registration.</small>
          </label>
          <div class="verification-upload-row">
            <button class="btn ghost" type="button" data-verification-action="send-phase2-email">Send Email</button>
          </div>
          <div class="phase2-info">
            <p><strong>Why Phase 2 verification?</strong></p>
            <ul>
              <li>Enhanced security for last-minute registrations</li>
              <li>Additional identity confirmation</li>
              <li>Prevents unauthorized access</li>
            </ul>
          </div>
        </div>
      </div>`;
  }
  function renderVerificationStep8Phase2(exam) {
    const form = st.examUi.form || createDefaultExamForm(exam);
    return `
      <div class="exam-step-panel">
        <div class="registration-review-panel phase2-final">
          <strong>Phase 2 Registration Confirmation</strong>
          <p>Please review all details and confirm your phase 2 registration. This final step completes the enhanced verification process.</p>
        </div>
        <div class="verification-summary registration-summary phase2-confirmation">
          <div class="detail-grid">
            <div class="detail-item"><span>Full Name</span><strong>${escapeHtml(form.fullName)}</strong></div>
            <div class="detail-item"><span>Registration Number</span><strong>${escapeHtml(form.registrationNumber)}</strong></div>
            <div class="detail-item"><span>Email</span><strong>${escapeHtml(form.email)}</strong></div>
            <div class="detail-item"><span>Department</span><strong>${escapeHtml(form.department)}</strong></div>
            <div class="detail-item"><span>Verification Code</span><strong>${escapeHtml(form.phase2VerificationCode || '-')}</strong></div>
            <div class="detail-item"><span>Registration Phase</span><strong>Phase 2 (Enhanced)</strong></div>
          </div>
          <div class="phase2-confirmation-notice">
            <p><strong>Phase 2 Registration Notice:</strong></p>
            <ul>
              <li>This registration uses enhanced verification</li>
              <li>Additional security measures are in place</li>
              <li>Registration is time-sensitive</li>
            </ul>
          </div>
          <label class="verification-check verification-check-strong">
            <input id="examPhase2Confirmed" type="checkbox" ${st.examUi.form.phase2Confirmed ? 'checked' : ''}>
            <span>I confirm phase 2 registration with enhanced verification</span>
          </label>
        </div>
      </div>`;
  }
  function renderExamVerificationBody() {
    const exam = getActiveVerificationExam();
    if (!exam || !el.examVerificationBody) return;
    const step = st.examUi.step;
    const map = {
      1: renderVerificationStep1(exam),
      2: renderVerificationStep2(),
      3: renderVerificationStep3(),
      4: renderVerificationStep4(),
      5: renderVerificationStep5(exam),
      6: renderVerificationStep6(exam),
      7: (st.examUi.mode === 'register-phase2' ? renderVerificationStep7Phase2(exam) : renderVerificationStep7Regular(exam)),
      8: renderVerificationStep8Phase2(exam)
    };
    el.examVerificationBody.innerHTML = map[step] || map[1];
  }
  function renderExamVerificationFoot() {
    if (!el.examVerificationFoot) return;
    const step = st.examUi.step;
    const mode = st.examUi.mode || 'start';
    const prevDisabled = step === 1;
    const isPhase2 = mode === 'register-phase2';
    const nextDisabled = (step === 1 && !isStep1Valid())
      || (step === 2 && !isStep2Valid())
      || (step === 3 && !isStep3Valid())
      || (step === 4 && !isStep4Valid())
      || (step === 5 && !isStep5Valid())
      || (step === 7 && !isPhase2 && mode === 'register' && !isStep6Valid())
      || (step === 7 && isPhase2 && !isStep7Valid())
      || (step === 8 && isPhase2 && !isStep8Valid());
    const primaryLabel = step === 5
      ? (mode === 'start' ? 'Start Exam' : 'Review Registration')
      : step === 6
        ? (isPhase2 ? 'Continue to Phase 2 Verification' : 'Continue to Confirmation')
        : step === 7
          ? (isPhase2 ? 'Continue to Final Confirmation' : 'Confirm Registration')
        : step === 8
          ? 'Complete Phase 2 Registration'
        : 'Next Step';
    el.examVerificationFoot.innerHTML = `
      <button class="btn ghost" type="button" data-verification-nav="close">Close</button>
      <button class="btn ghost" type="button" data-verification-nav="back" ${prevDisabled ? 'disabled' : ''}>Back</button>
      <button class="btn primary" type="button" data-verification-nav="next" ${nextDisabled ? 'disabled' : ''}>${primaryLabel}</button>`;
  }
  function updateExamVerificationUi() {
    renderExamStepper();
    renderExamSecurityIndicators();
    renderExamVerificationBody();
    renderExamVerificationFoot();
    syncVerificationFieldStyles();
  }
  function syncVerificationFieldStyles() {
    const map = [
      ['examMobileNumber', 'mobileNumber'],
      ['examEmergencyContact', 'emergencyContact'],
      ['examCurrentLocation', 'currentLocation'],
      ['examIdConfirmationNumber', 'idConfirmationNumber'],
      ['examPhase2Code', 'phase2VerificationCode']
    ];
    map.forEach(([id, key]) => {
      const input = $(id);
      if (!input) return;
      const ok = !!String(st.examUi.form?.[key] || '').trim();
      const field = input.closest('.verification-field');
      field?.classList.toggle('valid', ok);
      field?.classList.toggle('invalid', !ok);
      const error = field?.querySelector('.field-error');
      if (error) error.style.display = ok ? 'none' : 'block';
    });
  }
  function setVerificationField(key, value) {
    st.examUi.form = Object.assign({}, st.examUi.form, { [key]: value });
  }
  function handleVerificationInput(target) {
    if (!target) return;
    if (target.id === 'examMobileNumber') setVerificationField('mobileNumber', target.value);
    if (target.id === 'examEmergencyContact') setVerificationField('emergencyContact', target.value);
    if (target.id === 'examCurrentLocation') setVerificationField('currentLocation', target.value);
    if (target.id === 'examIdConfirmationNumber') setVerificationField('idConfirmationNumber', target.value);
    if (target.id === 'examPhase2Code') setVerificationField('phase2VerificationCode', target.value);
    if (target.id === 'examRulesAccepted') setVerificationField('rulesAccepted', target.checked);
    if (target.id === 'examTermsAccepted') setVerificationField('termsAccepted', target.checked);
    if (target.id === 'examDeclarationAccepted') setVerificationField('declarationAccepted', target.checked);
    if (target.id === 'examRegistrationConfirmed') setVerificationField('registrationConfirmed', target.checked);
    if (target.id === 'examPhase2Confirmed') setVerificationField('phase2Confirmed', target.checked);
    if (target.id === 'examImageUploadInput' || target.id === 'examImageCaptureInput') {
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          st.examUi.imageData = String(reader.result || '');
          st.examUi.imageName = file.name || 'Verification image';
          renderExamVerificationBody();
          updateExamVerificationUi();
        };
        reader.readAsDataURL(file);
      }
      return;
    }
    renderExamVerificationFoot();
    renderExamStepper();
    syncVerificationFieldStyles();
  }
  function moveVerificationStep(nextStep) {
    const mode = st.examUi.mode || 'start';
    const maxStep = mode === 'register-phase2' ? 8 : (mode === 'register' ? 7 : 5);
    st.examUi.step = clamp(nextStep, 1, maxStep);
    updateExamVerificationUi();
  }
  function registerExam(code) {
    if (!code) return;
    st.examRegistration[code] = true;
    save(K.er, st.examRegistration);
    toast('Registration complete', 'The exam is now unlocked for verification.', 'success');
    renderExamCatalog();
    renderMyExams();
  }
  async function completeExamRegistration(code) {
    if (!code) return;
    const isPhase2 = (st.examUi.mode || 'start') === 'register-phase2';
    try {
      if (isPhase2) {
        const verificationData = {
          verificationCode: st.examUi.form.phase2VerificationCode
        };
        await apiRequest(`/student/exam/register-phase2/${encodeURIComponent(code)}`, {
          method: 'POST',
          body: JSON.stringify(verificationData)
        });
      } else {
        await apiRequest(`/student/exam/register/${encodeURIComponent(code)}`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to register exam in backend:', error);
      toast('Registration failed', error?.message || 'Unable to register exam right now.', 'warn');
      return;
    }
    st.examRegistration[code] = true;
    save(K.er, st.examRegistration);
    markExamVerificationComplete(code);
    closeExamVerification();
    renderExamCatalog();
    renderMyExams();
    const phaseText = isPhase2 ? 'Phase 2 ' : '';
    toast(`${phaseText}Registration verified`, `The exam has been added to My Exams.`, 'success');
  }
  async function sendPhase2VerificationEmail(code, triggerBtn) {
    if (!code) return;
    try {
      setButtonBusy(triggerBtn, 'Sending email...');
      const response = await apiRequest(`/student/exam/phase2/send/${encodeURIComponent(code)}`, {
        method: 'POST'
      });
      const email = String(response?.email || '').trim();
      const maskedEmail = email ? email.replace(/(^.).*(@.*$)/, '$1***$2') : 'your registered email';
      toast('Verification email sent', `A phase 2 code was sent to ${maskedEmail}.`, 'success');
    } catch (error) {
      console.error('Failed to send phase 2 verification email:', error);
      toast('Email send failed', error?.message || 'Unable to send the phase 2 verification email right now.', 'warn');
    } finally {
      restoreButton(triggerBtn);
    }
  }
  async function ensureExamAttempt(code) {
    if (!code) return;
    let attemptId = st.examAttemptIds[code] || null;
    if (attemptId && await isActiveAttempt(attemptId)) return attemptId;
    if (attemptId) {
      delete st.examAttemptIds[code];
      save(K.ea, st.examAttemptIds);
    }
    const studentId = Number(st.currentUserId);
    const payload = {
      studentId: Number.isFinite(studentId) && studentId > 0 ? studentId : st.currentUserId,
      examCode: code
    };
    const started = await apiRequest('/exam/start', { method: 'POST', body: JSON.stringify(payload) });
    if (started?.id != null) {
      attemptId = started.id;
      st.examAttemptIds[code] = started.id;
      save(K.ea, st.examAttemptIds);
    }
    return attemptId || null;
  }
  async function startVerifiedExam(code) {
    if (!code) return;
    let attemptId = null;
    try {
      attemptId = await ensureExamAttempt(code);
      if (!attemptId) {
        toast('Unable to enter exam', 'Exam session could not be created. Please try again.', 'warn');
        return;
      }
    } catch (error) {
      console.warn('Unable to start exam with backend.', error);
      toast('Unable to enter exam', error?.message || 'Exam start failed. Please try again.', 'warn');
      return;
    }
    st.examSessions[code] = Date.now();
    save(K.es, st.examSessions);
    markExamVerificationComplete(code);
    const exam = st.data.exams.find((item) => item.examCode === code);
    if (exam && attemptId != null) {
      exam.resumeAttemptId = attemptId;
    }
    closeExamVerification();
    renderExamCatalog();
    renderMyExams();
    if (exam) openExamAccess(exam);
  }
  async function navigateToExamPage(code) {
    if (!code) {
      toast('Navigation failed', 'Exam code is missing. Please try again.', 'warn');
      return;
    }
    let attemptId = null;
    try {
      attemptId = await ensureExamAttempt(code);
    } catch (error) {
      console.warn('Unable to create exam attempt before navigation.', error);
      toast('Navigation failed', error?.message || 'Unable to create the exam attempt. Please try again.', 'warn');
      return;
    }
    if (!attemptId) {
      toast('Navigation failed', 'No active exam attempt found. Please verify and retry.', 'warn');
      return;
    }
    window.location.href = `exam/exam.html?code=${encodeURIComponent(code)}&attemptId=${encodeURIComponent(attemptId)}`;
  }
  function setSection(sec) { st.sec = sec; localStorage.setItem(K.sec, sec); $$('.section').forEach(s => s.classList.toggle('active', s.id === sec)); $$('.nav-link[data-section]').forEach(b => b.classList.toggle('active', b.dataset.section === sec)); updateTopPlaceholder(); if (isMobile()) closeSidebar(); if (!booting) refresh(); }
  function openSidebar() { el.sidebar.classList.add('open'); document.body.classList.add('sidebar-open'); }
  function closeSidebar() { el.sidebar.classList.remove('open'); document.body.classList.remove('sidebar-open'); updateSidebarToggle(); }
  function toggleSidebar() { if (isMobile()) (el.sidebar.classList.contains('open') ? closeSidebar() : openSidebar()); else el.sidebar.classList.toggle('collapsed'); updateSidebarToggle(); }
  function updateSidebarToggle() {
    if (!el.toggle) return;
    const isCollapsed = !isMobile() && el.sidebar.classList.contains('collapsed');
    const isOpen = isMobile() && el.sidebar.classList.contains('open');
    const icon = isMobile() ? (isOpen ? 'collapse' : 'menu') : (isCollapsed ? 'menu' : 'collapse');
    const text = isMobile() ? 'Menu' : (isCollapsed ? 'Expand' : 'Collapse');
    el.toggle.setAttribute('aria-label', `${text} sidebar`);
    el.toggle.querySelector('.svg-icon').innerHTML = ico[icon];
    const label = el.toggle.querySelector('.toggle-text');
    if (label) label.textContent = text;
  }
  function applyProfile() {
    save(K.p, st.profile);
    el.sidebarName.textContent = st.profile.fullName;
    el.sidebarRole.textContent = `${st.profile.department} Learner`;
    el.topName.textContent = st.profile.fullName;
    const photoSrc = (st.profile.profilePhoto && st.profile.profilePhoto.trim())
      ? st.profile.profilePhoto
      : avatar(st.profile.fullName);
    el.sidebarAvatar.src = photoSrc;
    el.topAvatar.src = photoSrc;
    fillProfileForm(el.profileForm);
    fillProfileForm(el.profileEditorForm);
    syncProfilePhotoPreview();
  }
  function applySettings() { save(K.s, st.settings); document.body.classList.toggle('student-compact', !!st.settings.compactDensity); document.body.classList.toggle('student-contrast', !!st.settings.highContrast); const t = $$('.toggle-row input[type="checkbox"]'); if (t[0]) t[0].checked = !!st.settings.emailAlerts; if (t[1]) t[1].checked = !!st.settings.examReminders; if (t[2]) t[2].checked = !!st.settings.compactDensity; if (t[3]) t[3].checked = !!st.settings.highContrast; }
  function resolveTheme(mode) { return mode === 'system' ? (themeQuery.matches ? 'dark' : 'light') : mode; }
  function chartPalette() {
    const resolved = resolveTheme(st.theme);
    const dark = resolved === 'dark';
    return {
      grid: dark ? 'rgba(82, 82, 91, 0.42)' : 'rgba(148, 163, 184, 0.18)',
      line: dark ? '#60a5fa' : '#3b82f6',
      lineFillStart: dark ? 'rgba(96, 165, 250, 0.30)' : 'rgba(59, 130, 246, 0.28)',
      lineFillEnd: dark ? 'rgba(96, 165, 250, 0.03)' : 'rgba(59, 130, 246, 0.02)',
      barTop: dark ? 'rgba(167, 139, 250, 0.96)' : 'rgba(139, 92, 246, 0.92)',
      barBottom: dark ? 'rgba(96, 165, 250, 0.52)' : 'rgba(59, 130, 246, 0.46)',
      text: dark ? '#f8fafc' : '#0f172a'
    };
  }
  function applyTheme(mode = st.theme) {
    st.theme = mode;
    localStorage.setItem(K.t, mode);
    const resolved = resolveTheme(mode);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-mode', mode);
    document.documentElement.style.colorScheme = resolved;
    if (el.themeButtons) el.themeButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.themeMode === mode));
    if (el.analyticsLineChart || el.analyticsBarChart || el.analyticsDonutChart || el.performanceTrendChart) {
      renderAnalyticsCharts();
    }
  }
  function renderCards() { const c = [['Total Exams',st.data.dash.totalExams,'dashboard','blue'],['Attempted Exams',st.data.dash.attemptedCount,'exams','purple'],['Average Score',pct(st.data.dash.averageScore),'analytics','green'],['Certificates Earned',st.data.dash.certificatesEarned,'certificates','amber']]; el.dashStatsGrid.innerHTML = c.map(([t,v,i,tn]) => `<article class="stat-card stat-${tn}"><div class="stat-icon">${svg(i)}</div><div class="stat-copy"><span class="stat-label">${t}</span><strong class="stat-value">${v}</strong><small class="stat-hint">Enterprise UI data</small></div></article>`).join(''); const a = st.data.analytics; el.analyticsCards.innerHTML = [['Attempted Exams',a.attemptedExams,'dashboard'],['Average Score',pct(a.averageScore),'analytics'],['Highest Score',a.highestScore,'star'],['Lowest Score',a.lowestScore,'results']].map(([t,v,i]) => `<article class="stat-card"><div class="stat-icon">${svg(i)}</div><div class="stat-copy"><span class="stat-label">${t}</span><strong class="stat-value">${v}</strong></div></article>`).join(''); }
  function getAnalyticsRows() {
    const rows = Array.isArray(st.data.results) ? st.data.results : [];
    if (rows.length) return rows;
    return (st.data.dash.attempts || []).map((attempt) => ({
      score: Number(attempt.obtainedMarks || 0),
      percentage: Number(attempt.percentage || 0),
      passed: Number(attempt.percentage || 0) >= 40
    }));
  }
  function analyticsWindowDays(filterValue = 'all-exams') {
    const key = String(filterValue || '').toLowerCase();
    if (key === 'this-month') return 30;
    if (key === 'last-3-months') return 90;
    return Infinity;
  }
  function analyticsDateKey(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  function analyticsWindowRows(rows, filterValue = 'all-exams') {
    const windowDays = analyticsWindowDays(filterValue);
    if (!Number.isFinite(windowDays)) return rows.slice();
    const threshold = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
    return rows.filter((row) => {
      const ts = new Date(row.submittedAt || row.evaluatedAt || row.updatedAt || row.createdAt || 0).getTime();
      return Number.isFinite(ts) && ts >= threshold;
    });
  }
  function analyticsTrendSeries(rows, filterValue = 'all-exams') {
    const filtered = analyticsWindowRows(rows, filterValue).slice().sort((a, b) => {
      const aTime = new Date(a.submittedAt || a.evaluatedAt || a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.submittedAt || b.evaluatedAt || b.updatedAt || b.createdAt || 0).getTime();
      return aTime - bTime;
    });
    const buckets = new Map();
    filtered.forEach((row) => {
      const key = analyticsDateKey(row.submittedAt || row.evaluatedAt || row.updatedAt || row.createdAt);
      if (!key) return;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    const keys = Array.from(buckets.keys()).sort();
    const compactKeys = keys.length > 5 ? keys.slice(-5) : keys;
    const labels = compactKeys.map((key) => {
      const d = new Date(`${key}T00:00:00`);
      return d.toLocaleDateString([], { month: 'short', day: '2-digit' });
    });
    const values = compactKeys.map((key) => buckets.get(key) || 0);
    return { labels, values, keys: compactKeys, filtered };
  }
  function analyticsPassSeries(rows, filterValue = 'all-exams') {
    const filtered = analyticsWindowRows(rows, filterValue);
    const passed = filtered.filter((row) => Boolean(row.passed) || Number(row.percentage || 0) >= 40).length;
    const failed = filtered.filter((row) => !((Boolean(row.passed) || Number(row.percentage || 0) >= 40)) && Number(row.percentage || 0) > 0).length;
    const unfinished = Math.max(filtered.length - passed - failed, 0);
    return {
      labels: ['Passed', 'Failed', 'Not Finished'],
      values: [passed, failed, unfinished],
      filtered
    };
  }
  function analyticsMixSeries(rows, filterValue = 'all-exams') {
    const filtered = analyticsWindowRows(rows, filterValue);
    const buckets = filtered.reduce((acc, row) => {
      const pctValue = Number(row.percentage || 0);
      if (pctValue >= 80) acc.high += 1;
      else if (pctValue >= 60) acc.good += 1;
      else if (pctValue >= 40) acc.mid += 1;
      else acc.poor += 1;
      return acc;
    }, { high: 0, good: 0, mid: 0, poor: 0 });
    return {
      parts: [
        { label: '80 - 100', value: buckets.high, color: '#7c3aed' },
        { label: '60 - 79', value: buckets.good, color: '#60a5fa' },
        { label: '40 - 59', value: buckets.mid, color: '#fbbf24' },
        { label: '0 - 39', value: buckets.poor, color: '#ff5f87' }
      ],
      buckets,
      filtered
    };
  }
  function analyticsMixLegendItems(series) {
    const total = Math.max(series.filtered.length, 1);
    return [
      { label: '80 - 100 (Excellent)', count: series.buckets.high, color: '#7c3aed' },
      { label: '60 - 79 (Good)', count: series.buckets.good, color: '#60a5fa' },
      { label: '40 - 59 (Average)', count: series.buckets.mid, color: '#fbbf24' },
      { label: '0 - 39 (Poor)', count: series.buckets.poor, color: '#ff5f87' }
    ].map((item) => {
      const percent = Math.round((item.count * 100) / total);
      return { ...item, percent };
    });
  }
  function computeAnalyticsSnapshot(rows = getAnalyticsRows()) {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const attemptedExams = sourceRows.length;
    const percentages = sourceRows.map((row) => Number(row.percentage || 0));
    const averageScore = attemptedExams ? percentages.reduce((sum, value) => sum + value, 0) / attemptedExams : 0;
    const highestScore = percentages.length ? Math.max(...percentages) : 0;
    const lowestScore = percentages.length ? Math.min(...percentages) : 0;
    const passRate = attemptedExams ? (sourceRows.filter((row) => Boolean(row.passed) || Number(row.percentage || 0) >= 40).length * 100.0) / attemptedExams : 0;
    const trend = percentages.length ? percentages.slice(-8) : [0, 0, 0, 0];
    const scoreMix = sourceRows.reduce((acc, row) => {
      const pctValue = Number(row.percentage || 0);
      if (pctValue >= 80) acc.high += 1;
      else if (pctValue >= 50) acc.mid += 1;
      else acc.low += 1;
      return acc;
    }, { high: 0, mid: 0, low: 0 });
    return { attemptedExams, averageScore, highestScore, lowestScore, passRate, trend, scoreMix };
  }
  function normalizeAnalyticsSnapshot(source, rows = getAnalyticsRows()) {
    const computed = computeAnalyticsSnapshot(rows);
    const analytics = source && typeof source === 'object' ? source : {};
    const scoreMix = analytics.scoreMix && typeof analytics.scoreMix === 'object'
      ? analytics.scoreMix
      : computed.scoreMix;
    return {
      attemptedExams: Number(analytics.attemptedExams ?? computed.attemptedExams ?? 0),
      averageScore: Number(analytics.averageScore ?? computed.averageScore ?? 0),
      highestScore: Number(analytics.highestScore ?? computed.highestScore ?? 0),
      lowestScore: Number(analytics.lowestScore ?? computed.lowestScore ?? 0),
      passRate: Number(analytics.passRate ?? computed.passRate ?? 0),
      trend: Array.isArray(analytics.trend) ? analytics.trend : computed.trend,
      scoreMix: {
        high: Number(scoreMix.high ?? computed.scoreMix.high ?? 0),
        mid: Number(scoreMix.mid ?? computed.scoreMix.mid ?? 0),
        low: Number(scoreMix.low ?? computed.scoreMix.low ?? 0)
      }
    };
  }
  function renderAnalyticsCards() {
    const analytics = normalizeAnalyticsSnapshot(st.data.analytics, getAnalyticsRows());
    st.data.analytics = analytics;
    el.analyticsCards.innerHTML = [
      ['Attempted Exams', analytics.attemptedExams, 'dashboard', 'purple', 'Total exams attempted'],
      ['Average Score', pct(analytics.averageScore), 'analytics', 'blue', 'Average across all exams'],
      ['Highest Score', fmtScore(analytics.highestScore), 'star', 'green', 'Your best score'],
      ['Lowest Score', fmtScore(analytics.lowestScore), 'results', 'amber', 'Your lowest score']
    ].map(([t, v, i, tone, hint]) => `
      <article class="stat-card stat-${tone}">
        <div class="stat-icon">${svg(i)}</div>
        <div class="stat-copy">
          <span class="stat-label">${t}</span>
          <strong class="stat-value">${v}</strong>
          <small class="stat-hint">${hint}</small>
        </div>
      </article>`).join('');
  }
  function renderDashboardTable() { const q = st.q.trim().toLowerCase(); const rows = st.data.dash.attempts.filter(r => !q || [r.examCode,r.badge,r.status].some(v => String(v).toLowerCase().includes(q))); el.recentAttemptsBody.innerHTML = rows.length ? rows.map(r => `<tr class="clickable-row" data-detail="attempt" data-code="${r.examCode}"><td><strong>${r.examCode}</strong></td><td>${r.obtainedMarks}</td><td>${r.totalMarks}</td><td>${pct(r.percentage)}</td><td><span class="badge ${badge[r.badge] || 'neutral'}">${r.badge}</span></td></tr>`).join('') : `<tr><td colspan="5" class="empty-state">No recent attempts found.</td></tr>`; }
  function examEmptyState(title, description) {
    return `
      <div class="exam-empty-state">
        <strong>${title}</strong>
        <p>${description}</p>
      </div>`;
  }

  function examCardHtml(exam, view = 'catalog') {
    const access = examActionForView(exam, view);
    if (!access) return '';
    const state = examRuntimeState(exam);
    const result = state.result;
    const verificationCompleted = isExamVerificationComplete(exam.examCode);
    const verificationBadge = renderVerificationBadge(exam);
    const startAt = getExamDate(exam);
    const attemptUsed = Math.min(Number(exam.attemptsUsed || 0), Number(exam.maxAttempts || 0));
    const attemptMax = Math.max(Number(exam.maxAttempts || 0), 1);
    const attemptRemaining = calculateAttemptsRemaining(exam);
    const attemptPercent = clamp((attemptUsed / attemptMax) * 100, 0, 100);
    const topStatus = state.completed ? 'CLOSED' : verificationCompleted ? 'VERIFIED' : state.live ? 'LIVE' : state.resumeEligible ? 'RESUME' : state.verificationOpen ? 'AVAILABLE' : state.upcoming && !state.expired ? 'UPCOMING' : 'CLOSED';
    const topStatusTone = state.completed ? 'closed' : verificationCompleted ? 'success' : state.live ? 'available' : state.resumeEligible ? 'resume' : state.verificationOpen ? 'upcoming' : state.upcoming && !state.expired ? 'upcoming' : 'closed';
    const accessNote = state.live
      ? (verificationCompleted ? 'Verification completed. Exam is currently available.' : 'Exam is currently available.')
      : state.expired
        ? 'Exam is not accessible now.'
        : state.resumeEligible
          ? 'Saved session ready to continue.'
          : !state.registered && state.registrationOpen
            ? 'Registration open.'
            : !state.registered && state.upcoming
              ? 'Upcoming exam.'
              : state.verificationOpen
                ? (verificationCompleted ? 'Verification completed.' : 'Verification window open.')
                : 'Registration closed.';
    const footerTitle = state.completed ? 'Closed' : state.live ? 'Live' : state.resumeEligible ? 'Resume Session' : !state.registered && state.registrationOpen ? 'Register Now' : !state.registered && state.upcoming ? 'Upcoming' : 'Closed';
    const footerBody = state.completed
      ? 'This exam is currently closed.'
      : state.live
        ? (verificationCompleted ? 'Verification completed. Enter the exam workspace.' : 'This exam is live now.')
        : state.resumeEligible
          ? 'This exam can be resumed from the saved session.'
          : !state.registered && state.registrationOpen
            ? 'Registration is open for this exam window.'
            : !state.registered && state.upcoming
              ? 'This exam will open later.'
              : state.verificationOpen
                ? 'Verification is open for eligible candidates.'
                : 'This exam is currently closed.';
    const myExamMenu = view === 'my' ? `
      <div class="exam-card-menu">
        <button class="btn ghost exam-card-menu-btn" type="button" data-action="exam-card-menu-toggle" aria-expanded="false" aria-label="More exam actions">&#8942;</button>
        <div class="exam-card-menu-panel" role="menu" aria-label="Exam actions">
          <button class="exam-card-menu-item" type="button" data-action="exam-detail" data-code="${exam.examCode}" role="menuitem">Details</button>
          <button class="exam-card-menu-item" type="button" data-action="exam-instructions" data-code="${exam.examCode}" role="menuitem">Instructions</button>
        </div>
      </div>` : '';
    return `
      <article class="exam-card ${view === 'my' ? 'my-exam-card' : ''}" data-status="${exam.status}" data-exam-view="${view}" data-exam-code="${exam.examCode}" data-action="exam-detail" role="button" tabindex="0">
          <div class="exam-card-shell">
            
            <!-- Compact Header Structure -->
            <div class="exam-card-badges-row">
              <div class="badges-left">
                <span class="exam-status-chip ${topStatusTone}">${svg(state.completed ? 'lock' : state.live ? 'clock' : 'shield')} <span>${topStatus}</span></span>
                ${verificationBadge ? (
                  verificationCompleted 
                  ? `<span class="exam-verify-badge is-ok">${svg('shield')} Verified</span>`
                  : `<span class="exam-verify-badge is-pending">${svg('shield')} Verify ID</span>`
                ) : ''}
              </div>
              ${myExamMenu}
            </div>

            <div class="exam-card-title-block">
              <h3 class="exam-title">${escapeHtml(exam.title || 'Untitled Exam')}</h3>
              <p class="exam-subject">
                ${escapeHtml(exam.subject || 'Subject')}
                <code class="exam-code-inline">${escapeHtml(exam.examCode)}</code>
              </p>
            </div>

            <!-- Compact Meta Grid -->
            <div class="exam-meta-grid">
              <div class="exam-meta-box">
                <span class="exam-meta-label">Attempts</span>
                <strong class="exam-meta-value">${attemptUsed} / ${attemptMax}</strong>
              </div>
              <div class="exam-meta-box">
                <span class="exam-meta-label">Start Time</span>
                <strong class="exam-meta-value">${formatFullDateTime(startAt).replace(/, \d{4}/, '')}</strong>
              </div>
              <div class="exam-meta-box">
                <span class="exam-meta-label">End Time</span>
                <strong class="exam-meta-value">${formatFullDateTime(state.endAt).replace(/, \d{4}/, '')}</strong>
              </div>
            </div>

            <!-- Compact Footer Info & Actions -->
            <div class="exam-footer-row">
              <div class="exam-footer-state">
                ${svg(state.completed ? 'lock' : state.live ? 'clock' : 'shield')}
                <span>${footerTitle}</span>
              </div>
              <div class="exam-actions-shell ${view === 'my' ? 'exam-actions-shell--my' : 'exam-actions-shell--catalog'}">
                ${view !== 'my' ? `
                  <button class="btn ghost btn-sm" type="button" data-action="exam-detail" data-code="${exam.examCode}">Details</button>
                ` : ''}
                <button class="btn ${access.disabled ? 'ghost' : 'primary'} btn-sm" type="button" data-action="${access.action}" data-code="${exam.examCode}" ${access.disabled ? 'disabled aria-disabled="true"' : ''}>${escapeHtml(access.label)}</button>
              </div>
            </div>

        </div>
      </article>`;
  }

  function renderExamCatalog() {
    const q = (el.examSearch.value.trim() || st.q).toLowerCase();
    const activeTab = el.examTabs.find((btn) => btn.classList.contains('active'))?.dataset.tab || 'all';
    renderStatusLegend();
    const visible = st.data.exams.filter((exam) => {
      const matchesQuery = !q || [exam.title, exam.examCode, exam.subject, exam.status, String(exam.durationMinutes), String(exam.totalMarks)].some((v) => String(v).toLowerCase().includes(q));
      const group = examCatalogGroup(exam);
      if (!group) return false;
      const matchesTab = activeTab === 'all' || group === activeTab;
      const filter = el.examFilter.value;
      const matchesFilter = filter === 'all' || filter === group;
      return matchesQuery && matchesTab && matchesFilter;
    });

    const groups = {
      unregistered: visible.filter((exam) => examCatalogGroup(exam) === 'unregistered'),
      upcoming: visible.filter((exam) => examCatalogGroup(exam) === 'upcoming'),
      closed: visible.filter((exam) => examCatalogGroup(exam) === 'closed')
    };

    el.unregisteredGrid.innerHTML = groups.unregistered.length ? groups.unregistered.slice().sort(sortExamStartAsc).map((exam) => examCardHtml(exam, 'catalog')).join('') : examEmptyState('No unregistered exams', 'Every exam in this category has already been registered or filtered out.');
    el.upcomingGrid.innerHTML = groups.upcoming.length ? groups.upcoming.slice().sort(sortExamStartAsc).map((exam) => examCardHtml(exam, 'catalog')).join('') : examEmptyState('No upcoming exams', 'Upcoming exam windows will appear here once they are scheduled.');
    el.closedGrid.innerHTML = groups.closed.length ? groups.closed.slice().sort(sortExamEndDesc).map((exam) => examCardHtml(exam, 'catalog')).join('') : examEmptyState('No closed exams', 'Completed or expired exams will appear here automatically.');

    const visibleCount = visible.length;
    el.summaryPill.textContent = `${visibleCount} visible ${visibleCount === 1 ? 'exam' : 'exams'}`;
    el.unregisteredCount.textContent = groups.unregistered.length;
    el.upcomingCount.textContent = groups.upcoming.length;
    el.closedCount.textContent = groups.closed.length;

    $$('.exam-group[data-group]', document).forEach((group) => {
      const groupType = group.dataset.group;
      group.classList.toggle('is-hidden', activeTab !== 'all' && activeTab !== groupType);
    });
  }

  function renderMyExams() {
    const q = (el.myExamSearch.value.trim() || st.q).toLowerCase();
    const activeTab = el.myExamTabs.find((btn) => btn.classList.contains('active'))?.dataset.myTab || 'all';
    const visible = st.data.exams.filter((exam) => {
      const group = myExamGroup(exam);
      if (!group) return false;
      const matchesQuery = !q || [exam.title, exam.examCode, exam.subject, String(exam.durationMinutes), String(exam.totalMarks), group].some((v) => String(v).toLowerCase().includes(q));
      const matchesTab = activeTab === 'all' || group === activeTab;
      const filter = el.myExamFilter.value;
      const matchesFilter = filter === 'all' || filter === group;
      return matchesQuery && matchesTab && matchesFilter;
    });

    const groups = {
      registered: visible.filter((exam) => myExamGroup(exam) === 'registered'),
      resume: visible.filter((exam) => myExamGroup(exam) === 'resume'),
      completed: visible.filter((exam) => myExamGroup(exam) === 'completed'),
      reexam: visible.filter((exam) => myExamGroup(exam) === 'reexam')
    };

    el.registeredGrid.innerHTML = groups.registered.length ? groups.registered.slice().sort(sortExamStartAsc).map((exam) => examCardHtml(exam, 'my')).join('') : examEmptyState('No registered exams', 'Register for an exam to see it here.');
    el.resumeMyGrid.innerHTML = groups.resume.length ? groups.resume.slice().sort(sortExamStartAsc).map((exam) => examCardHtml(exam, 'my')).join('') : examEmptyState('No resume sessions', 'Saved attempts will appear here when a session is in progress.');
    el.completedGrid.innerHTML = groups.completed.length ? groups.completed.slice().sort(sortExamEndDesc).map((exam) => examCardHtml(exam, 'my')).join('') : examEmptyState('No completed exams', 'Finished exams will appear here once the attempt limit is reached or the result is finalized.');
    el.reexamGrid.innerHTML = groups.reexam.length ? groups.reexam.slice().sort(sortExamEndDesc).map((exam) => examCardHtml(exam, 'my')).join('') : examEmptyState('No re-exam opportunities', 'Failed attempts eligible for retry will appear here.');

    const visibleCount = visible.length;
    el.myExamSummaryPill.textContent = `${visibleCount} visible ${visibleCount === 1 ? 'exam' : 'exams'}`;
    el.registeredCount.textContent = groups.registered.length;
    el.resumeMyCount.textContent = groups.resume.length;
    el.completedMyCount.textContent = groups.completed.length;
    el.reexamCount.textContent = groups.reexam.length;

    $$('.exam-group[data-my-group]', document).forEach((group) => {
      const groupType = group.dataset.myGroup;
      group.classList.toggle('is-hidden', activeTab !== 'all' && activeTab !== groupType);
    });
  }
  function renderResultsSummary() {
    const rows = st.data.results || [];
    const total = rows.length;
    const avg = total ? rows.reduce((sum, row) => sum + Number(row.percentage || 0), 0) / total : 0;
    const high = total ? Math.max(...rows.map((row) => Number(row.percentage || 0))) : 0;
    const pass = total ? (rows.filter((row) => row.passed).length / total) * 100 : 0;
    const cards = [
      ['Total Exams', total, 'dashboard', 'blue', 'Submitted result entries'],
      ['Average Percentage', pct(avg), 'analytics', 'purple', 'Across all completed attempts'],
      ['Highest Score', pct(high), 'star', 'green', 'Top score achieved'],
      ['Pass Rate', pct(pass), 'results', 'amber', 'Successful submissions']
    ];
    el.resultsSummaryGrid.innerHTML = cards.map(([label, value, icon, tone, hint]) => `
      <article class="summary-card summary-${tone}">
        <div class="summary-icon">${svg(icon)}</div>
        <div class="summary-copy">
          <span class="summary-label">${label}</span>
          <strong class="summary-value">${value}</strong>
          <small class="summary-hint">${hint}</small>
        </div>
      </article>
    `).join('');
  }
  function getFilteredResultsRows() {
    const q = (el.resultsSearch.value.trim() || st.q).toLowerCase();
    return st.data.results
      .slice()
      .sort(sortBySubmittedAtDesc)
      .filter((r) => (!q || [r.examCode, r.resultStatus, formatDate(r.submittedAt)].some((v) => String(v).toLowerCase().includes(q))) && resultsFilterValue(r));
  }
  function buildPaginationWindow(totalPages, currentPage) {
    if (totalPages <= 1) return [1];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    const windowStart = Math.max(2, currentPage - 1);
    const windowEnd = Math.min(totalPages - 1, currentPage + 1);
    if (windowStart > 2) pages.push('ellipsis-start');
    for (let page = windowStart; page <= windowEnd; page += 1) pages.push(page);
    if (windowEnd < totalPages - 1) pages.push('ellipsis-end');
    pages.push(totalPages);
    return pages;
  }
  function renderResultsPagination(totalRows) {
    const pageSize = Math.max(1, Number(st.results.pageSize || 10));
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    st.results.page = clamp(Number(st.results.page || 1), 1, totalPages);
    const page = st.results.page;
    const start = totalRows ? ((page - 1) * pageSize) + 1 : 0;
    const end = totalRows ? Math.min(page * pageSize, totalRows) : 0;
    if (el.resultsPageInfo) {
      el.resultsPageInfo.textContent = `Showing ${start} to ${end} of ${totalRows} results`;
    }
    if (!el.resultsPagination) return;
    if (totalPages <= 1) {
      el.resultsPagination.innerHTML = '';
      return;
    }
    const items = buildPaginationWindow(totalPages, page);
    const pageButton = (label, targetPage, extraClass = '') => `
      <button type="button" class="results-page-btn ${extraClass}" data-results-page="${targetPage}" ${targetPage === page ? 'aria-current="page"' : ''}>${label}</button>
    `;
    el.resultsPagination.innerHTML = [
      pageButton('‹', Math.max(1, page - 1), `nav-btn ${page === 1 ? 'disabled' : ''}`),
      ...items.map((item) => (typeof item === 'number'
        ? pageButton(String(item), item, item === page ? 'active' : '')
        : '<span class="results-page-ellipsis">…</span>')),
      pageButton('›', Math.min(totalPages, page + 1), `nav-btn ${page === totalPages ? 'disabled' : ''}`)
    ].join('');
  }
  function renderResultsPagination(totalRows) {
    const pageSize = Math.max(1, Number(st.results.pageSize || 10));
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    st.results.page = clamp(Number(st.results.page || 1), 1, totalPages);
    const page = st.results.page;
    const start = totalRows ? ((page - 1) * pageSize) + 1 : 0;
    const end = totalRows ? Math.min(page * pageSize, totalRows) : 0;
    if (el.resultsPageInfo) {
      el.resultsPageInfo.textContent = `Showing ${start} to ${end} of ${totalRows} results`;
    }
    if (!el.resultsPagination) return;
    if (totalPages <= 1) {
      el.resultsPagination.innerHTML = '';
      return;
    }
    const pages = buildPaginationWindow(totalPages, page);
    const pageButton = (label, targetPage, extraClass = '') => `
      <button type="button" class="results-page-btn ${extraClass}" data-results-page="${targetPage}" ${targetPage === page ? 'aria-current="page"' : ''}>${label}</button>
    `;
    el.resultsPagination.innerHTML = [
      pageButton('&lsaquo;', Math.max(1, page - 1), `nav-btn ${page === 1 ? 'disabled' : ''}`),
      ...pages.map((item) => (typeof item === 'number'
        ? pageButton(String(item), item, item === page ? 'active' : '')
        : '<span class="results-page-ellipsis">&hellip;</span>')),
      pageButton('&rsaquo;', Math.min(totalPages, page + 1), `nav-btn ${page === totalPages ? 'disabled' : ''}`)
    ].join('');
  }
  function resultsFilterValue(row) {
    const f = el.resultsFilter.value;
    if (f === 'all') return true;
    if (f === 'passed') return !!row.passed;
    if (f === 'failed') return !row.passed;
    if (f === 'highscore') return Number(row.percentage || 0) >= 90;
    if (f === 'recent') return true;
    return true;
  }
  function cycleResultsFilter() {
    if (!el.resultsFilter) return;
    const values = ['all', 'passed', 'failed', 'highscore', 'recent'];
    const current = values.indexOf(el.resultsFilter.value);
    const next = values[(current + 1) % values.length];
    el.resultsFilter.value = next;
    st.results.page = 1;
    renderResultsTable();
    toast('Filter updated', `Showing ${next === 'all' ? 'all results' : next.replace(/^\w/, (m) => m.toUpperCase())}.`, 'info');
  }
  function renderResultsTable() {
    const rows = getFilteredResultsRows();
    const pageSize = Math.max(1, Number(st.results.pageSize || 10));
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    st.results.page = clamp(Number(st.results.page || 1), 1, totalPages);
    const startIndex = (st.results.page - 1) * pageSize;
    const output = rows.slice(startIndex, startIndex + pageSize);
    el.resultsBody.innerHTML = output.length ? output.map((r) => `
      <tr class="clickable-row result-row" data-detail="result" data-code="${r.id ?? r.attemptId ?? r.examCode}">
        <td><strong>${r.examCode}</strong></td>
        <td>${r.score}</td>
        <td>${pct(r.percentage)}</td>
        <td><span class="result-badge ${r.passed ? 'pass' : 'fail'}">${r.resultStatus}</span></td>
        <td>${r.correctAnswers}</td>
        <td>${r.wrongAnswers}</td>
        <td>${r.unansweredQuestions}</td>
        <td>${formatDuration(r.timeTakenSeconds)}</td>
        <td>${formatDate(r.submittedAt)}</td>
        <td>
          <button class="btn ghost small result-action" type="button" data-action="result-view" data-code="${r.id ?? r.attemptId ?? r.examCode}">
            <span>View Details</span>
            ${svg('chevron')}
          </button>
        </td>
      </tr>`).join('') : `<tr class="empty-row"><td colspan="10" class="empty-state"><strong>No results match the selected filters.</strong><span>Try clearing the search or choose a different status.</span></td></tr>`;
    renderResultsPagination(rows.length);
  }
  const gradeOrder = { 'A+': 5, A: 4, 'B+': 3, B: 2, 'C+': 1, C: 0 };
  const certStatusLabel = (revoked) => (revoked ? 'REVOKED' : 'VERIFIED');
  const certStatusClass = (revoked) => (revoked ? 'fail' : 'pass');
  const certToneClass = (cert) => {
    if (cert?.revoked) return 'tone-revoked';
    const grade = String(cert?.grade || '').toUpperCase();
    if (grade === 'A+' || Number(cert?.score || 0) >= 90) return 'tone-green';
    if (grade === 'A' || Number(cert?.score || 0) >= 80) return 'tone-teal';
    if (grade === 'B+' || Number(cert?.score || 0) >= 70) return 'tone-purple';
    return 'tone-blue';
  };
  const latestCertificate = (rows) => rows.slice().sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())[0];
  function renderCertificateSummary() {
    const rows = st.data.certs || [];
    const latest = latestCertificate(rows);
    const highest = rows.reduce((acc, c) => (gradeOrder[c.grade] > gradeOrder[acc.grade] ? c : acc), rows[0] || { grade: 'C' });
    const verifiedCount = rows.filter((c) => !c.revoked).length;
    const cards = [
      { label:'Total Certificates', value:rows.length, icon:'certificates', tone:'blue', hint:'Issued certificate records', valueClass:'' },
      { label:'Highest Grade', value:highest?.grade || '-', icon:'star', tone:'purple', hint:latest ? latest.examTitle : 'No certificates yet', valueClass:'' },
      { label:'Latest Certificate', value:latest ? latest.certificateId : '-', icon:'dashboard', tone:'green', hint:latest ? formatDate(latest.issuedAt) : 'Awaiting issue', valueClass:'summary-value-code' },
      { label:'Verified Certificates', value:verifiedCount, icon:'results', tone:'amber', hint:'Currently active certificates', valueClass:'' }
    ];
    el.certificatesSummaryGrid.innerHTML = cards.map((card) => `
      <article class="summary-card summary-${card.tone}">
        <div class="summary-icon">${svg(card.icon)}</div>
        <div class="summary-copy">
          <span class="summary-label">${card.label}</span>
          <strong class="summary-value ${card.valueClass}">${card.value}</strong>
          <small class="summary-hint">${card.hint}</small>
        </div>
      </article>
    `).join('');
  }
  function renderCertificates() {
    const q = (el.certificatesSearch.value.trim() || st.q).toLowerCase();
    const f = el.certificatesFilter.value;
    const rows = (st.data.certs || [])
      .slice()
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
      .filter((c) => {
        const matchesQuery = !q || [c.certificateId, c.examTitle, c.studentName, c.collegeName, c.department, c.rollNumber, c.examCode, c.grade].some((v) => String(v).toLowerCase().includes(q));
        if (!matchesQuery) return false;
        if (f === 'all') return true;
        if (f === 'verified') return !c.revoked;
        if (f === 'revoked') return !!c.revoked;
        if (f === 'highest') return gradeOrder[c.grade] >= gradeOrder['A+'] || c.score >= 90;
        if (f === 'recent') return true;
        return true;
      });
    const output = f === 'recent' ? rows.slice(0, 4) : rows;
    el.certificatesGrid.innerHTML = output.length ? output.map((c) => `
      <article class="card cert-card certificate-card ${certToneClass(c)}" data-cert="${c.certificateId}">
        <div class="cert-head">
          <div>
            <h3 class="cert-title">${c.examTitle}</h3>
            <div class="meta-line">
              <span class="code-badge">${c.certificateId}</span>
              <span class="status-badge ${certStatusClass(c.revoked)}">${certStatusLabel(c.revoked)}</span>
            </div>
          </div>
          <span class="tag ${c.revoked ? 'danger' : 'success'}">${c.grade}</span>
        </div>
        <div class="cert-meta-grid">
          <div class="detail-item"><span>Student Name</span><strong>${c.studentName}</strong></div>
          <div class="detail-item"><span>College Name</span><strong>${c.collegeName}</strong></div>
          <div class="detail-item"><span>Department</span><strong>${c.department}</strong></div>
          <div class="detail-item"><span>Roll Number</span><strong>${c.rollNumber}</strong></div>
        </div>
          <div class="cert-score-grid">
            <div class="detail-item"><span>Score</span><strong>${fmtScore(c.score)}%</strong></div>
            <div class="detail-item"><span>Grade</span><strong>${c.grade}</strong></div>
            <div class="detail-item"><span>Issued Date</span><strong>${formatDate(c.issuedAt)}</strong></div>
            <div class="detail-item"><span>Status</span><strong>${certStatusLabel(c.revoked)}</strong></div>
          </div>
        <div class="card-actions cert-actions">
          <button class="btn ghost small" data-action="certificate-preview" data-code="${c.certificateId}" type="button">View</button>
          <button class="btn primary small" data-action="certificate-download" data-code="${c.certificateId}" type="button">Download</button>
          <button class="btn ghost small" data-action="certificate-verify" data-code="${c.certificateId}" type="button">Verify</button>
        </div>
      </article>
    `).join('') : `<article class="card empty-card certificate-empty"><h3>No certificates found</h3><p>Use a broader search or a different filter to reveal issued certificates.</p></article>`;
  }
  function applySearch(rows, query = '') {
    const q = String(query || '').trim().toLowerCase();
    return rows.filter((row) => !q || row.studentName.toLowerCase().includes(q));
  }

  function applySort(rows, sortKey = 'rank') {
    return rows.slice().sort((a, b) => {
      if (sortKey === 'score') return b.score - a.score || a.rank - b.rank || a.studentName.localeCompare(b.studentName);
      if (sortKey === 'percentage') return b.percentage - a.percentage || a.rank - b.rank || a.studentName.localeCompare(b.studentName);
      return a.rank - b.rank || b.score - a.score || a.studentName.localeCompare(b.studentName);
    });
  }

  function leaderboardRowsForMode() {
    return normalizeLeaderboardRows(activeLeaderboardRows()).map((row) => ({ ...row }));
  }

  function renderSummary(rows) {
    const total = rows.length;
    const top = rows.reduce((acc, row) => (row.percentage > (acc?.percentage ?? -Infinity) ? row : acc), rows[0] || null);
    const avg = total ? rows.reduce((sum, row) => sum + Number(row.percentage || 0), 0) / total : 0;
    const cards = [
      { label: 'Top Score', value: top ? pct(top.percentage) : '-', icon: 'star', tone: 'purple', hint: top ? top.studentName : 'No students yet' },
      { label: 'Total Participants', value: total, icon: 'dashboard', tone: 'blue', hint: `${st.leaderboard.mode === 'global' ? 'Global' : 'Exam'} cohort` },
      { label: 'Average Score', value: pct(avg), icon: 'analytics', tone: 'green', hint: 'Average across current filter' }
    ];
    el.leaderboardSummaryGrid.innerHTML = cards.map((card) => `
      <article class="summary-card summary-${card.tone}">
        <div class="summary-icon">${svg(card.icon)}</div>
        <div class="summary-copy">
          <span class="summary-label">${card.label}</span>
          <strong class="summary-value">${card.value}</strong>
          <small class="summary-hint">${card.hint}</small>
        </div>
      </article>
    `).join('');
  }

  function highlightUser(rows) {
    const user = rows.find((row) => row.studentId === st.currentUserId) || leaderboardRowsForMode().find((row) => row.studentId === st.currentUserId) || null;
    if (!user) {
      el.yourRankCard.innerHTML = `<div class="rank-spotlight-empty"><strong>Your Rank</strong><span>No rank found in the current leaderboard view.</span></div>`;
      return null;
    }
    const badgeInfo = leaderboardBadge(user.percentage);
    el.yourRankCard.innerHTML = `
      <div class="rank-spotlight-header">
        <div>
          <span class="rank-kicker">Your Rank</span>
          <h3>#${user.rank} ${escapeHtml(user.studentName)}</h3>
          <p>${st.leaderboard.mode === 'global' ? 'Global leaderboard' : 'Exam leaderboard'} position for the active dataset.</p>
        </div>
        <span class="rank-chip ${badgeInfo.tone}">${badgeInfo.label}</span>
      </div>
      <div class="rank-spotlight-stats">
        <div class="rank-stat"><span>Score</span><strong>${fmtScore(user.score)}</strong></div>
        <div class="rank-stat"><span>Percentage</span><strong>${pct(user.percentage)}</strong></div>
        <div class="rank-stat"><span>Mode</span><strong>${st.leaderboard.mode === 'global' ? 'Global' : 'Exam'}</strong></div>
      </div>
    `;
    return user;
  }

  function renderPodium(rows) {
    const podium = rows.slice(0, 3);
    const medals = ['gold', 'silver', 'bronze'];
    const podiumTitles = ['1st Place', '2nd Place', '3rd Place'];
    el.podiumGrid.innerHTML = podium.length ? podium.map((row, idx) => {
      const current = row.studentId === st.currentUserId;
      const badgeInfo = leaderboardBadge(row.percentage);
      return `
        <article class="card podium-card podium-${medals[idx]} ${current ? 'is-current-user' : ''}" data-detail="leader" data-code="${row.studentId}" style="animation-delay:${idx * 90}ms">
          <div class="podium-top">
            <div class="podium-medal medal-${medals[idx]}">${idx + 1}</div>
            <span class="podium-place">${podiumTitles[idx]}</span>
          </div>
          <div class="podium-avatar">${initials(row.studentName)}</div>
          <h3>${escapeHtml(row.studentName)}</h3>
          <p>${fmtScore(row.score)} score points</p>
          <div class="podium-meta">
            <strong>${pct(row.percentage)}</strong>
            <span class="performance-badge ${badgeInfo.tone}">${badgeInfo.label}</span>
          </div>
        </article>
      `;
    }).join('') : `<article class="card empty-card leaderboard-empty"><h3>No podium data</h3><p>Search or refresh to surface ranking data.</p></article>`;
  }

  function renderTable(rows) {
    el.leaderboardBody.innerHTML = rows.length ? rows.map((row, index) => {
      const current = row.studentId === st.currentUserId;
      const badgeInfo = leaderboardBadge(row.percentage);
      return `
        <tr class="clickable-row leaderboard-row ${current ? 'is-current-user' : ''}" data-detail="leader" data-code="${row.studentId}">
          <td><strong>#${index + 1}</strong></td>
          <td>
            <div class="leaderboard-student">
              <span class="leaderboard-avatar">${initials(row.studentName)}</span>
              <div>
                <strong>${escapeHtml(row.studentName)}</strong>
                ${current ? '<span class="leaderboard-me-tag">You</span>' : ''}
              </div>
            </div>
          </td>
          <td>${fmtScore(row.score)}</td>
          <td>${pct(row.percentage)}</td>
          <td>
            <div class="leaderboard-performance">
              <div class="leaderboard-progress"><span style="width:${clamp(row.percentage, 8, 100)}%"></span></div>
              <div class="leaderboard-performance-row">
                <span class="performance-badge ${badgeInfo.tone}">${badgeInfo.label}</span>
                <strong>${pct(row.percentage)}</strong>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="5" class="empty-state"><strong>No students found.</strong><span>Try clearing the search or refreshing the leaderboard.</span></td></tr>`;
  }

  function refreshData() {
    const mode = st.leaderboard.mode;
    st.data.leaderboard[mode] = normalizeLeaderboardRows(st.data.leaderboard[mode] || []);
    renderLeaderboard();
  }

  function renderLeaderboard() {
    const baseRows = leaderboardRowsForMode();
    const searched = applySearch(baseRows, el.leaderboardSearch?.value ?? st.leaderboard.q);
    const sorted = applySort(searched, el.leaderboardSort?.value || st.leaderboard.sort);
    st.leaderboard.q = el.leaderboardSearch?.value || '';
    st.leaderboard.sort = el.leaderboardSort?.value || 'rank';
    $$('#leaderboardModeToggle .segmented-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.leaderboardMode === st.leaderboard.mode));
    renderSummary(sorted);
    highlightUser(sorted);
    renderPodium(sorted);
    renderTable(sorted);
  }
  function renderAnalyticsCharts() {
    const rows = getAnalyticsRows();
    const trendFilter = st.analytics.trendFilter || 'this-month';
    const passFilter = st.analytics.passFilter || 'all-exams';
    const mixFilter = st.analytics.mixFilter || 'all-exams';
    if (el.analyticsTrendFilter && el.analyticsTrendFilter.value !== trendFilter) el.analyticsTrendFilter.value = trendFilter;
    if (el.analyticsPassFilter && el.analyticsPassFilter.value !== passFilter) el.analyticsPassFilter.value = passFilter;
    if (el.analyticsMixFilter && el.analyticsMixFilter.value !== mixFilter) el.analyticsMixFilter.value = mixFilter;
    const trendSeries = analyticsTrendSeries(rows, trendFilter);
    const passSeries = analyticsPassSeries(rows, passFilter);
    const mixSeries = analyticsMixSeries(rows, mixFilter);
    const mixLegend = analyticsMixLegendItems(mixSeries);
    const latestAttempt = trendSeries.filtered.length ? trendSeries.filtered.slice().sort((a, b) => new Date(b.submittedAt || b.evaluatedAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.evaluatedAt || a.updatedAt || a.createdAt || 0).getTime())[0] : null;
    const passTotal = Math.max(passSeries.filtered.length, 1);
    const passRate = clamp((passSeries.values[0] * 100) / passTotal, 0, 100);
    const mixTotal = Math.max(mixSeries.filtered.length, 1);
    const highPct = clamp((mixSeries.buckets.high * 100) / mixTotal, 0, 100);
    drawLine($('performanceTrendChart'), st.data.dash.trend.length ? st.data.dash.trend : trendSeries.values);
    drawLine($('analyticsLineChart'), trendSeries.values, trendSeries.labels);
    drawBars($('analyticsBarChart'), passSeries.values, passSeries.labels);
    drawDonut($('analyticsDonutChart'), mixSeries.parts);
    const mixLegendEl = $('analyticsMixLegend');
    const attemptFoot = $('analyticsAttemptFoot');
    const passFoot = $('analyticsPassFoot');
    const mixFoot = $('analyticsMixFoot');
    const peakIndex = trendSeries.values.length ? trendSeries.values.reduce((best, value, index, arr) => (value > arr[best] ? index : best), 0) : -1;
    const peakKey = trendSeries.keys?.[peakIndex];
    const peakDate = peakKey ? formatDate(`${peakKey}T00:00:00`) : 'May 15, 2026';
    if (attemptFoot) attemptFoot.querySelector('p').innerHTML = `You attempted the most exams on <strong>${peakDate}</strong>`;
    if (passFoot) passFoot.querySelector('p').innerHTML = `<strong>Pass Rate</strong> <span>${pct(passRate)} of students passed</span>`;
    if (mixFoot) mixFoot.querySelector('p').innerHTML = `<strong>${pct(highPct)}</strong> <span>of students scored between 80 - 100</span>`;
    if (mixLegendEl) {
      mixLegendEl.innerHTML = mixLegend.map((item) => `
        <div class="chart-legend-item">
          <span class="chart-legend-copy">
            <span class="chart-legend-dot" style="background:${item.color}"></span>
            <strong>${item.label}</strong>
          </span>
          <span>${item.percent}% (${item.count})</span>
        </div>
      `).join('');
    }
    const updatedEl = $('analyticsLastUpdated');
    if (updatedEl) {
      const latestSource = rows.slice().sort((a, b) => new Date(b.submittedAt || b.evaluatedAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.evaluatedAt || a.updatedAt || a.createdAt || 0).getTime())[0];
      updatedEl.textContent = latestSource ? formatFullDateTime(latestSource.submittedAt || latestSource.evaluatedAt || latestSource.updatedAt || latestSource.createdAt) : 'May 29, 2026 03:22 PM';
    }
    if (el.chartPlaceholder) el.chartPlaceholder.classList.add('hidden');
  }
  function renderAllTables() { renderDashboardTable(); renderResultsSummary(); renderResultsTable(); renderLeaderboard(); renderCertificateSummary(); renderCertificates(); renderExamCatalog(); renderMyExams(); }
  function setLoadingState() {
    const examSkeleton = () => `
      <article class="exam-loading-card skeleton">
        <div class="loading-top">
          <div class="loading-title">
            <div class="line title skeleton"></div>
            <div class="line sub skeleton"></div>
          </div>
          <div class="line code skeleton"></div>
        </div>
        <div class="loading-grid">
          <div class="loading-box skeleton"></div>
          <div class="loading-box skeleton"></div>
          <div class="loading-box skeleton"></div>
          <div class="loading-box skeleton"></div>
        </div>
        <div class="loading-stack">
          <div class="line sub skeleton"></div>
          <div class="line sub skeleton"></div>
        </div>
        <div class="loading-track skeleton"></div>
        <div class="loading-track skeleton" style="width: 72%;"></div>
        <div class="loading-actions">
          <div class="loading-btn skeleton"></div>
        </div>
      </article>`;

    el.dashStatsGrid.innerHTML = '<div class="card stat-skel skeleton"></div>'.repeat(4);
    el.recentAttemptsBody.innerHTML = '<tr><td colspan="5"><div class="card-skeleton"><div class="line large skeleton"></div><div class="line medium skeleton"></div><div class="line short skeleton"></div></div></td></tr>';
    el.unregisteredGrid.innerHTML = examSkeleton().repeat(3);
    el.upcomingGrid.innerHTML = examSkeleton().repeat(2);
    el.closedGrid.innerHTML = examSkeleton();
    el.registeredGrid.innerHTML = examSkeleton().repeat(3);
    el.resumeMyGrid.innerHTML = examSkeleton();
    el.completedGrid.innerHTML = examSkeleton();
    el.reexamGrid.innerHTML = examSkeleton();
    el.resultsSummaryGrid.innerHTML = '<article class="summary-card skeleton"></article>'.repeat(4);
    el.resultsBody.innerHTML = '<tr><td colspan="10"><div class="card-skeleton"><div class="line large skeleton"></div><div class="line medium skeleton"></div></div></td></tr>';
    el.certificatesSummaryGrid.innerHTML = '<article class="summary-card skeleton"></article>'.repeat(4);
    el.certificatesGrid.innerHTML = '<article class="card loading-panel skeleton"></article>'.repeat(3);
    el.leaderboardSummaryGrid.innerHTML = '<article class="summary-card skeleton"></article>'.repeat(3);
    el.yourRankCard.innerHTML = '<div class="rank-spotlight-skeleton skeleton"></div>';
    el.podiumGrid.innerHTML = '<article class="card loading-panel skeleton podium-skeleton"></article>'.repeat(3);
    el.leaderboardBody.innerHTML = '<tr><td colspan="5"><div class="card-skeleton"><div class="line large skeleton"></div></div></td></tr>';
    el.analyticsCards.innerHTML = '<div class="card stat-skel skeleton"></div>'.repeat(4);
  }
  function drawLine(canvas, data, labels = []) {
    if (!canvas) return;
    const palette = chartPalette();
    const ctx = canvas.getContext('2d');
    const dpr = devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    const w = Math.max(r.width, 280);
    const h = Math.max(r.height, 220);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const pad = { top: 24, right: 20, bottom: 42, left: 30 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const safeData = (data && data.length ? data : [0]).map((value) => Number(value || 0));
    const max = Math.max(...safeData, 1);
    const min = Math.min(...safeData, 0);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = pad.top + (plotH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }
    const points = safeData.map((v, i) => {
      const x = pad.left + (i * plotW) / Math.max(safeData.length - 1, 1);
      const y = pad.top + plotH * (1 - ((v - min) / ((max - min) || 1)));
      return { x, y };
    });
    if (points.length) {
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 3;
      ctx.stroke();
      const fill = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
      fill.addColorStop(0, palette.lineFillStart);
      fill.addColorStop(1, palette.lineFillEnd);
      ctx.lineTo(points[points.length - 1].x, h - pad.bottom);
      ctx.lineTo(points[0].x, h - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.fillStyle = palette.line;
      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (labels.length) {
      ctx.fillStyle = palette.text;
      ctx.font = '500 10px Inter, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      labels.forEach((label, index) => {
        if (!label) return;
        const x = pad.left + (index * plotW) / Math.max(labels.length - 1, 1);
        ctx.fillText(label, x, h - pad.bottom + 10);
      });
    }
  }
  function drawBars(canvas, data, labels = []) {
    if (!canvas) return;
    const palette = chartPalette();
    const ctx = canvas.getContext('2d');
    const dpr = devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    const w = Math.max(r.width, 280);
    const h = Math.max(r.height, 220);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const pad = { top: 20, right: 18, bottom: 48, left: 24 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const safeData = (data && data.length ? data : [0]).map((value) => Number(value || 0));
    const gap = 20;
    const bw = (plotW - gap * (safeData.length - 1)) / Math.max(safeData.length, 1);
    const max = Math.max(...safeData, 1);
    safeData.forEach((value, index) => {
      const barH = plotH * (value / max);
      const x = pad.left + index * (bw + gap);
      const y = pad.top + (plotH - barH);
      const gradient = ctx.createLinearGradient(0, y, 0, pad.top + plotH);
      gradient.addColorStop(0, palette.barTop);
      gradient.addColorStop(1, palette.barBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = palette.text;
      ctx.font = '700 11px Inter, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(value), x + bw / 2, y - 8);
      if (labels[index]) {
        ctx.font = '500 10px Inter, Segoe UI, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(labels[index], x + bw / 2, h - pad.bottom + 10);
      }
    });
  }
  function drawDonut(canvas, parts) { if (!canvas) return; const palette = chartPalette(); const ctx = canvas.getContext('2d'); const dpr = devicePixelRatio || 1; const r = canvas.getBoundingClientRect(); const w = Math.max(r.width, 280), h = Math.max(r.height, 220); canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h); const total = Math.max(parts.reduce((s, p) => s + p.value, 0), 1); let a = -Math.PI / 2; const cx = w / 2, cy = h / 2 + 6, rr = Math.min(w, h) / 4; parts.forEach((p) => { const ang = (p.value / total) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx, cy, rr, a, a + ang); ctx.lineWidth = 22; ctx.strokeStyle = p.color; ctx.stroke(); a += ang; }); ctx.fillStyle = palette.text; ctx.font = '700 16px Inter, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Score Mix', cx, cy); ctx.font = '500 12px Inter, Segoe UI, sans-serif'; ctx.fillText('Distribution', cx, cy + 18); }
  function refresh() {
    renderNotifications();
    renderSchedule();
    renderProctoringStatus();
    renderHelpSupport();
    if (st.sec === 'dashboard') renderDashboardTable();
    if (st.sec === 'exams') renderExamCatalog();
    if (st.sec === 'my-exams') renderMyExams();
    if (st.sec === 'results') { renderResultsSummary(); renderResultsTable(); }
    if (st.sec === 'certificates') { renderCertificateSummary(); renderCertificates(); }
    if (st.sec === 'leaderboard') renderLeaderboard();
    if (st.sec === 'analytics') {
      renderAnalyticsCards();
      renderAnalyticsCharts();
    }
  }
  function notificationTone(type) {
    return ({ exam: 'warning', result: 'success', certificate: 'neutral' }[type] || 'neutral');
  }
  function formatRelativeTime(value) {
    const d = new Date(value);
    const diff = Date.now() - d.getTime();
    if (Number.isNaN(d.getTime())) return '-';
    const mins = Math.max(Math.floor(diff / 60000), 0);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return formatDate(value);
  }
  function markNotificationRead(id) {
    const item = (st.data.notifications || []).find((n) => n.id === id);
    if (!item) return;
    item.read = true;
    save(K.nn, st.data.notifications);
    renderNotifications();
  }
  function renderNotifications() {
    const filter = el.notificationTypeFilter?.value || 'all';
    const list = (st.data.notifications || []).slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const visible = filter === 'all' ? list : list.filter((item) => item.type === filter);
    const unreadCount = list.filter((item) => !item.read).length;
    const topItems = list.slice(0, 3);
    const renderItem = (item, compact = false) => `
      <button class="notification-card ${item.read ? 'read' : 'unread'} ${notificationTone(item.type)}" type="button" data-notification-id="${item.id}">
        <span class="notification-dot ${item.type}"></span>
        <span class="notification-content">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.message)}</span>
          <small>${formatRelativeTime(item.timestamp)}</small>
        </span>
        ${compact ? svg('chevron') : '<span class="notification-pill">Open</span>'}
      </button>`;
    el.notifCount.textContent = String(unreadCount);
    if (el.notifNavCount) el.notifNavCount.textContent = String(unreadCount);
    if (el.notifyDropCount) el.notifyDropCount.textContent = String(unreadCount);
    if (el.unreadNotificationCount) el.unreadNotificationCount.textContent = String(unreadCount);
    if (el.notifyList) {
      el.notifyList.innerHTML = topItems.length ? topItems.map((item) => renderItem(item, true)).join('') : '<div class="empty-state-lite"><strong>No notifications</strong><p>You are fully caught up.</p></div>';
      $$('.notification-card', el.notifyList).forEach((btn) => btn.addEventListener('click', () => {
        markNotificationRead(btn.dataset.notificationId);
        toast('Notification opened', btn.querySelector('strong')?.textContent || 'Notification', 'info');
        el.notifyDrop.classList.remove('open');
      }));
    }
    if (el.notificationStream) {
      el.notificationStream.innerHTML = visible.length ? visible.map((item) => renderItem(item, false)).join('') : '<div class="empty-state-lite"><strong>No notifications</strong><p>Try a different filter or wait for new updates.</p></div>';
      $$('.notification-card', el.notificationStream).forEach((btn) => btn.addEventListener('click', () => {
        markNotificationRead(btn.dataset.notificationId);
        toast('Notification marked read', btn.querySelector('strong')?.textContent || 'Notification', 'success');
      }));
    }
  }
  function renderSchedule() {
    if (!el.scheduleList || !el.scheduleTimeline) return;
    const filter = el.scheduleDateFilter?.value || 'all';
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const items = st.data.exams.map((exam) => ({ exam, state: examRuntimeState(exam) }))
      .filter(({ state }) => state.upcoming || state.live)
      .filter(({ state }) => {
        const start = state.startAt;
        if (filter === 'today') return start.toDateString() === now.toDateString();
        if (filter === 'week') return state.live || (start >= now && start <= soon);
        return true;
      })
      .sort((a, b) => a.state.startAt - b.state.startAt);
    const todayCount = items.filter(({ state }) => state.startAt.toDateString() === now.toDateString()).length;
    if (el.scheduleTodayLabel) el.scheduleTodayLabel.textContent = `${todayCount} exam${todayCount === 1 ? '' : 's'} today`;
    const scheduleRow = ({ exam, state }) => {
      const live = state.live;
      return `
        <article class="schedule-card ${live ? 'live' : 'upcoming'} ${state.startAt.toDateString() === now.toDateString() ? 'today' : ''}">
          <div class="schedule-card-top">
            <div>
              <strong>${escapeHtml(exam.title)}</strong>
              <span>${escapeHtml(exam.examCode)} - ${escapeHtml(exam.subject)}</span>
            </div>
            <span class="tag ${live ? 'success' : 'neutral'}">${live ? 'LIVE' : 'UPCOMING'}</span>
          </div>
          <div class="schedule-meta">
            <span>${formatFullDateTime(state.startAt)}</span>
            <span>${formatFullDateTime(state.endAt)}</span>
            ${exam.location ? `<span>${escapeHtml(exam.location)}</span>` : '<span>Virtual room</span>'}
          </div>
          <div class="schedule-foot">
            <span class="schedule-countdown">${live ? (() => { const remaining = calculateTimeRemaining(exam); return remaining.minutes > 0 ? `Ends in ${remaining.minutes} min` : `Ends in ${remaining.seconds}s`; })() : `Starts in ${state.minutesUntil} min`}</span>
          </div>
        </article>`;
    };
    const timelineRow = ({ exam, state }, index) => `
      <div class="timeline-item ${state.live ? 'live' : ''}">
        <span class="timeline-marker"></span>
        <div class="timeline-copy">
          <strong>${formatExamTime(exam)} - ${escapeHtml(exam.title)}</strong>
          <p>${escapeHtml(exam.examCode)} - ${state.live ? 'Currently live' : `Starts in ${state.minutesUntil} min`}</p>
        </div>
        <span class="timeline-index">#${String(index + 1).padStart(2, '0')}</span>
      </div>`;
    el.scheduleList.innerHTML = items.length ? items.map(scheduleRow).join('') : '<div class="empty-state-lite"><strong>No scheduled exams</strong><p>Upcoming windows will appear here automatically.</p></div>';
    el.scheduleTimeline.innerHTML = items.length ? items.map(timelineRow).join('') : '<div class="empty-state-lite"><strong>No timeline data</strong><p>There are no live or upcoming exam windows right now.</p></div>';
  }
  function updateStatusIndicators() {
    const status = st.data.proctoring || {};
    if (!el.proctoringStatusGrid || !el.proctoringSummaryPanel) return;
    const items = [
      ['Camera', status.cameraEnabled, 'camera'],
      ['Microphone', status.micEnabled, 'ai'],
      ['Fullscreen', status.fullscreenActive, 'lock'],
      ['Face Detection', status.faceDetected, 'shield']
    ];
    el.proctoringStatusGrid.innerHTML = items.map(([label, on, icon]) => `
      <div class="status-tile ${on ? 'on' : 'off'}">
        <div class="status-tile-icon">${svg(icon)}</div>
        <div class="status-tile-copy">
          <strong>${label}</strong>
          <span>${on ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    `).join('');
    el.proctoringSummaryPanel.innerHTML = `
      <div class="proctoring-summary-grid">
        <div class="summary-card-mini"><span>AI Monitoring</span><strong>${status.aiMonitoringActive ? 'Enabled' : 'Disabled'}</strong></div>
        <div class="summary-card-mini"><span>Violations</span><strong>${status.violationsCount || 0}</strong></div>
        <div class="summary-card-mini"><span>Face Match</span><strong>${status.faceDetected ? 'Verified' : 'Pending'}</strong></div>
        <div class="summary-card-mini"><span>Session</span><strong>${status.cameraEnabled && status.micEnabled ? 'Secure' : 'Needs Review'}</strong></div>
      </div>
      <div class="proctoring-live-banner ${status.aiMonitoringActive ? 'active' : 'off'}">
        <span class="pulse-dot"></span>
        <strong>${status.aiMonitoringActive ? 'Proctoring Enabled' : 'Proctoring Offline'}</strong>
        <span>Identity and environment controls are monitored continuously.</span>
      </div>
    `;
  }
  function renderProctoringStatus() {
    updateStatusIndicators();
  }
  function toggleAccordion(btn) {
    const item = btn.closest('.faq-item');
    if (!item) return;
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  }
  function renderHelpSupport() {
    if (el.faqAccordion) {
      el.faqAccordion.innerHTML = st.data.supportFaq.map((item, idx) => `
          <article class="faq-item ${idx === 0 ? 'open' : ''}">
          <button class="faq-question" type="button" aria-expanded="${idx === 0 ? 'true' : 'false'}">
            <span>${escapeHtml(item.question)}</span>
            ${svg('chevron')}
          </button>
          <div class="faq-answer">${escapeHtml(item.answer)}</div>
        </article>
      `).join('');
      $$('.faq-question', el.faqAccordion).forEach((btn) => btn.addEventListener('click', () => toggleAccordion(btn)));
    }
    const activeTab = $$('.support-tabs .tab-btn', document).find((btn) => btn.classList.contains('active'))?.dataset.supportTab || 'faq';
    $$('.support-tabs .tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.supportTab === activeTab));
    $$('.support-panel', document).forEach((panel) => panel.classList.toggle('active', panel.dataset.supportPanel === activeTab));
  }
  function setSupportTab(tab) {
    $$('.support-tabs .tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.supportTab === tab));
    $$('.support-panel', document).forEach((panel) => panel.classList.toggle('active', panel.dataset.supportPanel === tab));
  }
  function certificatePreviewMarkup(c) {
    const score = fmtScore(c.score);
    const issued = formatDate(c.issuedAt);
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
  function validateSupportForm(form) {
    const data = new FormData(form);
    const required = Array.from(form.querySelectorAll('[required]'));
    let valid = true;
    required.forEach((field) => {
      const value = String(data.get(field.name) || '').trim();
      const error = form.querySelector(`[data-error-for="${field.name}"]`);
      if (!value) {
        valid = false;
        if (error) {
          error.textContent = 'This field is required.';
          error.style.display = 'block';
        }
      } else if (error) {
        error.textContent = '';
        error.style.display = 'none';
      }
    });
    return valid;
  }
  function submitSupportForm(form, label) {
    if (!validateSupportForm(form)) {
      toast('Validation required', 'Please complete all required fields before submitting.', 'warn');
      return;
    }
    form.reset();
    toast(`${label} submitted`, 'Your request has been sent to support successfully.', 'success');
  }
  function handleSidebarNavigation() {
    $$('.nav-link[data-section]').forEach((btn) => btn.addEventListener('click', () => setSection(btn.dataset.section)));
    $$('[data-section-jump]').forEach((btn) => btn.addEventListener('click', () => setSection(btn.dataset.sectionJump)));
  }
  function openDetail(type, code) {
    if (type === 'attempt') {
      const r = st.data.dash.attempts.find((x) => x.examCode === code);
      if (!r) return;
      modal({ kicker:'Recent Attempt', title:r.examCode, body:`<div class="detail-grid"><div><span>Obtained Marks</span><strong>${r.obtainedMarks}</strong></div><div><span>Total Marks</span><strong>${r.totalMarks}</strong></div><div><span>Percentage</span><strong>${pct(r.percentage)}</strong></div><div><span>Badge</span><strong>${r.badge}</strong></div><div><span>Duration</span><strong>${r.duration}</strong></div><div><span>Status</span><strong>${r.status}</strong></div></div>`, foot:'<button class="btn ghost" data-close-modal type="button">Close</button>' });
      return;
    }
    if (type === 'result') {
      const r = st.data.results.find((x) => String(x.id ?? '') === String(code))
        || st.data.results.find((x) => String(x.attemptId ?? '') === String(code))
        || bestResultForExam(code);
      if (!r) return;
      const totalQuestions = toNumber(r.totalQuestions);
      const correctAnswers = toNumber(r.correctAnswers);
      const wrongAnswers = toNumber(r.wrongAnswers);
      const unansweredQuestions = toNumber(r.unansweredQuestions, Math.max(totalQuestions - correctAnswers - wrongAnswers, 0));
      const easyCorrect = toNumber(r.easyCorrect);
      const mediumCorrect = toNumber(r.mediumCorrect);
      const hardCorrect = toNumber(r.hardCorrect ?? r.difficultCorrect);
      const easyWrong = toNumber(r.easyWrong);
      const mediumWrong = toNumber(r.mediumWrong);
      const hardWrong = toNumber(r.hardWrong ?? r.difficultWrong);
      const totalAnswered = correctAnswers + wrongAnswers + unansweredQuestions;
      modal({
        kicker: 'Result Details',
        title: `${r.examCode} - ${r.resultStatus}`,
        body: `
          <div class="result-modal-hero">
            <div>
              <span class="result-modal-code">${r.examCode}</span>
              <h4>${r.resultStatus}</h4>
              <p>Score ${r.score}/${r.totalQuestions} | Percentage ${pct(r.percentage)} | Submitted ${formatDate(r.submittedAt)}</p>
            </div>
            <span class="result-badge ${r.passed ? 'pass' : 'fail'}">${r.passed ? 'PASS' : 'FAIL'}</span>
          </div>
          <div class="result-modal-grid">
            <div class="result-modal-panel">
              <h5>Answer Breakdown</h5>
              <div class="detail-grid result-metric-grid">
                <div class="detail-item metric-card"><span>Total Questions</span><strong>${totalQuestions}</strong></div>
                <div class="detail-item metric-card"><span>Correct Answers</span><strong>${correctAnswers}</strong></div>
                <div class="detail-item metric-card"><span>Wrong Answers</span><strong>${wrongAnswers}</strong></div>
                <div class="detail-item metric-card"><span>Unanswered</span><strong>${unansweredQuestions}</strong></div>
              </div>
            </div>
            <div class="result-modal-panel">
              <h5>Difficulty Split</h5>
              <div class="detail-grid result-metric-grid result-metric-grid-3">
                <div class="detail-item metric-card"><span>Easy Correct</span><strong>${easyCorrect}</strong></div>
                <div class="detail-item metric-card"><span>Medium Correct</span><strong>${mediumCorrect}</strong></div>
                <div class="detail-item metric-card"><span>Hard Correct</span><strong>${hardCorrect}</strong></div>
                <div class="detail-item metric-card"><span>Easy Wrong</span><strong>${easyWrong}</strong></div>
                <div class="detail-item metric-card"><span>Medium Wrong</span><strong>${mediumWrong}</strong></div>
                <div class="detail-item metric-card"><span>Hard Wrong</span><strong>${hardWrong}</strong></div>
              </div>
            </div>
          </div>
          <div class="result-modal-note">
            <strong>Submission Summary</strong>
            <p>${totalAnswered}/${totalQuestions} questions were answered, with ${correctAnswers} correct and ${wrongAnswers} incorrect responses.</p>
          </div>
        `,
        foot: '<button class="btn ghost" data-close-modal type="button">Close</button>'
      });
      return;
    }
    if (type === 'leader') {
      const rows = leaderboardRowsForMode();
      const r = rows.find((x) => x.studentId === code) || st.data.leaderboard.global.find((x) => x.studentId === code) || st.data.leaderboard.exam.find((x) => x.studentId === code);
      if (!r) return;
      const info = leaderboardBadge(r.percentage);
      modal({
        kicker:'Leaderboard Student',
        title:r.studentName,
        body: `
          <div class="leaderboard-modal-card">
            <div class="leaderboard-modal-badge">${info.label}</div>
            <div class="leaderboard-modal-grid">
              <div class="leaderboard-stat">
                <span>Rank</span>
                <strong>#${r.rank}</strong>
              </div>
              <div class="leaderboard-stat">
                <span>Score</span>
                <strong>${fmtScore(r.score)}</strong>
              </div>
              <div class="leaderboard-stat">
                <span>Percentage</span>
                <strong>${pct(r.percentage)}</strong>
              </div>
              <div class="leaderboard-stat">
                <span>Mode</span>
                <strong>${st.leaderboard.mode === 'global' ? 'Global' : 'Exam'}</strong>
              </div>
            </div>
            <div class="leaderboard-modal-footer">
              <span>Performance</span>
              <strong class="performance-badge ${info.tone}">${info.label}</strong>
            </div>
          </div>`,
        foot:'<button class="btn ghost" data-close-modal type="button">Close</button>'
      });
      return;
    }
    if (type === 'certificate') {
      const c = st.data.certs.find((x) => x.certificateId === code);
      if (!c) return;
      modal({
        kicker: 'Certificate Preview',
        title: `${c.certificateId} - ${c.examTitle}`,
        body: `
          <div class="certificate-preview-shell">
            <div class="certificate-preview-frame">
              ${certificatePreviewMarkup(c)}
            </div>
            <div class="result-modal-grid certificate-preview-grid">
              <div class="result-modal-panel">
                <h5>Student Info</h5>
                <div class="detail-grid certificate-preview-detail-grid">
                  <div class="detail-item metric-card"><span>Student Name</span><strong>${c.studentName}</strong></div>
                  <div class="detail-item metric-card"><span>College</span><strong>${c.collegeName}</strong></div>
                  <div class="detail-item metric-card"><span>Department</span><strong>${c.department}</strong></div>
                  <div class="detail-item metric-card"><span>Roll Number</span><strong>${c.rollNumber}</strong></div>
                </div>
              </div>
              <div class="result-modal-panel">
                <h5>Certificate Info</h5>
                <div class="detail-grid certificate-preview-detail-grid">
                  <div class="detail-item metric-card"><span>Score</span><strong>${fmtScore(c.score)}%</strong></div>
                  <div class="detail-item metric-card"><span>Grade</span><strong>${c.grade}</strong></div>
                  <div class="detail-item metric-card"><span>Issued Date</span><strong>${formatDate(c.issuedAt)}</strong></div>
                  <div class="detail-item metric-card"><span>Status</span><strong>${c.revoked ? 'REVOKED' : 'VERIFIED'}</strong></div>
                </div>
              </div>
            </div>
            <div class="result-modal-note">
              <strong>Verification Status</strong>
              <p>${c.revoked ? 'This certificate has been revoked and cannot be downloaded.' : 'This certificate is currently verified and available for download.'}</p>
            </div>
          </div>
        `,
        foot: `
          <button class="btn ghost" data-close-modal type="button">Close</button>
          <button class="btn primary" data-action="certificate-download" data-code="${c.certificateId}" type="button">Download</button>`
      });
    }
  }
  async function action(type, code, view = '') {
    if (type === 'exam-instructions') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      const instructions = (e.instructions || []).map((item) => `<li>${item}</li>`).join('');
      const resumeInfo = e.status === 'resume' ? `
        <div class="instruction-note">
          <strong>Resume session</strong>
          <p>Your in-progress attempt is saved and can continue from the last checkpoint.</p>
        </div>` : '';
      modal({
        kicker: 'Exam Instructions',
        title: `${e.examCode} - ${e.title}`,
        body: `
          <div class="instruction-hero">
            <div>
              <span class="code-badge">${e.examCode}</span>
              <h4>${e.subject}</h4>
              <p>Duration ${e.durationMinutes} min | Total Marks ${e.totalMarks} | Passing Marks ${e.passingMarks}</p>
            </div>
            <span class="status-badge ${statusClass[e.status] || 'closed'}">${statusLabel[e.status] || 'CLOSED'}</span>
          </div>
          <div class="instruction-layout">
            <div class="instruction-panel">
              <h5>Rules</h5>
              <ul class="instruction-list">${instructions}</ul>
            </div>
            <div class="instruction-panel">
              <h5>Exam Snapshot</h5>
              <div class="detail-grid">
                <div class="detail-item"><span>Attempts</span><strong>${e.maxAttempts}</strong></div>
                <div class="detail-item"><span>Negative Marks</span><strong>${e.negativeMarks}</strong></div>
                <div class="detail-item"><span>Easy</span><strong>${e.easyQuestionCount}</strong></div>
                <div class="detail-item"><span>Medium</span><strong>${e.mediumQuestionCount}</strong></div>
                <div class="detail-item"><span>Hard</span><strong>${e.difficultQuestionCount}</strong></div>
                <div class="detail-item"><span>Window</span><strong>${e.startTime}</strong></div>
              </div>
            </div>
          </div>
          ${resumeInfo}
        `,
        foot: '<button class="btn ghost" data-close-modal type="button">Close</button>'
      });
      return;
    }
    if (type === 'exam-detail') {
      const e = st.data.exams.find(x => x.examCode === code);
      if (!e) return;
      openExamDetailModal(e);
      return;
    }
    if (type === 'exam-access') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      openExamAccess(e);
      return;
    }
    if (type === 'exam-start') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      openExamVerification(e, 'start');
      toast('Verification started', 'Complete the secure pre-exam checks to continue.', 'info');
      return;
    }
    if (type === 'exam-reexam-ready') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      openReexamReadyModal(e);
      return;
    }
    if (type === 'exam-register') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      openExamVerification(e, 'register');
      toast('Registration verification started', 'Complete the secure checks to unlock this exam.', 'info');
      return;
    }
    if (type === 'exam-register-phase2') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      openExamVerification(e, 'register-phase2');
      toast('Phase 2 registration started', 'Additional verification required. Complete the secure checks.', 'warning');
      return;
    }
    if (type === 'exam-enter') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      if (!st.examAttemptIds[code]) {
        startVerifiedExam(code).catch((error) => {
          console.error('Failed to prepare exam entry:', error);
          toast('Unable to enter exam', error?.message || 'Please try again.', 'warn');
        });
        return;
      }
      openExamAccess(e);
      return;
    }
    if (type === 'exam-enter-confirm') {
      closeModal();
      navigateToExamPage(code).catch((error) => {
        console.error('Failed to navigate to exam page:', error);
        toast('Navigation failed', error?.message || 'Please try again.', 'warn');
      });
      return;
    }
    if (type === 'exam-reexam-enter') {
      closeModal();
      startVerifiedExam(code);
      return;
    }
    if (type === 'result-view') {
      openDetail('result', code);
      return;
    }
    if (type === 'certificate-preview') {
      openDetail('certificate', code);
      return;
    }
    if (type === 'certificate-download') {
      const c = st.data.certs.find(x => x.certificateId === code);
      if (!c) return;
      try {
        const response = await API.request(
          `/api/certificate/download/${encodeURIComponent(code)}`,
          {
            method: 'GET',
            headers: { Accept: 'application/pdf' },
            raw: true
          }
        );
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(text || `Unable to download certificate PDF (${response.status})`);
        }

        const blob = await response.blob();
        if (!blob || !blob.size) {
          throw new Error('Empty certificate PDF received');
        }

        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${c.certificateId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        toast('Download started', `${code} has been downloaded as PDF.`, 'success');
      } catch (error) {
        toast('Download failed', error.message || 'Unable to download certificate PDF.', 'error');
      }
      return;
    }
    if (type === 'certificate-verify') {
      const c = st.data.certs.find((x) => x.certificateId === code);
      if (!c) return;
      if (!c.revoked) {
        toast('Certificate verified', `${code} is already verified.`, 'info');
      } else {
        c.revoked = false;
        c.qrCodeData = `${c.certificateId}|${c.examCode}|${c.grade}|Verified`;
        renderCertificateSummary();
        renderCertificates();
        toast('Certificate verified', `${code} has been restored locally.`, 'success');
      }
      return;
    }
    if (type === 'exam-schedule') {
      toast('Scheduled exam', `${code} is not live yet. Review the instructions and return at the start time.`, 'info');
    }
  }
  function runActionWithFeedback(btn) {
    if (!btn || isBusy(btn) || btn.disabled) return;
    const actionType = btn.dataset.action;
    if (!actionType) return;
    const code = btn.dataset.code || '';
    if (actionType === 'exam-detail' && btn.closest('.exam-card')) {
      Promise.resolve(action(actionType, code, btn.dataset.view || ''))
        .catch((error) => {
          console.error('Action failed:', error);
          toast('Action failed', error?.message || 'Please try again.', 'warn');
        });
      return;
    }
    const delay = actionType === 'certificate-download' ? 650 : actionType === 'exam-start' ? 520 : actionType === 'exam-instructions' ? 420 : 360;
    const text = actionLoadingText(actionType, code, btn);
    setButtonBusy(btn, text);
    setTimeout(() => {
      Promise.resolve(action(actionType, code, btn.dataset.view || ''))
        .catch((error) => {
          console.error('Action failed:', error);
          toast('Action failed', error?.message || 'Please try again.', 'warn');
        })
        .finally(() => {
          restoreButton(btn);
        });
    }, delay);
  }
  function runButtonFeedback(btn, text, fn, delay = 420) {
    if (!btn || isBusy(btn) || btn.disabled) return;
    setButtonBusy(btn, text);
    setTimeout(async () => {
      try {
        await Promise.resolve(fn?.());
      } catch (error) {
        console.error('Button action failed:', error);
        toast('Action failed', error?.message || 'Please try again.', 'warn');
      } finally {
        restoreButton(btn);
      }
    }, delay);
  }
  const PROFILE_FIELD_MAP = {
    fullName: 'fullName',
    email: 'email',
    phone: 'phone',
    collegeName: 'collegeName',
    department: 'department',
    year: 'year',
    rollNumber: 'rollNumber',
    section: 'section'
  };
  function fillProfileForm(formEl, profile = st.profile) {
    if (!formEl) return;
    Object.entries(PROFILE_FIELD_MAP).forEach(([fieldName, profileKey]) => {
      const input = formEl.querySelector(`[name="${fieldName}"]`);
      if (input) input.value = profile[profileKey] || '';
    });
  }
  function syncProfilePhotoPreview() {
    const photoSrc = (st.profile.profilePhoto && st.profile.profilePhoto.trim())
      ? st.profile.profilePhoto
      : avatar(st.profile.fullName);
    const draftSrc = (st.profileEditorPhotoDraft && st.profileEditorPhotoDraft.trim())
      ? st.profileEditorPhotoDraft
      : photoSrc;
    const title = 'Your Profile Photo';
    if (el.profilePhotoPreview) {
      el.profilePhotoPreview.src = photoSrc;
      el.profilePhotoPreview.alt = `${st.profile.fullName || 'Student'} photo`;
    }
    if (el.profileEditorPhotoPreview) {
      el.profileEditorPhotoPreview.src = draftSrc;
      el.profileEditorPhotoPreview.alt = `${st.profile.fullName || 'Student'} photo`;
    }
    if (el.profilePhotoName) el.profilePhotoName.textContent = title;
    if (el.profileEditorPhotoName) el.profileEditorPhotoName.textContent = title;
  }
  function openProfileEditor() {
    st.profileEditorPhotoDraft = st.profile.profilePhoto || '';
    fillProfileForm(el.profileEditorForm);
    syncProfilePhotoPreview();
    el.profileEditorModal?.classList.remove('hidden');
    el.profileEditorModal?.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      el.profileEditorForm?.querySelector('input:not([readonly])')?.focus();
    }, 40);
    toast('Profile editor opened', 'Update your details in the popup form.', 'info');
  }
  function closeProfileEditor() {
    if (!el.profileEditorModal) return;
    st.profileEditorPhotoDraft = '';
    el.profileEditorModal.classList.add('hidden');
    el.profileEditorModal.setAttribute('aria-hidden', 'true');
  }
  async function saveProfile(formEl = el.profileEditorForm || el.profileForm) {
    const sourceForm = formEl || el.profileEditorForm || el.profileForm;
    if (!sourceForm) throw new Error('Profile form is not ready');
    const f = new FormData(sourceForm);
    const payload = {
      fullName: String(f.get('fullName') || '').trim(),
      email: String(f.get('email') || st.profile.email || '').trim(),
      phone: String(f.get('phone') || '').trim(),
      collegeName: String(f.get('collegeName') || '').trim(),
      department: String(f.get('department') || '').trim(),
      year: String(f.get('year') || '').trim(),
      rollNumber: String(f.get('rollNumber') || '').trim(),
      section: String(f.get('section') || '').trim(),
      profilePhoto: st.profileEditorPhotoDraft || st.profile.profilePhoto || ''
    };
    if (!payload.fullName || !payload.collegeName || !payload.department || !payload.rollNumber) {
      throw new Error('Full name, college, department, and ID are required');
    }

    let saved = null;
    try {
      saved = await apiRequest('/student/profile', { method: 'PUT', body: JSON.stringify(payload) });
    } catch (_) {
      saved = await apiRequest('/student/profile', { method: 'POST', body: JSON.stringify(payload) });
    }

    st.profile = {
      ...st.profile,
      fullName: saved?.fullName || payload.fullName,
      email: saved?.email || payload.email,
      phone: saved?.phone || payload.phone,
      collegeName: saved?.collegeName || payload.collegeName,
      department: saved?.department || payload.department,
      year: saved?.year || payload.year,
      rollNumber: saved?.rollNumber || payload.rollNumber,
      section: saved?.section || payload.section,
      profilePhoto: saved?.profilePhoto || payload.profilePhoto || st.profile.profilePhoto || ''
    };
    st.profileEditorPhotoDraft = '';
    applyProfile();
    closeProfileEditor();
    toast('Profile saved', 'Student profile has been synced to the server.', 'success');
  }
  function goLogout() { toast('Logging out', 'Returning to role selection.', 'info'); setTimeout(() => { location.href = 'role-selection.html'; }, 180); }
  function updateClock() {
    const d = new Date();
    el.liveClock.textContent = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }
  function wire() {
    el.toggle.addEventListener('click', toggleSidebar);
    el.logout.addEventListener('click', goLogout);
    el.profileLogout.addEventListener('click', goLogout);
    el.profileMenuBtn.addEventListener('click', () => {
      const open = el.profileMenu.classList.toggle('open');
      el.profileMenuBtn.setAttribute('aria-expanded', String(open));
    });
    el.notifBtn.addEventListener('click', () => {
      el.notifyDrop.classList.remove('open');
      setSection('notifications');
    });
    el.detailModalClose.addEventListener('click', closeModal);
    el.detailModal.addEventListener('click', (e) => { if (e.target === el.detailModal) closeModal(); });
    handleSidebarNavigation();
    if (el.notificationTypeFilter) {
      el.notificationTypeFilter.addEventListener('change', renderNotifications);
    }
    if (el.markAllReadBtn) {
      el.markAllReadBtn.addEventListener('click', () => {
        (st.data.notifications || []).forEach((item) => { item.read = true; });
        save(K.nn, st.data.notifications);
        renderNotifications();
        toast('Notifications updated', 'All notifications were marked as read.', 'success');
      });
    }
    if (el.clearNotificationsBtn) {
      el.clearNotificationsBtn.addEventListener('click', () => {
        st.data.notifications = [];
        save(K.nn, st.data.notifications);
        renderNotifications();
        toast('Notifications cleared', 'The notification stream has been emptied.', 'info');
      });
    }
    if (el.scheduleDateFilter) {
      el.scheduleDateFilter.addEventListener('change', renderSchedule);
    }
    $$('.support-tabs .tab-btn').forEach((btn) => btn.addEventListener('click', () => setSupportTab(btn.dataset.supportTab)));
    if (el.contactSupportForm) {
      el.contactSupportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitSupportForm(e.currentTarget, 'Support request');
      });
    }
    if (el.reportIssueForm) {
      el.reportIssueForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitSupportForm(e.currentTarget, 'Issue report');
      });
    }
    $('refreshDashboard').addEventListener('click', (e) => {
      runButtonFeedback(e.currentTarget, 'Refreshing...', () => {
        renderCards();
        renderAnalyticsCards();
        renderAllTables();
        renderAnalyticsCharts();
        toast('Dashboard refreshed', 'UI data has been re-rendered.', 'info');
      }, 520);
    });
    $('dashboardActionBtn').addEventListener('click', (e) => runButtonFeedback(e.currentTarget, 'Opening analytics...', () => setSection('analytics'), 420));
    $('attemptsResetBtn').addEventListener('click', (e) => {
      runButtonFeedback(e.currentTarget, 'Resetting...', () => {
        st.q = '';
        localStorage.removeItem(K.q);
        el.topSearch.value = '';
        updateTopPlaceholder();
        renderDashboardTable();
        toast('Filters reset', 'Recent attempts cleared from search.', 'info');
      }, 420);
    });
    el.topSearch.addEventListener('input', (e) => { st.q = e.target.value; localStorage.setItem(K.q, st.q); refresh(); });
    el.examFilter.addEventListener('change', renderExamCatalog);
    el.examSearch.addEventListener('input', renderExamCatalog);
    el.refreshExamsBtn.addEventListener('click', () => runButtonFeedback(el.refreshExamsBtn, 'Refreshing exams...', renderExamCatalog, 420));
    el.examTabs.forEach((btn) => btn.addEventListener('click', () => {
      el.examTabs.forEach((tab) => tab.classList.toggle('active', tab === btn));
      renderExamCatalog();
    }));
    el.myExamFilter.addEventListener('change', renderMyExams);
    el.myExamSearch.addEventListener('input', renderMyExams);
    el.myExamTabs.forEach((btn) => btn.addEventListener('click', () => {
      el.myExamTabs.forEach((tab) => tab.classList.toggle('active', tab === btn));
      renderMyExams();
    }));
    $('resultsFilter').addEventListener('change', () => { st.results.page = 1; renderResultsTable(); });
    $('resultsSearch').addEventListener('input', () => { st.results.page = 1; renderResultsTable(); });
    $('resultsFilterBtn')?.addEventListener('click', cycleResultsFilter);
    $('resultsResetBtn').addEventListener('click', (e) => {
      runButtonFeedback(e.currentTarget, 'Resetting...', () => {
        $('resultsFilter').value = 'all';
        $('resultsSearch').value = '';
        st.results.page = 1;
        renderResultsTable();
        toast('Results reset', 'Result filters cleared.', 'info');
      }, 420);
    });
    $('resultsPagination')?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-results-page]');
      if (!btn || btn.classList.contains('disabled')) return;
      const nextPage = Number(btn.dataset.resultsPage || 1);
      if (!Number.isFinite(nextPage) || nextPage === st.results.page) return;
      st.results.page = nextPage;
      renderResultsTable();
    });
    $('certificatesFilter').addEventListener('change', () => { renderCertificateSummary(); renderCertificates(); });
    $('certificatesSearch').addEventListener('input', () => { renderCertificateSummary(); renderCertificates(); });
    $('certificatesResetBtn').addEventListener('click', (e) => {
      runButtonFeedback(e.currentTarget, 'Resetting...', () => {
        $('certificatesFilter').value = 'all';
        $('certificatesSearch').value = '';
        renderCertificateSummary();
        renderCertificates();
        toast('Certificates reset', 'Certificate filters cleared.', 'info');
      }, 420);
    });
    el.leaderboardModeButtons.forEach((btn) => btn.addEventListener('click', () => {
      st.leaderboard.mode = btn.dataset.leaderboardMode || 'global';
      renderLeaderboard();
    }));
    $('leaderboardSearch').addEventListener('input', renderLeaderboard);
    $('leaderboardSort').addEventListener('change', renderLeaderboard);
    $('leaderboardRefresh').addEventListener('click', (e) => {
      runButtonFeedback(e.currentTarget, 'Reshuffling...', () => {
        refreshData();
        toast('Leaderboard refreshed', 'Student positions were reshuffled locally.', 'info');
      }, 520);
    });
    el.analyticsTrendFilter?.addEventListener('change', (e) => {
      st.analytics.trendFilter = e.target.value || 'this-month';
      renderAnalyticsCharts();
    });
    el.analyticsPassFilter?.addEventListener('change', (e) => {
      st.analytics.passFilter = e.target.value || 'all-exams';
      renderAnalyticsCharts();
    });
    el.analyticsMixFilter?.addEventListener('change', (e) => {
      st.analytics.mixFilter = e.target.value || 'all-exams';
      renderAnalyticsCharts();
    });
    el.editProfileBtn?.addEventListener('click', (e) => runButtonFeedback(e.currentTarget, 'Opening editor...', () => openProfileEditor(), 360));
    el.profileEditorClose?.addEventListener('click', closeProfileEditor);
    el.profileEditorCancel?.addEventListener('click', closeProfileEditor);
    el.profileEditorModal?.addEventListener('click', (e) => {
      if (e.target === el.profileEditorModal) closeProfileEditor();
    });
    el.profileEditorSave?.addEventListener('click', (e) => runButtonFeedback(e.currentTarget, 'Saving profile...', () => saveProfile(el.profileEditorForm), 520));
    el.profileEditorForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      runButtonFeedback(el.profileEditorSave, 'Saving profile...', () => saveProfile(el.profileEditorForm), 520);
    });
    el.profileEditorPhotoUploadBtn?.addEventListener('click', () => el.profileEditorPhotoInput?.click());
    el.profileEditorPhotoInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        st.profileEditorPhotoDraft = String(reader.result || '');
        syncProfilePhotoPreview();
        fillProfileForm(el.profileEditorForm);
      };
      reader.readAsDataURL(file);
    });
    el.profileEditorPhotoRemoveBtn?.addEventListener('click', () => {
      st.profileEditorPhotoDraft = '';
      if (el.profileEditorPhotoInput) el.profileEditorPhotoInput.value = '';
      syncProfilePhotoPreview();
    });
    if (el.examVerificationClose) {
      el.examVerificationClose.addEventListener('click', closeExamVerification);
    }
    if (el.examVerificationModal) {
      el.examVerificationModal.addEventListener('click', (e) => {
        if (e.target === el.examVerificationModal) {
          closeExamVerification();
          return;
        }
        const nav = e.target.closest('[data-verification-nav]');
        if (nav) {
          const step = nav.dataset.verificationNav;
          if (step === 'close') {
            closeExamVerification();
            return;
          }
          if (step === 'back') {
            moveVerificationStep(st.examUi.step - 1);
            return;
          }
        if (step === 'next') {
          if (st.examUi.step === 1 && !isStep1Valid()) return toast('Missing fields', 'Complete the student details before continuing.', 'warn');
          if (st.examUi.step === 2 && !isStep2Valid()) return toast('Image required', 'Upload or capture a verification image.', 'warn');
          if (st.examUi.step === 3 && !isStep3Valid()) return toast('Rules not accepted', 'Please confirm the exam rules.', 'warn');
          if (st.examUi.step === 4 && !isStep4Valid()) return toast('Terms not accepted', 'Please agree to the terms and conditions.', 'warn');
          if (st.examUi.step === 5 && !isStep5Valid()) return toast('Declaration required', 'Please confirm the declaration before continuing.', 'warn');
          if (st.examUi.step < 5) {
            moveVerificationStep(st.examUi.step + 1);
            return;
          }
          if ((st.examUi.mode || 'start') !== 'start' && st.examUi.step === 5) {
            moveVerificationStep(6);
            return;
          }
          if ((st.examUi.mode || 'start') === 'register' && st.examUi.step === 6) {
            moveVerificationStep(7);
            return;
          }
          if (st.examUi.mode === 'register-phase2' && st.examUi.step === 6) {
            moveVerificationStep(7);
            return;
          }
          if (st.examUi.mode === 'register-phase2' && st.examUi.step === 7 && !isStep7Valid()) {
            return toast('Verification code required', 'Enter a valid 6-digit phase 2 verification code.', 'warn');
          }
          if (st.examUi.mode === 'register-phase2' && st.examUi.step === 7) {
            moveVerificationStep(8);
            return;
          }
          if (st.examUi.mode === 'register' && st.examUi.step === 7 && !isStep6Valid()) {
            return toast('Confirmation required', 'Please confirm the reviewed registration details.', 'warn');
          }
          if (st.examUi.mode === 'register-phase2' && st.examUi.step === 8 && !isStep8Valid()) {
            return toast('Final confirmation required', 'Please confirm the phase 2 registration before submitting.', 'warn');
          }
          if (!canStartExam()) {
            toast('Verification incomplete', 'Please complete all required checks.', 'warn');
            return;
          }
          const exam = getActiveVerificationExam();
          if (!exam) return;
          if ((st.examUi.mode || 'start') === 'register') {
            if (!isStep6Valid()) return toast('Confirmation required', 'Please confirm the reviewed registration details.', 'warn');
            completeExamRegistration(exam.examCode).catch((error) => {
              console.error('Failed to complete exam registration:', error);
              toast('Registration failed', error?.message || 'Unable to register exam right now.', 'warn');
            });
            return;
          }
          if (st.examUi.mode === 'register-phase2') {
            completeExamRegistration(exam.examCode).catch((error) => {
              console.error('Failed to complete exam registration:', error);
              toast('Registration failed', error?.message || 'Unable to register exam right now.', 'warn');
            });
            return;
            }
            startVerifiedExam(exam.examCode).catch((error) => {
              console.error('Failed to start verified exam:', error);
              toast('Exam start failed', error?.message || 'Please try again.', 'warn');
            });
            toast('Verification complete', 'The exam session is ready to enter.', 'success');
            return;
          }
        }
        const upload = e.target.closest('[data-verification-action]');
        if (upload) {
          const action = upload.dataset.verificationAction;
          if (action === 'upload') $('examImageUploadInput')?.click();
          if (action === 'capture') $('examImageCaptureInput')?.click();
          if (action === 'send-phase2-email') {
            const exam = getActiveVerificationExam();
            if (!exam) {
              toast('Exam not found', 'Unable to find the active exam for phase 2 email.', 'warn');
              return;
            }
            sendPhase2VerificationEmail(exam.examCode, upload);
          }
        }
      });
      el.examVerificationModal.addEventListener('input', (e) => handleVerificationInput(e.target));
      el.examVerificationModal.addEventListener('change', (e) => handleVerificationInput(e.target));
    }
    $$('.toggle-row input[type="checkbox"]').forEach((i, idx) => i.addEventListener('change', () => { const map = ['emailAlerts', 'examReminders', 'compactDensity', 'highContrast']; st.settings[map[idx]] = i.checked; applySettings(); toast('Settings saved', 'Your preferences were updated.', 'success'); refresh(); }));
    el.themeButtons.forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.themeMode)));
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-action]');
      if (a) {
        e.preventDefault();
        if (a.dataset.action === 'exam-card-menu-toggle') {
          toggleExamCardMenu(a);
          return;
        }
        if (a.dataset.action === 'exam-detail' || a.dataset.action === 'exam-instructions') {
          closeExamCardMenus();
        }
        runActionWithFeedback(a);
        return;
      }
      const r = e.target.closest('[data-detail]');
      if (r) openDetail(r.dataset.detail, r.dataset.code);
      if (e.target.matches('[data-close-modal]')) closeModal();
      if (!el.profileDd.contains(e.target)) { el.profileMenu.classList.remove('open'); el.profileMenuBtn.setAttribute('aria-expanded', 'false'); }
      if (!el.notifBtn.contains(e.target) && !el.notifyDrop.contains(e.target)) el.notifyDrop.classList.remove('open');
      if (!e.target.closest('.exam-card-menu')) closeExamCardMenus();
      if (!el.sidebar.contains(e.target) && !el.toggle.contains(e.target) && isMobile()) closeSidebar();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeExamVerification(); closeProfileEditor(); closeExamCardMenus(); el.profileMenu.classList.remove('open'); el.notifyDrop.classList.remove('open'); closeSidebar(); } });
    window.addEventListener('resize', () => { if (isMobile()) el.sidebar.classList.remove('collapsed'); renderAnalyticsCharts(); renderExamCatalog(); renderMyExams(); renderNotifications(); renderSchedule(); renderProctoringStatus(); if (st.sec === 'leaderboard') renderLeaderboard(); updateSidebarToggle(); });
    themeQuery.addEventListener?.('change', () => { if (st.theme === 'system') applyTheme('system'); });
  }
  function updateTopPlaceholder() { const map = { dashboard:'Search exams, results, certificates...', exams:'Search exam catalog...', 'my-exams':'Search registered exams...', results:'Search results by exam code...', certificates:'Search certificates...', leaderboard:'Search student name...', analytics:'Search metrics...', profile:'Search profile fields...', settings:'Search settings...', notifications:'Search notifications...', schedule:'Search schedules...', proctoring:'Search proctoring status...', 'help-support':'Search support topics...' }; el.topSearch.placeholder = map[st.sec] || map.dashboard; el.topSearch.value = st.q; }
  async function init() {
    bind();
    hydrateIcons();
    try {
      await hydrateFromBackend();
    } catch (error) {
      console.warn('Student backend bootstrap failed. Falling back to local data.', error);
    }
    if (el.detailModalClose) el.detailModalClose.innerHTML = '<span aria-hidden="true">×</span>';
    updateTopPlaceholder();
    applyTheme(st.theme);
    applyProfile();
    applySettings();
    hydrateExamSchedule();
    $$('input', el.profileForm).forEach(i => i.setAttribute('readonly', 'readonly'));
    setLoadingState();
    renderExamCatalog();
    renderMyExams();
    wire();
    setSection(st.sec);
    updateSidebarToggle();
    updateClock();
    renderNotifications();
    renderSchedule();
    renderProctoringStatus();
    renderHelpSupport();
    setInterval(updateClock, 1000);
    startCountdownTimer();
    setTimeout(() => { booting = false; document.getElementById('loaderOverlay')?.classList.add('hidden'); setTimeout(() => document.getElementById('loaderOverlay')?.remove(), 600); renderCards(); renderAnalyticsCards(); renderAllTables(); renderAnalyticsCharts(); toast('Student UI ready', 'Enterprise dashboard shell has loaded.', 'success'); refresh(); document.getElementById('loaderOverlay')?.classList.remove('active'); }, 450);
  }
  document.addEventListener('DOMContentLoaded', () => { init().catch((error) => console.error('Student UI init failed:', error)); });
  window.studentUI = { renderCards, renderChart: renderAnalyticsCharts, renderTable: renderAllTables, renderLeaderboard };
})();


