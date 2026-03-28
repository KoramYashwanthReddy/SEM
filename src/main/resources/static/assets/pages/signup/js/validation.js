const Validation = (() => {
  const form = document.getElementById('signup-form');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  const strengthBar = document.getElementById('strength-bar');
  const terms = document.getElementById('terms');

  function showMessage(field, message) {
    const el = document.querySelector(`[data-for="${field}"]`);
    if (el) el.textContent = message;
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function scorePassword(value) {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }

  function updateStrength() {
    const score = scorePassword(password.value);
    strengthBar.style.width = `${(score / 4) * 100}%`;
  }

  function validateFields() {
    let valid = true;

    if (!validateEmail(email.value)) {
      showMessage('email', 'Enter a valid email address.');
      valid = false;
    } else {
      showMessage('email', '');
    }

    if (password.value.length < 8) {
      showMessage('password', 'Password must be at least 8 characters.');
      valid = false;
    } else {
      showMessage('password', '');
    }

    if (confirmPassword.value !== password.value || !confirmPassword.value) {
      showMessage('confirmPassword', 'Passwords must match.');
      valid = false;
    } else {
      showMessage('confirmPassword', '');
    }

    if (!terms.checked) {
      showMessage('terms', 'Please accept the terms to continue.');
      valid = false;
    } else {
      showMessage('terms', '');
    }

    return valid;
  }

  function init() {
    if (!form) return;
    password.addEventListener('input', updateStrength);
  }

  return { init, validateFields };
})();

document.addEventListener('DOMContentLoaded', Validation.init);
