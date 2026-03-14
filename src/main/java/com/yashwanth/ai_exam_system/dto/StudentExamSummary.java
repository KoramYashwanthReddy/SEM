package com.yashwanth.ai_exam_system.dto;

public class StudentExamSummary {

    private String examCode;
    private Integer obtainedMarks;
    private Integer totalMarks;
    private Double percentage;
    private String badge;

    public StudentExamSummary() {}

    public StudentExamSummary(String examCode, Integer obtainedMarks,
                              Integer totalMarks, Double percentage, String badge) {
        this.examCode = examCode;
        this.obtainedMarks = obtainedMarks;
        this.totalMarks = totalMarks;
        this.percentage = percentage;
        this.badge = badge;
    }

    public String getExamCode() { return examCode; }
    public Integer getObtainedMarks() { return obtainedMarks; }
    public Integer getTotalMarks() { return totalMarks; }
    public Double getPercentage() { return percentage; }
    public String getBadge() { return badge; }

    public void setExamCode(String examCode) { this.examCode = examCode; }
    public void setObtainedMarks(Integer obtainedMarks) { this.obtainedMarks = obtainedMarks; }
    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }
    public void setBadge(String badge) { this.badge = badge; }
}