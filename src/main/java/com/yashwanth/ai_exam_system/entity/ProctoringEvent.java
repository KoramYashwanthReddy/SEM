package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_events",
       indexes = {
           @Index(name = "idx_attempt_id", columnList = "attemptId"),
           @Index(name = "idx_event_type", columnList = "eventType")
       })
public class ProctoringEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long attemptId;

    @Column(length = 50)
    private String eventType;

    @Column(length = 1000)
    private String details;

    private LocalDateTime timestamp;

    // =========================================================
    // 🔥 AI + SCORING SYSTEM
    // =========================================================

    private Integer severity; // AI confidence (1–10)

    private Integer score;    // Weight added to cheatingScore

    // =========================================================
    // 📸 EVIDENCE SYSTEM (ADVANCED)
    // =========================================================

    private String evidenceUrl; // image/audio/video path

    @Column(length = 2000)
    private String metadata; // JSON (faceCount, noiseLevel, etc.)

    public ProctoringEvent() {}

    @PrePersist
    public void onCreate() {
        timestamp = LocalDateTime.now();

        if (severity == null) {
            severity = calculateSeverity(this.eventType);
        }

        if (score == null) {
            score = calculateScore(this.eventType);
        }
    }

    // =========================================================
    // 🔥 AI SEVERITY (Confidence)
    // =========================================================

    private int calculateSeverity(String eventType) {
        if (eventType == null) return 1;

        return switch (eventType) {
            case "TAB_SWITCH" -> 5;
            case "COPY_PASTE" -> 8;
            case "EXIT_FULLSCREEN" -> 7;
            case "MULTIPLE_FACES" -> 9;
            case "NO_FACE" -> 7;
            case "NOISE_DETECTED" -> 6;
            case "PHONE_DETECTED" -> 10;
            default -> 2;
        };
    }

    // =========================================================
    // 🔥 SCORE (USED FOR CHEATING SCORE)
    // =========================================================

    private int calculateScore(String eventType) {
        if (eventType == null) return 5;

        return switch (eventType) {
            case "MULTIPLE_FACES" -> 50;
            case "NO_FACE" -> 40;
            case "PHONE_DETECTED" -> 60;
            case "NOISE_DETECTED" -> 30;
            case "TAB_SWITCH" -> 20;
            case "EXIT_FULLSCREEN" -> 25;
            case "COPY_PASTE" -> 35;
            default -> 10;
        };
    }

    // =========================================================
    // ✅ GETTERS & SETTERS
    // =========================================================

    public Long getId() { return id; }

    public Long getAttemptId() { return attemptId; }

    public String getEventType() { return eventType; }

    public String getDetails() { return details; }

    public LocalDateTime getTimestamp() { return timestamp; }

    public Integer getSeverity() { return severity; }

    public Integer getScore() { return score; }

    public String getEvidenceUrl() { return evidenceUrl; }

    public String getMetadata() { return metadata; }

    public void setId(Long id) { this.id = id; }

    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public void setEventType(String eventType) { this.eventType = eventType; }

    public void setDetails(String details) { this.details = details; }

    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public void setSeverity(Integer severity) { this.severity = severity; }

    public void setScore(Integer score) { this.score = score; }

    public void setEvidenceUrl(String evidenceUrl) { this.evidenceUrl = evidenceUrl; }

    public void setMetadata(String metadata) { this.metadata = metadata; }
}