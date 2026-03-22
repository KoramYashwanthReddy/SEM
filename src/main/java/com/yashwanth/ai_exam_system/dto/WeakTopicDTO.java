package com.yashwanth.ai_exam_system.dto;

public class WeakTopicDTO {

    private String topic;
    private double accuracy;
    private String recommendation;

    // ================= NEW PRODUCTION FIELDS =================

    private String difficulty;
    private Integer totalQuestions;
    private Integer correctAnswers;
    private Integer wrongAnswers;

    private String weaknessLevel; // LOW / MEDIUM / HIGH
    private Double priorityScore;

    public WeakTopicDTO() {
    }

    public WeakTopicDTO(String topic, double accuracy, String recommendation) {
        this.topic = topic;
        this.accuracy = accuracy;
        this.recommendation = recommendation;
    }

    // ================= GETTERS =================

    public String getTopic() {
        return topic;
    }

    public double getAccuracy() {
        return accuracy;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public Integer getCorrectAnswers() {
        return correctAnswers;
    }

    public Integer getWrongAnswers() {
        return wrongAnswers;
    }

    public String getWeaknessLevel() {
        return weaknessLevel;
    }

    public Double getPriorityScore() {
        return priorityScore;
    }

    // ================= SETTERS =================

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public void setAccuracy(double accuracy) {
        this.accuracy = accuracy;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public void setCorrectAnswers(Integer correctAnswers) {
        this.correctAnswers = correctAnswers;
    }

    public void setWrongAnswers(Integer wrongAnswers) {
        this.wrongAnswers = wrongAnswers;
    }

    public void setWeaknessLevel(String weaknessLevel) {
        this.weaknessLevel = weaknessLevel;
    }

    public void setPriorityScore(Double priorityScore) {
        this.priorityScore = priorityScore;
    }

    // ================= UTILITY =================

    @Override
    public String toString() {
        return "WeakTopicDTO{" +
                "topic='" + topic + '\'' +
                ", accuracy=" + accuracy +
                ", recommendation='" + recommendation + '\'' +
                ", difficulty='" + difficulty + '\'' +
                ", totalQuestions=" + totalQuestions +
                ", correctAnswers=" + correctAnswers +
                ", wrongAnswers=" + wrongAnswers +
                ", weaknessLevel='" + weaknessLevel + '\'' +
                ", priorityScore=" + priorityScore +
                '}';
    }
}