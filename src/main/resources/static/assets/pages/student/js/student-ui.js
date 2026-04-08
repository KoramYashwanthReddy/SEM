(() => {
  const K = { p:'student-ui-profile', s:'student-ui-settings', sec:'student-ui-section', q:'student-ui-search', t:'student-ui-theme', er:'student-ui-exam-reg', es:'student-ui-exam-sessions', ea:'student-ui-exam-attempts', nn:'student-ui-notifications' };
  const API_BASE = /^https?:/i.test(window.location.origin) ? window.location.origin : 'http://localhost:8080';
  const AUTH_KEYS = ['token', 'accessToken', 'jwt', 'authToken', 'access_token'];
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pct = (n) => `${Number(n).toFixed(1)}%`;
  const load = (k, f) => { try { return Object.assign({}, f, JSON.parse(localStorage.getItem(k) || '{}')); } catch { return f; } };
  const loadArray = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return Array.isArray(v) ? v : f; } catch { return f; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
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
    const token = getToken();
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_BASE}/api${path}`, {
      credentials: 'same-origin',
      ...options,
      headers
    });
    if (res.status === 401 || res.status === 403) {
      clearAuthStorage();
      redirectToLogin();
      throw new Error('Session expired. Please login again.');
    }
    const raw = await res.text();
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch (_) { data = raw; }
    }
    if (!res.ok) {
      const message = data && typeof data === 'object'
        ? (data.message || data.error || data.cause || data.detail)
        : (typeof data === 'string' ? data : '');
      throw new Error(message || `Request failed (${res.status})`);
    }
    if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'data')) {
      return data.data;
    }
    return data;
  };
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
    theme: localStorage.getItem(K.t) || 'system',
    currentUserId: 'stu-aarav',
    leaderboard: {
      mode: 'global',
      sort: 'rank',
      q: ''
    },
    profile: load(K.p, { fullName:'Aarav Mehta', email:'aarav.mehta@college.edu', phone:'+91 98765 43210', collegeName:'Institute of Technology', department:'Computer Science', year:'3rd Year', rollNumber:'CS23-018', section:'A' }),
    settings: load(K.s, { emailAlerts:true, examReminders:true, compactDensity:false, highContrast:false }),
    examRegistration: load(K.er, {
      'CS-201': false,
      'CS-214': true,
      'CS-225': true,
      'CS-238': true,
      'AI-301': true,
      'SE-210': true,
      'MA-109': true,
      'CS-101': true,
      'AI-302': true
    }),
    examSessions: load(K.es, {}),
    examAttemptIds: load(K.ea, {}),
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
      dash: { totalExams:24, attemptedCount:17, averageScore:86.4, certificatesEarned:6, trend:[54,60,62,68,74,71,79,83,88,85,91,89], attempts:[
        { examCode:'CS-201', obtainedMarks:86, totalMarks:100, percentage:86, badge:'GOLD', status:'Completed', date:'Today', duration:'54 min' },
        { examCode:'MA-109', obtainedMarks:91, totalMarks:100, percentage:91, badge:'PLATINUM', status:'Completed', date:'Yesterday', duration:'48 min' },
        { examCode:'EC-204', obtainedMarks:78, totalMarks:100, percentage:78, badge:'SILVER', status:'Completed', date:'3 days ago', duration:'61 min' },
        { examCode:'PHY-115', obtainedMarks:69, totalMarks:100, percentage:69, badge:'BRONZE', status:'Completed', date:'5 days ago', duration:'57 min' }
      ]},
      exams: [
        {
          title:'Data Structures',
          examCode:'CS-201',
          subject:'Computer Science',
          durationMinutes:60,
          totalMarks:100,
          passingMarks:35,
          maxAttempts:2,
          negativeMarks:0.25,
          startTime:'10:00 AM',
          endTime:'11:00 AM',
          easyQuestionCount:14,
          mediumQuestionCount:18,
          difficultQuestionCount:8,
          instructions:[
            'Read all questions carefully before submitting an answer.',
            'Negative marking is active for incorrect responses.',
            'Use the full duration only if needed and keep your session active.'
          ],
          status:'available'
        },
        {
          title:'Cloud Computing Essentials',
          examCode:'CC-118',
          subject:'Information Technology',
          durationMinutes:75,
          totalMarks:100,
          passingMarks:40,
          maxAttempts:2,
          negativeMarks:0.25,
          startTime:'11:15 AM',
          endTime:'12:30 PM',
          easyQuestionCount:11,
          mediumQuestionCount:18,
          difficultQuestionCount:11,
          instructions:[
            'Review architecture patterns and service models before starting.',
            'Keep the exam window open once verification completes.',
            'All responses are saved in real time for secure continuity.'
          ],
          status:'available'
        },
        {
          title:'Cyber Security Foundations',
          examCode:'CY-104',
          subject:'Security',
          durationMinutes:90,
          totalMarks:100,
          passingMarks:42,
          maxAttempts:2,
          negativeMarks:0.25,
          startTime:'01:45 PM',
          endTime:'03:15 PM',
          easyQuestionCount:12,
          mediumQuestionCount:18,
          difficultQuestionCount:10,
          instructions:[
            'Complete the identity verification flow before starting.',
            'Monitor network and browser stability during the session.',
            'Questions are shuffled on every attempt to maintain integrity.'
          ],
          status:'available'
        },
        {
          title:'Technical Communication',
          examCode:'TC-107',
          subject:'Communication',
          durationMinutes:60,
          totalMarks:100,
          passingMarks:35,
          maxAttempts:2,
          negativeMarks:0.25,
          startTime:'04:20 PM',
          endTime:'05:20 PM',
          easyQuestionCount:14,
          mediumQuestionCount:16,
          difficultQuestionCount:10,
          instructions:[
            'Read the prompt carefully and answer with professional precision.',
            'Language clarity and structure matter across all responses.',
            'Submit only when you are ready to finalize the verified attempt.'
          ],
          status:'available'
        },
        {
          title:'Data Visualization Systems',
          examCode:'DV-330',
          subject:'Analytics',
          durationMinutes:75,
          totalMarks:100,
          passingMarks:40,
          maxAttempts:1,
          negativeMarks:0.25,
          startTime:'05:10 PM',
          endTime:'06:25 PM',
          easyQuestionCount:10,
          mediumQuestionCount:20,
          difficultQuestionCount:10,
          instructions:[
            'Inspect the dashboard prompt carefully before answering.',
            'Charts, reports, and interpretation questions are mixed throughout.',
            'Once verified, maintain focus for the duration of the attempt.'
          ],
          status:'available'
        },
        {
          title:'Mobile App Development',
          examCode:'MD-208',
          subject:'Software Engineering',
          durationMinutes:90,
          totalMarks:100,
          passingMarks:42,
          maxAttempts:2,
          negativeMarks:0.25,
          startTime:'06:40 PM',
          endTime:'08:10 PM',
          easyQuestionCount:12,
          mediumQuestionCount:18,
          difficultQuestionCount:10,
          instructions:[
            'Expect scenario, architecture, and implementation questions.',
            'Use the latest saved session only if resume mode is available.',
            'Keep the browser in focus to avoid integrity warnings.'
          ],
          status:'available'
        },
        {
          title:'Database Systems',
          examCode:'CS-214',
          subject:'Databases',
          durationMinutes:90,
          totalMarks:100,
          passingMarks:40,
          maxAttempts:1,
          negativeMarks:0.25,
          startTime:'01:30 PM',
          endTime:'03:00 PM',
          easyQuestionCount:10,
          mediumQuestionCount:20,
          difficultQuestionCount:10,
          instructions:[
            'This exam is timed and will auto-submit when time ends.',
            'Attempt questions in the order that suits your strategy.',
            'Review marked questions before the final submission.'
          ],
          status:'available'
        },
        {
          title:'Operating Systems',
          examCode:'CS-225',
          subject:'Systems',
          durationMinutes:75,
          totalMarks:100,
          passingMarks:38,
          maxAttempts:2,
          negativeMarks:0.25,
          startTime:'04:00 PM',
          endTime:'05:15 PM',
          easyQuestionCount:12,
          mediumQuestionCount:18,
          difficultQuestionCount:10,
          instructions:[
            'Ensure your device stays connected during the attempt.',
            'Any timeout will preserve the session for resume where allowed.',
            'Navigation between questions is unrestricted during the exam.'
          ],
          status:'available'
        },
        {
          title:'Advanced Algorithms',
          examCode:'CS-238',
          subject:'Computer Science',
          durationMinutes:75,
          totalMarks:100,
          passingMarks:40,
          maxAttempts:2,
          negativeMarks:0.25,
          startTime:'02:15 PM',
          endTime:'03:30 PM',
          easyQuestionCount:12,
          mediumQuestionCount:18,
          difficultQuestionCount:10,
          instructions:[
            'Focus on complexity analysis and optimal problem solving.',
            'Use the question palette to track visited questions.',
            'A final review screen appears before submission.'
          ],
          status:'available'
        },
        {
          title:'Machine Learning Basics',
          examCode:'AI-301',
          subject:'Artificial Intelligence',
          durationMinutes:120,
          totalMarks:100,
          passingMarks:45,
          maxAttempts:1,
          negativeMarks:0.25,
          startTime:'Tomorrow 10:00 AM',
          endTime:'Tomorrow 12:00 PM',
          easyQuestionCount:8,
          mediumQuestionCount:18,
          difficultQuestionCount:14,
          instructions:[
            'This exam opens in a scheduled window and cannot be started early.',
            'Check prerequisites and system readiness before the start time.',
            'A countdown will be displayed when the exam is live.'
          ],
          status:'upcoming'
        },
        {
          title:'Software Engineering',
          examCode:'SE-210',
          subject:'Engineering',
          durationMinutes:80,
          totalMarks:100,
          passingMarks:42,
          maxAttempts:1,
          negativeMarks:0.25,
          startTime:'Sat 09:30 AM',
          endTime:'Sat 10:50 AM',
          easyQuestionCount:14,
          mediumQuestionCount:16,
          difficultQuestionCount:10,
          instructions:[
            'Expect scenario-based questions and design trade-off choices.',
            'The exam becomes available only during its allocated window.',
            'Keep your browser tab in focus to avoid interruption warnings.'
          ],
          status:'upcoming'
        },
        {
          title:'Discrete Mathematics',
          examCode:'MA-109',
          subject:'Mathematics',
          durationMinutes:90,
          totalMarks:100,
          passingMarks:40,
          maxAttempts:1,
          negativeMarks:0.25,
          startTime:'Fri 11:00 AM',
          endTime:'Fri 12:30 PM',
          easyQuestionCount:12,
          mediumQuestionCount:18,
          difficultQuestionCount:10,
          instructions:[
            'This paper is scheduled and will unlock at the stated time.',
            'Work through proofs, sets, and logic carefully before answer submission.',
            'Use the instruction preview to confirm rules before starting.'
          ],
          status:'upcoming'
        },
        {
          title:'Programming Fundamentals',
          examCode:'CS-101',
          subject:'Computer Science',
          durationMinutes:60,
          totalMarks:100,
          passingMarks:35,
          maxAttempts:2,
          negativeMarks:0.25,
          startTime:'Resume Now',
          endTime:'Saved Session',
          easyQuestionCount:11,
          mediumQuestionCount:16,
          difficultQuestionCount:9,
          status:'resume',
          attemptNumber:2,
          percentage:62,
          obtainedMarks:62,
          timeTakenSeconds:1840,
          instructions:[
            'Resume from your saved attempt and continue where you left off.',
            'Your remaining time is preserved for this session.',
            'Review flagged questions before final submission if time allows.'
          ]
        },
        {
          title:'Artificial Intelligence',
          examCode:'AI-302',
          subject:'Artificial Intelligence',
          durationMinutes:110,
          totalMarks:100,
          passingMarks:45,
          maxAttempts:1,
          negativeMarks:0.25,
          startTime:'Resume Now',
          endTime:'Saved Session',
          easyQuestionCount:10,
          mediumQuestionCount:18,
          difficultQuestionCount:12,
          status:'resume',
          attemptNumber:1,
          percentage:74,
          obtainedMarks:74,
          timeTakenSeconds:2260,
          instructions:[
            'Resume mode restores your last saved progress.',
            'Answer confidence-based questions first if you are short on time.',
            'A final confirmation step is shown before submitting the attempt.'
          ]
        }
      ],
      results: [
        { examCode:'CS-201', score:86, percentage:86, resultStatus:'Pass', passed:true, correctAnswers:43, wrongAnswers:5, unansweredQuestions:2, timeTakenSeconds:3240, submittedAt:'2026-03-22', totalQuestions:50, easyCorrect:18, mediumCorrect:16, hardCorrect:9, easyWrong:1, mediumWrong:2, hardWrong:2 },
        { examCode:'MA-109', score:91, percentage:91, resultStatus:'Pass', passed:true, correctAnswers:46, wrongAnswers:3, unansweredQuestions:1, timeTakenSeconds:2860, submittedAt:'2026-03-24', totalQuestions:50, easyCorrect:20, mediumCorrect:17, hardCorrect:9, easyWrong:0, mediumWrong:1, hardWrong:2 },
        { examCode:'EC-204', score:78, percentage:78, resultStatus:'Pass', passed:true, correctAnswers:39, wrongAnswers:8, unansweredQuestions:3, timeTakenSeconds:3660, submittedAt:'2026-03-25', totalQuestions:50, easyCorrect:16, mediumCorrect:14, hardCorrect:9, easyWrong:2, mediumWrong:3, hardWrong:3 },
        { examCode:'PHY-115', score:69, percentage:69, resultStatus:'Pass', passed:true, correctAnswers:34, wrongAnswers:10, unansweredQuestions:6, timeTakenSeconds:3420, submittedAt:'2026-03-28', totalQuestions:50, easyCorrect:14, mediumCorrect:12, hardCorrect:8, easyWrong:3, mediumWrong:3, hardWrong:4 },
        { examCode:'AI-301', score:52, percentage:52, resultStatus:'Fail', passed:false, correctAnswers:26, wrongAnswers:14, unansweredQuestions:10, timeTakenSeconds:3840, submittedAt:'2026-03-30', totalQuestions:50, easyCorrect:10, mediumCorrect:9, hardCorrect:7, easyWrong:4, mediumWrong:5, hardWrong:5 }
      ],
      certs: [
        { certificateId:'CERT-2026-011', examCode:'MA-109', examTitle:'Discrete Mathematics', studentName:'Aarav Mehta', collegeName:'Institute of Technology', department:'Computer Science', rollNumber:'CS23-018', score:91, grade:'A+', issuedAt:'2026-03-12', revoked:false, qrCodeData:'CERT-2026-011|MA-109|A+|Verified' },
        { certificateId:'CERT-2026-012', examCode:'CS-201', examTitle:'Data Structures', studentName:'Aarav Mehta', collegeName:'Institute of Technology', department:'Computer Science', rollNumber:'CS23-018', score:86, grade:'A', issuedAt:'2026-03-22', revoked:false, qrCodeData:'CERT-2026-012|CS-201|A|Verified' },
        { certificateId:'CERT-2026-013', examCode:'EC-204', examTitle:'Electronics Fundamentals', studentName:'Aarav Mehta', collegeName:'Institute of Technology', department:'Computer Science', rollNumber:'CS23-018', score:78, grade:'B+', issuedAt:'2026-03-27', revoked:false, qrCodeData:'CERT-2026-013|EC-204|B+|Verified' },
        { certificateId:'CERT-2026-014', examCode:'PHY-115', examTitle:'Applied Physics', studentName:'Aarav Mehta', collegeName:'Institute of Technology', department:'Computer Science', rollNumber:'CS23-018', score:69, grade:'B', issuedAt:'2026-03-29', revoked:true, qrCodeData:'CERT-2026-014|PHY-115|B|Revoked' },
        { certificateId:'CERT-2026-015', examCode:'AI-302', examTitle:'Artificial Intelligence', studentName:'Aarav Mehta', collegeName:'Institute of Technology', department:'Computer Science', rollNumber:'CS23-018', score:96, grade:'A+', issuedAt:'2026-04-01', revoked:false, qrCodeData:'CERT-2026-015|AI-302|A+|Verified' }
      ],
      leaderboard: {
        global: leaderboardRows([
          ['stu-meera', 'Meera Shah', 98, 98, 1],
          ['stu-aarav', 'Aarav Mehta', 96, 96, 2],
          ['stu-rohan', 'Rohan Iyer', 95, 95, 3],
          ['stu-tanya', 'Tanya Kapoor', 94, 94, 4],
          ['stu-kabir', 'Kabir Singh', 92, 92, 5],
          ['stu-ishita', 'Ishita Verma', 91, 91, 6],
          ['stu-nikhil', 'Nikhil Rao', 90, 90, 7],
          ['stu-pooja', 'Pooja Nair', 89, 89, 8],
          ['stu-ananya', 'Ananya Das', 88, 88, 9],
          ['stu-arjun', 'Arjun Patil', 87, 87, 10],
          ['stu-simran', 'Simran Kaur', 85, 85, 11],
          ['stu-vihaan', 'Vihaan Joshi', 83, 83, 12],
          ['stu-neha', 'Neha Menon', 80, 80, 13],
          ['stu-aditya', 'Aditya Rao', 77, 77, 14],
          ['stu-sara', 'Sara Khan', 74, 74, 15]
        ]),
        exam: leaderboardRows([
          ['stu-aarav', 'Aarav Mehta', 99, 99, 1],
          ['stu-meera', 'Meera Shah', 97, 97, 2],
          ['stu-rohan', 'Rohan Iyer', 94, 94, 3],
          ['stu-kabir', 'Kabir Singh', 93, 93, 4],
          ['stu-tanya', 'Tanya Kapoor', 91, 91, 5],
          ['stu-ishita', 'Ishita Verma', 89, 89, 6],
          ['stu-nikhil', 'Nikhil Rao', 88, 88, 7],
          ['stu-pooja', 'Pooja Nair', 86, 86, 8],
          ['stu-arjun', 'Arjun Patil', 84, 84, 9],
          ['stu-ananya', 'Ananya Das', 82, 82, 10],
          ['stu-vihaan', 'Vihaan Joshi', 80, 80, 11],
          ['stu-simran', 'Simran Kaur', 78, 78, 12],
          ['stu-neha', 'Neha Menon', 76, 76, 13],
          ['stu-aditya', 'Aditya Rao', 73, 73, 14],
          ['stu-sara', 'Sara Khan', 70, 70, 15]
        ])
      },
      analytics: { attemptedExams:17, averageScore:86.4, highestScore:98, lowestScore:52, passRate:88 },
      notifications: loadArray(K.nn, [
        { id:'n-1', title:'Results published', message:'Discrete Mathematics scores are now visible in My Results.', timestamp:'2026-04-07T09:10:00', type:'result', read:false },
        { id:'n-2', title:'Exam reminder', message:'AI-301 begins later today at 1:00 PM with verification required.', timestamp:'2026-04-07T08:40:00', type:'exam', read:false },
        { id:'n-3', title:'Certificate ready', message:'MA-109 certificate is ready for secure download.', timestamp:'2026-04-06T18:25:00', type:'certificate', read:true },
        { id:'n-4', title:'Schedule updated', message:'Upcoming exam windows were refreshed for the week.', timestamp:'2026-04-06T15:45:00', type:'exam', read:true }
      ]),
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
      section: profile.section || st.profile.section || ''
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
    st.data.analytics = dashboard.analytics || st.data.analytics;
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
        status: examStatus
      };
    }) : st.data.exams;
    if (Array.isArray(payload.registeredExamCodes)) {
      const registeredSet = new Set(payload.registeredExamCodes.map((code) => String(code || '').trim()).filter(Boolean));
      st.data.exams.forEach((exam) => {
        const code = String(exam?.examCode || '').trim();
        if (!code) return;
        st.examRegistration[code] = registeredSet.has(code);
      });
    }
    st.data.exams.forEach((exam) => {
      if (exam?.examCode && exam?.resumeAttemptId) {
        st.examAttemptIds[exam.examCode] = exam.resumeAttemptId;
      }
    });
    st.data.results = Array.isArray(payload.attempts) ? payload.attempts.map((attempt) => {
      const linkedExam = st.data.exams.find((exam) => exam.examCode === attempt.examCode);
      const totalQuestions = toNumber(
        attempt.totalQuestions,
        toNumber(linkedExam?.totalQuestions, toNumber(linkedExam?.easyQuestionCount) + toNumber(linkedExam?.mediumQuestionCount) + toNumber(linkedExam?.difficultQuestionCount))
      );
      const correctAnswers = toNumber(attempt.correctAnswers);
      const wrongAnswers = toNumber(attempt.wrongAnswers);
      const unansweredQuestions = toNumber(attempt.unansweredQuestions, Math.max(totalQuestions - correctAnswers - wrongAnswers, 0));
      const percentage = toNumber(attempt.percentage);
      const score = toNumber(attempt.obtainedMarks, toNumber(attempt.score));
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
        submittedAt: attempt.endTime || attempt.updatedAt || attempt.createdAt || null,
        totalQuestions,
        easyCorrect: toNumber(attempt.easyCorrect),
        mediumCorrect: toNumber(attempt.mediumCorrect),
        hardCorrect: toNumber(attempt.hardCorrect),
        easyWrong: toNumber(attempt.easyWrong),
        mediumWrong: toNumber(attempt.mediumWrong),
        hardWrong: toNumber(attempt.hardWrong)
      };
    }) : st.data.results;
    st.data.certs = Array.isArray(payload.certificates) ? payload.certificates.map((cert) => ({
      ...cert,
      revoked: Boolean(cert.revoked),
      examTitle: cert.examTitle || cert.examCode || 'Exam Certificate',
      issuedAt: cert.issuedAt || cert.updatedAt || cert.createdAt || null
    })) : st.data.certs;
    if (Array.isArray(payload.leaderboardGlobal)) {
      st.data.leaderboard.global = payload.leaderboardGlobal.map((row, idx) => ({
        studentId: `stu-${row.studentId}`,
        studentName: row.studentName || `Student-${row.studentId}`,
        score: Number(row.score || 0),
        percentage: Number(row.percentage || 0),
        rank: Number(row.rank || (idx + 1))
      }));
    }

    save(K.p, st.profile);
    save(K.ea, st.examAttemptIds);
  }

  let booting = true;
  const el = {};
  const ico = {
    menu:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/></svg>',
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
    const d = new Date(exam?.startAt || 0);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };
  const getExamEndDate = (exam) => new Date(getExamDate(exam).getTime() + (Number(exam?.durationMinutes || 0) * 60000));
  const formatExamTime = (exam) => getExamDate(exam).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatExamDateTime = (exam) => getExamDate(exam).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const getExamResult = (examCode) => (st.data.results || []).find((row) => row.examCode === examCode) || null;
  function examRuntimeState(exam) {
    const startAt = getExamDate(exam);
    const endAt = getExamEndDate(exam);
    const now = Date.now();
    const registered = !!st.examRegistration[exam.examCode];
    const sessionStarted = !!st.examSessions[exam.examCode] || !!exam.resumeAttemptId || String(exam?.status || '').toLowerCase() === 'resume';
    const result = getExamResult(exam.examCode);
    const failed = !!(result && !result.passed);
    const attemptsRemaining = calculateAttemptsRemaining(exam);
    const reexamEligible = failed && attemptsRemaining > 0;
    const registrationDeadline = startAt.getTime() - (30 * 60000);
    const verificationOpenAt = startAt.getTime() - (10 * 60000);
    const registrationOpen = now < registrationDeadline;
    const preStartLock = now >= registrationDeadline && now < verificationOpenAt;
    const verificationOpen = now >= verificationOpenAt && now < startAt.getTime();
    const live = now >= startAt.getTime() && now <= endAt.getTime();
    const upcoming = now < startAt.getTime();
    const minutesUntil = Math.ceil((startAt.getTime() - now) / 60000);
    const expired = now > endAt.getTime() || String(exam?.status || '').toLowerCase() === 'closed';
    const minutesUntilVerification = Math.ceil((verificationOpenAt - now) / 60000);
    const minutesUntilRegistrationClose = Math.ceil((registrationDeadline - now) / 60000);
    return {
      registered,
      sessionStarted,
      result,
      failed,
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
      registrationDeadline: new Date(registrationDeadline),
      verificationOpenAt: new Date(verificationOpenAt)
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
      if (state.sessionStarted) {
        return { label: 'Resume Exam', action: 'exam-enter', tone: 'primary', hint: 'Saved session ready to continue.', disabled: false };
      }
      if (state.reexamEligible) {
        return { label: 'Re-Exam', action: 'exam-start', tone: 'primary', hint: 'Eligible for another verified attempt.', disabled: false };
      }
      if (state.live) {
        return { label: 'Enter Exam', action: 'exam-enter', tone: 'primary', hint: 'Exam is live now.', disabled: false };
      }
      if (state.expired) {
        return { label: 'Expired', action: 'exam-detail', tone: 'ghost', hint: 'Session closed.', disabled: true };
      }
      if (state.verificationOpen) {
        return { label: 'Start Exam', action: 'exam-start', tone: 'primary', hint: 'Verification is available now.', disabled: false };
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
        return {
          label: 'Register',
          action: 'exam-register',
          tone: 'primary',
          hint: `Registration open (${Math.max(state.minutesUntilRegistrationClose, 0)} min left).`,
          disabled: false
        };
      }
      if (state.preStartLock || state.verificationOpen || state.live) {
        return {
          label: 'Registration Closed',
          action: 'exam-detail',
          tone: 'ghost',
          hint: state.preStartLock
            ? `Closed. Verification opens in ${Math.max(state.minutesUntilVerification, 0)} min.`
            : 'Registration closed for this exam window.',
          disabled: true
        };
      }
      return { label: 'Closed', action: 'exam-detail', tone: 'ghost', hint: 'Registration closed.', disabled: true };
    }
    if (state.sessionStarted || state.live) {
      return { label: 'Enter Exam', action: 'exam-enter', tone: 'primary', hint: 'Exam is live or ready to continue.', disabled: false };
    }
    if (state.expired || state.result) {
      return { label: 'Closed', action: 'exam-detail', tone: 'ghost', hint: 'Expired or completed.', disabled: true };
    }
    if (state.verificationOpen) {
      return { label: 'Start Exam', action: 'exam-start', tone: 'primary', hint: 'Verification is available now.', disabled: false };
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
    if (state.expired || state.result) return 'closed';
    if (!state.registered) return state.registrationOpen ? 'unregistered' : 'closed';
    if (state.verificationOpen || state.live || state.sessionStarted || state.reexamEligible) return null;
    if (state.upcoming) return 'upcoming';
    return 'upcoming';
  }
  function myExamGroup(exam) {
    const state = examRuntimeState(exam);
    if (!state.registered) return null;
    if (state.sessionStarted) return 'resume';
    if (state.reexamEligible) return 'reexam';
    if (state.expired) return null;
    return 'registered';
  }
  function examVisibleLabel(exam, view = 'catalog') {
    const state = examRuntimeState(exam);
    if (view === 'my') {
      if (state.sessionStarted) return 'SESSION SAVED';
      if (state.failed) return 'RE-EXAM';
      if (state.live) return 'LIVE';
      if (state.preStartLock) return 'VERIFICATION SOON';
      return 'REGISTERED';
    }
    if (!state.registered) return state.registrationOpen ? 'UNREGISTERED' : 'REG CLOSED';
    if (state.expired || state.result) return 'CLOSED';
    if (state.live) return 'LIVE';
    return state.verificationOpen ? 'START SOON' : state.preStartLock ? 'VERIFICATION SOON' : 'UPCOMING';
  }
  function examGroupTone(exam, view = 'catalog') {
    const state = examRuntimeState(exam);
    if (view === 'my') {
      if (state.sessionStarted) return 'warning';
      if (state.failed) return 'danger';
      if (state.live) return 'success';
      if (state.preStartLock) return 'neutral';
      return 'success';
    }
    if (!state.registered) return state.registrationOpen ? 'danger' : 'neutral';
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
  function renderVerificationBadge(exam) {
    if (!exam?.verificationRequired) return '';
    return `
      <span class="exam-pill verification-badge" title="Complete identity verification before starting exam">
        ${svg('shield')}
        <span>Verification Required</span>
      </span>`;
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
  const sortExamEndDesc = (a, b) => (getExamDate(b).getTime() + Number(b.durationMinutes || 0) * 60000) - (getExamDate(a).getTime() + Number(a.durationMinutes || 0) * 60000);
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
    const sessionStarted = !!st.examSessions[exam.examCode];
    const started = sessionStarted || now >= startAt.getTime();
    const minutesUntil = Math.ceil((startAt.getTime() - now) / 60000);
    const registrationDeadline = startAt.getTime() - (30 * 60000);
    const verificationOpenAt = startAt.getTime() - (10 * 60000);
    const registrationOpen = now < registrationDeadline;
    const verificationOpen = now >= verificationOpenAt && now < startAt.getTime();
    const preStartLock = now >= registrationDeadline && now < verificationOpenAt;

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
      registrationConfirmed: false
    };
  }
  const activeLeaderboardRows = () => st.data.leaderboard[st.leaderboard.mode] || [];
  const leaderboardShuffle = (rows) => {
    const shuffled = rows.slice().sort(() => Math.random() - 0.5);
    return shuffled.map((row, index) => {
      const nudge = Math.floor(Math.random() * 5) - 2;
      const score = clamp((row.score || 0) + nudge, 58, 99);
      return {
        ...row,
        rank: index + 1,
        score,
        percentage: score
      };
    });
  };
  const sortBySubmittedAtDesc = (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  const busyCopy = {
    'exam-instructions': 'Loading instructions...',
    'exam-start': 'Preparing exam...',
    'exam-register': 'Registering student...',
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
  function bind() { Object.assign(el, { sidebar:$('sidebar'), toggle:$('toggle-sidebar'), logout:$('logoutBtn'), sideNav:$('sideNav'), sidebarAvatar:$('sidebarAvatar'), sidebarName:$('sidebarName'), sidebarRole:$('sidebarRole'), topAvatar:$('topAvatar'), topName:$('topName'), topSearch:$('top-nav-search'), notifBtn:$('notifBtn'), notifCount:$('notifCount'), notifNavCount:$('notifNavCount'), notifyDrop:$('notifyDrop'), notifyDropCount:$('notifyDropCount'), notifyList:$('notifyList'), notificationTypeFilter:$('notificationTypeFilter'), markAllReadBtn:$('markAllReadBtn'), clearNotificationsBtn:$('clearNotificationsBtn'), unreadNotificationCount:$('unreadNotificationCount'), notificationStream:$('notificationStream'), scheduleDateFilter:$('scheduleDateFilter'), scheduleList:$('scheduleList'), scheduleTimeline:$('scheduleTimeline'), scheduleTodayLabel:$('scheduleTodayLabel'), proctoringStatusGrid:$('proctoringStatusGrid'), proctoringSummaryPanel:$('proctoringSummaryPanel'), faqAccordion:$('faqAccordion'), contactSupportForm:$('contactSupportForm'), reportIssueForm:$('reportIssueForm'), supportTabs:$$('[data-support-tab]'), supportPanels:$$('[data-support-panel]'), profileDd:$('profileDd'), profileMenuBtn:$('profileMenuBtn'), profileMenu:$('profileMenu'), profileLogout:$('profileLogout'), themeToggle:$('themeToggle'), themeButtons:$$('[data-theme-mode]', $('themeToggle')), dashStatsGrid:$('dashStatsGrid'), recentAttemptsBody:$('recentAttemptsBody'), performanceTrendChart:$('performanceTrendChart'), chartPlaceholder:$('chartPlaceholder'), refreshDashboard:$('refreshDashboard'), dashboardActionBtn:$('dashboardActionBtn'), attemptsResetBtn:$('attemptsResetBtn'), examSearch:$('examSearch'), examFilter:$('examFilter'), examTabs:$$('[data-tab]'), summaryPill:$('summaryPill'), examStatusLegend:$('examStatusLegend'), unregisteredGrid:$('unregisteredGrid'), upcomingGrid:$('upcomingGrid'), closedGrid:$('closedGrid'), unregisteredCount:$('unregisteredCount'), upcomingCount:$('upcomingCount'), closedCount:$('closedCount'), myExamSearch:$('myExamSearch'), myExamFilter:$('myExamFilter'), myExamTabs:$$('[data-my-tab]'), myExamSummaryPill:$('myExamSummaryPill'), registeredGrid:$('registeredGrid'), resumeMyGrid:$('resumeMyGrid'), reexamGrid:$('reexamGrid'), registeredCount:$('registeredCount'), resumeMyCount:$('resumeMyCount'), reexamCount:$('reexamCount'), resultsSummaryGrid:$('resultsSummaryGrid'), resultsFilter:$('resultsFilter'), resultsSearch:$('resultsSearch'), resultsResetBtn:$('resultsResetBtn'), resultsBody:$('resultsBody'), certificatesSummaryGrid:$('certificatesSummaryGrid'), certificatesFilter:$('certificatesFilter'), certificatesSearch:$('certificatesSearch'), certificatesResetBtn:$('certificatesResetBtn'), certificatesGrid:$('certificatesGrid'), leaderboardModeToggle:$('leaderboardModeToggle'), leaderboardModeButtons:$$('[data-leaderboard-mode]', $('leaderboardModeToggle')), leaderboardSearch:$('leaderboardSearch'), leaderboardSort:$('leaderboardSort'), leaderboardRefresh:$('leaderboardRefresh'), leaderboardSummaryGrid:$('leaderboardSummaryGrid'), yourRankCard:$('yourRankCard'), podiumGrid:$('podiumGrid'), leaderboardBody:$('leaderboardBody'), analyticsCards:$('analyticsCards'), analyticsLineChart:$('analyticsLineChart'), analyticsBarChart:$('analyticsBarChart'), analyticsDonutChart:$('analyticsDonutChart'), editProfileBtn:$('editProfileBtn'), saveProfileBtn:$('saveProfileBtn'), profileForm:$('profileForm'), detailModal:$('detailModal'), detailModalKicker:$('detailModalKicker'), detailModalTitle:$('detailModalTitle'), detailModalBody:$('detailModalBody'), detailModalFoot:$('detailModalFoot'), detailModalClose:$('detailModalClose'), examVerificationModal:$('examVerificationModal'), examVerificationClose:$('examVerificationClose'), examVerificationTitle:$('examVerificationTitle'), examVerificationSubtitle:$('examVerificationSubtitle'), examVerificationBody:$('examVerificationBody'), examVerificationFoot:$('examVerificationFoot'), examStepper:$('examStepper'), examSecurityIndicators:$('examSecurityIndicators'), toastStack:$('toastStack'), liveClock:$('liveClock') }); }
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
    st.examUi.activeCode = exam.examCode;
    st.examUi.mode = mode;
    st.examUi.step = 1;
    st.examUi.imageData = '';
    st.examUi.imageName = '';
    st.examUi.form = createDefaultExamForm(exam);
    if (el.examVerificationTitle) el.examVerificationTitle.textContent = `${exam.examCode} - ${exam.title}`;
    if (el.examVerificationSubtitle) {
      el.examVerificationSubtitle.textContent = mode === 'register'
        ? `Secure registration verification for ${exam.subject} opens at ${formatExamDateTime(exam)}.`
        : `Secure verification for ${exam.subject} starts at ${formatExamDateTime(exam)}.`;
    }
    el.examVerificationModal.classList.remove('hidden');
    el.examVerificationModal.setAttribute('aria-hidden', 'false');
    updateExamVerificationUi();
  }
  function getActiveVerificationExam() {
    return st.data.exams.find((exam) => exam.examCode === st.examUi.activeCode) || null;
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
  function canStartExam() {
    return isStep1Valid() && isStep2Valid() && isStep3Valid() && isStep4Valid() && isStep5Valid();
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
    if ((st.examUi.mode || 'start') === 'register') steps.push('Registration Review', 'Final Confirmation');
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
  function renderVerificationStep7(exam) {
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
      7: renderVerificationStep7(exam)
    };
    el.examVerificationBody.innerHTML = map[step] || map[1];
  }
  function renderExamVerificationFoot() {
    if (!el.examVerificationFoot) return;
    const step = st.examUi.step;
    const mode = st.examUi.mode || 'start';
    const prevDisabled = step === 1;
    const nextDisabled = (step === 1 && !isStep1Valid())
      || (step === 2 && !isStep2Valid())
      || (step === 3 && !isStep3Valid())
      || (step === 4 && !isStep4Valid())
      || (step === 5 && !canStartExam())
      || (step === 7 && !isStep6Valid());
    const primaryLabel = step === 5
      ? (mode === 'register' ? 'Review Registration' : 'Start Exam')
      : step === 6
        ? 'Continue to Confirmation'
        : step === 7
          ? 'Confirm Registration'
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
      ['examIdConfirmationNumber', 'idConfirmationNumber']
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
    if (target.id === 'examRulesAccepted') setVerificationField('rulesAccepted', target.checked);
    if (target.id === 'examTermsAccepted') setVerificationField('termsAccepted', target.checked);
    if (target.id === 'examDeclarationAccepted') setVerificationField('declarationAccepted', target.checked);
    if (target.id === 'examRegistrationConfirmed') setVerificationField('registrationConfirmed', target.checked);
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
    const maxStep = (st.examUi.mode || 'start') === 'register' ? 7 : 5;
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
    try {
      await apiRequest(`/student/exam/register/${encodeURIComponent(code)}`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to register exam in backend:', error);
      toast('Registration failed', error?.message || 'Unable to register exam right now.', 'warn');
      return;
    }
    st.examRegistration[code] = true;
    save(K.er, st.examRegistration);
    closeExamVerification();
    renderExamCatalog();
    renderMyExams();
    toast('Registration verified', 'The exam has been added to My Exams.', 'success');
  }
  async function startVerifiedExam(code) {
    if (!code) return;
    let attemptId = st.examAttemptIds[code] || null;
    try {
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
    } catch (error) {
      console.warn('Unable to sync exam start with backend. Continuing local flow.', error);
      toast('Live sync warning', 'Exam start could not be fully synced. Continuing in local mode.', 'warn');
    }
    st.examSessions[code] = Date.now();
    save(K.es, st.examSessions);
    const exam = st.data.exams.find((item) => item.examCode === code);
    if (exam && attemptId != null) {
      exam.resumeAttemptId = attemptId;
    }
    closeExamVerification();
    renderExamCatalog();
    renderMyExams();
    if (exam) openExamAccess(exam);
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
  function applyProfile() { save(K.p, st.profile); el.sidebarName.textContent = st.profile.fullName; el.sidebarRole.textContent = `${st.profile.department} Learner`; el.topName.textContent = st.profile.fullName; el.sidebarAvatar.src = avatar(st.profile.fullName); el.topAvatar.src = avatar(st.profile.fullName); ['fullName','email','phone','collegeName','department','year','rollNumber','sectionField'].forEach(id => { const map = { sectionField:'section' }; if ($(id)) $(id).value = st.profile[map[id] || id] || ''; }); }
  function applySettings() { save(K.s, st.settings); document.body.classList.toggle('student-compact', !!st.settings.compactDensity); document.body.classList.toggle('student-contrast', !!st.settings.highContrast); const t = $$('.toggle-row input[type="checkbox"]'); if (t[0]) t[0].checked = !!st.settings.emailAlerts; if (t[1]) t[1].checked = !!st.settings.examReminders; if (t[2]) t[2].checked = !!st.settings.compactDensity; if (t[3]) t[3].checked = !!st.settings.highContrast; }
  function resolveTheme(mode) { return mode === 'system' ? (themeQuery.matches ? 'dark' : 'light') : mode; }
  function applyTheme(mode = st.theme) { st.theme = mode; localStorage.setItem(K.t, mode); document.documentElement.setAttribute('data-theme', resolveTheme(mode)); if (el.themeButtons) el.themeButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.themeMode === mode)); }
  function renderCards() { const c = [['Total Exams',st.data.dash.totalExams,'dashboard','blue'],['Attempted Exams',st.data.dash.attemptedCount,'exams','purple'],['Average Score',pct(st.data.dash.averageScore),'analytics','green'],['Certificates Earned',st.data.dash.certificatesEarned,'certificates','amber']]; el.dashStatsGrid.innerHTML = c.map(([t,v,i,tn]) => `<article class="stat-card stat-${tn}"><div class="stat-icon">${svg(i)}</div><div class="stat-copy"><span class="stat-label">${t}</span><strong class="stat-value">${v}</strong><small class="stat-hint">Enterprise UI data</small></div></article>`).join(''); const a = st.data.analytics; el.analyticsCards.innerHTML = [['Attempted Exams',a.attemptedExams,'dashboard'],['Average Score',pct(a.averageScore),'analytics'],['Highest Score',a.highestScore,'star'],['Lowest Score',a.lowestScore,'results']].map(([t,v,i]) => `<article class="stat-card"><div class="stat-icon">${svg(i)}</div><div class="stat-copy"><span class="stat-label">${t}</span><strong class="stat-value">${v}</strong></div></article>`).join(''); }
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
    const verificationBadge = renderVerificationBadge(exam);
    const proctoringIndicator = renderProctoringIndicator(exam);
    const attemptCounter = renderAttemptCounter(exam);
    const timeRemainingBadge = renderTimeRemainingBadge(exam);
    const accessTone = view === 'my' && state.sessionStarted
      ? 'resume'
      : access.action === 'exam-register'
        ? 'register'
        : access.action === 'exam-enter'
          ? 'live'
          : 'verified';
    const metrics = view === 'my' && result ? `
      <div class="detail-grid">
        <div class="detail-item"><span>Attempt</span><strong>${state.sessionStarted ? 'Saved' : `#${result.passed ? 1 : 2}`}</strong></div>
        <div class="detail-item"><span>Score</span><strong>${result.score}/${result.totalQuestions}</strong></div>
        <div class="detail-item"><span>Percentage</span><strong>${pct(result.percentage)}</strong></div>
        <div class="detail-item"><span>Result</span><strong>${result.resultStatus}</strong></div>
      </div>` : '';
    const resumeMeta = view === 'my' && state.sessionStarted ? `
      <div class="detail-grid">
        <div class="detail-item"><span>Attempt</span><strong>#${exam.attemptNumber || 1}</strong></div>
        <div class="detail-item"><span>Score</span><strong>${exam.percentage || result?.percentage || 0}%</strong></div>
        <div class="detail-item"><span>Obtained</span><strong>${exam.obtainedMarks || result?.score || 0}/${exam.totalMarks}</strong></div>
        <div class="detail-item"><span>Time Taken</span><strong>${formatDuration(exam.timeTakenSeconds || result?.timeTakenSeconds || 0)}</strong></div>
      </div>` : '';
    return `
      <article class="exam-card ${view === 'my' ? 'my-exam-card' : ''}" data-status="${exam.status}" data-exam-view="${view}" data-exam-code="${exam.examCode}">
        <div class="exam-top">
          <div>
            <h3 class="exam-title">${exam.title}</h3>
            <div class="meta-line">
              <span class="code-badge">${exam.examCode}</span>
              <span class="status-badge ${view === 'my' ? examGroupTone(exam, view) : examGroupTone(exam, view)}">${examVisibleLabel(exam, view)}</span>
              ${verificationBadge}
              <span class="access-badge ${access.disabled ? 'locked' : accessTone}">${access.hint}</span>
            </div>
            <p class="exam-subject">${exam.subject}</p>
          </div>
        </div>
        <div class="exam-signal-grid">
          ${proctoringIndicator}
          ${attemptCounter}
        </div>
        <div class="section-block">
          <div class="exam-core-grid">
            <div class="detail-item"><span>Duration</span><strong>${exam.durationMinutes} min</strong></div>
            <div class="detail-item"><span>Total Marks</span><strong>${exam.totalMarks}</strong></div>
            <div class="detail-item"><span>Passing Marks</span><strong>${exam.passingMarks}</strong></div>
          </div>
          <div class="exam-aux-grid">
            <div class="detail-item"><span>Negative</span><strong>${exam.negativeMarks}</strong></div>
            <div class="detail-item"><span>Max Attempts</span><strong>${exam.maxAttempts}</strong></div>
            <div class="detail-item"><span>Window</span><strong>${state.live ? 'Live' : state.expired ? 'Closed' : 'Scheduled'}</strong></div>
          </div>
        </div>
        <div class="section-block">
          <div class="timing-grid">
            <div class="timing-item"><span>Start Time</span><strong>${formatExamTime(exam)}</strong></div>
            <div class="timing-item"><span>End Time</span><strong>${new Date(state.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
            <div class="timing-item"><span>Access</span><strong>${access.hint}</strong></div>
          </div>
        </div>
        <div class="section-block">
          <div class="difficulty-grid">
            <div class="difficulty-row"><div class="difficulty-row-header"><span class="difficulty-label">Easy Questions</span><strong>${exam.easyQuestionCount}</strong></div><div class="progress-track"><div class="progress-fill easy" style="width:${progressWidth('easy', exam)}%"></div></div></div>
            <div class="difficulty-row"><div class="difficulty-row-header"><span class="difficulty-label">Medium Questions</span><strong>${exam.mediumQuestionCount}</strong></div><div class="progress-track"><div class="progress-fill medium" style="width:${progressWidth('medium', exam)}%"></div></div></div>
            <div class="difficulty-row"><div class="difficulty-row-header"><span class="difficulty-label">Hard Questions</span><strong>${exam.difficultQuestionCount}</strong></div><div class="progress-track"><div class="progress-fill hard" style="width:${progressWidth('hard', exam)}%"></div></div></div>
          </div>
        </div>
        ${metrics}
        ${resumeMeta}
        ${timeRemainingBadge ? `<div class="time-remaining-row">${timeRemainingBadge}</div>` : ''}
        <div class="card-actions">
          <button class="btn ${access.tone === 'primary' ? 'primary' : 'ghost'}" type="button" data-action="${access.action}" data-code="${exam.examCode}" ${access.disabled ? 'disabled' : ''}>${access.label}</button>
          <button class="btn ghost" type="button" data-action="exam-instructions" data-code="${exam.examCode}">Instructions</button>
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
      reexam: visible.filter((exam) => myExamGroup(exam) === 'reexam')
    };

    el.registeredGrid.innerHTML = groups.registered.length ? groups.registered.slice().sort(sortExamStartAsc).map((exam) => examCardHtml(exam, 'my')).join('') : examEmptyState('No registered exams', 'Register for an exam to see it here.');
    el.resumeMyGrid.innerHTML = groups.resume.length ? groups.resume.slice().sort(sortExamStartAsc).map((exam) => examCardHtml(exam, 'my')).join('') : examEmptyState('No resume sessions', 'Saved attempts will appear here when a session is in progress.');
    el.reexamGrid.innerHTML = groups.reexam.length ? groups.reexam.slice().sort(sortExamEndDesc).map((exam) => examCardHtml(exam, 'my')).join('') : examEmptyState('No re-exam opportunities', 'Failed attempts eligible for retry will appear here.');

    const visibleCount = visible.length;
    el.myExamSummaryPill.textContent = `${visibleCount} visible ${visibleCount === 1 ? 'exam' : 'exams'}`;
    el.registeredCount.textContent = groups.registered.length;
    el.resumeMyCount.textContent = groups.resume.length;
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
    const high = total ? Math.max(...rows.map((row) => Number(row.score || 0))) : 0;
    const pass = total ? (rows.filter((row) => row.passed).length / total) * 100 : 0;
    const cards = [
      ['Total Exams', total, 'dashboard', 'blue', 'Submitted result entries'],
      ['Average Percentage', pct(avg), 'analytics', 'purple', 'Across all completed attempts'],
      ['Highest Score', `${high}`, 'star', 'green', 'Top score achieved'],
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
  function resultsFilterValue(row) {
    const f = el.resultsFilter.value;
    if (f === 'all') return true;
    if (f === 'passed') return !!row.passed;
    if (f === 'failed') return !row.passed;
    if (f === 'highscore') return Number(row.percentage || 0) >= 90;
    if (f === 'recent') return true;
    return true;
  }
  function renderResultsTable() {
    const q = (el.resultsSearch.value.trim() || st.q).toLowerCase();
    const f = el.resultsFilter.value;
    const rows = st.data.results
      .slice()
      .sort(sortBySubmittedAtDesc)
      .filter((r) => (!q || [r.examCode, r.resultStatus, formatDate(r.submittedAt)].some((v) => String(v).toLowerCase().includes(q))) && resultsFilterValue(r));
    const output = f === 'recent' ? rows.slice(0, 3) : rows;
    el.resultsBody.innerHTML = output.length ? output.map((r) => `
      <tr class="clickable-row result-row" data-detail="result" data-code="${r.examCode}">
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
          <button class="btn ghost small result-action" type="button" data-action="result-view" data-code="${r.examCode}">View</button>
        </td>
      </tr>`).join('') : `<tr class="empty-row"><td colspan="10" class="empty-state"><strong>No results match the selected filters.</strong><span>Try clearing the search or choose a different status.</span></td></tr>`;
  }
  const gradeOrder = { 'A+': 5, A: 4, 'B+': 3, B: 2, 'C+': 1, C: 0 };
  const certStatusLabel = (revoked) => (revoked ? 'REVOKED' : 'VERIFIED');
  const certStatusClass = (revoked) => (revoked ? 'fail' : 'pass');
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
      <article class="card cert-card certificate-card" data-cert="${c.certificateId}">
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
          <div class="detail-item"><span>Score</span><strong>${c.score}%</strong></div>
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
    return activeLeaderboardRows().map((row) => ({ ...row }));
  }

  function renderSummary(rows) {
    const total = rows.length;
    const top = rows.reduce((acc, row) => (row.percentage > (acc?.percentage ?? -Infinity) ? row : acc), rows[0] || null);
    const avg = total ? rows.reduce((sum, row) => sum + Number(row.percentage || 0), 0) / total : 0;
    const cards = [
      { label: 'Top Score', value: top ? pct(top.percentage) : '-', icon: 'star', tone: 'blue', hint: top ? top.studentName : 'No students yet' },
      { label: 'Total Participants', value: total, icon: 'dashboard', tone: 'purple', hint: `${st.leaderboard.mode === 'global' ? 'Global' : 'Exam'} cohort` },
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
        <div class="rank-stat"><span>Score</span><strong>${user.score}</strong></div>
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
          <p>${row.score} score points</p>
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
          <td>${row.score}</td>
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
    st.data.leaderboard[mode] = leaderboardShuffle(st.data.leaderboard[mode] || []);
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
  function renderAnalyticsCharts() { drawLine($('performanceTrendChart'), st.data.dash.trend); drawLine($('analyticsLineChart'), [9,12,15,18,16,19,22,24]); drawBars($('analyticsBarChart'), [88,76,91,84,93,89]); drawDonut($('analyticsDonutChart'), [{ label:'High', value:42, color:'#3b82f6' }, { label:'Mid', value:36, color:'#8b5cf6' }, { label:'Low', value:22, color:'#22c55e' }]); if (el.chartPlaceholder) el.chartPlaceholder.classList.add('hidden'); }
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
  function drawLine(canvas, data) { if (!canvas) return; const ctx = canvas.getContext('2d'); const dpr = devicePixelRatio || 1; const r = canvas.getBoundingClientRect(); const w = Math.max(r.width, 280), h = Math.max(r.height, 220); canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h); const pad = 30, max = Math.max(...data, 1), min = Math.min(...data, 0); ctx.strokeStyle = 'rgba(148,163,184,.18)'; for (let i = 0; i < 4; i++) { const y = pad + ((h - pad * 2) / 3) * i; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); } ctx.beginPath(); data.forEach((v, i) => { const x = pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1); const y = pad + (h - pad * 2) * (1 - (v - min) / ((max - min) || 1)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.strokeStyle = 'rgba(59,130,246,.95)'; ctx.lineWidth = 3; ctx.stroke(); const g = ctx.createLinearGradient(0, 0, 0, h - pad); g.addColorStop(0, 'rgba(59,130,246,.28)'); g.addColorStop(1, 'rgba(59,130,246,.02)'); ctx.lineTo(w - pad, h - pad); ctx.lineTo(pad, h - pad); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); }
  function drawBars(canvas, data) { if (!canvas) return; const ctx = canvas.getContext('2d'); const dpr = devicePixelRatio || 1; const r = canvas.getBoundingClientRect(); const w = Math.max(r.width, 280), h = Math.max(r.height, 220); canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h); const pad = 28, gap = 12, bw = (w - pad * 2 - gap * (data.length - 1)) / data.length; data.forEach((v, i) => { const bh = (h - pad * 2) * (v / 100), x = pad + i * (bw + gap), y = h - pad - bh, g = ctx.createLinearGradient(0, y, 0, h - pad); g.addColorStop(0, 'rgba(139,92,246,.9)'); g.addColorStop(1, 'rgba(59,130,246,.45)'); ctx.fillStyle = g; ctx.fillRect(x, y, bw, bh); }); }
  function drawDonut(canvas, parts) { if (!canvas) return; const ctx = canvas.getContext('2d'); const dpr = devicePixelRatio || 1; const r = canvas.getBoundingClientRect(); const w = Math.max(r.width, 280), h = Math.max(r.height, 220); canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h); const total = parts.reduce((s, p) => s + p.value, 0); let a = -Math.PI / 2; const cx = w / 2, cy = h / 2 + 6, rr = Math.min(w, h) / 4; parts.forEach((p) => { const ang = (p.value / total) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx, cy, rr, a, a + ang); ctx.lineWidth = 22; ctx.strokeStyle = p.color; ctx.stroke(); a += ang; }); ctx.fillStyle = '#0f172a'; ctx.font = '700 16px DM Sans'; ctx.textAlign = 'center'; ctx.fillText('Score Mix', cx, cy); ctx.font = '500 12px DM Sans'; ctx.fillText('Distribution', cx, cy + 18); }
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
    if (st.sec === 'analytics') renderAnalyticsCharts();
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
            <span>${formatDate(state.startAt)}</span>
            <span>${formatExamTime(exam)} - ${new Date(state.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
      const r = st.data.results.find((x) => x.examCode === code);
      if (!r) return;
      const totalAnswered = (r.correctAnswers || 0) + (r.wrongAnswers || 0) + (r.unansweredQuestions || 0);
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
              <div class="detail-grid">
                <div><span>Total Questions</span><strong>${r.totalQuestions}</strong></div>
                <div><span>Correct Answers</span><strong>${r.correctAnswers}</strong></div>
                <div><span>Wrong Answers</span><strong>${r.wrongAnswers}</strong></div>
                <div><span>Unanswered</span><strong>${r.unansweredQuestions}</strong></div>
              </div>
            </div>
            <div class="result-modal-panel">
              <h5>Difficulty Split</h5>
              <div class="detail-grid">
                <div><span>Easy Correct</span><strong>${r.easyCorrect}</strong></div>
                <div><span>Medium Correct</span><strong>${r.mediumCorrect}</strong></div>
                <div><span>Hard Correct</span><strong>${r.hardCorrect}</strong></div>
                <div><span>Easy Wrong</span><strong>${r.easyWrong}</strong></div>
                <div><span>Medium Wrong</span><strong>${r.mediumWrong}</strong></div>
                <div><span>Hard Wrong</span><strong>${r.hardWrong}</strong></div>
              </div>
            </div>
          </div>
          <div class="result-modal-note">
            <strong>Submission Summary</strong>
            <p>${totalAnswered}/${r.totalQuestions} questions were answered, with ${r.correctAnswers} correct and ${r.wrongAnswers} incorrect responses.</p>
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
      modal({ kicker:'Leaderboard Student', title:r.studentName, body:`<div class="detail-grid"><div><span>Rank</span><strong>#${r.rank}</strong></div><div><span>Score</span><strong>${r.score}</strong></div><div><span>Percentage</span><strong>${pct(r.percentage)}</strong></div><div><span>Performance</span><strong>${info.label}</strong></div></div>`, foot:'<button class="btn ghost" data-close-modal type="button">Close</button>' });
      return;
    }
    if (type === 'certificate') {
      const c = st.data.certs.find((x) => x.certificateId === code);
      if (!c) return;
      modal({
        kicker: 'Certificate Details',
        title: `${c.certificateId} - ${c.examTitle}`,
        body: `
          <div class="result-modal-hero">
            <div>
              <span class="result-modal-code">${c.certificateId}</span>
              <h4>${c.examTitle}</h4>
              <p>${c.studentName} | ${c.collegeName}</p>
            </div>
            <span class="result-badge ${c.revoked ? 'fail' : 'pass'}">${certStatusLabel(c.revoked)}</span>
          </div>
          <div class="result-modal-grid">
            <div class="result-modal-panel">
              <h5>Student Info</h5>
              <div class="detail-grid">
                <div><span>Student Name</span><strong>${c.studentName}</strong></div>
                <div><span>College</span><strong>${c.collegeName}</strong></div>
                <div><span>Department</span><strong>${c.department}</strong></div>
                <div><span>Roll Number</span><strong>${c.rollNumber}</strong></div>
              </div>
            </div>
            <div class="result-modal-panel">
              <h5>Certificate Info</h5>
              <div class="detail-grid">
                <div><span>Score</span><strong>${c.score}%</strong></div>
                <div><span>Grade</span><strong>${c.grade}</strong></div>
                <div><span>Issued Date</span><strong>${formatDate(c.issuedAt)}</strong></div>
                <div><span>QR Text</span><strong>${c.qrCodeData}</strong></div>
              </div>
            </div>
          </div>
          <div class="result-modal-note">
            <strong>Verification Status</strong>
            <p>${c.revoked ? 'This certificate has been revoked locally in the UI preview.' : 'This certificate is currently verified and available for download.'}</p>
          </div>
        `,
        foot: `
          <button class="btn ghost" data-close-modal type="button">Close</button>
          <button class="btn primary" data-action="certificate-download" data-code="${c.certificateId}" type="button">Download</button>`
      });
    }
  }
  function action(type, code, view = '') {
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
        foot: `
          <button class="btn ghost" data-close-modal type="button">Close</button>
          <button class="btn primary" data-action="${e.status === 'upcoming' ? 'exam-schedule' : 'exam-start'}" data-code="${e.examCode}" type="button">
            ${e.status === 'resume' ? 'Resume Exam' : e.status === 'upcoming' ? 'View Schedule' : 'Start Exam'}
          </button>`
      });
      return;
    }
    if (type === 'exam-detail') {
      const e = st.data.exams.find(x => x.examCode === code);
      if (!e) return;
      const totalQuestions = toNumber(e.totalQuestions, toNumber(e.easyQuestionCount) + toNumber(e.mediumQuestionCount) + toNumber(e.difficultQuestionCount));
      modal({ kicker:'Exam Details', title:`${e.examCode} - ${e.subject}`, body:`<div class="detail-grid"><div><span>Status</span><strong>${e.status}</strong></div><div><span>Duration</span><strong>${toNumber(e.durationMinutes)} min</strong></div><div><span>Questions</span><strong>${totalQuestions}</strong></div><div><span>Negative Marks</span><strong>${toNumber(e.negativeMarks)}</strong></div><div><span>Schedule</span><strong>${formatExamDateTime(e)}</strong></div></div><p class="card-copy">${e.description || 'No description available.'}</p>`, foot:`<button class="btn ghost" data-close-modal type="button">Close</button><button class="btn primary" data-action="exam-start" data-code="${e.examCode}" type="button">Open Exam</button>` });
      return;
    }
    if (type === 'exam-start') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      openExamVerification(e, 'start');
      toast('Verification started', 'Complete the secure pre-exam checks to continue.', 'info');
      return;
    }
    if (type === 'exam-register') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      openExamVerification(e, 'register');
      toast('Registration verification started', 'Complete the secure checks to unlock this exam.', 'info');
      return;
    }
    if (type === 'exam-enter') {
      const e = st.data.exams.find((x) => x.examCode === code);
      if (!e) return;
      openExamAccess(e);
      return;
    }
    if (type === 'exam-enter-confirm') {
      closeModal();
      toast('Exam entry opened', 'You can now proceed to the exam workspace.', 'success');
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
      const blob = new Blob([`Certificate ID: ${c.certificateId}\nExam Title: ${c.examTitle}\nStudent: ${c.studentName}\nCollege: ${c.collegeName}\nDepartment: ${c.department}\nRoll Number: ${c.rollNumber}\nScore: ${c.score}%\nGrade: ${c.grade}\nIssued: ${c.issuedAt}\nStatus: ${c.revoked ? 'REVOKED' : 'VERIFIED'}\nQR: ${c.qrCodeData}\n`], { type:'text/plain;charset=utf-8' });
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `${c.certificateId}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 500);
      toast('Download started', `${code} has been downloaded.`, 'success');
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
    const delay = actionType === 'certificate-download' ? 650 : actionType === 'exam-start' ? 520 : actionType === 'exam-instructions' ? 420 : 360;
    const text = actionLoadingText(actionType, code, btn);
    setButtonBusy(btn, text);
    setTimeout(() => {
      try {
        action(actionType, code, btn.dataset.view || '');
      } finally {
        restoreButton(btn);
      }
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
  function setProfileEditable(on) {
    $$('input', el.profileForm).forEach((input) => {
      if (input.id === 'email') {
        input.setAttribute('readonly', 'readonly');
        return;
      }
      input.toggleAttribute('readonly', !on);
    });
    toast(on ? 'Edit mode enabled' : 'Edit mode disabled', on ? 'You can now update profile values.' : 'Profile editing locked.', 'info');
  }
  async function saveProfile() {
    const f = new FormData(el.profileForm);
    const payload = {
      fullName: String(f.get('fullName') || '').trim(),
      email: String(f.get('email') || st.profile.email || '').trim(),
      phone: String(f.get('phone') || '').trim(),
      collegeName: String(f.get('collegeName') || '').trim(),
      department: String(f.get('department') || '').trim(),
      year: String(f.get('year') || '').trim(),
      rollNumber: String(f.get('rollNumber') || '').trim(),
      section: String(f.get('section') || '').trim(),
      profilePhoto: st.profile.profilePhoto || ''
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
      profilePhoto: saved?.profilePhoto || st.profile.profilePhoto || ''
    };
    applyProfile();
    setProfileEditable(false);
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
    el.notifBtn.addEventListener('click', () => el.notifyDrop.classList.toggle('open'));
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
    $('resultsFilter').addEventListener('change', renderResultsTable);
    $('resultsSearch').addEventListener('input', renderResultsTable);
    $('resultsResetBtn').addEventListener('click', (e) => {
      runButtonFeedback(e.currentTarget, 'Resetting...', () => {
        $('resultsFilter').value = 'all';
        $('resultsSearch').value = '';
        renderResultsTable();
        toast('Results reset', 'Result filters cleared.', 'info');
      }, 420);
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
    $('editProfileBtn').addEventListener('click', (e) => runButtonFeedback(e.currentTarget, 'Opening editor...', () => setProfileEditable(true), 360));
    $('saveProfileBtn').addEventListener('click', (e) => runButtonFeedback(e.currentTarget, 'Saving profile...', () => saveProfile(), 520));
    $('profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = $('saveProfileBtn');
      runButtonFeedback(btn, 'Saving profile...', () => saveProfile(), 520);
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
            if (st.examUi.step < 5) {
              moveVerificationStep(st.examUi.step + 1);
              return;
            }
            if ((st.examUi.mode || 'start') === 'register' && st.examUi.step === 5) {
              moveVerificationStep(6);
              return;
            }
            if ((st.examUi.mode || 'start') === 'register' && st.examUi.step === 6) {
              moveVerificationStep(7);
              return;
            }
            if (st.examUi.mode === 'register' && st.examUi.step === 7 && !isStep6Valid()) {
              return toast('Confirmation required', 'Please confirm the reviewed registration details.', 'warn');
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
        runActionWithFeedback(a);
        return;
      }
      const r = e.target.closest('[data-detail]');
      if (r) openDetail(r.dataset.detail, r.dataset.code);
      if (e.target.matches('[data-close-modal]')) closeModal();
      if (!el.profileDd.contains(e.target)) { el.profileMenu.classList.remove('open'); el.profileMenuBtn.setAttribute('aria-expanded', 'false'); }
      if (!el.notifBtn.contains(e.target) && !el.notifyDrop.contains(e.target)) el.notifyDrop.classList.remove('open');
      if (!el.sidebar.contains(e.target) && !el.toggle.contains(e.target) && isMobile()) closeSidebar();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeExamVerification(); el.profileMenu.classList.remove('open'); el.notifyDrop.classList.remove('open'); closeSidebar(); } });
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
    setTimeout(() => { booting = false; renderCards(); renderAllTables(); renderAnalyticsCharts(); toast('Student UI ready', 'Enterprise dashboard shell has loaded.', 'success'); refresh(); }, 450);
  }
  document.addEventListener('DOMContentLoaded', () => { init().catch((error) => console.error('Student UI init failed:', error)); });
  window.studentUI = { renderCards, renderChart: renderAnalyticsCharts, renderTable: renderAllTables, renderLeaderboard };
})();


