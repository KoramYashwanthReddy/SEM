package com.yashwanth.ai_exam_system.dto;

public class ExamSuggestionResponse {

    private String suggestion;

    // suggestion category
    private String type; 
    // PERFORMANCE / WEAKNESS / TIME / DIFFICULTY / IMPROVEMENT

    private String priority; 
    // LOW / MEDIUM / HIGH

    // context
    private String topic;
    private String difficulty;

    // score info
    private Double percentage;

    // recommendation
    private String recommendedAction;

    public ExamSuggestionResponse() {}

    public ExamSuggestionResponse(String suggestion) {
        this.suggestion = suggestion;
    }

    public String getSuggestion() {
        return suggestion;
    }

    public void setSuggestion(String suggestion) {
        this.suggestion = suggestion;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public Double getPercentage() {
        return percentage;
    }

    public void setPercentage(Double percentage) {
        this.percentage = percentage;
    }

    public String getRecommendedAction() {
        return recommendedAction;
    }

    public void setRecommendedAction(String recommendedAction) {
        this.recommendedAction = recommendedAction;
    }
}