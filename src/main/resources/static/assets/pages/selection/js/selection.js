/**
 * Role Selection Module
 * Handles UI interactions and theme sync.
 */
const Selection = (() => {
  const cards = document.querySelectorAll('.role-card');

  function init() {
    ThemeController.init();
    setup3DTilt();
    initTyping();
    initSignatures();
    handleCardClicks();
    initCardTyping();
    console.log('Role Selection Module Initialized');
  }

  /**
   * Sub-typing effect for each card
   */
  function initCardTyping() {
    const cardTypingMap = {
      'card-student': ['Live Proctoring Active', 'Secure Terminal Ready', 'Instant Feedback Enabled'],
      'card-teacher': ['Class Monitoring Tool', 'Dynamic Exam Builder', 'Anti-Cheat Engine ON'],
      'card-admin': ['Master System Access', 'Global Node Monitor', 'AES-256 Encrypted']
    };

    Object.keys(cardTypingMap).forEach(id => {
      const card = document.getElementById(id);
      if (!card) return;
      const el = card.querySelector('.typing-sub');
      if (!el) return;
      
      const phrases = cardTypingMap[id];
      let pIdx = 0, cIdx = 0, del = false;

      function loop() {
        const cur = phrases[pIdx];
        el.textContent = del ? cur.slice(0, cIdx--) : cur.slice(0, cIdx++);
        
        let speed = del ? 40 : 80;
        if (!del && cIdx > cur.length) {
          del = true; speed = 2500;
        } else if (del && cIdx === 0) {
          del = false; pIdx = (pIdx + 1) % phrases.length; speed = 500;
        }
        setTimeout(loop, speed);
      }
      loop();
    });
  }

  /**
   * Handle Card Button Clicks with Buffering Logic and Focus DIM
   */
  function handleCardClicks() {
    const buttons = document.querySelectorAll('.btn-primary');
    const allCards = document.querySelectorAll('.role-card');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('.role-card');
        const targetUrl = btnTarget(btn);
        
        if (btn.classList.contains('loading')) return;
        btn.classList.add('loading');
        
        // Dim and Blur others
        allCards.forEach(c => {
          if (c !== card) {
            c.style.opacity = '0.3';
            c.style.filter = 'blur(4px)';
            c.style.pointerEvents = 'none';
          } else {
            c.style.transform = 'translateY(-20px) scale(1.05)';
            c.style.zIndex = '100';
          }
        });
        
        const sequences = [
          'Initializing...',
          'SSL Handshake...',
          'Auth Validating...',
          'Finalizing...'
        ];
        
        let seqIdx = 0;
        const loaderIcon = `
          <svg class="loader-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.2"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
          </svg>`;

        const interval = setInterval(() => {
          btn.innerHTML = `${loaderIcon} <span>${sequences[seqIdx]}</span>`;
          seqIdx++;
          
          if (seqIdx >= sequences.length) {
            clearInterval(interval);
            btn.innerHTML = `${loaderIcon} <span>Redirecting...</span>`;
            btn.style.background = 'var(--accent-green)';
            btn.style.boxShadow = '0 0 30px var(--accent-green)';
            
            setTimeout(() => {
              // Final dramatic fade before redirect
              document.body.style.opacity = '0';
              document.body.style.transition = 'opacity 0.6s ease';
              setTimeout(() => {
                window.location.href = targetUrl;
              }, 400);
            }, 600);
          }
        }, 500);
      });
    });

    function btnTarget(btn) {
      if (btn.classList.contains('btn-teacher')) return 'teacher-login.html';
      if (btn.classList.contains('btn-admin')) return 'admin-login.html';
      return 'login.html';
    }
  }

  /**
   * Typing animation for the header
   */
  function initTyping() {
    const el = document.getElementById('typing-text');
    if (!el) return;

    const phrases = [
      'Student Candidate',
      'Certified Educator',
      'System Administrator',
      'Guest Examinee',
      'Platform Moderator'
    ];

    let pIdx = 0, cIdx = 0, deleting = false;

    function tick() {
      const phrase = phrases[pIdx];
      if (!deleting) {
        cIdx++;
        el.textContent = phrase.slice(0, cIdx);
        if (cIdx >= phrase.length) {
          deleting = true;
          setTimeout(tick, 2000);
          return;
        }
        setTimeout(tick, 80);
      } else {
        cIdx--;
        el.textContent = phrase.slice(0, cIdx);
        if (cIdx === 0) {
          deleting = false;
          pIdx = (pIdx + 1) % phrases.length;
          setTimeout(tick, 500);
          return;
        }
        setTimeout(tick, 45);
      }
    }

    tick();
  }

  /**
   * Live Encryption Signatures for Role Cards
   */
  function initSignatures() {
    const sigs = document.querySelectorAll('.sig-feed');
    if (!sigs.length) return;

    function update() {
      sigs.forEach(sig => {
        const hash = Array.from({length: 12}, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('').toUpperCase();
        sig.textContent = `SIG_${hash}`;
      });
      setTimeout(update, 3000 + Math.random() * 2000);
    }

    update();
  }

  /**
   * 3D Tilt Effect for Role Cards
   */
  function setup3DTilt() {
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Tilt amount
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px) scale(1.02)`;
        
        // Individual Glow tracking (optional)
        const glow = card.querySelector('.card-glow');
        if (glow) {
          const moveX = (x / rect.width) * 100;
          const moveY = (y / rect.height) * 100;
          glow.style.background = `radial-gradient(circle at ${moveX}% ${moveY}%, rgba(99, 102, 241, 0.15) 0%, transparent 80%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
        const glow = card.querySelector('.card-glow');
        if (glow) {
          glow.style.background = `radial-gradient(circle at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%)`;
        }
      });
    });
  }

  return { init };
})();

// Initialize
document.addEventListener('DOMContentLoaded', Selection.init);
