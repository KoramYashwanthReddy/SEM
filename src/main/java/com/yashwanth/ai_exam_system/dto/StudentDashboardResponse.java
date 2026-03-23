package com.yashwanth.ai_exam_system.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class StudentDashboardResponse {

    // ================= EXAM LISTS =================
    private List<StudentExamSummary> attempted = new ArrayList<>();
    private List<String> notAttempted = new ArrayList<>();

    // ================= ANALYTICS =================
    private StudentExamAnalyticsResponse analytics;

    // ================= AI SUGGESTIONS =================
    private List<ExamSuggestionResponse> suggestions = new ArrayList<>();

    // ================= NEW PRODUCTION FEATURES =================
    private int totalExams;
    private int attemptedCount;
    private int notAttemptedCount;

    private double averageScore;
    private int certificatesEarned;

    private int leaderboardRank;

    private int cheatingAlerts;

    private List<String> weakTopics = new ArrayList<>();

    private List<Double> performanceTrend = new ArrayList<>();

    private LocalDateTime lastAttemptTime;

    public StudentDashboardResponse() {}

    // ================= GETTERS =================

    public List<StudentExamSummary> getAttempted() {
        return attempted;
    }

    public List<String> getNotAttempted() {
        return notAttempted;
    }

    public StudentExamAnalyticsResponse getAnalytics() {
        return analytics;
    }

    public List<ExamSuggestionResponse> getSuggestions() {
        return suggestions;
    }

    public int getTotalExams() {
        return totalExams;
    }

    public int getAttemptedCount() {
        return attemptedCount;
    }

    public int getNotAttemptedCount() {
        return notAttemptedCount;
    }

    public double getAverageScore() {
        return averageScore;
    }

    public int getCertificatesEarned() {
        return certificatesEarned;
    }

    public int getLeaderboardRank() {
        return leaderboardRank;
    }

    public int getCheatingAlerts() {
        return cheatingAlerts;
    }

    public List<String> getWeakTopics() {
        return weakTopics;
    }

    public List<Double> getPerformanceTrend() {
        return performanceTrend;
    }

    public LocalDateTime getLastAttemptTime() {
        return lastAttemptTime;
    }

    // ================= SETTERS =================

    public void setAttempted(List<StudentExamSummary> attempted) {
        this.attempted = attempted != null ? attempted : new ArrayList<>();
    }

    public void setNotAttempted(List<String> notAttempted) {
        this.notAttempted = notAttempted != null ? notAttempted : new ArrayList<>();
    }

    public void setAnalytics(StudentExamAnalyticsResponse analytics) {
        this.analytics = analytics;
    }

    public void setSuggestions(List<ExamSuggestionResponse> suggestions) {
        this.suggestions = suggestions != null ? suggestions : new ArrayList<>();
    }

    public void setTotalExams(int totalExams) {
        this.totalExams = totalExams;
    }

    public void setAttemptedCount(int attemptedCount) {
        this.attemptedCount = attemptedCount;
    }

    public void setNotAttemptedCount(int notAttemptedCount) {
        this.notAttemptedCount = notAttemptedCount;
    }

    public void setAverageScore(double averageScore) {
        this.averageScore = averageScore;
    }

    public void setCertificatesEarned(int certificatesEarned) {
        this.certificatesEarned = certificatesEarned;
    }

    public void setLeaderboardRank(int leaderboardRank) {
        this.leaderboardRank = leaderboardRank;
    }

    public void setCheatingAlerts(int cheatingAlerts) {
        this.cheatingAlerts = cheatingAlerts;
    }

    public void setWeakTopics(List<String> weakTopics) {
        this.weakTopics = weakTopics != null ? weakTopics : new ArrayList<>();
    }

    public void setPerformanceTrend(List<Double> performanceTrend) {
        this.performanceTrend = performanceTrend != null ? performanceTrend : new ArrayList<>();
    }

    public void setLastAttemptTime(LocalDateTime lastAttemptTime) {
        this.lastAttemptTime = lastAttemptTime;
    }
}