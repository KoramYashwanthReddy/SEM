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

    // TAB_SWITCH
    // COPY_PASTE
    // EXIT_FULLSCREEN
    // MULTIPLE_FACE
    // NO_FACE
    // AUDIO_DETECTED

    private String details;

    private LocalDateTime timestamp;

    public ProctoringEvent() {}

    public Long getId() { return id; }

    public Long getAttemptId() { return attemptId; }

    public String getEventType() { return eventType; }

    public String getDetails() { return details; }

    public LocalDateTime getTimestamp() { return timestamp; }

    public void setId(Long id) { this.id = id; }

    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public void setEventType(String eventType) { this.eventType = eventType; }

    public void setDetails(String details) { this.details = details; }

    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}