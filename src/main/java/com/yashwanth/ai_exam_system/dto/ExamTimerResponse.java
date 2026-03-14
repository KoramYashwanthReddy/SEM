package com.yashwanth.ai_exam_system.dto;

public class ExamTimerResponse {

    private long remainingSeconds;

    public ExamTimerResponse() {
    }

    public ExamTimerResponse(long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
    }

    public long getRemainingSeconds() {
        return remainingSeconds;
    }

    public void setRemainingSeconds(long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
    }
}