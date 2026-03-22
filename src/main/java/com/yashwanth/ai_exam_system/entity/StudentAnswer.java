package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_answers",
        indexes = {
                @Index(name = "idx_attempt_id", columnList = "attempt_id"),
                @Index(name = "idx_question_id", columnList = "question_id")
        }
)
public class StudentAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id")
    private Long attemptId;

    @Column(name = "question_id")
    private Long questionId;

    private String answer;

    private Boolean isCorrect;

    private Integer marksObtained;

    // ANSWERED | MARKED_FOR_REVIEW | NOT_ANSWERED
    private String status;

    private Boolean reviewMarked;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdated;

    // ================= NEW PRODUCTION FIELDS =================

    private Boolean visited;

    private Long timeSpentSeconds;

    private Boolean autoSaved;

    private Boolean answerChanged;

    private Integer tabSwitchCount;

    private Integer fullscreenExitCount;

    private String codingLanguage;

    @Column(length = 5000)
    private String codeAnswer;

    private String difficulty;

    private String topic;

    private Boolean flaggedForCheating;

    private Integer orderIndex;

    // ================= RELATIONSHIPS =================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", insertable = false, updatable = false)
    private ExamAttempt attempt;

    public StudentAnswer() {}

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdated = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }

    // ================= GETTERS =================

    public Long getId() { return id; }
    public Long getAttemptId() { return attemptId; }
    public Long getQuestionId() { return questionId; }
    public String getAnswer() { return answer; }
    public Boolean getIsCorrect() { return isCorrect; }
    public Integer getMarksObtained() { return marksObtained; }
    public String getStatus() { return status; }
    public Boolean getReviewMarked() { return reviewMarked; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public ExamAttempt getAttempt() { return attempt; }

    public Boolean getVisited() { return visited; }
    public Long getTimeSpentSeconds() { return timeSpentSeconds; }
    public Boolean getAutoSaved() { return autoSaved; }
    public Boolean getAnswerChanged() { return answerChanged; }
    public Integer getTabSwitchCount() { return tabSwitchCount; }
    public Integer getFullscreenExitCount() { return fullscreenExitCount; }
    public String getCodingLanguage() { return codingLanguage; }
    public String getCodeAnswer() { return codeAnswer; }
    public String getDifficulty() { return difficulty; }
    public String getTopic() { return topic; }
    public Boolean getFlaggedForCheating() { return flaggedForCheating; }
    public Integer getOrderIndex() { return orderIndex; }

    // ================= SETTERS =================

    public void setId(Long id) { this.id = id; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }
    public void setAnswer(String answer) { this.answer = answer; }
    public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }
    public void setMarksObtained(Integer marksObtained) { this.marksObtained = marksObtained; }
    public void setStatus(String status) { this.status = status; }
    public void setReviewMarked(Boolean reviewMarked) { this.reviewMarked = reviewMarked; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }

    public void setVisited(Boolean visited) { this.visited = visited; }
    public void setTimeSpentSeconds(Long timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }
    public void setAutoSaved(Boolean autoSaved) { this.autoSaved = autoSaved; }
    public void setAnswerChanged(Boolean answerChanged) { this.answerChanged = answerChanged; }
    public void setTabSwitchCount(Integer tabSwitchCount) { this.tabSwitchCount = tabSwitchCount; }
    public void setFullscreenExitCount(Integer fullscreenExitCount) { this.fullscreenExitCount = fullscreenExitCount; }
    public void setCodingLanguage(String codingLanguage) { this.codingLanguage = codingLanguage; }
    public void setCodeAnswer(String codeAnswer) { this.codeAnswer = codeAnswer; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public void setTopic(String topic) { this.topic = topic; }
    public void setFlaggedForCheating(Boolean flaggedForCheating) { this.flaggedForCheating = flaggedForCheating; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
}