package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "exam_attempts",
       indexes = {
           @Index(name = "idx_student_id", columnList = "studentId"),
           @Index(name = "idx_exam_id", columnList = "examId"),
           @Index(name = "idx_status", columnList = "status")
       })
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================
    // 🔥 CORE FIELDS
    // =========================================================

    private Long examId;

    private String examCode;

    private Long studentId;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer durationMinutes;

    private LocalDateTime expiryTime;

    // =========================================================
    // 📊 RESULT DATA
    // =========================================================

    private Integer totalMarks;

    private Integer obtainedMarks;

    private Double score;

    /**
     * STARTED | SUBMITTED | EVALUATED | FLAGGED | INVALIDATED
     */
    @Column(length = 20)
    private String status;

    // =========================================================
    // 🚨 AI CHEATING SYSTEM
    // =========================================================

    private Integer cheatingScore = 0;

    private Boolean cheatingFlag = false;

    @Column(length = 1000)
    private String remarks;

    private LocalDateTime lastAiCheckTime;

    // =========================================================
    // 🕒 AUDIT FIELDS
    // =========================================================

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // =========================================================
    // 🔄 ENTITY RELATIONSHIPS (OPTIONAL BUT RECOMMENDED)
    // =========================================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", insertable = false, updatable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", insertable = false, updatable = false)
    private Exam exam;

    // =========================================================
    // 🔄 LIFECYCLE METHODS
    // =========================================================

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        createdAt = now;
        updatedAt = now;

        if (status == null) {
            status = "STARTED";
        }

        if (startTime != null && durationMinutes != null && expiryTime == null) {
            expiryTime = startTime.plusMinutes(durationMinutes);
        }

        if (cheatingScore == null) cheatingScore = 0;
        if (cheatingFlag == null) cheatingFlag = false;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // =========================================================
    // 🧠 HELPER METHODS (VERY USEFUL)
    // =========================================================

    public boolean isActive() {
        return "STARTED".equals(this.status) &&
               expiryTime != null &&
               expiryTime.isAfter(LocalDateTime.now());
    }

    public boolean isHighRisk() {
        return cheatingScore != null && cheatingScore >= 50;
    }

    public boolean isFlagged() {
        return Boolean.TRUE.equals(cheatingFlag);
    }

    // =========================================================
    // ✅ GETTERS & SETTERS
    // =========================================================

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

    public User getStudent() { return student; }

    public Exam getExam() { return exam; }

    // SETTERS

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