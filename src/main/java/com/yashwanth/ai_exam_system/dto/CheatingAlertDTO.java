package com.yashwanth.ai_exam_system.dto;

import java.time.LocalDateTime;

public class CheatingAlertDTO {

    private Long studentId;
    private Long examId;
    private Long attemptId;

    private String message;
    private double riskScore;
    private String eventType;

    // LOW | HIGH | CRITICAL
    private String severity;

    private LocalDateTime timestamp;

    // Optional fields
    private String studentName;
    private String examName;

    // ================= CONSTRUCTORS =================

    public CheatingAlertDTO() {
    }

    public CheatingAlertDTO(Long studentId,
                            Long examId,
                            Long attemptId,
                            String message,
                            double riskScore,
                            String eventType,
                            String severity,
                            LocalDateTime timestamp,
                            String studentName,
                            String examName) {

        this.studentId = studentId;
        this.examId = examId;
        this.attemptId = attemptId;
        this.message = message;
        this.riskScore = riskScore;
        this.eventType = eventType;
        this.severity = severity;
        this.timestamp = timestamp;
        this.studentName = studentName;
        this.examName = examName;
    }

    // ================= GETTERS =================

    public Long getStudentId() {
        return studentId;
    }

    public Long getExamId() {
        return examId;
    }

    public Long getAttemptId() {
        return attemptId;
    }

    public String getMessage() {
        return message;
    }

    public double getRiskScore() {
        return riskScore;
    }

    public String getEventType() {
        return eventType;
    }

    public String getSeverity() {
        return severity;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public String getStudentName() {
        return studentName;
    }

    public String getExamName() {
        return examName;
    }

    // ================= SETTERS =================

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public void setExamId(Long examId) {
        this.examId = examId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setRiskScore(double riskScore) {
        this.riskScore = riskScore;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public void setExamName(String examName) {
        this.examName = examName;
    }
}