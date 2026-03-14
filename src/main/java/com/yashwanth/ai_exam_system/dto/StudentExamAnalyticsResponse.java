package com.yashwanth.ai_exam_system.dto;

public class StudentExamAnalyticsResponse {

    private Integer attemptedExams;
    private Double averageScore;
    private Double highestScore;
    private Double lowestScore;
    private Double passRate;

    public StudentExamAnalyticsResponse() {}

    public Integer getAttemptedExams() { return attemptedExams; }
    public Double getAverageScore() { return averageScore; }
    public Double getHighestScore() { return highestScore; }
    public Double getLowestScore() { return lowestScore; }
    public Double getPassRate() { return passRate; }

    public void setAttemptedExams(Integer attemptedExams) { this.attemptedExams = attemptedExams; }
    public void setAverageScore(Double averageScore) { this.averageScore = averageScore; }
    public void setHighestScore(Double highestScore) { this.highestScore = highestScore; }
    public void setLowestScore(Double lowestScore) { this.lowestScore = lowestScore; }
    public void setPassRate(Double passRate) { this.passRate = passRate; }
}