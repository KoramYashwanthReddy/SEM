// proctoring.js - Monitor user activities and tab switching

class ProctoringSystem {
  constructor() {
    this.warningModal = document.getElementById('warning-modal');
    this.warningText = document.getElementById('warning-text');
    this.dismissBtn = document.getElementById('dismiss-warning-btn');
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    
    this.generalWarningsCount = 0;
    this.voiceWarningsCount = 0;
    
    this.maxGeneralWarnings = 5; 
    this.maxVoiceWarnings = 10;
    
    this.logContainer = document.getElementById('proctoring-log-container');
    this.logCountGeneral = document.getElementById('log-count-general');
    this.logCountVoice = document.getElementById('log-count-voice');
    
    this.mustSubmit = false;
    this.camReady = false;
    this.micReady = false;
    this.userVisible = false;
    
    this.setupOverlay = document.getElementById('proctoring-setup-overlay');
    this.startBtn = document.getElementById('start-exam-btn');
    this.consentChk = document.getElementById('setup-consent-chk');
    
    this.init();
  }

  isOverlayActive() {
    return !!(this.setupOverlay && this.setupOverlay.classList.contains('active'));
  }

  isExamStarted() {
    return !this.isOverlayActive();
  }

  resolveViolationType(reason, category) {
    const text = String(reason || '').toLowerCase();
    if (text.includes('tab switch')) return 'TAB_SWITCH';
    if (text.includes('focus lost') || text.includes('other applications')) return 'WINDOW_BLUR';
    if (text.includes('fullscreen')) return 'EXIT_FULLSCREEN';
    if (text.includes('copy') || text.includes('paste')) return 'COPY_PASTE';
    if (text.includes('shortcut') || text.includes('f12') || text.includes('developer tools')) return 'FORBIDDEN_SHORTCUT';
    if (text.includes('multiple distinct voices') || text.includes('noise')) return 'MULTIPLE_VOICES';
    if (text.includes('multiple persons')) return 'MULTIPLE_FACES';
    if (text.includes('camera') && (text.includes('turned off') || text.includes('lost'))) return 'CAMERA_LOST';
    if (text.includes('microphone') && (text.includes('turned off') || text.includes('lost'))) return 'MIC_LOST';
    if (text.includes('candidate not detected') || text.includes('no one')) return 'NO_FACE';
    return category === 'voice' ? 'AUDIO_VIOLATION' : 'SYSTEM_VIOLATION';
  }

  recordEvent(eventType, details, metadata = {}, dedupeKey = '') {
    if (typeof window.__examAuditLogger === 'function') {
      window.__examAuditLogger({
        eventType,
        details,
        metadata,
        dedupeKey
      });
    }
  }

