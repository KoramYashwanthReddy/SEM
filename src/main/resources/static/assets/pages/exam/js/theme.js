// theme.js - Handle Theme Switching

const themes = ['light', 'dark', 'system'];
let currentThemeIndex = 1; // start with dark, as requested by general SaaS aesthetic preference

const getSystemTheme = () => 
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function initTheme() {
  const savedTheme = localStorage.getItem('exam-theme');
  if (savedTheme && themes.includes(savedTheme)) {
    currentThemeIndex = themes.indexOf(savedTheme);
  }
  applyTheme();

  const themeToggleUrl = document.getElementById('theme-toggle');
  if (themeToggleUrl) {
    themeToggleUrl.addEventListener('click', toggleTheme);
  }
}

function applyTheme() {
  let theme = themes[currentThemeIndex];
  if (theme === 'system') {
    theme = getSystemTheme();
  }
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('exam-theme', themes[currentThemeIndex]);
}

function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  applyTheme();
  
  // Optional visually show what theme is selected, using a toast
  let themeName = themes[currentThemeIndex];
  showToast(`Theme set to ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`, 'info');
}

// Simple Toast system scoped here for utility
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  
  container.appendChild(toast);
  
  // animate in
  setTimeout(() => toast.classList.add('active'), 10);
  
  // hide and remove
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Watch system theme change
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themes[currentThemeIndex] === 'system') {
    applyTheme();
  }
});

// Initialize early
initTheme();
