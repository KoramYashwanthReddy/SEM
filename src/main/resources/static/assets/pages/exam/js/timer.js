// timer.js - Countdown Timer Logic

class ExamTimer {
  constructor(durationInSeconds, displayElementId, onTimeUpCallback) {
    this.duration = durationInSeconds;
    this.timeRemaining = durationInSeconds;
    this.displayElement = document.getElementById(displayElementId);
    this.timerInterval = null;
    this.onTimeUp = onTimeUpCallback;
    
    // Check local storage for resume
    const savedTime = localStorage.getItem('exam-time-remaining');
    if (savedTime && !isNaN(savedTime)) {
        this.timeRemaining = parseInt(savedTime);
    }
  }

  start() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.updateDisplay();
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.updateDisplay();
      
      // Save state every 5 seconds
      if (this.timeRemaining % 5 === 0) {
        localStorage.setItem('exam-time-remaining', this.timeRemaining);
      }

      // Warning color triggers
      if (this.timeRemaining === 300) { // 5 minutes left
        this.displayElement.classList.add('timer-warning');
        showToast('5 minutes remaining!', 'warning');
      }
      
      if (this.timeRemaining === 60) { // 1 minute left
        this.displayElement.classList.remove('timer-warning');
        this.displayElement.classList.add('timer-danger');
      }

      if (this.timeRemaining <= 0) {
        this.stop();
        if (typeof this.onTimeUp === 'function') {
          this.onTimeUp();
        }
      }
    }, 1000);
  }

  setDuration(durationInSeconds) {
    if (Number.isFinite(durationInSeconds) && durationInSeconds > 0) {
      this.duration = durationInSeconds;
      this.updateDisplay();
    }
  }

  setRemainingTime(seconds) {
    if (Number.isFinite(seconds) && seconds >= 0) {
      this.timeRemaining = seconds;
      localStorage.setItem('exam-time-remaining', seconds);
      this.updateDisplay();
    }
  }

  stop() {
    clearInterval(this.timerInterval);
    localStorage.removeItem('exam-time-remaining');
  }

  updateDisplay() {
    if (!this.displayElement) return;
    
    // Calculate color based on time ratio
    const percentLeft = this.timeRemaining / this.duration;
    let dotColor = 'var(--success-color)'; // full time default green
    
    // last 10 minutes = 600 seconds
    if (this.timeRemaining <= 600) {
       dotColor = 'var(--danger-color)';
    } else if (percentLeft <= 0.5) {
       // half time 
       dotColor = 'var(--warning-color)';
    }

    const h = Math.floor(this.timeRemaining / 3600);
    const m = Math.floor((this.timeRemaining % 3600) / 60);
    const s = this.timeRemaining % 60;
    
    const formattedTime = 
      String(h).padStart(2, '0') + ':' + 
      String(m).padStart(2, '0') + ':' + 
      String(s).padStart(2, '0');
      
    this.displayElement.innerHTML = `<div class="indicator-dot" style="background-color: ${dotColor}; margin-top:2px;"></div><span>${formattedTime}</span>`;
  }

  getElapsedTime() {
    const elapsedUnits = this.duration - this.timeRemaining;
    const h = Math.floor(elapsedUnits / 3600);
    const m = Math.floor((elapsedUnits % 3600) / 60);
    const s = elapsedUnits % 60;
    
    const formatted = 
      (h > 0 ? String(h).padStart(2, '0') + 'h ' : '') + 
      (m > 0 || h > 0 ? String(m).padStart(2, '0') + 'm ' : '') + 
      String(s).padStart(2, '0') + 's';
      
    return { h, m, s, formatted };
  }
}
