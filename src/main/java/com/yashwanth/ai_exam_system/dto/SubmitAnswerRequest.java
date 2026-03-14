package com.yashwanth.ai_exam_system.dto;

public class SubmitAnswerRequest {

    private Long attemptId;
    private Long questionId;
    private String answer;
    private Boolean markForReview;

    public SubmitAnswerRequest() {}

    public Long getAttemptId() { return attemptId; }

    public Long getQuestionId() { return questionId; }

    public String getAnswer() { return answer; }

    public Boolean getMarkForReview() { return markForReview; }

    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public void setAnswer(String answer) { this.answer = answer; }

    public void setMarkForReview(Boolean markForReview) { this.markForReview = markForReview; }
}