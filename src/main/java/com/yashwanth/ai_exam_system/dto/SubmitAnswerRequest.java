package com.yashwanth.ai_exam_system.dto;

public class SubmitAnswerRequest {

    private Long attemptId;
    private Long questionId;
    private String answer;
    private Boolean markForReview;

    // ================= NEW PRODUCTION FIELDS =================

    private Boolean visited;

    private Long timeSpentSeconds;

    private Boolean autoSaved;

    private Boolean answerChanged;

    private Integer tabSwitchCount;

    private Integer fullscreenExitCount;

    private String codingLanguage;

    private String codeAnswer;

    private Long clientTimestamp;

    private Integer questionNumber;

    // ================= CONSTRUCTOR =================

    public SubmitAnswerRequest() {}

    // ================= GETTERS =================

    public Long getAttemptId() { return attemptId; }

    public Long getQuestionId() { return questionId; }

    public String getAnswer() { return answer; }

    public Boolean getMarkForReview() { return markForReview; }

    public Boolean getVisited() { return visited; }

    public Long getTimeSpentSeconds() { return timeSpentSeconds; }

    public Boolean getAutoSaved() { return autoSaved; }

    public Boolean getAnswerChanged() { return answerChanged; }

    public Integer getTabSwitchCount() { return tabSwitchCount; }

    public Integer getFullscreenExitCount() { return fullscreenExitCount; }

    public String getCodingLanguage() { return codingLanguage; }

    public String getCodeAnswer() { return codeAnswer; }

    public Long getClientTimestamp() { return clientTimestamp; }

    public Integer getQuestionNumber() { return questionNumber; }

    // ================= SETTERS =================

    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public void setAnswer(String answer) { this.answer = answer; }

    public void setMarkForReview(Boolean markForReview) { this.markForReview = markForReview; }

    public void setVisited(Boolean visited) { this.visited = visited; }

    public void setTimeSpentSeconds(Long timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }

    public void setAutoSaved(Boolean autoSaved) { this.autoSaved = autoSaved; }

    public void setAnswerChanged(Boolean answerChanged) { this.answerChanged = answerChanged; }

    public void setTabSwitchCount(Integer tabSwitchCount) { this.tabSwitchCount = tabSwitchCount; }

    public void setFullscreenExitCount(Integer fullscreenExitCount) { this.fullscreenExitCount = fullscreenExitCount; }

    public void setCodingLanguage(String codingLanguage) { this.codingLanguage = codingLanguage; }

    public void setCodeAnswer(String codeAnswer) { this.codeAnswer = codeAnswer; }

    public void setClientTimestamp(Long clientTimestamp) { this.clientTimestamp = clientTimestamp; }

    public void setQuestionNumber(Integer questionNumber) { this.questionNumber = questionNumber; }
}