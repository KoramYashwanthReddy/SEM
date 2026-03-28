/**
 * cursor.js — Custom cursor with trailing effect
 */

const CursorEngine = (() => {
  let dot, ring, canvas, ctx;
  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  let trail = [];
  const TRAIL_LEN = 18;
  let animId;

  function init() {
    if (window.innerWidth <= 768) return;

    dot = document.getElementById('cursor-dot');
    ring = document.getElementById('cursor-ring');
    canvas = document.getElementById('cursor-trail-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseenter', () => dot && (dot.style.opacity = '1'));
    document.addEventListener('mouseleave', () => { if(dot) dot.style.opacity = '0'; if(ring) ring.style.opacity = '0'; });

    const interactives = document.querySelectorAll('a,button,.btn,.feature-card,.pricing-card,.social-link,.sidebar-item,.option,.chart-filter');
    interactives.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    animate();
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function onMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (dot) {
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
    }

    trail.push({ x: mouseX, y: mouseY, alpha: 1 });
    if (trail.length > TRAIL_LEN) trail.shift();
  }

  function animate() {
    animId = requestAnimationFrame(animate);

    // Smooth ring follow
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;

    if (ring) {
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
    }

    // Draw trail
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 1; i < trail.length; i++) {
      const p = trail[i];
      const pp = trail[i - 1];
      const progress = i / trail.length;
      const alpha = progress * 0.35;
      const size = progress * 3;

      ctx.beginPath();
      ctx.moveTo(pp.x, pp.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Dot along trail
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha * 0.6})`;
        ctx.fill();
      }
    }

    // Fade trail
    trail.forEach(p => { p.alpha -= 0.04; });
    trail = trail.filter(p => p.alpha > 0);
  }

  return { init };
})();
