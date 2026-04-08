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

    const API_BASE = /^https?:/i.test(window.location.origin)
      ? window.location.origin
      : "http://localhost:8080";
    const token = () => localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("jwt") || "";
    const finishBtn = document.querySelector('.onboard-finish');
    const dashboardBtn = document.querySelector('.onboard-dashboard');

    const sanitizeUserForStorage = (raw) => {
      const user = raw && typeof raw === "object" ? { ...raw } : {};
      const heavyImage = String(user.profileImage || "").trim();
      if (heavyImage.startsWith("data:")) {
        user.profileImage = "";
      }
      return {
        id: user.userId || user.id || null,
        userId: user.userId || user.id || null,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "STUDENT",
        phone: user.phone || "",
        department: user.department || "",
        designation: user.designation || "",
        qualification: user.qualification || "",
        employeeId: user.employeeId || "",
        profileImage: user.profileImage || ""
      };
    };

    const safeSetStorage = (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn(`Skipping localStorage key '${key}' due to quota/storage error`, error);
        return false;
      }
    };

    const request = async (path) => {
      const auth = token();
      if (!auth) return false;
      const response = await fetch(`${API_BASE}/api${path}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${auth}`
        }
      });
      if (!response.ok) return false;
      return response.json();
    };

    const syncVerifiedUser = async () => {
      const me = await request("/users/me");
      if (me && typeof me === "object") {
        safeSetStorage("user", JSON.stringify(sanitizeUserForStorage(me)));
        if (me.email) {
          sessionStorage.setItem("signup.pendingEmail", String(me.email));
        }
      }
      return me;
    };

    // Initialize Card Stagger Animation
    const cards = document.querySelectorAll('.onboard-card');
    cards.forEach((card, index) => {
      card.style.animationDelay = `${0.3 + (index * 0.1)}s`;
    });

    const setFinishLabel = (completed) => {
        if (!finishBtn) return;
        finishBtn.querySelector("span").textContent = completed ? "Initialize First Session" : "Complete Profile";
    };

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

    const resolveTarget = async () => {
        const completed = await request("/student/profile/completed");
        return completed ? "student-ui.html" : "student-profile.html";
    };

    (async () => {
      await syncVerifiedUser().catch(() => null);
      const completed = await request("/student/profile/completed");
      setFinishLabel(Boolean(completed));
    })().catch(() => setFinishLabel(false));

    if (finishBtn) {
        finishBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = await resolveTarget();
            concludeOnboarding(target);
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
            concludeOnboarding('role-selection.html');
        }
    });
});
