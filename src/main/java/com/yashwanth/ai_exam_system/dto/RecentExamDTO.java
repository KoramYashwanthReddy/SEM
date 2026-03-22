package com.yashwanth.ai_exam_system.dto;

import java.time.LocalDateTime;

public class RecentExamDTO {

    private String examCode;

    private int obtainedMarks;
    private int totalMarks;

    private String status;

    private LocalDateTime endTime;

    // ================= NEW PRODUCTION FIELDS =================

    private Double percentage;
    private Boolean passed;

    private Integer totalQuestions;
    private Integer correctAnswers;
    private Integer wrongAnswers;

    private Long durationSeconds;

    private String examTitle;
    private String subject;

    private Long attemptId;

    private Integer rank;
    private Boolean flaggedForCheating;

    // ================= CONSTRUCTORS =================

    public RecentExamDTO() {}

    public RecentExamDTO(
            String examCode,
            int obtainedMarks,
            int totalMarks,
            String status,
            LocalDateTime endTime) {

        this.examCode = examCode;
        this.obtainedMarks = obtainedMarks;
        this.totalMarks = totalMarks;
        this.status = status;
        this.endTime = endTime;
    }

    // ================= GETTERS =================

    public String getExamCode() { return examCode; }
    public int getObtainedMarks() { return obtainedMarks; }
    public int getTotalMarks() { return totalMarks; }
    public String getStatus() { return status; }
    public LocalDateTime getEndTime() { return endTime; }

    public Double getPercentage() { return percentage; }
    public Boolean getPassed() { return passed; }
    public Integer getTotalQuestions() { return totalQuestions; }
    public Integer getCorrectAnswers() { return correctAnswers; }
    public Integer getWrongAnswers() { return wrongAnswers; }
    public Long getDurationSeconds() { return durationSeconds; }
    public String getExamTitle() { return examTitle; }
    public String getSubject() { return subject; }
    public Long getAttemptId() { return attemptId; }
    public Integer getRank() { return rank; }
    public Boolean getFlaggedForCheating() { return flaggedForCheating; }

    // ================= SETTERS =================

    public void setExamCode(String examCode) { this.examCode = examCode; }
    public void setObtainedMarks(int obtainedMarks) { this.obtainedMarks = obtainedMarks; }
    public void setTotalMarks(int totalMarks) { this.totalMarks = totalMarks; }
    public void setStatus(String status) { this.status = status; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public void setPercentage(Double percentage) { this.percentage = percentage; }
    public void setPassed(Boolean passed) { this.passed = passed; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }
    public void setCorrectAnswers(Integer correctAnswers) { this.correctAnswers = correctAnswers; }
    public void setWrongAnswers(Integer wrongAnswers) { this.wrongAnswers = wrongAnswers; }
    public void setDurationSeconds(Long durationSeconds) { this.durationSeconds = durationSeconds; }
    public void setExamTitle(String examTitle) { this.examTitle = examTitle; }
    public void setSubject(String subject) { this.subject = subject; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }
    public void setRank(Integer rank) { this.rank = rank; }
    public void setFlaggedForCheating(Boolean flaggedForCheating) { this.flaggedForCheating = flaggedForCheating; }
}