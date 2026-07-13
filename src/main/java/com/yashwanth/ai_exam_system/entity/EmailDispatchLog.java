package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "email_dispatch_log",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_email_dispatch_unique",
                        columnNames = {"recipient_email", "event_type", "reference_key"}
                )
        },
        indexes = {
                @Index(name = "idx_email_dispatch_recipient", columnList = "recipient_email"),
                @Index(name = "idx_email_dispatch_event", columnList = "event_type"),
                @Index(name = "idx_email_dispatch_reference", columnList = "reference_key")
        }
)
public class EmailDispatchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String recipientEmail;

    @Column(nullable = false, length = 80)
    private String eventType;

    @Column(nullable = false, length = 200)
    private String referenceKey;

    @Column(nullable = false)
    private LocalDateTime sentAt;

    @PrePersist
    public void onCreate() {
        if (sentAt == null) {
            sentAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getReferenceKey() {
        return referenceKey;
    }

    public void setReferenceKey(String referenceKey) {
        this.referenceKey = referenceKey;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