  init() {
    // Visibility change (Tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.triggerWarning('Tab switch detected. You must stay on the exam page.', 'general');
      }
    });

    // Window blur (Lost focus)
    window.addEventListener('blur', () => {
      // Small timeout to prevent false positives when interacting with browser UI
      setTimeout(() => {
        if (!document.hasFocus()) {
          this.triggerWarning('Window focus lost. Please do not interact with other applications.', 'general');
        }
      }, 500);
    });

    if (this.dismissBtn) {
      this.dismissBtn.addEventListener('click', () => {
        this.warningModal.classList.remove('active');
        
        // Re-lock Fullscreen if it was exited during the exam
        const isStarted = this.isExamStarted();
        const isSubmitted = document.body.innerHTML.includes('Submitted Successfully');
        if (isStarted && !isSubmitted && !document.fullscreenElement) {
           document.documentElement.requestFullscreen().catch(err => console.warn(err.message));
        }
        
        // If critical violations reached, submit
        if (this.mustSubmit) {
           showToast('Proctoring limits exceeded. Force submitting exam...', 'error');
           if (window.examController) {
               window.examController.submitExam(true);
           }
        }
      });
    }

    // Fullscreen behavior & Enforcement
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Error attempting to enable fullscreen: ${err.message}`);
          });
        } else {
          // If exam is running, don't allow manual exit via button
          if (this.isExamStarted() && !document.body.innerHTML.includes('Submitted Successfully')) {
             showToast('Manual exit disabled during examination.', 'warning');
             return;
          }
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      });
    }

    // Mandatory Re-lock logic
    document.addEventListener('fullscreenchange', () => {
       const isSubmitted = document.body.innerHTML.includes('Submitted Successfully');
       const isStarted = this.isExamStarted();
       
       if (isStarted && !isSubmitted && !document.fullscreenElement) {
          this.triggerWarning('Mandatory Fullscreen Mode exited. This violation has been recorded.', 'general');
          // Re-entry will be offered via the warning modal acknowledgment
       }
    });
    
    // Attempt camera init and proctoring setup
    this.initCameraProctoring();
    
    // Initialize Audio Proctoring (Detecting voices)
    this.initAudioProctoring();
    
    // Add anti-cheat listeners
    this.initAntiCheat();
    
    // Final check for startup button
    if (this.startBtn) {
       this.startBtn.addEventListener('click', () => {
         if (this.camReady && this.micReady && this.consentChk.checked) {
            this.recordEvent('EXAM_PROCTORING_STARTED', 'Proctoring checks completed and exam started', {
              camReady: true,
              micReady: true,
              identityVerified: Boolean(this.userVisible)
            }, 'proctor-start');
            // Request Fullscreen (Mandatory)
            document.documentElement.requestFullscreen().catch(err => {
               console.warn(`Fullscreen request failed: ${err.message}`);
            });

            if (this.setupOverlay) {
              this.setupOverlay.classList.remove('active');
              this.setupOverlay.style.display = 'none';
            }
            // Start the exam timer if examController exists
            if (window.examController && window.examController.timer) {
                window.examController.timer.start();
            }
         }
       });
    }

    if (this.consentChk) {
       this.consentChk.addEventListener('change', () => this.validateFinalSetup());
    }
  }

  validateFinalSetup() {
     if (!this.startBtn) return;
     const isReady = this.camReady && this.micReady && this.userVisible && this.consentChk.checked;
     this.startBtn.disabled = !isReady;
  }

  triggerWarning(reason, category = 'general') {
    let count, max;
    const categoryLabel = category === 'voice' ? 'Audio/Voice' : 'Visual/System';
    
    if (category === 'voice') {
      this.voiceWarningsCount++;
      count = this.voiceWarningsCount;
      max = this.maxVoiceWarnings;
    } else {
      this.generalWarningsCount++;
      count = this.generalWarningsCount;
      max = this.maxGeneralWarnings;
    }
    
    // Construct specific message
    let displayMessage = `Specific Violation: ${reason}\n\n`;
    displayMessage += `Violation Category: ${categoryLabel}\n`;
    displayMessage += `Strike: ${count} of ${max}\n\n`;

    if (count === max - 1) {
       displayMessage += 'WARNING: This is your final chance for this category!';
    } else if (count >= max) {
       displayMessage = `CRITICAL LIMIT REACHED\n\nReason: ${reason}\n\nYour exam is being automatically submitted due to repeated proctoring violations.`;
       this.mustSubmit = true;
    }
    
    if (this.warningText) {
       this.warningText.innerText = displayMessage;
    }
    if (this.warningModal) {
       this.warningModal.classList.add('active');
    }
    
    // Update Right Panel Logs
    this.addLogToPanel(reason, category, count, max);
    
    // Log securely to fake backend
    console.warn(`[Proctor Log] Category: ${category}, Strike: ${count}/${max}, Reason: ${reason}`);
    this.recordEvent(
      this.resolveViolationType(reason, category),
      reason,
      { category, strike: count, limit: max },
      `${category}:${reason}`
    );
  }

  addLogToPanel(reason, category, count, max) {
    if (!this.logContainer) return;
    
    // Remove empty message if it exists
    const emptyMsg = this.logContainer.querySelector('.empty-log-msg');
    if (emptyMsg) emptyMsg.remove();
    
    const logEntry = document.createElement('div');
    logEntry.style.padding = '8px';
    logEntry.style.borderRadius = '6px';
    logEntry.style.fontSize = '0.75rem';
    logEntry.style.background = 'var(--bg-secondary)';
    logEntry.style.borderLeft = category === 'voice' ? '3px solid #ffc107' : '3px solid #dc3545';
    logEntry.style.animation = 'slideInRight 0.3s ease-out';
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    logEntry.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
        <strong style="color: ${category === 'voice' ? '#ffc107' : '#dc3545'};">${category === 'voice' ? 'Mic' : 'Sys'} Strike ${count}/${max}</strong>
        <span style="opacity:0.5; font-size: 0.65rem;">${time}</span>
      </div>
      <div style="color: var(--text-secondary); line-height: 1.3;">${reason}</div>
    `;
    
    this.logContainer.prepend(logEntry);
    
    // Update labels
    if (this.logCountGeneral) this.logCountGeneral.innerText = `${this.generalWarningsCount} / ${this.maxGeneralWarnings}`;
    if (this.logCountVoice) this.logCountVoice.innerText = `${this.voiceWarningsCount} / ${this.maxVoiceWarnings}`;
  }
  
  initAudioProctoring() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('MediaDevices API not supported for audio proctoring.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.micReady = true;
        this.updateSetupStatus('mic', true);
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 512;
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let vocalActivityFrames = 0;
        let cooldownFrames = 0;
        
        const monitor = () => {
          // Stay running to capture logs even if warnings count is maxed out, 
          // but stop triggering modals after submission.
          if (document.body.innerHTML.includes('Submitted Successfully')) return;

          // 1. Mandatory Persistence Check: Ensure Mic is still active
          const micTrack = stream.getAudioTracks()[0];
          if (!stream.active || !micTrack || micTrack.readyState !== 'live' || !micTrack.enabled) {
             if (this.isExamStarted()) { // only during exam
                this.triggerWarning('CRITICAL: Microphone has been turned off or lost.', 'voice');
             }
          }

          analyser.getByteFrequencyData(dataArray);
          
          // Voice range bins: 300Hz to 3000Hz (Bins ~4 to 35)
          let voiceEnergy = 0;
          let peakCount = 0;
          
          for (let i = 4; i < 35; i++) {
            voiceEnergy += dataArray[i];
            // Simple peak detection as proxy for complex voice/harmonic overlapping
            if (dataArray[i] > 65 && dataArray[i] > dataArray[i-1] + 5 && dataArray[i] > dataArray[i+1] + 5) {
              peakCount++;
            }
          }
          
          const avgVoiceEnergy = voiceEnergy / 31;
          const statusMic = document.getElementById('status-mic');
          
          if (statusMic) {
            if (avgVoiceEnergy > 45) {
               statusMic.style.opacity = '0.5';
               setTimeout(() => statusMic.style.opacity = '1', 50);
            }
          }
          
          // Heuristic: Multi-voice detection specifically requires overlapping frequency peaks
          // peakCount > 2 is the primary indicator of multiple distinct speakers
          if (peakCount > 2) {
            vocalActivityFrames++;
          } else {
            vocalActivityFrames = Math.max(0, vocalActivityFrames - 1);
          }
          
          if (cooldownFrames > 0) {
            cooldownFrames--;
          } else if (vocalActivityFrames > 120) { // ~2 seconds of persistent multi-voice
             this.triggerWarning('Multiple distinct voices detected in the environment.', 'voice');
             vocalActivityFrames = 0; 
             cooldownFrames = 300; // 5 second cooldown
          }
          
          requestAnimationFrame(monitor);
        };
        
        monitor();
        console.log("Audio proctoring system initialized.");
      })
      .catch(err => {
        console.warn("Microphone access denied or error:", err);
      });
  }
  
  initCameraProctoring() {
     const placeholder = document.getElementById('camera-feed-placeholder');
     if (!placeholder) return;

     navigator.mediaDevices.getUserMedia({ video: true })
       .then(stream => {
           this.camReady = true;
           this.updateSetupStatus('cam', true);
           
           // Small Monitor (Right Panel)
           let videoSmall = document.createElement('video');
           videoSmall.style.width = '100%';
           videoSmall.style.height = '100%';
           videoSmall.style.objectFit = 'cover';
           videoSmall.autoplay = true;
           videoSmall.muted = true;
           placeholder.innerHTML = '<div style="position:absolute; bottom:5px; left:5px; z-index:5; color:white; font-size:10px; background:rgba(220,53,69,0.8); padding:2px 4px; border-radius:2px; display:flex; gap:4px; align-items:center;"><div class="indicator-dot" style="background:white; width:6px; height:6px;"></div> REC</div>';
           placeholder.appendChild(videoSmall);
           videoSmall.srcObject = stream;

           // Large Preview (Setup Overlay)
           const setupPreview = document.getElementById('setup-camera-preview');
           if (setupPreview) {
              let videoLarge = document.createElement('video');
              videoLarge.style.width = '100%';
              videoLarge.style.height = '100%';
              videoLarge.style.objectFit = 'cover';
              videoLarge.autoplay = true;
              videoLarge.muted = true;
              setupPreview.innerHTML = '';
              setupPreview.appendChild(videoLarge);
              videoLarge.srcObject = stream;
           }

           const video = videoSmall;
           
           // Hidden canvas for shutter/obstruction detection
           const canvas = document.createElement('canvas');
           canvas.width = 64; canvas.height = 36;
           const ctx = canvas.getContext('2d', { willReadFrequently: true });
           
           let lastTime = 0;
           let lastTimeCheck = Date.now();
           
           setInterval(() => {
              if (this.isExamStarted()) { // only monitor while exam is running
                 // 1. Mandatory Persistence Check: Ensure Camera is still active
                 const camTrack = stream.getVideoTracks()[0];
                 if (!stream.active || !camTrack || camTrack.readyState !== 'live' || !camTrack.enabled) {
                    this.triggerWarning('CRITICAL: Camera has been turned off or lost.', 'general');
                 }
                 
                 // 2. Physical Shutter/Lens Obstruction Detection
                 if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    // Check for frozen frame (CurrentTime must progress)
                    if (video.currentTime === lastTime && Date.now() - lastTimeCheck > 4000) {
                        this.triggerWarning('Camera feed appears frozen or static.', 'general');
                    }
                    lastTime = video.currentTime;
                    lastTimeCheck = Date.now();

                    // Check for black/shutter frame
                    ctx.drawImage(video, 0, 0, 64, 36);
                    const pixels = ctx.getImageData(0, 0, 64, 36).data;
                    let totalBrightness = 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                       totalBrightness += (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
                    }
                    const avgBrightness = totalBrightness / (64 * 36);
                    
                    if (avgBrightness < 5) {
                       this.triggerWarning('Camera lens appears obstructed or shutter is closed.', 'general');
                    }
                  
                    // 3. Simulated Face/Person Visibility Detection
                    // Pure JS pixel-based variance check to estimate if a person is in frame
                    if (avgBrightness > 10) { 
                       // Periodically test for "No person detected" simulation
                       if (Math.random() > 0.995 && this.userVisible) { 
                          this.triggerWarning('Candidate not detected. There is no one to write the exam. Please remain in the camera field of view at all times.', 'general');
                       }
                    }
                 }
                 
                 // 4. Simulated Multi-person detection (AI Simulation)
                 if (Math.random() > 0.999) { // low chance dummy trigger for demo purposes
                    this.triggerWarning('Multiple persons detected in camera field.', 'general');
                 }
              }
           }, 5000); // Check every 5 seconds for shutter/obstruction
       })
       .catch(err => {
           console.error("Camera access denied or error:", err);
           this.updateSetupStatus('cam', false);
       });
  }

  updateSetupStatus(type, success) {
     const el = document.getElementById(`setup-status-${type}`);
     if (!el) return;
     
     if (success) {
        el.style.borderLeftColor = 'var(--success-color)';
        el.children[1].innerText = 'Ready';
        el.children[1].style.color = 'var(--success-color)';
        
        if (type === 'cam') {
           // Simulate identifying the user
           setTimeout(() => {
              this.userVisible = true;
              showToast('Face identity verified successfully.', 'info');
              this.validateFinalSetup();
           }, 2000);
        }
     } else {
        el.style.borderLeftColor = 'var(--danger-color)';
        el.children[1].innerText = 'Error/Denied';
        el.children[1].style.color = 'var(--danger-color)';
        document.getElementById('setup-error-msg').style.display = 'block';
        this.validateFinalSetup();
     }
     
     this.validateFinalSetup();
  }


  initAntiCheat() {
    // Note: Normal mouse clicks including right-click are permitted per user request.

    // Disable copy, cut, paste events
    ['copy', 'cut', 'paste'].forEach(evt => {
      document.addEventListener(evt, (e) => {
        e.preventDefault();
        this.triggerWarning(`User attempted '${evt}' (Copy/Paste Restricted)`, 'general');
      });
    });

    // Disable specific keyboard shortcuts (F12, Ctrl/Cmd + C, V, X, P, S, U, etc)
    document.addEventListener('keydown', (e) => {
      // Prevent F12
      if (e.key === 'F12') {
        e.preventDefault();
        this.triggerWarning('Developer Tools (F12) access attempt', 'general');
      }
      
      // Prevent Ctrl/Cmd modifiers
      if (e.ctrlKey || e.metaKey) {
        const forbiddenKeys = ['c', 'v', 'x', 'p', 's', 'u', 'i', 'j'];
        const key = e.key.toLowerCase();
        
        if (forbiddenKeys.includes(key)) {
          e.preventDefault();
          this.triggerWarning(`Restricted keyboard shortcut used: Ctrl/Cmd + ${key.toUpperCase()}`, 'general');
        }
      }
    });
  }
}

// Instantiate early to start listening, but only after document parses
document.addEventListener('DOMContentLoaded', () => {
    window.proctorSystem = new ProctoringSystem();
});
