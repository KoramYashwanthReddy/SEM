/* ════════════════════════════════════════════════════════════
   ONBOARDING LOGIC
   ════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // Check if onboarding was already shown - REMOVED for testing/direct access as requested
    /*
    if (localStorage.getItem('studentWelcomeShown')) {
        window.location.href = '../index.html'; 
        return;
    }
    */

    // Theme logic removed - handled by global ThemeController.init()

    // Initialize Card Stagger Animation
    const cards = document.querySelectorAll('.onboard-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${0.3 + (index * 0.1)}s`;
    });

    // Handle Finish Onboarding
    const finishBtn = document.querySelector('.onboard-finish');
    const dashboardBtn = document.querySelector('.onboard-dashboard');

    const concludeOnboarding = (target) => {
        // Set flag
        localStorage.setItem('studentWelcomeShown', 'true');
        
        // Simple fade out transition
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            window.location.href = target;
        }, 500);
    };

    if (finishBtn) {
        finishBtn.addEventListener('click', (e) => {
            e.preventDefault();
            concludeOnboarding('student-profile.html');
        });
    }

    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            concludeOnboarding('student-profile.html');
        });
    }

    // Optional: Esc key to skip
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            concludeOnboarding('../index.html');
        }
    });
});
