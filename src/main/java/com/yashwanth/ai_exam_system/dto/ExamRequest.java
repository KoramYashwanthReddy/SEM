package com.yashwanth.ai_exam_system.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;

public class ExamRequest {

    @NotBlank(message = "Exam title is required")
    private String title;
    private String description;
    @NotBlank(message = "Subject is required")
    private String subject;
    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer durationMinutes;
    @NotNull(message = "Total marks are required")
    @Min(value = 1, message = "Total marks must be at least 1")
    private Integer totalMarks;
    @NotNull(message = "Passing marks are required")
    @Min(value = 0, message = "Passing marks cannot be negative")
    private Integer passingMarks;
    @NotNull(message = "Max attempts are required")
    @Min(value = 1, message = "Max attempts must be at least 1")
    private Integer maxAttempts;
    @NotNull(message = "Marks per question is required")
    @DecimalMin(value = "0.0", message = "Marks per question cannot be negative")
    private Double marksPerQuestion;
    @NotNull(message = "Negative marks value is required")
    @DecimalMin(value = "0.0", message = "Negative marks cannot be negative")
    private Double negativeMarks;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private String startTime;
    private String endTime;

    // ✅ NEW — Difficulty Distribution
    @NotNull(message = "Easy question count is required")
    @Min(value = 0, message = "Easy question count cannot be negative")
    private Integer easyQuestionCount = 0;
    @NotNull(message = "Medium question count is required")
    @Min(value = 0, message = "Medium question count cannot be negative")
    private Integer mediumQuestionCount = 0;
    @NotNull(message = "Difficult question count is required")
    @Min(value = 0, message = "Difficult question count cannot be negative")
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

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
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
