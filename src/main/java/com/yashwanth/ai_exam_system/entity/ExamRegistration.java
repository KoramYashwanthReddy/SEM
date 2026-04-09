package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "exam_registrations",
        indexes = {
                @Index(name = "idx_exam_registration_student", columnList = "studentId"),
                @Index(name = "idx_exam_registration_exam_code", columnList = "examCode")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_exam_registration_student_exam", columnNames = {"studentId", "examCode"})
        }
)
public class ExamRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private Long examId;

    @Column(nullable = false, length = 50)
    private String examCode;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(length = 50)
    private String source = "STUDENT_UI";

    @Column(length = 20)
    private String registrationPhase = "PHASE1";

    private Boolean phase2Verified = false;

    @Column(length = 128)
    private String phase2VerificationCodeHash;

    @Column(length = 32)
    private String phase2VerificationMethod;

    private LocalDateTime phase2VerifiedAt;

    private LocalDateTime registeredAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.registeredAt == null) {
            this.registeredAt = now;
        }
        if (this.active == null) {
            this.active = true;
        }
        if (this.registrationPhase == null || this.registrationPhase.isBlank()) {
            this.registrationPhase = "PHASE1";
        }
        if (this.phase2Verified == null) {
            this.phase2Verified = false;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }
    public Long getExamId() { return examId; }
    public void setExamId(Long examId) { this.examId = examId; }
    public String getExamCode() { return examCode; }
    public void setExamCode(String examCode) { this.examCode = examCode; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getRegistrationPhase() { return registrationPhase; }
    public void setRegistrationPhase(String registrationPhase) { this.registrationPhase = registrationPhase; }
    public Boolean getPhase2Verified() { return phase2Verified; }
    public void setPhase2Verified(Boolean phase2Verified) { this.phase2Verified = phase2Verified; }
    public String getPhase2VerificationCodeHash() { return phase2VerificationCodeHash; }
    public void setPhase2VerificationCodeHash(String phase2VerificationCodeHash) { this.phase2VerificationCodeHash = phase2VerificationCodeHash; }
    public String getPhase2VerificationMethod() { return phase2VerificationMethod; }
    public void setPhase2VerificationMethod(String phase2VerificationMethod) { this.phase2VerificationMethod = phase2VerificationMethod; }
    public LocalDateTime getPhase2VerifiedAt() { return phase2VerifiedAt; }
    public void setPhase2VerifiedAt(LocalDateTime phase2VerifiedAt) { this.phase2VerifiedAt = phase2VerifiedAt; }
    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
