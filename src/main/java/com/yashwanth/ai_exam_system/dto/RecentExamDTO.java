package com.yashwanth.ai_exam_system.dto;

import java.time.LocalDateTime;

public class RecentExamDTO {

    private String examCode;

    private int obtainedMarks;

    private int totalMarks;

    private String status;

    private LocalDateTime endTime;

    public RecentExamDTO() {}

    public RecentExamDTO(
            String examCode,
            int obtainedMarks,
            int totalMarks,
            String status,
            LocalDateTime endTime) {

        this.examCode = examCode;
        this.obtainedMarks = obtainedMarks;
        this.totalMarks = totalMarks;
        this.status = status;
        this.endTime = endTime;
    }

    public String getExamCode() {
        return examCode;
    }

    public int getObtainedMarks() {
        return obtainedMarks;
    }

    public int getTotalMarks() {
        return totalMarks;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public void setObtainedMarks(int obtainedMarks) {
        this.obtainedMarks = obtainedMarks;
    }

    public void setTotalMarks(int totalMarks) {
        this.totalMarks = totalMarks;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }
}