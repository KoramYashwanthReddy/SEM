package com.yashwanth.ai_exam_system.entity;

import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "exam_attempts",
        indexes = {
                @Index(name = "idx_student_id", columnList = "student_id"),
                @Index(name = "idx_exam_id", columnList = "exam_id"),
                @Index(name = "idx_status", columnList = "status"),
                @Index(name = "idx_expiry", columnList = "expiry_time")
        }
)
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ================= BASIC INFO =================

    @Column(name = "exam_id")
    private Long examId;

    private String examCode;

    @Column(name = "student_id")
    private Long studentId;

    // ================= TIME =================

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private Integer durationMinutes;
    private LocalDateTime expiryTime;

    private Long timeTakenSeconds;

    // ================= SCORE =================

    private Integer totalMarks;
    private Integer obtainedMarks;
    private Double score;
    private Double percentage;

    private Double negativeMarksApplied = 0.0;

    // ================= STATUS =================

    @Enumerated(EnumType.STRING)
    private AttemptStatus status;

    private Integer attemptNumber = 1;
    private Boolean autoSubmitted = false;
    private Boolean active = true;
    private Boolean cancelled = false;

    // ================= AI PROCTORING =================

    private Integer cheatingScore = 0;
    private Boolean cheatingFlag = false;

    private Integer tabSwitchCount = 0;
    private Integer fullscreenViolationCount = 0;

    private LocalDateTime lastAiCheckTime;

    // ================= AUDIT =================

    private LocalDateTime cancelledAt;
    private String remarks;

    private String ipAddress;
    private String deviceInfo;
    private String browserInfo;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ================= RELATIONSHIPS =================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", insertable = false, updatable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", insertable = false, updatable = false)
    private Exam exam;

    // ================= LIFECYCLE =================

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        this.createdAt = now;
        this.updatedAt = now;

        if (status == null) status = AttemptStatus.STARTED;
        if (active == null) active = true;
        if (cancelled == null) cancelled = false;
        if (autoSubmitted == null) autoSubmitted = false;
        if (cheatingScore == null) cheatingScore = 0;
        if (cheatingFlag == null) cheatingFlag = false;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ================= BUSINESS METHODS =================

    public boolean isActive() {
        return Boolean.TRUE.equals(active)
                && status == AttemptStatus.STARTED
                && !Boolean.TRUE.equals(cancelled)
                && expiryTime != null
                && expiryTime.isAfter(LocalDateTime.now());
    }

    public void markCancelled(String reason) {
        this.cancelled = true;
        this.active = false;
        this.status = AttemptStatus.INVALIDATED;
        this.remarks = reason;
        this.cancelledAt = LocalDateTime.now();
    }

    public void markAutoSubmitted() {
        this.autoSubmitted = true;
        this.active = false;
        this.status = AttemptStatus.AUTO_SUBMITTED;
        this.endTime = LocalDateTime.now();
    }

    // ================= GETTERS =================

    public Long getId() { return id; }
    public Long getExamId() { return examId; }
    public String getExamCode() { return examCode; }
    public Long getStudentId() { return studentId; }

    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public LocalDateTime getExpiryTime() { return expiryTime; }

    public Integer getTotalMarks() { return totalMarks; }
    public Integer getObtainedMarks() { return obtainedMarks; }
    public Double getScore() { return score; }
    public Double getPercentage() { return percentage; }

    public AttemptStatus getStatus() { return status; }

    public Integer getAttemptNumber() { return attemptNumber; }
    public Boolean getAutoSubmitted() { return autoSubmitted; }
    public Boolean getActive() { return active; }

    public Long getTimeTakenSeconds() { return timeTakenSeconds; }

    public Integer getCheatingScore() { return cheatingScore; }
    public Boolean getCheatingFlag() { return cheatingFlag; }
    public Boolean getCancelled() { return cancelled; }

    public Integer getTabSwitchCount() { return tabSwitchCount; }
    public Integer getFullscreenViolationCount() { return fullscreenViolationCount; }

    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public String getRemarks() { return remarks; }
    public LocalDateTime getLastAiCheckTime() { return lastAiCheckTime; }

    public String getIpAddress() { return ipAddress; }
    public String getDeviceInfo() { return deviceInfo; }
    public String getBrowserInfo() { return browserInfo; }

    public Double getNegativeMarksApplied() { return negativeMarksApplied; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public User getStudent() { return student; }
    public Exam getExam() { return exam; }

    // ================= SETTERS =================

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

    public void setStatus(AttemptStatus status) { this.status = status; }

    public void setAttemptNumber(Integer attemptNumber) { this.attemptNumber = attemptNumber; }
    public void setAutoSubmitted(Boolean autoSubmitted) { this.autoSubmitted = autoSubmitted; }
    public void setActive(Boolean active) { this.active = active; }

    public void setTimeTakenSeconds(Long timeTakenSeconds) { this.timeTakenSeconds = timeTakenSeconds; }

    public void setCheatingScore(Integer cheatingScore) { this.cheatingScore = cheatingScore; }
    public void setCheatingFlag(Boolean cheatingFlag) { this.cheatingFlag = cheatingFlag; }
    public void setCancelled(Boolean cancelled) { this.cancelled = cancelled; }

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