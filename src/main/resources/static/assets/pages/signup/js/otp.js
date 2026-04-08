const OTP = (() => {
  const inputs = Array.from(document.querySelectorAll('.otp-input'));
  const resendBtn = document.getElementById('resend-btn');
  const resendTimer = document.getElementById('resend-timer');
  const otpMessage = document.querySelector('[data-for="otp"]');
  let timer = 600;
  let activeDuration = 600;
  let intervalId;

  function formatTime(t) {
    const mins = String(Math.floor(t / 60)).padStart(2, '0');
    const secs = String(t % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function startTimer(duration = activeDuration) {
    activeDuration = Number(duration) > 0 ? Number(duration) : activeDuration;
    timer = activeDuration;
    resendBtn.disabled = true;
    resendTimer.textContent = formatTime(timer);
    clearInterval(intervalId);
    intervalId = setInterval(() => {
      timer -= 1;
      resendTimer.textContent = formatTime(timer);
      if (timer <= 0) {
        resendBtn.disabled = false;
        clearInterval(intervalId);
      }
    }, 1000);
  }

  function initInputs() {
    inputs.forEach((input, idx) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '');
        if (input.value && inputs[idx + 1]) inputs[idx + 1].focus();
      });

      input.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !input.value && inputs[idx - 1]) {
          inputs[idx - 1].focus();
        }
      });
    });
  }

  function getOTP() {
    return inputs.map(i => i.value).join('');
  }

  function getCode() {
    return getOTP();
  }

  function setMessage(message) {
    otpMessage.textContent = message || '';
  }

  function validateOTP() {
    const value = getOTP();
    if (value.length !== 6) {
      setMessage('Enter the 6-digit OTP to continue.');
      return false;
    }
    setMessage('');
    return true;
  }

  function activate(duration = 600) {
    if (!inputs.length) return;
    inputs.forEach(i => (i.value = ''));
    setMessage('');
    startTimer(duration);
    inputs[0].focus();
  }

  function init() {
    if (!inputs.length) return;
    initInputs();
    resendBtn.addEventListener('click', () => {
      if (window.SignupOtpBridge?.resend) {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Resending...';
        Promise.resolve(window.SignupOtpBridge.resend())
          .then((duration) => {
            resendBtn.textContent = 'Resend Code';
            startTimer(duration || activeDuration);
          })
          .catch((err) => {
            setMessage(err?.message || 'Unable to resend code.');
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Code';
          });
        return;
      }

      resendBtn.disabled = true;
      resendBtn.textContent = 'Resending...';
      setTimeout(() => {
        resendBtn.textContent = 'Resend Code';
        startTimer(activeDuration);
      }, 800);
    });
  }

  return { init, validateOTP, activate, getCode, setMessage };
})();

document.addEventListener('DOMContentLoaded', OTP.init);
