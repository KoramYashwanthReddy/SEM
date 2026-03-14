package com.yashwanth.ai_exam_system.dto;

public class SaveAnswerRequest {

    private Long attemptId;
    private Long questionId;
    private String answer;
    private Boolean reviewMarked;

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
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

    public Boolean getReviewMarked() {
        return reviewMarked;
    }

    public void setReviewMarked(Boolean reviewMarked) {
        this.reviewMarked = reviewMarked;
    }
}