package com.yashwanth.ai_exam_system.dto;

public class StartExamRequest {

    private Long studentId;
    private String examCode;

    // ================= NEW PRODUCTION FIELDS =================

    private String attemptMode; // PRACTICE / REAL
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;

    private Integer startFromQuestion; // resume support

    private String deviceType;
    private String browser;
    private String ipAddress;
    private String timezone;

    private Boolean autoSubmit;
    private String language;

    public StartExamRequest() {}

    // ================= GETTERS =================

    public Long getStudentId() {
        return studentId;
    }

    public String getExamCode() {
        return examCode;
    }

    public String getAttemptMode() {
        return attemptMode;
    }

    public Boolean getShuffleQuestions() {
        return shuffleQuestions;
    }

    public Boolean getShuffleOptions() {
        return shuffleOptions;
    }

    public Integer getStartFromQuestion() {
        return startFromQuestion;
    }

    public String getDeviceType() {
        return deviceType;
    }

    public String getBrowser() {
        return browser;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public String getTimezone() {
        return timezone;
    }

    public Boolean getAutoSubmit() {
        return autoSubmit;
    }

    public String getLanguage() {
        return language;
    }

    // ================= SETTERS =================

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public void setAttemptMode(String attemptMode) {
        this.attemptMode = attemptMode;
    }

    public void setShuffleQuestions(Boolean shuffleQuestions) {
        this.shuffleQuestions = shuffleQuestions;
    }

    public void setShuffleOptions(Boolean shuffleOptions) {
        this.shuffleOptions = shuffleOptions;
    }

    public void setStartFromQuestion(Integer startFromQuestion) {
        this.startFromQuestion = startFromQuestion;
    }

    public void setDeviceType(String deviceType) {
        this.deviceType = deviceType;
    }

    public void setBrowser(String browser) {
        this.browser = browser;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public void setAutoSubmit(Boolean autoSubmit) {
        this.autoSubmit = autoSubmit;
    }

    public void setLanguage(String language) {
        this.language = language;
    }
}