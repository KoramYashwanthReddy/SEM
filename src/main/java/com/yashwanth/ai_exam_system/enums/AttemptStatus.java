package com.yashwanth.ai_exam_system.enums;

public enum AttemptStatus {

    // Exam started but not submitted
    STARTED,

    // Student manually submitted
    SUBMITTED,

    // Auto submitted by timer
    AUTO_SUBMITTED,

    // Evaluation completed
    EVALUATED,

    // Successfully completed
    COMPLETED,

    // Cancelled by admin / cheating
    INVALIDATED,

    // Time expired but not yet evaluated
    EXPIRED;

    // ================= HELPER METHODS =================

    public boolean isActive() {
        return this == STARTED;
    }

    public boolean isSubmitted() {
        return this == SUBMITTED || this == AUTO_SUBMITTED;
    }

    public boolean isFinal() {
        return this == EVALUATED ||
               this == COMPLETED ||
               this == INVALIDATED;
    }

    public boolean isExpired() {
        return this == EXPIRED;
    }
}