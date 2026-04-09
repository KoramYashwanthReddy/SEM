// navigation.js - Keyboard Shortcuts & UI Flow

class ExamNavigation {
  constructor(examController) {
    this.controller = examController;
    
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.saveNextBtn = document.getElementById('save-next-btn');
    this.markReviewChk = document.getElementById('mark-review-chk');
    this.clearBtn = document.getElementById('clear-response-btn');
    
    this.initListeners();
    this.initKeyboardShortcuts();
  }

  initListeners() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.controller.navigate(-1));
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.controller.navigate(1));
    }
    if (this.saveNextBtn) {
      this.saveNextBtn.addEventListener('click', async () => {
         await this.controller.saveCurrentAnswer();
         this.controller.navigate(1);
      });
    }
    if (this.markReviewChk) {
      this.markReviewChk.addEventListener('change', (e) => {
         this.controller.toggleMarkReview(e.target.checked);
      });
    }
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
         this.controller.clearCurrentAnswer();
      });
    }
  }

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger if inside an input or textarea (unless it's an arrow key for select)
      if (e.target.tagName === 'INPUT' && e.target.type !== 'radio' && e.target.type !== 'checkbox') return;
      if (e.target.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case 'ArrowLeft':
          this.controller.navigate(-1);
          break;
        case 'ArrowRight':
          this.controller.navigate(1);
          break;
        case 'Enter':
          // Optionally save & next on enter
          // this.controller.saveCurrentAnswer();
          // this.controller.navigate(1);
          break;
        case 'm':
        case 'M':
          // Toggle mark for review
          if (this.markReviewChk) {
             this.markReviewChk.checked = !this.markReviewChk.checked;
             this.controller.toggleMarkReview(this.markReviewChk.checked);
          }
          break;
      }
    });
  }
}
