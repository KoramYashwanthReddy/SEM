package com.yashwanth.ai_exam_system.dto;

public class ProctoringEventRequest {

    private Long attemptId;
    private String eventType;
    private String details;

    // 🔥 NEW
    private String evidenceUrl;
    private String metadata;

    public Long getAttemptId() { return attemptId; }

    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public String getEventType() { return eventType; }

    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getDetails() { return details; }

    public void setDetails(String details) { this.details = details; }

    public String getEvidenceUrl() { return evidenceUrl; }

    public void setEvidenceUrl(String evidenceUrl) { this.evidenceUrl = evidenceUrl; }

    public String getMetadata() { return metadata; }

    public void setMetadata(String metadata) { this.metadata = metadata; }
}