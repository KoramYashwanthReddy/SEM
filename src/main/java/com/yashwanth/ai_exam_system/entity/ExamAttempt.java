package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_attempts")
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long studentId;

    private String examCode;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer totalMarks;

    private Integer obtainedMarks;

    // percentage score
    private Double score;

    // STARTED | SUBMITTED | EVALUATED
    private String status;

    // exam duration in minutes
    private Integer durationMinutes;

    // calculated exam expiry time
    private LocalDateTime expiryTime;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public ExamAttempt() {}

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (startTime != null && durationMinutes != null) {
            expiryTime = startTime.plusMinutes(durationMinutes);
        }
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }

    public Long getStudentId() { return studentId; }

    public String getExamCode() { return examCode; }

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

    public void setId(Long id) { this.id = id; }

    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public void setExamCode(String examCode) { this.examCode = examCode; }

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
}