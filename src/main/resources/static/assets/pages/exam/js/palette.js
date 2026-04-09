// palette.js - Question Palette Grid Visuals

class QuestionPalette {
  constructor(questions, onQuestionClick) {
    this.questions = questions;
    this.container = document.getElementById('question-palette');
    this.onQuestionClick = onQuestionClick;
    this.buttons = {};
    this.sectionCards = {}; // difficulty -> card element
    
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.buttons = new Array(this.questions.length);
        const questionOrder = this.questions.reduce((acc, q, idx) => {
      acc[q.id] = idx + 1;
      return acc;
    }, {});
    // Group questions by difficulty
    const groups = {
      'Easy': [],
      'Medium': [],
      'Hard': []
    };
    
    this.questions.forEach(q => {
      const diff = q.difficulty || 'Medium';
      if(groups[diff]) groups[diff].push(q);
    });

    Object.keys(groups).forEach(difficulty => {
      const qList = groups[difficulty];
      if(qList.length === 0) return;

      const card = document.createElement('div');
      card.className = 'accordion-card open';

      // Header
      const header = document.createElement('div');
      header.className = 'accordion-header';
      header.innerHTML = `
        <div class="accordion-title">
          <span class="exam-badge badge-${difficulty.toLowerCase()}">${difficulty}</span> 
          <span style="color:var(--text-secondary);font-size:0.75rem;">Questions: ${qList.length}</span>
          <span class="marked-count-header" id="palette-marked-${difficulty}" style="color:var(--focus-color);font-size:0.75rem;margin-left:8px;">Marked: 0/5</span>
        </div>
        <div class="accordion-icon">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>
        </div>
      `;
      header.addEventListener('click', () => {
         card.classList.toggle('open');
      });
      card.appendChild(header);

      // Body (Grid)
      const body = document.createElement('div');
      body.className = 'accordion-body';
      
      const grid = document.createElement('div');
      grid.className = 'palette-grid';

      qList.forEach((q) => {
        const btn = document.createElement('button');
        btn.className = 'palette-btn not-visited';
        const displayNumber = questionOrder[q.id] || 0;
        btn.textContent = String(displayNumber);
        btn.dataset.id = q.id;
        btn.dataset.questionNumber = String(displayNumber);
        btn.addEventListener('click', () => this.onQuestionClick(displayNumber));
        grid.appendChild(btn);
        
        // Map by real question ID for backend-driven IDs
        this.buttons[q.id] = btn;
      });

      body.appendChild(grid);
      card.appendChild(body);
      
      this.sectionCards[difficulty] = card;
      this.container.appendChild(card);
    });
  }

  updateLockStatus(unlockedDifficulties) {
    Object.keys(this.sectionCards).forEach(diff => {
      const card = this.sectionCards[diff];
      const isLocked = !unlockedDifficulties.includes(diff);
      
      if (isLocked) {
        card.classList.add('locked');
        card.classList.remove('open');
      } else {
        card.classList.remove('locked');
      }
    });
  }

  // Status can be: 'not-visited', 'not-answered', 'answered', 'marked', 'marked-answered'
  updateStatus(questionId, status) {
    const btn = this.buttons[questionId];
    if (btn) {
      // Remove all state classes
      btn.classList.remove('not-visited', 'not-answered', 'answered', 'marked', 'marked-answered');
      // Add new state
      btn.classList.add(status);
    }
  }

  setActive(questionId) {
    Object.values(this.buttons).forEach(btn => btn.classList.remove('active'));
    const btn = this.buttons[questionId];
    if (btn) {
        btn.classList.add('active');
        // Auto scroll to active button in palette
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  
  getSummary() {
    let answered = 0, unanswered = 0, marked = 0, notVisited = 0;
    Object.values(this.buttons).forEach((btn) => {
      const hasAnswer = btn.classList.contains('answered') || btn.classList.contains('marked-answered');
      const isMarked = btn.classList.contains('marked') || btn.classList.contains('marked-answered');
      const isNotVisited = btn.classList.contains('not-visited');
      const isUnanswered = btn.classList.contains('not-answered');
      
      if (hasAnswer) answered++;
      if (isMarked) marked++;
      if (isNotVisited) notVisited++;
      if (isUnanswered) unanswered++;
    });
    
    return { answered, unanswered, marked, notVisited };
  }

  updateMarkedHeader(difficulty, current, limit) {
    const el = document.getElementById(`palette-marked-${difficulty}`);
    if (el) {
      el.textContent = `Marked: ${current}/${limit}`;
      if (current >= limit) {
        el.style.color = 'var(--danger-color)';
        el.style.fontWeight = '600';
      } else {
        el.style.color = 'var(--focus-color)';
        el.style.fontWeight = 'normal';
      }
    }
  }
}
