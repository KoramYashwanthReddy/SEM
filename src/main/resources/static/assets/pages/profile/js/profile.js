/**
 * STUDENT PROFILE BRIEFING — MULTI-STEP CONTROLLER
 * Logic for navigation, staged validation, and final confirmation walkthrough.
 */

const ProfileBriefing = (() => {
  // Elements
  const form = document.querySelector('#profile-multi-step-form');
  const steps = document.querySelectorAll('.step-content');
  const badges = document.querySelectorAll('.step-item');
  const prevBtn = document.querySelector('#prev-step');
  const nextBtn = document.querySelector('#next-step');
  const submitBtn = document.querySelector('#submit-step');
  const confirmOverlay = document.querySelector('#confirm-overlay');
  const reviewGrid = document.querySelector('#review-summary');
  const photoInput = document.querySelector('#photoInput');
  const photoPreview = document.querySelector('#photo-preview');
  const uploadTrigger = document.querySelector('#trigger-upload');
  const finalConfirmBtn = document.querySelector('#final-confirm');
  const cancelConfirmBtn = document.querySelector('#cancel-confirm');

  const clearBtn = document.querySelector('#clear-step');

  // State
  let currentStep = 1;

  /**
   * Initialize Module
   */
  function init() {
    bindEvents();
    updateStepUI();
  }

  /**
   * Bind Event Listeners
   */
  function bindEvents() {
    nextBtn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        currentStep++;
        updateStepUI();
      }
    });

    prevBtn.addEventListener('click', () => {
      currentStep--;
      updateStepUI();
    });

    // Clear current stage
    clearBtn.addEventListener('click', () => {
      const activeStepEl = document.querySelector(`#step-${currentStep}`);
      const inputsInStep = activeStepEl.querySelectorAll('input, select');
      inputsInStep.forEach(input => {
        if (input.type !== 'hidden') {
           input.value = '';
           if (input.type === 'file') photoPreview.src = '../assets/core/images/default-avatar.png';
        }
      });
    });

    // Photo Upload
    if (uploadTrigger) uploadTrigger.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', handlePhotoUpload);

    // Form Submission (Show Confirmation)
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showReviewSummary();
    });

    // Final Confirmation
    finalConfirmBtn.addEventListener('click', () => {
      finalConfirmBtn.innerHTML = '<span>Finalizing...</span>';
      setTimeout(() => {
        window.location.href = '../index.html'; // Or dashboard
      }, 1200);
    });

    cancelConfirmBtn.addEventListener('click', () => {
      confirmOverlay.style.display = 'none';
    });
  }

  /**
   * Update UI based on current step
   */
  function updateStepUI() {
    // Show/Hide Steps
    steps.forEach((step, idx) => {
      step.classList.toggle('active', idx + 1 === currentStep);
    });

    // Update Badges
    badges.forEach((badge, idx) => {
      badge.classList.toggle('active', idx + 1 === currentStep);
      badge.classList.toggle('completed', idx + 1 < currentStep);
    });

    // Button Visibility & Labelling Logic
    // Stage 1: Clear, Next
    // Stage 2: Prev, Clear, Next
    // Stage 3: Prev, Clear, Submit
    
    prevBtn.style.visibility = currentStep > 1 ? 'visible' : 'hidden';
    
    if (currentStep < 3) {
      nextBtn.style.display = 'block';
      submitBtn.style.display = 'none';
    } else {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'block';
    }
  }

  /**
   * Validate Current Step Fields
   */
  function validateStep(step) {
    const activeStepEl = document.querySelector(`#step-${step}`);
    const requiredInputs = activeStepEl.querySelectorAll('[required]');
    let isValid = true;

    requiredInputs.forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
        input.style.borderColor = 'var(--accent-pink)';
        // Reset border on input
        input.addEventListener('input', () => {
          input.style.borderColor = 'var(--border-subtle)';
        }, { once: true });
      } else {
        input.style.borderColor = 'var(--border-subtle)';
      }
    });

    if (!isValid) {
      // Small shake for feedback
      activeStepEl.classList.add('shake');
      setTimeout(() => activeStepEl.classList.remove('shake'), 400);
    }

    return isValid;
  }

  /**
   * Process Photo Preview
   */
  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => photoPreview.src = event.target.result;
      reader.readAsDataURL(file);
    }
  }

  /**
   * Show review Summary Modal
   */
  function showReviewSummary() {
    const formData = new FormData(form);
    let html = '';
    
    const labels = {
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      gender: 'Gender',
      dateOfBirth: 'Date of Birth',
      collegeName: 'Institution',
      department: 'Dept',
      year: 'Academic Year',
      rollNumber: 'Roll No',
      section: 'Section'
    };

    formData.forEach((value, key) => {
      if (labels[key]) {
        html += `
          <div class="review-item">
            <div class="review-label">${labels[key]}</div>
            <div class="review-val">${value || '--'}</div>
          </div>
        `;
      }
    });

    reviewGrid.innerHTML = html;
    confirmOverlay.style.display = 'flex';
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ProfileBriefing.init);
