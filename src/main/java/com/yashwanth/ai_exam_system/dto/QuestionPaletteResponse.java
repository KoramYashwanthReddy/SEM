package com.yashwanth.ai_exam_system.dto;

public class QuestionPaletteResponse {

    private Long questionId;
    private String status;

    // ================= NEW PRODUCTION FIELDS =================

    private Boolean visited;
    private Boolean answered;
    private Boolean markedForReview;

    private Long timeSpentSeconds;

    private String difficulty;
    private Integer questionNumber;

    private Boolean autoSaved;

    private Boolean flaggedForCheating;

    public QuestionPaletteResponse() {}

    public QuestionPaletteResponse(Long questionId, String status) {
        this.questionId = questionId;
        this.status = status;
    }

    // ================= GETTERS =================

    public Long getQuestionId() {
        return questionId;
    }

    public String getStatus() {
        return status;
    }

    public Boolean getVisited() {
        return visited;
    }

    public Boolean getAnswered() {
        return answered;
    }

    public Boolean getMarkedForReview() {
        return markedForReview;
    }

    public Long getTimeSpentSeconds() {
        return timeSpentSeconds;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public Integer getQuestionNumber() {
        return questionNumber;
    }

    public Boolean getAutoSaved() {
        return autoSaved;
    }

    public Boolean getFlaggedForCheating() {
        return flaggedForCheating;
    }

    // ================= SETTERS =================

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setVisited(Boolean visited) {
        this.visited = visited;
    }

    public void setAnswered(Boolean answered) {
        this.answered = answered;
    }

    public void setMarkedForReview(Boolean markedForReview) {
        this.markedForReview = markedForReview;
    }

    public void setTimeSpentSeconds(Long timeSpentSeconds) {
        this.timeSpentSeconds = timeSpentSeconds;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public void setQuestionNumber(Integer questionNumber) {
        this.questionNumber = questionNumber;
    }

    public void setAutoSaved(Boolean autoSaved) {
        this.autoSaved = autoSaved;
    }

    public void setFlaggedForCheating(Boolean flaggedForCheating) {
        this.flaggedForCheating = flaggedForCheating;
    }
}