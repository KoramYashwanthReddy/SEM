package com.yashwanth.ai_exam_system.dto;

public class ExamSuggestionResponse {

    private String suggestion;

    public ExamSuggestionResponse() {}

    public ExamSuggestionResponse(String suggestion) {
        this.suggestion = suggestion;
    }

    public String getSuggestion() { return suggestion; }

    public void setSuggestion(String suggestion) { this.suggestion = suggestion; }
}