package com.yashwanth.ai_exam_system.dto;

public class QuestionPaletteResponse {

    private Long questionId;
    private String status;

    public QuestionPaletteResponse() {}

    public QuestionPaletteResponse(Long questionId, String status) {
        this.questionId = questionId;
        this.status = status;
    }

    public Long getQuestionId() {
        return questionId;
    }

    public String getStatus() {
        return status;
    }

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}