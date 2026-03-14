package com.yashwanth.ai_exam_system.dto;

public class StartExamRequest {

    private Long studentId;
    private String examCode;

    public StartExamRequest() {}

    public Long getStudentId() {
        return studentId;
    }

    public String getExamCode() {
        return examCode;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }
}