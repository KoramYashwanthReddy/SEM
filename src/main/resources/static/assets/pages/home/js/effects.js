/**
 * effects.js — Particles, Magnetic Buttons, Ripples, Tilt, Typing
 */

const EffectsEngine = (() => {

  /* ─── PARTICLE SYSTEM ─── */
  function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], animId;

    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    }

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -Math.random() * 0.6 - 0.2;
        this.life = 0;
        this.maxLife = 180 + Math.random() * 120;
        this.size = Math.random() * 2 + 0.5;
        this.color = Math.random() > 0.5 ? '59,130,246' : Math.random() > 0.5 ? '139,92,246' : '6,182,212';
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life++;
        if (this.life >= this.maxLife) this.reset();
      }
      draw() {
        const progress = this.life / this.maxLife;
        const alpha = progress < 0.2 ? progress * 5 : progress > 0.8 ? (1 - progress) * 5 : 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${alpha * 0.5})`;
        ctx.fill();

        // Connections
        particles.forEach(other => {
          if (other === this) return;
          const dx = other.x - this.x, dy = other.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(${this.color},${(1 - dist/100) * 0.08 * alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      }
    }

    function init() {
      resize();
      const count = Math.min(Math.floor((w * h) / 8000), 80);
      particles = Array.from({ length: count }, () => new Particle());
      particles.forEach(p => { p.life = Math.random() * p.maxLife; });
    }

    function loop() {
      animId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => { p.update(); p.draw(); });
    }

    window.addEventListener('resize', () => { resize(); init(); });
    init();
    loop();
  }

  /* ─── TYPING EFFECT ─── */
  function initTyping() {
    const el = document.getElementById('typing-text');
    if (!el) return;

    const phrases = [
      'AI-Powered Proctoring',
      'Real-time Detection',
      'Smart Analytics',
      'Instant Certificates',
      'Role-Based Access',
      'WebSocket Alerts',
      'Zero Cheating'
    ];

    let pIdx = 0, cIdx = 0, deleting = false;

    function tick() {
      const phrase = phrases[pIdx];
      if (!deleting) {
        cIdx++;
        el.textContent = phrase.slice(0, cIdx);
        if (cIdx >= phrase.length) {
          deleting = true;
          setTimeout(tick, 1800);
          return;
        }
        setTimeout(tick, 65);
      } else {
        cIdx--;
        el.textContent = phrase.slice(0, cIdx);
        if (cIdx === 0) {
          deleting = false;
          pIdx = (pIdx + 1) % phrases.length;
          setTimeout(tick, 350);
          return;
        }
        setTimeout(tick, 35);
      }
    }

    tick();
  }

  /* ─── MAGNETIC BUTTONS ─── */
  function initMagnetic() {
    document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 80;
        if (dist < maxDist) {
          const strength = (maxDist - dist) / maxDist;
          btn.style.transform = `translate(${dx * strength * 0.3}px, ${dy * strength * 0.3}px) scale(1.03)`;
        }
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        setTimeout(() => btn.style.transition = '', 400);
      });
    });
  }

  /* ─── RIPPLE ─── */
  function initRipple() {
    document.querySelectorAll('.btn, .feature-card, .pricing-card').forEach(el => {
      el.addEventListener('click', e => {
        const rect = el.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height) * 2;
        ripple.className = 'ripple';
        ripple.style.cssText = `
          width:${size}px;height:${size}px;
          left:${e.clientX - rect.left - size/2}px;
          top:${e.clientY - rect.top - size/2}px;
        `;
        el.style.position = 'relative';
        el.style.overflow = 'hidden';
        el.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  /* ─── 3D TILT ─── */
  function initTilt() {
    document.querySelectorAll('.glass-card, .hero-card-main, .pricing-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        card.style.transform = `perspective(1000px) rotateX(${-dy * 6}deg) rotateY(${dx * 6}deg) translateZ(8px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.25,1,0.5,1)';
        setTimeout(() => card.style.transition = '', 500);
      });
    });
  }

  /* ─── ALERT SIMULATION ─── */
  function initAlertSimulation() {
    const alerts = [
      { type: 'warn', icon: '👀', title: 'Eye Contact Lost', sub: '3.2s · Student ID #2847', time: 'now' },
      { type: 'danger', icon: '🔊', title: 'Noise Detected', sub: 'Background voices · 87dB', time: '0:03' },
      { type: 'info', icon: '📱', title: 'Tab Switch Prevented', sub: 'Browser focus restored', time: '0:08' },
      { type: 'warn', icon: '🖥️', title: 'Multiple Screens', sub: 'External monitor signal', time: '0:14' },
      { type: 'danger', icon: '🚫', title: 'Face Not Detected', sub: 'Student #1042 – Alert sent', time: '0:21' },
    ];

    const feed = document.getElementById('alert-feed');
    if (!feed) return;

    let idx = 0;
    function showNext() {
      if (idx >= alerts.length) idx = 0;
      const a = alerts[idx++];
      const item = document.createElement('div');
      item.className = `live-alert ${a.type}`;
      item.innerHTML = `
        <div class="alert-icon">${a.icon}</div>
        <div class="alert-body">
          <div class="alert-title">${a.title}</div>
          <div class="alert-sub">${a.sub}</div>
        </div>
        <div class="alert-time">${a.time}</div>
      `;
      item.style.animation = 'alertSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both';
      feed.insertBefore(item, feed.firstChild);
      if (feed.children.length > 5) feed.lastChild.remove();
    }

    showNext();
    setInterval(showNext, 3200);
  }

  /* ─── TOAST ─── */
  function initToasts() {
    const toasts = [
      { icon: '⚡', title: 'New Exam Published', body: 'Advanced JS – 45 mins · 150 questions' },
      { icon: '🎓', title: 'Certificate Generated', body: 'Sarah K. completed Python Fundamentals' },
      { icon: '⚠️', title: 'Proctoring Alert', body: 'Unusual activity detected in Room B-12' },
      { icon: '📊', title: 'Report Ready', body: 'Analytics export for March 2025 complete' },
    ];

    let tIdx = 0;
    function showToast() {
      const t = toasts[tIdx % toasts.length];
      tIdx++;
      const container = document.getElementById('toast-container');
      if (!container) return;

      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `
        <span class="toast-icon">${t.icon}</span>
        <div class="toast-content">
          <div class="toast-title">${t.title}</div>
          <div class="toast-body">${t.body}</div>
        </div>
      `;
      container.appendChild(el);

      setTimeout(() => {
        el.classList.add('hiding');
        setTimeout(() => el.remove(), 300);
      }, 4000);
    }

    setTimeout(() => {
      showToast();
      setInterval(showToast, 8000);
    }, 3000);
  }

  /* ─── EXAM OPTION INTERACTION ─── */
  function initExamInteraction() {
    document.querySelectorAll('.option').forEach(opt => {
      opt.addEventListener('click', () => {
        opt.closest('.options-list')?.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
  }

  /* ─── TIMER ─── */
  function initTimer() {
    const timerEl = document.getElementById('exam-timer');
    if (!timerEl) return;
    let mins = 44, secs = 57;

    setInterval(() => {
      secs--;
      if (secs < 0) { secs = 59; mins--; }
      if (mins < 0) { mins = 0; secs = 0; }
      timerEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      if (mins < 5) timerEl.style.color = 'var(--accent-pink)';
    }, 1000);
  }

  /* ─── THREAT SCORE SIMULATION ─── */
  function initThreatScore() {
    const fill = document.querySelector('.threat-fill');
    if (!fill) return;

    setInterval(() => {
      const pct = Math.random() * 20 + 5;
      fill.style.width = pct + '%';
      fill.style.background = pct > 40 ? 'var(--accent-amber)' : pct > 65 ? '#ef4444' : 'var(--accent-green)';
    }, 2500);
  }

  function init() {
    initParticles();
    initTyping();
    initMagnetic();
    initRipple();
    initAlertSimulation();
    initToasts();
    initExamInteraction();
    initTimer();
    initThreatScore();
  }

  return { init };
})();
