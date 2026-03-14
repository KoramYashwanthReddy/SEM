package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exams")
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String examCode;

    private String title;
    private String description;
    private String subject;

    private Integer durationMinutes;
    private Integer totalMarks;
    private Integer passingMarks;
    private Integer maxAttempts;

    private Double marksPerQuestion;
    private Double negativeMarks;

    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;

    @Enumerated(EnumType.STRING)
    private ExamStatus status;

    private Integer mcqCount;
    private Integer codingCount;
    private Integer descriptiveCount;

    private Boolean questionsUploaded;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private String createdBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Boolean active;

    public Exam() {}

    // getters setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getExamCode() {
        return examCode;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Integer getTotalMarks() {
        return totalMarks;
    }

    public void setTotalMarks(Integer totalMarks) {
        this.totalMarks = totalMarks;
    }

    public Integer getPassingMarks() {
        return passingMarks;
    }

    public void setPassingMarks(Integer passingMarks) {
        this.passingMarks = passingMarks;
    }

    public Integer getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(Integer maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public Double getMarksPerQuestion() {
        return marksPerQuestion;
    }

    public void setMarksPerQuestion(Double marksPerQuestion) {
        this.marksPerQuestion = marksPerQuestion;
    }

    public Double getNegativeMarks() {
        return negativeMarks;
    }

    public void setNegativeMarks(Double negativeMarks) {
        this.negativeMarks = negativeMarks;
    }

    public Boolean getShuffleQuestions() {
        return shuffleQuestions;
    }

    public void setShuffleQuestions(Boolean shuffleQuestions) {
        this.shuffleQuestions = shuffleQuestions;
    }

    public Boolean getShuffleOptions() {
        return shuffleOptions;
    }

    public void setShuffleOptions(Boolean shuffleOptions) {
        this.shuffleOptions = shuffleOptions;
    }

    public ExamStatus getStatus() {
        return status;
    }

    public void setStatus(ExamStatus status) {
        this.status = status;
    }

    public Integer getMcqCount() {
        return mcqCount;
    }

    public void setMcqCount(Integer mcqCount) {
        this.mcqCount = mcqCount;
    }

    public Integer getCodingCount() {
        return codingCount;
    }

    public void setCodingCount(Integer codingCount) {
        this.codingCount = codingCount;
    }

    public Integer getDescriptiveCount() {
        return descriptiveCount;
    }

    public void setDescriptiveCount(Integer descriptiveCount) {
        this.descriptiveCount = descriptiveCount;
    }

    public Boolean getQuestionsUploaded() {
        return questionsUploaded;
    }

    public void setQuestionsUploaded(Boolean questionsUploaded) {
        this.questionsUploaded = questionsUploaded;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}