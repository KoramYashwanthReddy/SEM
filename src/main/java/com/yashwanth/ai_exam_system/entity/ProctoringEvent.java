package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_events")
public class ProctoringEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long attemptId;

    private String eventType;

    private String details;

    private LocalDateTime timestamp;

    // 🔥 NEW FIELD
    private Integer severity;

    public ProctoringEvent() {}

    @PrePersist
    public void onCreate() {
        timestamp = LocalDateTime.now();
        severity = calculateSeverity(this.eventType);
    }

    // 🔥 CORE LOGIC (AI BASE)
    private int calculateSeverity(String eventType) {
        if (eventType == null) return 1;

        return switch (eventType) {
            case "TAB_SWITCH" -> 5;
            case "COPY_PASTE" -> 8;
            case "EXIT_FULLSCREEN" -> 7;
            case "MULTIPLE_FACE" -> 9;
            case "NO_FACE" -> 6;
            case "AUDIO_DETECTED" -> 6;
            default -> 2;
        };
    }

    // Getters & Setters

    public Long getId() { return id; }

    public Long getAttemptId() { return attemptId; }

    public String getEventType() { return eventType; }

    public String getDetails() { return details; }

    public LocalDateTime getTimestamp() { return timestamp; }

    public Integer getSeverity() { return severity; }

    public void setId(Long id) { this.id = id; }

    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public void setEventType(String eventType) { this.eventType = eventType; }

    public void setDetails(String details) { this.details = details; }

    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public void setSeverity(Integer severity) { this.severity = severity; }
}