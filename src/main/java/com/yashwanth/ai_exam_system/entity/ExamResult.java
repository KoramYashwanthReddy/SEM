package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_results")
public class ExamResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long attemptId;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private String examCode;

    private int totalQuestions;
    private int correctAnswers;
    private int wrongAnswers;

    // ✅ NEW
    private int unansweredQuestions;

    private double score;
    private double percentage;

    private String resultStatus; // PASS / FAIL
    private Boolean passed;

    // Difficulty analytics
    private Integer easyQuestions = 0;
    private Integer mediumQuestions = 0;
    private Integer difficultQuestions = 0;

    private Integer easyCorrect = 0;
    private Integer mediumCorrect = 0;
    private Integer difficultCorrect = 0;

    private Integer easyWrong = 0;
    private Integer mediumWrong = 0;
    private Integer difficultWrong = 0;

    // Attempt tracking
    private Long timeTakenSeconds;

    private LocalDateTime submittedAt;
    private LocalDateTime evaluatedAt;

    public ExamResult() {}

    public Long getId() { return id; }

    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getExamCode() { return examCode; }
    public void setExamCode(String examCode) { this.examCode = examCode; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public int getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(int correctAnswers) { this.correctAnswers = correctAnswers; }

    public int getWrongAnswers() { return wrongAnswers; }
    public void setWrongAnswers(int wrongAnswers) { this.wrongAnswers = wrongAnswers; }

    public int getUnansweredQuestions() { return unansweredQuestions; }
    public void setUnansweredQuestions(int unansweredQuestions) { this.unansweredQuestions = unansweredQuestions; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }

    public String getResultStatus() { return resultStatus; }
    public void setResultStatus(String resultStatus) { this.resultStatus = resultStatus; }

    public Boolean getPassed() { return passed; }
    public void setPassed(Boolean passed) { this.passed = passed; }

    public Integer getEasyQuestions() { return easyQuestions; }
    public void setEasyQuestions(Integer easyQuestions) { this.easyQuestions = easyQuestions; }

    public Integer getMediumQuestions() { return mediumQuestions; }
    public void setMediumQuestions(Integer mediumQuestions) { this.mediumQuestions = mediumQuestions; }

    public Integer getDifficultQuestions() { return difficultQuestions; }
    public void setDifficultQuestions(Integer difficultQuestions) { this.difficultQuestions = difficultQuestions; }

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

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getEvaluatedAt() { return evaluatedAt; }
    public void setEvaluatedAt(LocalDateTime evaluatedAt) { this.evaluatedAt = evaluatedAt; }
}