package com.yashwanth.ai_exam_system.dto;

public class TopicPerformanceDTO {

    private String topic;
    private int totalQuestions;
    private int correctAnswers;
    private double accuracy;

    // ================= NEW PRODUCTION FIELDS =================

    private int wrongAnswers;
    private int unanswered;

    private String difficulty; // EASY / MEDIUM / HARD
    private String subject;

    private double averageTimeSeconds;

    private double score;
    private double percentage;

    private String performanceLevel; // WEAK / AVERAGE / STRONG
    private String recommendation;

    private Double improvementNeeded;

    // ================= GETTERS =================

    public String getTopic() {
        return topic;
    }

    public int getTotalQuestions() {
        return totalQuestions;
    }

    public int getCorrectAnswers() {
        return correctAnswers;
    }

    public double getAccuracy() {
        return accuracy;
    }

    public int getWrongAnswers() {
        return wrongAnswers;
    }

    public int getUnanswered() {
        return unanswered;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public String getSubject() {
        return subject;
    }

    public double getAverageTimeSeconds() {
        return averageTimeSeconds;
    }

    public double getScore() {
        return score;
    }

    public double getPercentage() {
        return percentage;
    }

    public String getPerformanceLevel() {
        return performanceLevel;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public Double getImprovementNeeded() {
        return improvementNeeded;
    }

    // ================= SETTERS =================

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public void setTotalQuestions(int totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public void setCorrectAnswers(int correctAnswers) {
        this.correctAnswers = correctAnswers;
    }

    public void setAccuracy(double accuracy) {
        this.accuracy = accuracy;
    }

    public void setWrongAnswers(int wrongAnswers) {
        this.wrongAnswers = wrongAnswers;
    }

    public void setUnanswered(int unanswered) {
        this.unanswered = unanswered;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public void setAverageTimeSeconds(double averageTimeSeconds) {
        this.averageTimeSeconds = averageTimeSeconds;
    }

    public void setScore(double score) {
        this.score = score;
    }

    public void setPercentage(double percentage) {
        this.percentage = percentage;
    }

    public void setPerformanceLevel(String performanceLevel) {
        this.performanceLevel = performanceLevel;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public void setImprovementNeeded(Double improvementNeeded) {
        this.improvementNeeded = improvementNeeded;
    }
}