package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_attempts")
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔥 IMPORTANT (needed for cancelExam)
    private Long examId;

    private String examCode;

    private Long studentId;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer totalMarks;

    private Integer obtainedMarks;

    private Double score;

    /**
     * STARTED | SUBMITTED | EVALUATED | FLAGGED | INVALIDATED
     */
    private String status;

    private Integer durationMinutes;

    private LocalDateTime expiryTime;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // 🔥 AI CHEATING SYSTEM
    private Integer cheatingScore = 0;

    private Boolean cheatingFlag = false;

    // 🔥 NEW: store reason for invalidation / cheating
    @Column(length = 1000)
    private String remarks;

    // 🔥 OPTIONAL: track last AI update time
    private LocalDateTime lastAiCheckTime;

    public ExamAttempt() {}

    // ✅ AUTO SET VALUES ON CREATE
    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        // Default status
        if (status == null) {
            status = "STARTED";
        }

        // Calculate expiry
        if (startTime != null && durationMinutes != null) {
            expiryTime = startTime.plusMinutes(durationMinutes);
        }

        // Default values
        if (cheatingScore == null) cheatingScore = 0;
        if (cheatingFlag == null) cheatingFlag = false;
    }

    // ✅ AUTO UPDATE TIMESTAMP
    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ================= GETTERS =================

    public Long getId() { return id; }

    public Long getExamId() { return examId; }

    public String getExamCode() { return examCode; }

    public Long getStudentId() { return studentId; }

    public LocalDateTime getStartTime() { return startTime; }

    public LocalDateTime getEndTime() { return endTime; }

    public Integer getTotalMarks() { return totalMarks; }

    public Integer getObtainedMarks() { return obtainedMarks; }

    public Double getScore() { return score; }

    public String getStatus() { return status; }

    public Integer getDurationMinutes() { return durationMinutes; }

    public LocalDateTime getExpiryTime() { return expiryTime; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public Integer getCheatingScore() { return cheatingScore; }

    public Boolean getCheatingFlag() { return cheatingFlag; }

    public String getRemarks() { return remarks; }

    public LocalDateTime getLastAiCheckTime() { return lastAiCheckTime; }

    // ================= SETTERS =================

    public void setId(Long id) { this.id = id; }

    public void setExamId(Long examId) { this.examId = examId; }

    public void setExamCode(String examCode) { this.examCode = examCode; }

    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks; }

    public void setObtainedMarks(Integer obtainedMarks) { this.obtainedMarks = obtainedMarks; }

    public void setScore(Double score) { this.score = score; }

    public void setStatus(String status) { this.status = status; }

    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public void setExpiryTime(LocalDateTime expiryTime) { this.expiryTime = expiryTime; }

    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public void setCheatingScore(Integer cheatingScore) { this.cheatingScore = cheatingScore; }

    public void setCheatingFlag(Boolean cheatingFlag) { this.cheatingFlag = cheatingFlag; }

    public void setRemarks(String remarks) { this.remarks = remarks; }

    public void setLastAiCheckTime(LocalDateTime lastAiCheckTime) { this.lastAiCheckTime = lastAiCheckTime; }
}