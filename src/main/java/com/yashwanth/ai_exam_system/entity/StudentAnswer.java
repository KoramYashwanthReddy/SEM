package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_answers")
public class StudentAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long attemptId;

    private Long questionId;

    private String answer;

    private Boolean isCorrect;

    private Integer marksObtained;

    // ANSWERED | MARKED_FOR_REVIEW | NOT_ANSWERED
    private String status;

    private Boolean reviewMarked;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdated;

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
}