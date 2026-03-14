package com.yashwanth.ai_exam_system.dto;

import java.util.List;

public class StudentDashboardResponse {

    private List<StudentExamSummary> attempted;
    private List<String> notAttempted;
    private StudentExamAnalyticsResponse analytics;
    private List<ExamSuggestionResponse> suggestions;

    public StudentDashboardResponse() {}

    public List<StudentExamSummary> getAttempted() { return attempted; }
    public List<String> getNotAttempted() { return notAttempted; }
    public StudentExamAnalyticsResponse getAnalytics() { return analytics; }
    public List<ExamSuggestionResponse> getSuggestions() { return suggestions; }

    public void setAttempted(List<StudentExamSummary> attempted) { this.attempted = attempted; }
    public void setNotAttempted(List<String> notAttempted) { this.notAttempted = notAttempted; }
    public void setAnalytics(StudentExamAnalyticsResponse analytics) { this.analytics = analytics; }
    public void setSuggestions(List<ExamSuggestionResponse> suggestions) { this.suggestions = suggestions; }
}