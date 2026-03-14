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

    private String status;
    // STARTED, SUBMITTED, EVALUATED

    // NEW: exam duration in minutes
    private Integer durationMinutes;

    // NEW: calculated exam expiry time
    private LocalDateTime expiryTime;

    public ExamAttempt() {}

    public Long getId() { return id; }

    public Long getStudentId() { return studentId; }

    public String getExamCode() { return examCode; }

    public LocalDateTime getStartTime() { return startTime; }

    public LocalDateTime getEndTime() { return endTime; }

    public Integer getTotalMarks() { return totalMarks; }

    public Integer getObtainedMarks() { return obtainedMarks; }

    public String getStatus() { return status; }

    public Integer getDurationMinutes() { return durationMinutes; }

    public LocalDateTime getExpiryTime() { return expiryTime; }

    public void setId(Long id) { this.id = id; }

    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public void setExamCode(String examCode) { this.examCode = examCode; }

    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks; }

    public void setObtainedMarks(Integer obtainedMarks) { this.obtainedMarks = obtainedMarks; }

    public void setStatus(String status) { this.status = status; }

    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public void setExpiryTime(LocalDateTime expiryTime) { this.expiryTime = expiryTime; }
}