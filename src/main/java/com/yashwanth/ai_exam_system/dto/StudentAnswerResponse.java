package com.yashwanth.ai_exam_system.dto;

public class StudentAnswerResponse {

    private Long questionId;
    private String answer;
    private String status;
    private Boolean markedForReview;

    public StudentAnswerResponse() {}

    public StudentAnswerResponse(Long questionId, String answer, String status, Boolean markedForReview) {
        this.questionId = questionId;
        this.answer = answer;
        this.status = status;
        this.markedForReview = markedForReview;
    }

    public Long getQuestionId() {
        return questionId;
    }

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getMarkedForReview() {
        return markedForReview;
    }

    public void setMarkedForReview(Boolean markedForReview) {
        this.markedForReview = markedForReview;
    }
}
