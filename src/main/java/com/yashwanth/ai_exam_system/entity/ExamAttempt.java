package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "exam_attempts",
        indexes = {
                @Index(name = "idx_student_id", columnList = "student_id"),
                @Index(name = "idx_exam_id", columnList = "exam_id"),
                @Index(name = "idx_status", columnList = "status")
        }
)
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_id")
    private Long examId;

    private String examCode;

    @Column(name = "student_id")
    private Long studentId;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private Integer durationMinutes;
    private LocalDateTime expiryTime;

    private Integer totalMarks;
    private Integer obtainedMarks;
    private Double score;
    private Double percentage;

    @Column(length = 20)
    private String status;

    private Integer attemptNumber = 1;
    private Boolean autoSubmitted = false;
    private Long timeTakenSeconds;

    private Integer easyCount = 0;
    private Integer mediumCount = 0;
    private Integer difficultCount = 0;

    private Integer cheatingScore = 0;
    private Boolean cheatingFlag = false;
    private Boolean isCancelled = false;

    private Integer tabSwitchCount = 0;
    private Integer fullscreenViolationCount = 0;

    private LocalDateTime cancelledAt;

    @Column(length = 1000)
    private String remarks;

    private LocalDateTime lastAiCheckTime;

    private String ipAddress;
    private String deviceInfo;
    private String browserInfo;

    private Double negativeMarksApplied = 0.0;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", insertable = false, updatable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", insertable = false, updatable = false)
    private Exam exam;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        createdAt = now;
        updatedAt = now;

        if (status == null) status = "STARTED";

        if (startTime != null && durationMinutes != null && expiryTime == null) {
            expiryTime = startTime.plusMinutes(durationMinutes);
        }

        if (autoSubmitted == null) autoSubmitted = false;
        if (cheatingScore == null) cheatingScore = 0;
        if (cheatingFlag == null) cheatingFlag = false;
        if (isCancelled == null) isCancelled = false;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return "STARTED".equals(this.status)
                && !Boolean.TRUE.equals(this.isCancelled)
                && expiryTime != null
                && expiryTime.isAfter(LocalDateTime.now());
    }

    public boolean isHighRisk() {
        return cheatingScore != null && cheatingScore >= 50;
    }

    public boolean isDangerous() {
        return cheatingScore != null && cheatingScore >= 80;
    }

    public boolean shouldCancel(int threshold) {
        return cheatingScore != null && cheatingScore >= threshold;
    }

    public void markCancelled() {
        this.isCancelled = true;
        this.status = "INVALIDATED";
        this.cancelledAt = LocalDateTime.now();
    }

    // ========================
    // GETTERS
    // ========================

    public Long getId() { return id; }
    public Long getExamId() { return examId; }
    public String getExamCode() { return examCode; }
    public Long getStudentId() { return studentId; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public Integer getTotalMarks() { return totalMarks; }
    public Integer getObtainedMarks() { return obtainedMarks; }
    public Double getScore() { return score; }
    public Double getPercentage() { return percentage; }
    public String getStatus() { return status; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public LocalDateTime getExpiryTime() { return expiryTime; }

    public Integer getAttemptNumber() { return attemptNumber; }
    public Boolean getAutoSubmitted() { return autoSubmitted; }
    public Long getTimeTakenSeconds() { return timeTakenSeconds; }

    public Integer getCheatingScore() { return cheatingScore; }
    public Boolean getCheatingFlag() { return cheatingFlag; }
    public Boolean getIsCancelled() { return isCancelled; }

    public Integer getTabSwitchCount() { return tabSwitchCount; }
    public Integer getFullscreenViolationCount() { return fullscreenViolationCount; }

    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public String getRemarks() { return remarks; }
    public LocalDateTime getLastAiCheckTime() { return lastAiCheckTime; }

    public String getIpAddress() { return ipAddress; }
    public String getDeviceInfo() { return deviceInfo; }
    public String getBrowserInfo() { return browserInfo; }

    public Double getNegativeMarksApplied() { return negativeMarksApplied; }

    public User getStudent() { return student; }
    public Exam getExam() { return exam; }

    // ========================
    // SETTERS
    // ========================

    public void setExamId(Long examId) { this.examId = examId; }
    public void setExamCode(String examCode) { this.examCode = examCode; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public void setExpiryTime(LocalDateTime expiryTime) { this.expiryTime = expiryTime; }
    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks; }
    public void setObtainedMarks(Integer obtainedMarks) { this.obtainedMarks = obtainedMarks; }
    public void setScore(Double score) { this.score = score; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }
    public void setStatus(String status) { this.status = status; }

    public void setAttemptNumber(Integer attemptNumber) { this.attemptNumber = attemptNumber; }
    public void setAutoSubmitted(Boolean autoSubmitted) { this.autoSubmitted = autoSubmitted; }
    public void setTimeTakenSeconds(Long timeTakenSeconds) { this.timeTakenSeconds = timeTakenSeconds; }

    public void setCheatingScore(Integer cheatingScore) { this.cheatingScore = cheatingScore; }
    public void setCheatingFlag(Boolean cheatingFlag) { this.cheatingFlag = cheatingFlag; }
    public void setIsCancelled(Boolean cancelled) { isCancelled = cancelled; }

    public void setTabSwitchCount(Integer tabSwitchCount) { this.tabSwitchCount = tabSwitchCount; }
    public void setFullscreenViolationCount(Integer fullscreenViolationCount) { this.fullscreenViolationCount = fullscreenViolationCount; }

    public void setCancelledAt(LocalDateTime cancelledAt) { this.cancelledAt = cancelledAt; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public void setLastAiCheckTime(LocalDateTime lastAiCheckTime) { this.lastAiCheckTime = lastAiCheckTime; }

    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public void setDeviceInfo(String deviceInfo) { this.deviceInfo = deviceInfo; }
    public void setBrowserInfo(String browserInfo) { this.browserInfo = browserInfo; }

    public void setNegativeMarksApplied(Double negativeMarksApplied) { this.negativeMarksApplied = negativeMarksApplied; }
}