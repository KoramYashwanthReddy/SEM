package com.yashwanth.ai_exam_system.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

@Entity
@Table(
        name = "exams",
        indexes = {
                @Index(name = "idx_exam_code", columnList = "exam_code"),
                @Index(name = "idx_exam_status", columnList = "status"),
                @Index(name = "idx_exam_created_by", columnList = "created_by"),
                @Index(name = "idx_exam_start_time", columnList = "start_time"),
                @Index(name = "idx_exam_end_time", columnList = "end_time")
        }
)
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true, nullable = false, length = 50)
    private String examCode;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(length = 100)
    private String subject;

    @PositiveOrZero
    private Integer durationMinutes = 60;

    @PositiveOrZero
    private Integer totalMarks = 0;

    @PositiveOrZero
    private Integer passingMarks = 0;

    private Integer maxAttempts = 1;

    private Double marksPerQuestion = 1.0;
    private Double negativeMarks = 0.0;

    private Boolean shuffleQuestions = true;
    private Boolean shuffleOptions = true;

    @Enumerated(EnumType.STRING)
    private ExamStatus status = ExamStatus.DRAFT;

    // ================= QUESTION DISTRIBUTION =================
    private Integer mcqCount = 0;
    private Integer codingCount = 0;
    private Integer descriptiveCount = 0;

    // ================= DIFFICULTY DISTRIBUTION =================
    @Column(name = "easy_question_count")
    private Integer easyQuestionCount = 0;

    @Column(name = "medium_question_count")
    private Integer mediumQuestionCount = 0;

    @Column(name = "difficult_question_count")
    private Integer difficultQuestionCount = 0;

    private Boolean questionsUploaded = false;

    // ================= SCHEDULING =================
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // ================= REGISTRATION PHASES =================
    //
    //  TIMELINE:
    //  |<----------- Phase 1 ----------->|<-- Phase 2 -->|
    //  T-24h                            T-1h             T (exam start)
    //
    //  Phase 1 : standard registration window (opens 24 h before, closes 1 h before).
    //  Phase 2 : enhanced-verification window (opens 1 h before, closes at exam start).
    //
    //  SMART FALLTHROUGH for late-published exams:
    //  ┌──────────────────────┬────────────────────────────────────────────────────┐
    //  │ Time until exam      │ Behaviour                                          │
    //  ├──────────────────────┼────────────────────────────────────────────────────┤
    //  │ > 24 h               │ Phase 1 opens at T-24h, Phase 2 at T-1h            │
    //  │ 1 h < t ≤ 24 h       │ Phase 1 opens immediately (reg start is past now)  │
    //  │ 5/10/.../50/60 min   │ Phase 2 active immediately (phase2Start is past)   │
    //  │ Exam start (T=0)     │ Registration closed                                │
    //  └──────────────────────┴────────────────────────────────────────────────────┘
    //
    private Boolean registrationOpen = false;
    private LocalDateTime registrationStartTime; // T-24h (registration opens)
    private LocalDateTime phase1EndTime;          // T-1h  (Phase 1 closes / Phase 2 opens)
    private LocalDateTime phase2StartTime;        // T-1h  (Phase 2 opens, until T)
    private Boolean phase2VerificationRequired = true;

    // ================= AUDIT =================
    @NotBlank
    @Column(nullable = false)
    private String createdBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Boolean active = true;

    public Exam() {}

    // ================= JPA LIFECYCLE =================
    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (status == null) status = ExamStatus.DRAFT;
        if (active == null) active = true;
        if (shuffleQuestions == null) shuffleQuestions = true;
        if (shuffleOptions == null) shuffleOptions = true;
        if (questionsUploaded == null) questionsUploaded = false;
        if (registrationOpen == null) registrationOpen = false;
        if (phase2VerificationRequired == null) phase2VerificationRequired = true;

        // Auto-calculate registration phase boundary times.
        // These are FIXED markers relative to startTime.
        // isRegistrationOpen / isInPhase1 / isInPhase2 logic handles
        // the "late publish" scenarios automatically at query time.
        if (startTime != null) {
            if (registrationStartTime == null) {
                registrationStartTime = startTime.minusHours(24); // Phase 1 opens
            }
            if (phase1EndTime == null) {
                phase1EndTime = startTime.minusHours(1);          // Phase 1 closes
            }
            if (phase2StartTime == null) {
                phase2StartTime = startTime.minusHours(1);        // Phase 2 opens
            }
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ================= BUSINESS HELPERS =================

    public boolean isPublished() {
        return ExamStatus.PUBLISHED.equals(this.status);
    }

    public boolean isDraft() {
        return ExamStatus.DRAFT.equals(this.status);
    }

    public boolean isActive() {
        return Boolean.TRUE.equals(this.active);
    }

    public boolean isExpired() {
        return endTime != null && LocalDateTime.now().isAfter(endTime);
    }

    public boolean isUpcoming() {
        return startTime != null && LocalDateTime.now().isBefore(startTime);
    }

    public boolean isRunning() {
        LocalDateTime now = LocalDateTime.now();
        return isPublished()
                && startTime != null
                && endTime != null
                && now.isAfter(startTime)
                && now.isBefore(endTime);
    }

    public boolean canAttempt() {
        return isActive() && isRunning();
    }

    // ================= REGISTRATION PHASE HELPERS =================

    /**
     * Registration is open from T-24h until exam start (T).
     * If the exam was published < 24 h before start, registration opens immediately
     * because registrationStartTime (= T-24h) is already in the past.
     */
    public boolean isRegistrationOpen() {
        if (!Boolean.TRUE.equals(registrationOpen) || !isPublished() || !isActive()) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        // Fallback: 24 h before exam if not stored
        LocalDateTime registrationOpenAt = registrationStartTime != null
                ? registrationStartTime
                : (startTime != null ? startTime.minusHours(24) : createdAt);
        LocalDateTime registrationCloseAt = startTime; // closes exactly at exam start
        if (registrationOpenAt == null || registrationCloseAt == null) {
            return false;
        }
        return !now.isBefore(registrationOpenAt) && now.isBefore(registrationCloseAt);
    }

    /**
     * Phase 1 runs from registration open until T-1h.
     * If exam is < 1 h away when published, this returns false immediately
     * and isInPhase2() returns true instead.
     */
    public boolean isInPhase1() {
        if (!isRegistrationOpen()) return false;
        LocalDateTime now = LocalDateTime.now();
        // Phase 1 closes 1 h before exam (fallback if not stored)
        LocalDateTime phase1CloseAt = phase1EndTime != null
                ? phase1EndTime
                : (startTime != null ? startTime.minusHours(1) : null);
        return phase1CloseAt != null && now.isBefore(phase1CloseAt);
    }

    /**
     * Phase 2 runs from T-1h until exam start (T).
     * If exam is published with < 1 h to go, phase2OpenAt is already in the past,
     * so this returns true immediately — correct behaviour for last-minute exams.
     */
    public boolean isInPhase2() {
        if (!isRegistrationOpen()) return false;
        LocalDateTime now = LocalDateTime.now();
        // Phase 2 opens 1 h before exam (fallback if not stored)
        LocalDateTime phase2OpenAt = phase2StartTime != null
                ? phase2StartTime
                : (startTime != null ? startTime.minusHours(1) : null);
        return phase2OpenAt != null
                && startTime != null
                && !now.isBefore(phase2OpenAt)  // now >= T-1h
                && now.isBefore(startTime);      // now < T
    }

    public boolean requiresPhase2Verification() {
        return Boolean.TRUE.equals(phase2VerificationRequired) && isInPhase2();
    }

    public enum RegistrationPhase {
        CLOSED, PHASE1, PHASE2
    }

    public RegistrationPhase getCurrentRegistrationPhase() {
        if (!isRegistrationOpen()) return RegistrationPhase.CLOSED;
        if (isInPhase2()) return RegistrationPhase.PHASE2;
        return RegistrationPhase.PHASE1;
    }

    // ================= GETTERS & SETTERS =================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getExamCode() { return examCode; }
    public void setExamCode(String examCode) { this.examCode = examCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public Integer getTotalMarks() { return totalMarks; }
    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks; }

    public Integer getPassingMarks() { return passingMarks; }
    public void setPassingMarks(Integer passingMarks) { this.passingMarks = passingMarks; }

    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }

    public Double getMarksPerQuestion() { return marksPerQuestion; }
    public void setMarksPerQuestion(Double marksPerQuestion) { this.marksPerQuestion = marksPerQuestion; }

    public Double getNegativeMarks() { return negativeMarks; }
    public void setNegativeMarks(Double negativeMarks) { this.negativeMarks = negativeMarks; }

    public Boolean getShuffleQuestions() { return shuffleQuestions; }
    public void setShuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; }

    public Boolean getShuffleOptions() { return shuffleOptions; }
    public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }

    public ExamStatus getStatus() { return status; }
    public void setStatus(ExamStatus status) { this.status = status; }

    public Integer getMcqCount() { return mcqCount; }
    public void setMcqCount(Integer mcqCount) { this.mcqCount = mcqCount; }

    public Integer getCodingCount() { return codingCount; }
    public void setCodingCount(Integer codingCount) { this.codingCount = codingCount; }

    public Integer getDescriptiveCount() { return descriptiveCount; }
    public void setDescriptiveCount(Integer descriptiveCount) { this.descriptiveCount = descriptiveCount; }

    public Integer getEasyQuestionCount() { return easyQuestionCount; }
    public void setEasyQuestionCount(Integer easyQuestionCount) { this.easyQuestionCount = easyQuestionCount; }

    public Integer getMediumQuestionCount() { return mediumQuestionCount; }
    public void setMediumQuestionCount(Integer mediumQuestionCount) { this.mediumQuestionCount = mediumQuestionCount; }

    public Integer getDifficultQuestionCount() { return difficultQuestionCount; }
    public void setDifficultQuestionCount(Integer difficultQuestionCount) { this.difficultQuestionCount = difficultQuestionCount; }

    public Boolean getQuestionsUploaded() { return questionsUploaded; }
    public void setQuestionsUploaded(Boolean questionsUploaded) { this.questionsUploaded = questionsUploaded; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    // ================= REGISTRATION PHASE GETTERS & SETTERS =================
    public Boolean getRegistrationOpen() { return registrationOpen; }
    public void setRegistrationOpen(Boolean registrationOpen) { this.registrationOpen = registrationOpen; }

    public LocalDateTime getRegistrationStartTime() { return registrationStartTime; }
    public void setRegistrationStartTime(LocalDateTime registrationStartTime) { this.registrationStartTime = registrationStartTime; }

    public LocalDateTime getPhase1EndTime() { return phase1EndTime; }
    public void setPhase1EndTime(LocalDateTime phase1EndTime) { this.phase1EndTime = phase1EndTime; }

    public LocalDateTime getPhase2StartTime() { return phase2StartTime; }
    public void setPhase2StartTime(LocalDateTime phase2StartTime) { this.phase2StartTime = phase2StartTime; }

    public Boolean getPhase2VerificationRequired() { return phase2VerificationRequired; }
    public void setPhase2VerificationRequired(Boolean phase2VerificationRequired) { this.phase2VerificationRequired = phase2VerificationRequired; }
}
