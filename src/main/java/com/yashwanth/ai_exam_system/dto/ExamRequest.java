package com.yashwanth.ai_exam_system.dto;

import java.time.LocalDateTime;

public class ExamRequest {

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
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // ✅ NEW — Difficulty Distribution
    private Integer easyQuestionCount = 0;
    private Integer mediumQuestionCount = 0;
    private Integer difficultQuestionCount = 0;

    public ExamRequest() {}

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

    // ✅ Difficulty getters/setters

    public Integer getEasyQuestionCount() {
        return easyQuestionCount;
    }

    public void setEasyQuestionCount(Integer easyQuestionCount) {
        this.easyQuestionCount = easyQuestionCount;
    }

    public Integer getMediumQuestionCount() {
        return mediumQuestionCount;
    }

    public void setMediumQuestionCount(Integer mediumQuestionCount) {
        this.mediumQuestionCount = mediumQuestionCount;
    }

    public Integer getDifficultQuestionCount() {
        return difficultQuestionCount;
    }

    public void setDifficultQuestionCount(Integer difficultQuestionCount) {
        this.difficultQuestionCount = difficultQuestionCount;
    }
}