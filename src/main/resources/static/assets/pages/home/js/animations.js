/**
 * animations.js — Chart.js charts, QR, cert animation
 */

const AnimationsController = (() => {

  function initCharts() {
    const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';

    function getGridColor() {
      return isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    }
    function getTextColor() {
      return isDark() ? '#475569' : '#94a3b8';
    }

    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.animation.duration = 1200;
    Chart.defaults.animation.easing = 'easeOutQuart';

    // Score Distribution
    const scoreCtx = document.getElementById('scoreChart');
    if (scoreCtx) {
      const scoreChart = new Chart(scoreCtx, {
        type: 'bar',
        data: {
          labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
          datasets: [{
            label: 'Students',
            data: [45, 120, 380, 520, 235],
            backgroundColor: [
              'rgba(239,68,68,0.7)', 'rgba(245,158,11,0.7)',
              'rgba(59,130,246,0.7)', 'rgba(139,92,246,0.7)', 'rgba(16,185,129,0.7)'
            ],
            borderColor: [
              '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'
            ],
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark() ? '#0a0f1e' : '#fff',
              borderColor: 'rgba(59,130,246,0.3)',
              borderWidth: 1,
              titleColor: isDark() ? '#f1f5f9' : '#0f172a',
              bodyColor: isDark() ? '#94a3b8' : '#475569',
              padding: 12,
              cornerRadius: 10
            }
          },
          scales: {
            x: { grid: { color: getGridColor(), drawBorder: false }, ticks: { color: getTextColor(), font: { size: 11 } } },
            y: { grid: { color: getGridColor(), drawBorder: false }, ticks: { color: getTextColor(), font: { size: 11 } } }
          }
        }
      });

      window.addEventListener('themechange', () => {
        scoreChart.options.scales.x.grid.color = getGridColor();
        scoreChart.options.scales.y.grid.color = getGridColor();
        scoreChart.options.scales.x.ticks.color = getTextColor();
        scoreChart.options.scales.y.ticks.color = getTextColor();
        scoreChart.update();
      });
    }

    // Completion Rate Line
    const completionCtx = document.getElementById('completionChart');
    if (completionCtx) {
      const completionChart = new Chart(completionCtx, {
        type: 'line',
        data: {
          labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
          datasets: [{
            label: 'Completion Rate',
            data: [72, 75, 80, 76, 83, 87, 85, 91, 89, 93, 94, 96],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: isDark() ? '#030712' : '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7
          }, {
            label: 'Pass Rate',
            data: [58, 62, 65, 63, 70, 74, 72, 78, 77, 81, 83, 86],
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139,92,246,0.05)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#8b5cf6',
            pointBorderColor: isDark() ? '#030712' : '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                color: isDark() ? '#94a3b8' : '#475569',
                boxWidth: 10,
                boxHeight: 10,
                borderRadius: 5,
                usePointStyle: true,
                pointStyle: 'circle',
                font: { size: 11 }
              }
            },
            tooltip: {
              backgroundColor: isDark() ? '#0a0f1e' : '#fff',
              borderColor: 'rgba(59,130,246,0.3)',
              borderWidth: 1,
              titleColor: isDark() ? '#f1f5f9' : '#0f172a',
              bodyColor: isDark() ? '#94a3b8' : '#475569',
              padding: 12,
              cornerRadius: 10
            }
          },
          scales: {
            x: { grid: { color: getGridColor(), drawBorder: false }, ticks: { color: getTextColor(), font: { size: 11 } } },
            y: {
              grid: { color: getGridColor(), drawBorder: false },
              ticks: { color: getTextColor(), font: { size: 11 }, callback: v => v + '%' },
              min: 50, max: 100
            }
          }
        }
      });

      window.addEventListener('themechange', () => {
        completionChart.options.scales.x.grid.color = getGridColor();
        completionChart.options.scales.y.grid.color = getGridColor();
        completionChart.options.scales.x.ticks.color = getTextColor();
        completionChart.options.scales.y.ticks.color = getTextColor();
        completionChart.options.plugins.legend.labels.color = getTextColor();
        completionChart.update();
      });
    }

    // Doughnut — Violation types
    const violCtx = document.getElementById('violationChart');
    if (violCtx) {
      new Chart(violCtx, {
        type: 'doughnut',
        data: {
          labels: ['Face Away', 'Tab Switch', 'Noise', 'Device', 'Other'],
          datasets: [{
            data: [35, 28, 18, 12, 7],
            backgroundColor: [
              'rgba(59,130,246,0.85)', 'rgba(139,92,246,0.85)',
              'rgba(245,158,11,0.85)', 'rgba(236,72,153,0.85)', 'rgba(16,185,129,0.85)'
            ],
            borderColor: isDark() ? '#030712' : '#fff',
            borderWidth: 3,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: isDark() ? '#94a3b8' : '#475569',
                padding: 16,
                boxWidth: 10,
                boxHeight: 10,
                borderRadius: 5,
                usePointStyle: true,
                pointStyle: 'circle',
                font: { size: 11 }
              }
            },
            tooltip: {
              backgroundColor: isDark() ? '#0a0f1e' : '#fff',
              borderColor: 'rgba(59,130,246,0.3)',
              borderWidth: 1,
              titleColor: isDark() ? '#f1f5f9' : '#0f172a',
              bodyColor: isDark() ? '#94a3b8' : '#475569',
              padding: 12,
              cornerRadius: 10,
              callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}%` }
            }
          }
        }
      });
    }
  }

  function initQRAnimation() {
    const qrGrid = document.querySelector('.cert-qr');
    if (!qrGrid) return;

    // Generate a QR-like pattern
    const pattern = [
      1,1,1,0,1,1,1,
      1,0,1,0,1,0,1,
      1,1,1,1,0,1,1,
      0,1,0,0,1,0,1,
      1,1,1,0,1,1,1,
      1,0,1,0,0,0,1,
      1,1,1,1,0,1,1
    ];

    pattern.forEach((cell, i) => {
      const div = document.createElement('div');
      div.className = 'qr-cell';
      div.style.opacity = cell ? '1' : '0';
      div.style.transition = `opacity ${0.1 + i * 0.01}s ease`;
      qrGrid.appendChild(div);
    });

    // Animate QR appearance
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        qrGrid.querySelectorAll('.qr-cell').forEach((cell, i) => {
          setTimeout(() => {
            cell.style.opacity = pattern[i] ? '1' : '0.05';
          }, i * 20);
        });
      }
    }, { threshold: 0.5 });

    io.observe(qrGrid);
  }

  function init() {
    // Wait for Chart.js to load
    if (typeof Chart !== 'undefined') {
      initCharts();
    } else {
      window.addEventListener('load', initCharts);
    }
    initQRAnimation();
  }

  return { init };
})();
