package com.yashwanth.ai_exam_system.dto;

public class ExamNavigationStatusDTO {

    private Long attemptId;

    private Long totalQuestions;

    private Long answered;

    private Long notAnswered;

    private Long markedForReview;

    public ExamNavigationStatusDTO() {}

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public Long getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Long totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public Long getAnswered() {
        return answered;
    }

    public void setAnswered(Long answered) {
        this.answered = answered;
    }

    public Long getNotAnswered() {
        return notAnswered;
    }

    public void setNotAnswered(Long notAnswered) {
        this.notAnswered = notAnswered;
    }

    public Long getMarkedForReview() {
        return markedForReview;
    }

    public void setMarkedForReview(Long markedForReview) {
        this.markedForReview = markedForReview;
    }
}