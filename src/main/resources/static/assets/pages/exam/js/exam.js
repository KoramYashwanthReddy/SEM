// exam.js - Main Application Logic

// Production exam runtime uses backend questions only.

const AUTH_KEYS = ['token', 'accessToken', 'jwt', 'authToken', 'access_token'];
const API_BASE = /^https?:/i.test(window.location.origin) ? window.location.origin : 'http://localhost:8080';
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
const getAuthToken = () => {
  for (const key of AUTH_KEYS) {
    const localValue = normalizeToken(localStorage.getItem(key));
    if (localValue) return localValue;
    const sessionValue = normalizeToken(sessionStorage.getItem(key));
    if (sessionValue) return sessionValue;
  }
  return '';
};
const apiRequest = async (path, options = {}) => {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers
  });
  const text = await res.text();
  if (!res.ok) {
    let body = text;
    try { body = JSON.parse(text); } catch (_) {}
    const message = body && typeof body === 'object' ? (body.message || body.error || body.detail || body.cause) : (typeof body === 'string' ? body : '');
    throw new Error(message || `Request failed (${res.status})`);
  }
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { return text; }
};
const getQueryParam = (key) => new URLSearchParams(window.location.search).get(key);
const getExamAttemptId = () => {
  const raw = getQueryParam('attemptId');
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};
const EVENT_THROTTLE_MS = 1200;
const eventThrottleBucket = new Map();
const shouldThrottleEvent = (key) => {
  const now = Date.now();
  const prev = eventThrottleBucket.get(key) || 0;
  if (now - prev < EVENT_THROTTLE_MS) return true;
  eventThrottleBucket.set(key, now);
  return false;
};
const logExamEvent = async (payload = {}) => {
  const attemptId = Number(payload.attemptId || getExamAttemptId());
  if (!Number.isFinite(attemptId) || attemptId <= 0) return;
  const eventType = String(payload.eventType || '').trim().toUpperCase();
  if (!eventType) return;
  const dedupeKey = payload.dedupeKey ? `${eventType}:${payload.dedupeKey}` : '';
  if (dedupeKey && shouldThrottleEvent(dedupeKey)) return;
  const body = {
    attemptId,
    eventType,
    details: String(payload.details || ''),
    evidenceUrl: payload.evidenceUrl ? String(payload.evidenceUrl) : null,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null
  };
  try {
    await apiRequest('/proctoring/event', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.warn('Failed to log exam event:', error?.message || error);
  }
};
window.__examAuditLogger = logExamEvent;
const normalizeDifficulty = (raw) => {
  if (!raw) return 'Medium';
  const value = String(raw).trim().toLowerCase();
  if (value === 'difficult') return 'Hard';
  return value.charAt(0).toUpperCase() + value.slice(1);
};
const toExamQuestion = (q) => {
  if (!q) return null;
  const optionPool = Array.isArray(q.options)
    ? q.options
    : (Array.isArray(q.allOptions) ? q.allOptions : [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE, q.optionF]);
  const rawOptions = optionPool
    .filter((opt) => opt != null && String(opt).trim() !== '');
  const type = String(q.questionType || '').toLowerCase();
  let mappedType = 'mcq';
  if (type.includes('multiple') && type.includes('choice')) mappedType = 'mscq';
  else if (type.includes('multiple')) mappedType = 'mscq';
  else if (type.includes('descriptive') || type.includes('subjective')) mappedType = 'descriptive';
  else if (type.includes('code') || type.includes('coding') || type.includes('programming')) mappedType = 'coding';
  const marks = Number.isFinite(Number(q.marks)) ? Number(q.marks) : 4;
  const negative = Math.max(1, Math.round(marks * 0.25));
  return {
    id: q.id,
    displayOrder: Number.isFinite(Number(q.displayOrder)) ? Number(q.displayOrder) : null,
    type: mappedType,
    section: q.topic || q.examCode || 'Exam',
    difficulty: normalizeDifficulty(q.difficulty),
    points: `+${marks} / -${negative}`,
    text: q.questionText || q.question || q.text || '',
    options: rawOptions,
    sampleInput: q.sampleInput || '',
    sampleOutput: q.sampleOutput || ''
  };
};
const loadExamQuestions = async (examCode) => {
  if (!examCode) throw new Error('Missing exam code');
  const response = await apiRequest(`/student/exam/${encodeURIComponent(examCode)}/questions`, { method: 'GET' });
  if (!Array.isArray(response)) throw new Error('Unexpected backend response');
  const questions = response.map(toExamQuestion).filter(Boolean);
  if (questions.length === 0) throw new Error('No questions were returned from the exam backend');
  questions.sort((a, b) => {
    const aOrder = Number.isFinite(Number(a.displayOrder)) ? Number(a.displayOrder) : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const order = ['Easy', 'Medium', 'Hard'];
    const ai = order.indexOf(a.difficulty);
    const bi = order.indexOf(b.difficulty);
    if (ai !== bi) return ai - bi;
    return Number(a.id) - Number(b.id);
  });
  return questions;
};
const enableStartButtonWhenConsented = () => {
  const consent = document.getElementById('setup-consent-chk');
  const startBtn = document.getElementById('start-exam-btn');
  if (!startBtn) return;
  const updateState = () => { startBtn.disabled = consent ? !consent.checked : false; };
  if (consent) consent.addEventListener('change', updateState);
  updateState();
  startBtn.addEventListener('click', () => {
    if (consent && !consent.checked) return;
    logExamEvent({
      eventType: 'EXAM_SETUP_CONFIRMED',
      details: 'Student confirmed proctoring setup and started exam',
      metadata: { consentAccepted: Boolean(consent?.checked) },
      dedupeKey: 'setup-start'
    });
    const overlay = document.getElementById('proctoring-setup-overlay');
    if (overlay) overlay.classList.remove('active');
    if (window.examController?.timer) window.examController.timer.start();
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });
};
const initializeExamPage = async () => {
  const examCode = getQueryParam('code');
  const attemptId = getExamAttemptId();
  const overlay = document.getElementById('proctoring-setup-overlay');
  const errorMessage = document.getElementById('setup-error-msg');

  if (!examCode || !attemptId) {
    document.body.innerHTML = `<div style="padding:3rem;text-align:center;"><h1>Exam load failed</h1><p>Missing exam code or attempt ID. Please return to the student dashboard and enter the exam again.</p></div>`;
    return;
  }

  enableStartButtonWhenConsented();
  if (overlay) overlay.classList.add('active');

  try {
    const questions = await loadExamQuestions(examCode);
    const controller = new ExamController(questions, attemptId);
    await controller.initializeAttemptState();
  } catch (error) {
    console.error('Failed to load backend questions:', error);
    if (errorMessage) {
      errorMessage.textContent = error.message || 'Unable to load exam questions from backend.';
      errorMessage.style.display = 'block';
    }
    const appContainer = document.body.querySelector('.app-container');
    if (appContainer) appContainer.classList.add('hide');
    return;
  }
};

class ExamController {
  constructor(questions, attemptId) {
    this.questions = questions;
    this.currentQIndex = 0;
    this.attemptId = attemptId;
    this.heartbeatInterval = null;
    
    // State storage: { questionId: { answer: string|array, status: string } }
    this.answers = {};
    this.maxMarkReviewPerLevel = { 'Easy': 5, 'Medium': 5, 'Hard': 5 }; // Max 5 items per level can be marked for review
    
    // DOM Elements
    this.qNumEl = document.getElementById('current-q-num');
    this.qTextEl = document.getElementById('question-text');
    this.optionsContainer = document.getElementById('options-container');
    this.qTypeBadge = document.getElementById('q-type-badge');
    this.qPointsEl = document.getElementById('q-points');
    this.qDifficultyEl = document.getElementById('q-difficulty');
    this.sectionNameEl = document.getElementById('section-name');
    this.qProgressEl = document.getElementById('q-progress');
    this.wrapper = document.getElementById('question-wrapper');
    this.progressBar = document.getElementById('exam-progress-bar');
    this.markReviewChk = document.getElementById('mark-review-chk');
    this.markReviewCountEl = document.getElementById('mark-review-count');
    this.clearBtn = document.getElementById('clear-response-btn');
    
    this.submitBtn = document.getElementById('header-submit-btn');
    this.submitModal = document.getElementById('submit-modal');
    this.confirmSubmitBtn = document.getElementById('confirm-submit-btn');
    this.cancelSubmitBtn = document.getElementById('cancel-submit-btn');
    this.reviewAnswersBtn = document.getElementById('review-answers-btn');
    
    // Review Modal
    this.reviewModal = document.getElementById('review-modal');
    this.reviewList = document.getElementById('review-answers-list');
    this.closeReviewBtn = document.getElementById('close-review-btn');
    this.backToSubmitBtn = document.getElementById('back-to-submit-btn');
    
    // Time Up Modal
    this.timeUpModal = document.getElementById('time-up-modal');
    this.timeUpOkBtn = document.getElementById('time-up-ok-btn');

    this.init();
  }

  init() {
    // Initialize components
    this.palette = new QuestionPalette(this.questions, (idx) => this.jumpTo(idx));
    this.nav = new ExamNavigation(this);
    
    // 5 minute timer
    this.timer = new ExamTimer(300, 'exam-timer', () => this.submitExam(true));
    // Timer start is now handled by ProctoringSystem upon clicking "Start Examination"
    // this.timer.start();

    // Init state
    this.questions.forEach(q => {
       this.answers[q.id] = { answer: null, status: 'not-visited', marked: false };
    });
    this.logAction('EXAM_SESSION_OPENED', 'Student opened exam session', {
      questionCount: this.questions.length
    });

    // Modals
    if (this.submitBtn) {
       this.submitBtn.addEventListener('click', () => this.showSubmitModal());
    }
    if (this.cancelSubmitBtn) {
       this.cancelSubmitBtn.addEventListener('click', () => this.submitModal.classList.remove('active'));
    }
    if (this.confirmSubmitBtn) {
       this.confirmSubmitBtn.addEventListener('click', () => this.submitExam(false));
    }
    if (this.reviewAnswersBtn) {
       this.reviewAnswersBtn.addEventListener('click', () => this.showReviewModal());
    }
    if (this.closeReviewBtn) {
       this.closeReviewBtn.addEventListener('click', () => this.reviewModal.classList.remove('active'));
    }
    if (this.backToSubmitBtn) {
       this.backToSubmitBtn.addEventListener('click', () => {
          this.reviewModal.classList.remove('active');
          this.submitModal.classList.add('active');
       });
    }
    if (this.timeUpOkBtn) {
       this.timeUpOkBtn.addEventListener('click', () => {
          this.renderFinalSuccess(true);
       });
    }

    // Instructions Card Logic
    const instBtn = document.getElementById('instructions-btn');
    const instCard = document.getElementById('instructions-card');
    const closeInstBtn = document.getElementById('close-instructions-btn');
    
    if(instBtn && instCard && closeInstBtn) {
       instBtn.addEventListener('click', () => instCard.classList.toggle('active'));
       closeInstBtn.addEventListener('click', () => instCard.classList.remove('active'));
    }

    // Don't render until backend sync completes, so persisted answers are visible immediately.
    window.examController = this;
  }

  logAction(eventType, details, metadata = {}, dedupeKey = '') {
    logExamEvent({
      attemptId: this.attemptId,
      eventType,
      details,
      metadata: {
        examCode: getQueryParam('code') || '',
        ...metadata
      },
      dedupeKey
    });
  }

  renderQuestion() {
    const q = this.questions[this.currentQIndex];
    if (!q) return;

    // Trigger animation
    this.wrapper.classList.remove('fade-in');
    void this.wrapper.offsetWidth; // trigger reflow
    this.wrapper.classList.add('fade-in');

    // Update Meta
    const displayNumber = this.currentQIndex + 1;
    this.qNumEl.textContent = displayNumber;
    this.qTextEl.textContent = q.text;
    this.qTypeBadge.textContent = this.getTypeLabel(q.type);
    this.qPointsEl.textContent = q.points;
    this.qDifficultyEl.textContent = q.difficulty;
    this.qDifficultyEl.className = 'exam-badge badge-' + q.difficulty.toLowerCase();
    this.sectionNameEl.textContent = `Section: ${q.section}`;
    this.qProgressEl.textContent = `${displayNumber}/${this.questions.length}`;
    this.logAction('ACTION_QUESTION_VIEWED', `Viewed question ${displayNumber}`, {
      questionId: q.id,
      questionNumber: displayNumber,
      difficulty: q.difficulty,
      section: q.section
    }, `question-view-${q.id}`);

    // Progress Bar
    const progressPercent = (displayNumber / this.questions.length) * 100;
    this.progressBar.style.width = `${progressPercent}%`;

    // State bindings
    const state = this.answers[q.id];
    
    // Mark for review check
    this.markReviewChk.checked = state.marked;
    this.updateMarkCountUI();
    
    // Clear btn visibility
    this.clearBtn.classList.toggle('hide', state.answer === null || state.answer === "" || (Array.isArray(state.answer) && state.answer.length === 0));

    // Update status to not-answered if it was not-visited
    if (state.status === 'not-visited') {
       state.status = 'not-answered';
       this.updatePaletteStatus(q.id);
    }
    
    this.palette.setActive(q.id);

    // Render Options Interface
    this.optionsContainer.innerHTML = '';
    
    if (q.type === 'mcq') {
       if (!Array.isArray(q.options) || q.options.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'empty-hint';
          empty.textContent = 'Options are not available for this question.';
          this.optionsContainer.appendChild(empty);
          return;
       }
       q.options.forEach((opt, idx) => {
          const label = document.createElement('label');
          label.className = 'option-label';
          
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = `q_${q.id}`;
          input.value = opt;
          input.className = 'option-input';
          
          if (state.answer === opt) {
             input.checked = true;
             label.classList.add('selected');
          }
          
          input.addEventListener('change', (e) => {
             // visually update selected class
             document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(inp => {
                inp.parentElement.classList.remove('selected');
             });
             if (e.target.checked) label.classList.add('selected');
             
             this.saveLocalAnswer(opt);
          });
          
          label.appendChild(input);
          label.appendChild(document.createTextNode(opt));
          this.optionsContainer.appendChild(label);
       });
    } 
    else if (q.type === 'mscq') {
       if (!Array.isArray(q.options) || q.options.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'empty-hint';
          empty.textContent = 'Options are not available for this question.';
          this.optionsContainer.appendChild(empty);
          return;
       }
       q.options.forEach((opt, idx) => {
          const label = document.createElement('label');
          label.className = 'option-label';
          
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.name = `q_${q.id}`;
          input.value = opt;
          input.className = 'option-input';
          
          const currentAnswers = Array.isArray(state.answer) ? state.answer : [];
          if (currentAnswers.includes(opt)) {
             input.checked = true;
             label.classList.add('selected');
          }
          
          input.addEventListener('change', (e) => {
             if (e.target.checked) label.classList.add('selected');
             else label.classList.remove('selected');
             
             const selected = Array.from(document.querySelectorAll(`input[name="q_${q.id}"]:checked`)).map(cb => cb.value);
             this.saveLocalAnswer(selected);
          });
          
          label.appendChild(input);
          label.appendChild(document.createTextNode(opt));
          this.optionsContainer.appendChild(label);
       });
    }
    else if (q.type === 'descriptive') {
       const textarea = document.createElement('textarea');
       textarea.className = 'text-answer';
       textarea.placeholder = 'Type your answer here...';
       if (state.answer) textarea.value = state.answer;
       
       textarea.addEventListener('input', (e) => {
          this.saveLocalAnswer(e.target.value);
       });
       
       this.optionsContainer.appendChild(textarea);
    }
    else if (q.type === 'coding') {
       const textarea = document.createElement('textarea');
       textarea.className = 'code-editor';
       textarea.spellcheck = false;
       textarea.placeholder = '# Write your code here...';
       if (state.answer) textarea.value = state.answer;
       
       textarea.addEventListener('input', (e) => {
          this.saveLocalAnswer(e.target.value);
       });
       
       this.optionsContainer.appendChild(textarea);
    }
  }

  getTypeLabel(type) {
    switch(type) {
       case 'mcq': return 'Single Choice';
       case 'mscq': return 'Multiple Choice';
       case 'descriptive': return 'Subjective';
       case 'coding': return 'Programming';
       default: return 'Question';
    }
  }

  saveLocalAnswer(value) {
    const qId = this.questions[this.currentQIndex].id;
    const state = this.answers[qId];
    state.answer = value;
    
    const hasAnswer = this.hasValidAnswer(value);
    
    if (hasAnswer) {
       state.status = 'answered';
       this.clearBtn.classList.remove('hide');
    } else {
       state.status = 'not-answered';
       this.clearBtn.classList.add('hide');
    }
    
    this.updatePaletteStatus(qId);
    this.logAction('ACTION_ANSWER_UPDATED', `Updated answer for question ${qId}`, {
      questionId: qId,
      answerKind: Array.isArray(value) ? 'multi' : typeof value
    }, `answer-${qId}`);
    this.persistAnswer(qId).catch(() => {
      // keep UI responsive even if backend save temporarily fails
    });
  }

  serializeAnswer(answer) {
    if (answer == null) return '';
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    return String(answer).trim();
  }

  async persistAnswer(questionId) {
    if (!this.attemptId) return;
    const state = this.answers[questionId];
    if (!state) return;

    const payload = {
      attemptId: this.attemptId,
      questionId,
      answer: this.serializeAnswer(state.answer),
      markForReview: Boolean(state.marked),
      visited: state.status !== 'not-visited',
      autoSaved: true,
      clientTimestamp: Date.now(),
      questionNumber: questionId
    };

    try {
      await apiRequest('/exam/submit-answer', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      this.logAction('ACTION_ANSWER_SAVED', `Saved answer for question ${questionId}`, {
        questionId,
        markedForReview: Boolean(state.marked),
        status: state.status
      }, `answer-save-${questionId}`);
    } catch (error) {
      console.warn('Unable to persist answer to server:', error);
      showToast('Unable to save this answer to server. Your work is still visible locally.', 'warning');
    }
  }

  async saveCurrentAnswer() {
    const currentQuestion = this.questions[this.currentQIndex];
    if (!currentQuestion) return;
    await this.persistAnswer(currentQuestion.id);
  }

  async initializeAttemptState() {
    if (!this.attemptId) return;
    await this.syncAnswersFromServer();
    await Promise.allSettled([
      this.syncTimerFromServer(),
      this.syncPaletteFromServer()
    ]);
    this.syncPaletteLocks();
    ['Easy', 'Medium', 'Hard'].forEach(lvl => {
      const count = this.questions.filter(qi => qi.difficulty === lvl && this.answers[qi.id]?.marked).length;
      this.palette.updateMarkedHeader(lvl, count, this.maxMarkReviewPerLevel[lvl] || 5);
    });
    this.startHeartbeat();
    this.renderQuestion();
    this.logAction('SYSTEM_ATTEMPT_SYNCED', 'Exam attempt state synced with backend', {
      syncedAnswers: Object.keys(this.answers || {}).length
    }, 'attempt-synced');
  }

  parseServerAnswer(answer, type) {
    if (answer == null) return null;
    const normalized = String(answer).trim();
    if (!normalized) return null;
    if (type === 'mscq') {
      return normalized.split(',').map(item => item.trim()).filter(Boolean);
    }
    return normalized;
  }

  async syncAnswersFromServer() {
    if (!this.attemptId) return;
    try {
      const answerData = await apiRequest(`/exam/answers/${this.attemptId}`, { method: 'GET' });
      if (!Array.isArray(answerData)) return;

      answerData.forEach((entry) => {
        const qId = Number(entry.questionId);
        const state = this.answers[qId];
        const question = this.questions.find((q) => q.id === qId);
        if (!state || !question) return;

        state.answer = this.parseServerAnswer(entry.answer, question.type);
        state.marked = Boolean(entry.markedForReview) || String(entry.status || '').toUpperCase() === 'MARKED_FOR_REVIEW';

        const status = String(entry.status || '').toUpperCase();
        if (status === 'ANSWERED') {
          state.status = 'answered';
        } else if (status === 'NOT_VISITED') {
          state.status = 'not-visited';
        } else if (status === 'NOT_ANSWERED') {
          state.status = 'not-answered';
        } else if (status === 'MARKED_FOR_REVIEW') {
          state.status = this.hasValidAnswer(state.answer) ? 'answered' : 'not-answered';
        } else if (this.hasValidAnswer(state.answer)) {
          state.status = 'answered';
        }
      });
    } catch (error) {
      console.warn('Failed to load persisted answers from backend:', error);
    }
  }

  async syncTimerFromServer() {
    if (!this.attemptId || !this.timer) return;
    try {
      const timerData = await apiRequest(`/exam/timer/${this.attemptId}`, { method: 'GET' });
      if (timerData) {
        if (Number.isFinite(Number(timerData.totalSeconds)) && timerData.totalSeconds > 0) {
          this.timer.setDuration(Number(timerData.totalSeconds));
        }
        if (Number.isFinite(Number(timerData.remainingSeconds)) && timerData.remainingSeconds >= 0) {
          this.timer.setRemainingTime(Number(timerData.remainingSeconds));
        }
        if (String(timerData.status).toUpperCase() === 'EXPIRED' || timerData.autoSubmit) {
          showToast('Exam time expired. Submitting automatically.', 'error');
          await this.submitExam(true);
        }
      }
    } catch (error) {
      console.warn('Failed to sync exam timer from backend:', error);
    }
  }

  async syncPaletteFromServer() {
    if (!this.attemptId) return;
    try {
      const paletteData = await apiRequest(`/exam/palette/${this.attemptId}`, { method: 'GET' });
      if (Array.isArray(paletteData)) {
        paletteData.forEach((entry) => {
          const qId = Number(entry.questionId);
          const state = this.answers[qId];
          if (!state) return;

          const status = String(entry.status || '').toUpperCase();
          state.marked = Boolean(entry.markedForReview) || status === 'MARKED_FOR_REVIEW';
          if (status === 'ANSWERED') {
            state.status = 'answered';
          } else if (status === 'NOT_VISITED') {
            state.status = 'not-visited';
          } else if (status === 'NOT_ANSWERED') {
            state.status = 'not-answered';
          } else if (status === 'MARKED_FOR_REVIEW') {
            state.status = this.hasValidAnswer(state.answer) ? 'answered' : 'not-answered';
          }
          this.palette.updateStatus(qId, state.marked ? (state.status === 'answered' ? 'marked-answered' : 'marked') : state.status);
        });
      }
    } catch (error) {
      console.warn('Failed to sync question palette from backend:', error);
    }
  }

  async sendHeartbeat() {
    if (!this.attemptId) return;
    try {
      await apiRequest(`/exam/heartbeat/${this.attemptId}`, { method: 'POST' });
    } catch (error) {
      console.warn('Exam heartbeat failed:', error);
    }
  }

  startHeartbeat() {
    if (!this.attemptId) return;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000);
  }

  hasValidAnswer(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }

  clearCurrentAnswer() {
    const q = this.questions[this.currentQIndex];
    const state = this.answers[q.id];
    state.answer = null;
    state.status = 'not-answered';
    state.marked = false;
    this.markReviewChk.checked = false;
    this.updateMarkCountUI();
    this.updatePaletteStatus(q.id);
    this.logAction('ACTION_ANSWER_CLEARED', `Cleared answer for question ${q.id}`, {
      questionId: q.id
    }, `answer-clear-${q.id}`);
    this.persistAnswer(q.id).catch(() => {});
    this.renderQuestion();
  }

  updateMarkCountUI() {
     const q = this.questions[this.currentQIndex];
     if(!q || !this.markReviewCountEl) return;
     
     const currentMarkedInLevel = this.questions.filter(qi => qi.difficulty === q.difficulty && this.answers[qi.id].marked).length;
     const limit = this.maxMarkReviewPerLevel[q.difficulty] || 5;
     this.markReviewCountEl.textContent = `(${currentMarkedInLevel}/${limit})`;
     
     // Update palette header if available
     this.palette.updateMarkedHeader(q.difficulty, currentMarkedInLevel, limit);
     
     // visually highlight if at limit
     if(currentMarkedInLevel >= limit) {
        this.markReviewCountEl.style.color = 'var(--danger-color)';
        this.markReviewCountEl.style.fontWeight = '600';
     } else {
        this.markReviewCountEl.style.color = '';
        this.markReviewCountEl.style.fontWeight = '';
     }
  }

  toggleMarkReview(isMarked) {
    const q = this.questions[this.currentQIndex];
    const qId = q.id;
    const state = this.answers[qId];
    
    if (isMarked) {
       // Filter marked questions in the same difficulty as this one
       const currentMarkedInLevel = this.questions.filter(qi => qi.difficulty === q.difficulty && this.answers[qi.id].marked).length;
       const limit = this.maxMarkReviewPerLevel[q.difficulty] || 5;
       
       if (currentMarkedInLevel >= limit) {
          showToast(`Limit Exceeded: You can only mark ${limit} ${q.difficulty} questions for review.`, 'error');
          this.markReviewChk.checked = false;
          return;
       }
    }
    
    state.marked = isMarked;
    this.logAction(isMarked ? 'ACTION_MARK_REVIEW' : 'ACTION_UNMARK_REVIEW',
      `${isMarked ? 'Marked' : 'Unmarked'} question ${qId} for review`,
      { questionId: qId, difficulty: q.difficulty },
      `mark-${qId}-${isMarked ? '1' : '0'}`);
    this.updateMarkCountUI();
    this.updatePaletteStatus(qId);
    this.persistAnswer(qId).catch(() => {});
  }

  updatePaletteStatus(qId) {
    const state = this.answers[qId];
    let classStatus = state.status; // 'answered' or 'not-answered'
    
    if (state.marked) {
       if (state.status === 'answered') {
          classStatus = 'marked-answered';
       } else {
          classStatus = 'marked';
       }
    }
    
    this.palette.updateStatus(qId, classStatus);
    this.syncPaletteLocks();
  }

  syncPaletteLocks() {
    const unlocked = ['Easy'];
    if (this.isSectionComplete('Easy')) unlocked.push('Medium');
    if (this.isSectionComplete('Easy') && this.isSectionComplete('Medium')) unlocked.push('Hard');
    
    this.palette.updateLockStatus(unlocked);
  }

  navigate(direction) {
    const newIdx = this.currentQIndex + direction;
    if (newIdx >= 0 && newIdx < this.questions.length) {
       // Check if allowed to move to the next question based on progression rules
       if (direction > 0) {
          const currentDiff = this.questions[this.currentQIndex].difficulty;
          const targetDiff = this.questions[newIdx].difficulty;
          
          if (currentDiff !== targetDiff) {
             // Crossing a difficulty boundary
             if (!this.isSectionComplete(currentDiff)) {
                showToast(`Complete all ${currentDiff} questions to unlock the ${targetDiff} section!`, 'warning');
                return;
             }
          }
       }
       
       this.currentQIndex = newIdx;
       this.logAction('ACTION_NAVIGATE', `Navigated ${direction > 0 ? 'next' : 'previous'} question`, {
         fromIndex: this.currentQIndex - direction,
         toIndex: this.currentQIndex
       }, `nav-${this.currentQIndex}`);
       this.renderQuestion();
    }
  }

  isSectionComplete(difficulty) {
     // Section is complete if all questions in that difficulty are Answered OR Marked for Review
     const sectionQuestions = this.questions.filter(q => q.difficulty === difficulty);
     return sectionQuestions.every(q => {
        const state = this.answers[q.id];
        return state.status === 'answered' || state.marked;
     });
  }

  jumpTo(questionNumber) {
    const idx = questionNumber - 1;
    if (idx >= 0 && idx < this.questions.length) {
       const targetDiff = this.questions[idx].difficulty;
       
       // Verification: Can only jump to higher difficulty if previous sections are complete
       if (targetDiff === 'Medium' && !this.isSectionComplete('Easy')) {
          showToast('Easy section must be completed first!', 'warning');
          return;
       }
       if (targetDiff === 'Hard' && (!this.isSectionComplete('Easy') || !this.isSectionComplete('Medium'))) {
          showToast('Complete Easy and Medium sections to unlock Hard questions!', 'warning');
          return;
       }
       
       this.currentQIndex = idx;
       this.logAction('ACTION_JUMP', `Jumped to question ${questionNumber}`, {
         targetQuestionNumber: questionNumber
       }, `jump-${questionNumber}`);
       this.renderQuestion();
    }
  }

  showSubmitModal() {
    const summary = this.palette.getSummary();
    document.getElementById('summary-answered').textContent = summary.answered;
    document.getElementById('summary-not-answered').textContent = summary.unanswered;
    document.getElementById('summary-marked').textContent = summary.marked;
    document.getElementById('summary-not-visited').textContent = summary.notVisited;
    
    this.submitModal.classList.add('active');
    this.logAction('ACTION_OPEN_SUBMIT_REVIEW', 'Opened submit modal', summary, 'open-submit-modal');
  }

  showReviewModal() {
    this.submitModal.classList.remove('active');
    this.reviewModal.classList.add('active');
    this.logAction('ACTION_OPEN_REVIEW_MODAL', 'Opened review answers modal', {}, 'open-review-modal');
    
    this.reviewList.innerHTML = '';
    
    this.questions.forEach((q, idx) => {
       const state = this.answers[q.id];
       const row = document.createElement('div');
       row.style.marginBottom = '1.5rem';
       row.style.padding = '1rem';
       row.style.borderRadius = '8px';
       row.style.background = 'var(--bg-tertiary)';
       row.style.border = state.marked ? '1px solid var(--focus-color)' : '1px solid var(--border-color)';
       
       const answerText = this.hasValidAnswer(state.answer) 
          ? (Array.isArray(state.answer) ? state.answer.join(', ') : state.answer)
          : '<em style="color:var(--text-tertiary);">Not Answered</em>';
          
       row.innerHTML = `
         <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; align-items: center;">
            <div style="font-weight:600;">Question ${q.id} <span class="exam-badge" style="margin-left:8px;">${q.difficulty}</span></div>
            ${state.marked ? '<span style="color:var(--focus-color); font-size:0.75rem; font-weight:600;">★ MARKED FOR REVIEW</span>' : ''}
         </div>
         <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.75rem; border-left: 3px solid var(--border-color); padding-left: 10px;">
           ${q.text}
         </div>
         <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 6px; font-size: 0.9rem;">
           <span style="color: var(--primary-color); font-weight: 500;">Your Response:</span>
           <div style="margin-top: 5px; white-space: pre-wrap;">${answerText}</div>
         </div>
       `;
       
       this.reviewList.appendChild(row);
    });
  }

  async submitExam(isAuto = false) {
    const timeTaken = this.timer ? this.timer.getElapsedTime() : { formatted: 'N/A' };
    this.timer.stop();
    this.submitModal.classList.remove('active');
    this.reviewModal.classList.remove('active');
    
    // Exit Fullscreen if active
    if (document.fullscreenElement && document.exitFullscreen) {
       document.exitFullscreen().catch(err => console.warn(`Exit fullscreen failed: ${err.message}`));
    }

    if (this.attemptId) {
      try {
        if (!isAuto) {
          await this.saveCurrentAnswer();
        }
        await apiRequest(`/exam/submit/${this.attemptId}`, { method: 'POST' });
        this.logAction(isAuto ? 'EXAM_AUTO_SUBMITTED' : 'EXAM_SUBMITTED', isAuto ? 'Exam auto submitted due to timer/proctoring rule' : 'Exam submitted by student', {
          autoSubmitted: Boolean(isAuto)
        }, 'exam-submit');
      } catch (error) {
        console.error('Final submit failed:', error);
        showToast('Final submit failed', error.message || 'Please try again.', 'error');
        return;
      }
    }

    if (isAuto) {
       if (this.timeUpModal) this.timeUpModal.classList.add('active');
    } else {
       this.renderFinalSuccess(false, timeTaken);
    }
  }

  renderFinalSuccess(isAutoTimeOut, timeTaken) {
    if(this.timeUpModal) this.timeUpModal.classList.remove('active');
    
    // Replace whole body with a success message
    document.body.innerHTML = `
      <div style="height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-primary);">
         <div style="background: var(--bg-secondary); padding: 3rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); text-align: center; max-width: 500px;">
           <div style="font-size: 4rem; color: var(--success-color); margin-bottom: 1rem;">✓</div>
           <h2 style="margin-bottom: 0.5rem;">Examination Submitted Successfully!</h2>
           
           ${!isAutoTimeOut ? `
           <div style="margin: 1.5rem 0; padding: 1rem; background: var(--bg-tertiary); border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 4px;">Time Spent</div>
              <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-color);">${timeTaken.formatted}</div>
              <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">Excellent! You completed the assessment ahead of schedule.</p>
           </div>
           ` : ''}

           <p style="color: var(--text-secondary); margin-bottom: 2rem;">
             ${isAutoTimeOut ? 'Your session was automatically submitted because you reached the maximum time allowed. ' : ''}
             Your answers have been securely recorded. You may now close this window safely.
           </p>
           <button class="btn btn-primary" onclick="window.close()">Close Window</button>
         </div>
      </div>
    `;
  }
}

// Init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
   if (document.getElementById('question-wrapper')) {
       initializeExamPage();
   }
});
