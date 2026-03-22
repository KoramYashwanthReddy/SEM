package com.yashwanth.ai_exam_system.dto;

public class ExamResultResponse {

    private Integer totalMarks;
    private Integer obtainedMarks;
    private Double percentage;
    private String result;
    private Boolean passed;

    // question stats
    private Integer totalQuestions;
    private Integer correctAnswers;
    private Integer wrongAnswers;
    private Integer unansweredQuestions;

    // difficulty analytics
    private Integer easyCorrect;
    private Integer mediumCorrect;
    private Integer difficultCorrect;

    private Integer easyWrong;
    private Integer mediumWrong;
    private Integer difficultWrong;

    // performance
    private Long timeTakenSeconds;
    private String grade;

    public ExamResultResponse() {}

    public Integer getTotalMarks() { return totalMarks; }
    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks; }

    public Integer getObtainedMarks() { return obtainedMarks; }
    public void setObtainedMarks(Integer obtainedMarks) { this.obtainedMarks = obtainedMarks; }

    public Double getPercentage() { return percentage; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }

    public Boolean getPassed() { return passed; }
    public void setPassed(Boolean passed) { this.passed = passed; }

    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }

    public Integer getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(Integer correctAnswers) { this.correctAnswers = correctAnswers; }

    public Integer getWrongAnswers() { return wrongAnswers; }
    public void setWrongAnswers(Integer wrongAnswers) { this.wrongAnswers = wrongAnswers; }

    public Integer getUnansweredQuestions() { return unansweredQuestions; }
    public void setUnansweredQuestions(Integer unansweredQuestions) { this.unansweredQuestions = unansweredQuestions; }

    public Integer getEasyCorrect() { return easyCorrect; }
    public void setEasyCorrect(Integer easyCorrect) { this.easyCorrect = easyCorrect; }

    public Integer getMediumCorrect() { return mediumCorrect; }
    public void setMediumCorrect(Integer mediumCorrect) { this.mediumCorrect = mediumCorrect; }

    public Integer getDifficultCorrect() { return difficultCorrect; }
    public void setDifficultCorrect(Integer difficultCorrect) { this.difficultCorrect = difficultCorrect; }

    public Integer getEasyWrong() { return easyWrong; }
    public void setEasyWrong(Integer easyWrong) { this.easyWrong = easyWrong; }

    public Integer getMediumWrong() { return mediumWrong; }
    public void setMediumWrong(Integer mediumWrong) { this.mediumWrong = mediumWrong; }

    public Integer getDifficultWrong() { return difficultWrong; }
    public void setDifficultWrong(Integer difficultWrong) { this.difficultWrong = difficultWrong; }

    public Long getTimeTakenSeconds() { return timeTakenSeconds; }
    public void setTimeTakenSeconds(Long timeTakenSeconds) { this.timeTakenSeconds = timeTakenSeconds; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
}