package com.yashwanth.ai_exam_system.dto;

import java.util.ArrayList;
import java.util.List;

public class TeacherDashboardResponse {

    private int totalExams;
    private int publishedExams;
    private int draftExams;

    private long totalStudents;
    private long totalAttempts;

    private double averageScore;
    private long cheatingFlags;

    private List<String> recentExamCodes = new ArrayList<>();
    private List<Double> performanceTrend = new ArrayList<>();

    public TeacherDashboardResponse() {}

    public int getTotalExams() {
        return totalExams;
    }

    public void setTotalExams(int totalExams) {
        this.totalExams = totalExams;
    }

    public int getPublishedExams() {
        return publishedExams;
    }

    public void setPublishedExams(int publishedExams) {
        this.publishedExams = publishedExams;
    }

    public int getDraftExams() {
        return draftExams;
    }

    public void setDraftExams(int draftExams) {
        this.draftExams = draftExams;
    }

    public long getTotalStudents() {
        return totalStudents;
    }

    public void setTotalStudents(long totalStudents) {
        this.totalStudents = totalStudents;
    }

    public long getTotalAttempts() {
        return totalAttempts;
    }

    public void setTotalAttempts(long totalAttempts) {
        this.totalAttempts = totalAttempts;
    }

    public double getAverageScore() {
        return averageScore;
    }

    public void setAverageScore(double averageScore) {
        this.averageScore = averageScore;
    }

    public long getCheatingFlags() {
        return cheatingFlags;
    }

    public void setCheatingFlags(long cheatingFlags) {
        this.cheatingFlags = cheatingFlags;
    }

    public List<String> getRecentExamCodes() {
        return recentExamCodes;
    }

    public void setRecentExamCodes(List<String> recentExamCodes) {
        this.recentExamCodes = recentExamCodes;
    }

    public List<Double> getPerformanceTrend() {
        return performanceTrend;
    }

    public void setPerformanceTrend(List<Double> performanceTrend) {
        this.performanceTrend = performanceTrend;
    }
}