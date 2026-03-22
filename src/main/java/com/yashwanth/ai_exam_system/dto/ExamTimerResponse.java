package com.yashwanth.ai_exam_system.dto;

import java.time.LocalDateTime;

public class ExamTimerResponse {

    // remaining time
    private long remainingSeconds;

    // total exam duration
    private long totalSeconds;

    // elapsed time
    private long elapsedSeconds;

    // warning when last minutes
    private Boolean warning;

    // auto submit trigger
    private Boolean autoSubmit;

    // RUNNING / EXPIRED / PAUSED
    private String status;

    // percentage for UI progress bar
    private Double timePercentage;

    // server sync
    private LocalDateTime serverTime;

    public ExamTimerResponse() {}

    public ExamTimerResponse(long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
    }

    public long getRemainingSeconds() {
        return remainingSeconds;
    }

    public void setRemainingSeconds(long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
    }

    public long getTotalSeconds() {
        return totalSeconds;
    }

    public void setTotalSeconds(long totalSeconds) {
        this.totalSeconds = totalSeconds;
    }

    public long getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(long elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public Boolean getWarning() {
        return warning;
    }

    public void setWarning(Boolean warning) {
        this.warning = warning;
    }

    public Boolean getAutoSubmit() {
        return autoSubmit;
    }

    public void setAutoSubmit(Boolean autoSubmit) {
        this.autoSubmit = autoSubmit;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getTimePercentage() {
        return timePercentage;
    }

    public void setTimePercentage(Double timePercentage) {
        this.timePercentage = timePercentage;
    }

    public LocalDateTime getServerTime() {
        return serverTime;
    }

    public void setServerTime(LocalDateTime serverTime) {
        this.serverTime = serverTime;
    }
}