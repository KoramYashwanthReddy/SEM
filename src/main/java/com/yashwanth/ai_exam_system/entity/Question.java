package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ================= BASIC =================

    @Column(nullable = false)
    private String examCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType questionType;

    // EASY / MEDIUM / HARD
    private String difficulty;

    // 🔥 NEW (VERY IMPORTANT FOR AI)
    @Column(nullable = false)
    private String topic;

    @Column(length = 2000, nullable = false)
    private String questionText;

    // ================= MCQ OPTIONS =================

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    private String correctAnswer;

    // ================= CODING =================

    @Column(length = 2000)
    private String sampleInput;

    @Column(length = 2000)
    private String sampleOutput;

    // ================= MARKS =================

    @Column(nullable = false)
    private Integer marks;

    // ================= CONSTRUCTORS =================

    public Question() {
    }

    public Question(Long id, String examCode, QuestionType questionType,
                    String difficulty, String topic, String questionText,
                    String optionA, String optionB, String optionC,
                    String optionD, String correctAnswer,
                    String sampleInput, String sampleOutput,
                    Integer marks) {

        this.id = id;
        this.examCode = examCode;
        this.questionType = questionType;
        this.difficulty = difficulty;
        this.topic = topic;
        this.questionText = questionText;
        this.optionA = optionA;
        this.optionB = optionB;
        this.optionC = optionC;
        this.optionD = optionD;
        this.correctAnswer = correctAnswer;
        this.sampleInput = sampleInput;
        this.sampleOutput = sampleOutput;
        this.marks = marks;
    }

    // ================= GETTERS =================

    public Long getId() {
        return id;
    }

    public String getExamCode() {
        return examCode;
    }

    public QuestionType getQuestionType() {
        return questionType;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public String getTopic() {
        return topic;
    }

    public String getQuestionText() {
        return questionText;
    }

    public String getOptionA() {
        return optionA;
    }

    public String getOptionB() {
        return optionB;
    }

    public String getOptionC() {
        return optionC;
    }

    public String getOptionD() {
        return optionD;
    }

    public String getCorrectAnswer() {
        return correctAnswer;
    }

    public String getSampleInput() {
        return sampleInput;
    }

    public String getSampleOutput() {
        return sampleOutput;
    }

    public Integer getMarks() {
        return marks;
    }

    // ================= SETTERS =================

    public void setId(Long id) {
        this.id = id;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public void setQuestionType(QuestionType questionType) {
        this.questionType = questionType;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public void setOptionA(String optionA) {
        this.optionA = optionA;
    }

    public void setOptionB(String optionB) {
        this.optionB = optionB;
    }

    public void setOptionC(String optionC) {
        this.optionC = optionC;
    }

    public void setOptionD(String optionD) {
        this.optionD = optionD;
    }

    public void setCorrectAnswer(String correctAnswer) {
        this.correctAnswer = correctAnswer;
    }

    public void setSampleInput(String sampleInput) {
        this.sampleInput = sampleInput;
    }

    public void setSampleOutput(String sampleOutput) {
        this.sampleOutput = sampleOutput;
    }

    public void setMarks(Integer marks) {
        this.marks = marks;
    }
}