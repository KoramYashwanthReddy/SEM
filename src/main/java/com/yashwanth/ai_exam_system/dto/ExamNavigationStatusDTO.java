package com.yashwanth.ai_exam_system.dto;

public class ExamNavigationStatusDTO {

    private Long attemptId;

    private Long totalQuestions = 0L;

    private Long answered = 0L;

    private Long notAnswered = 0L;

    private Long notVisited = 0L;

    private Long markedForReview = 0L;

    private Long answeredAndMarkedForReview = 0L;

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

    public Long getNotVisited() {
        return notVisited;
    }

    public void setNotVisited(Long notVisited) {
        this.notVisited = notVisited;
    }

    public Long getMarkedForReview() {
        return markedForReview;
    }

    public void setMarkedForReview(Long markedForReview) {
        this.markedForReview = markedForReview;
    }

    public Long getAnsweredAndMarkedForReview() {
        return answeredAndMarkedForReview;
    }

    public void setAnsweredAndMarkedForReview(Long answeredAndMarkedForReview) {
        this.answeredAndMarkedForReview = answeredAndMarkedForReview;
    }
}