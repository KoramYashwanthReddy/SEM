package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_logs")
public class ProctoringLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔗 Relations (recommended for future scaling)
    private Long studentId;

    private Long attemptId;

    // ✅ Use ENUM instead of String (BEST PRACTICE)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventType eventType;

    @Column(length = 500)
    private String description;

    // ✅ Auto timestamp
    private LocalDateTime timestamp;

    // 🔥 OPTIONAL: severity level (VERY USEFUL)
    @Enumerated(EnumType.STRING)
    private SeverityLevel severity;

    // 🔥 OPTIONAL: flag for admin review
    private Boolean reviewed = false;

    // ================= ENUMS =================

    public enum EventType {
        TAB_SWITCH,
        WINDOW_MINIMIZED,
        FACE_NOT_VISIBLE,
        MULTIPLE_PERSON_DETECTED,
        COPY_PASTE,
        FULL_SCREEN_EXIT
    }

    public enum SeverityLevel {
        LOW,
        MEDIUM,
        HIGH
    }

    // ================= LIFECYCLE =================

    @PrePersist
    public void onCreate() {
        this.timestamp = LocalDateTime.now();
    }

    // ================= GETTERS & SETTERS =================

    public Long getId() {
        return id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public SeverityLevel getSeverity() {
        return severity;
    }

    public void setSeverity(SeverityLevel severity) {
        this.severity = severity;
    }

    public Boolean getReviewed() {
        return reviewed;
    }

    public void setReviewed(Boolean reviewed) {
        this.reviewed = reviewed;
    }
}