package com.yashwanth.ai_exam_system.dto;

public class ExamResultResponse {

    private Integer totalMarks;
    private Integer obtainedMarks;
    private Double percentage;
    private String result;

    public ExamResultResponse() {}

    public Integer getTotalMarks() {
        return totalMarks;
    }

    public Integer getObtainedMarks() {
        return obtainedMarks;
    }

    public Double getPercentage() {
        return percentage;
    }

    public String getResult() {
        return result;
    }

    public void setTotalMarks(Integer totalMarks) {
        this.totalMarks = totalMarks;
    }

    public void setObtainedMarks(Integer obtainedMarks) {
        this.obtainedMarks = obtainedMarks;
    }

    public void setPercentage(Double percentage) {
        this.percentage = percentage;
    }

    public void setResult(String result) {
        this.result = result;
    }
}