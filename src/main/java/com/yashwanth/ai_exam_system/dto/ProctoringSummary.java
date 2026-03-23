package com.yashwanth.ai_exam_system.dto;

public class ProctoringSummary {

    private Long attemptId;
    private int cheatingScore;
    private boolean suspicious;
    private boolean flagged;
    private boolean cancelled;

    public ProctoringSummary() {
    }

    public ProctoringSummary(Long attemptId, int cheatingScore,
                             boolean suspicious, boolean flagged,
                             boolean cancelled) {
        this.attemptId = attemptId;
        this.cheatingScore = cheatingScore;
        this.suspicious = suspicious;
        this.flagged = flagged;
        this.cancelled = cancelled;
    }

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public int getCheatingScore() {
        return cheatingScore;
    }

    public void setCheatingScore(int cheatingScore) {
        this.cheatingScore = cheatingScore;
    }

    public boolean isSuspicious() {
        return suspicious;
    }

    public void setSuspicious(boolean suspicious) {
        this.suspicious = suspicious;
    }

    public boolean isFlagged() {
        return flagged;
    }

    public void setFlagged(boolean flagged) {
        this.flagged = flagged;
    }

    public boolean isCancelled() {
        return cancelled;
    }

    public void setCancelled(boolean cancelled) {
        this.cancelled = cancelled;
    }
}