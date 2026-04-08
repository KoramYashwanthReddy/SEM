package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String examCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType questionType;

    // EASY / MEDIUM / DIFFICULT
    private String difficulty;

    @Column(nullable = false)
    private String topic;

    @Column(length = 2000, nullable = false)
    private String questionText;

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String optionE;
    private String optionF;

    private String correctAnswer;

    @Column(length = 2000)
    private String sampleInput;

    @Column(length = 2000)
    private String sampleOutput;

    @Column(nullable = false)
    private Integer marks;

    private Boolean shuffleOptions = true;
    private Boolean fixedPosition = false;
    private Integer displayOrder;
    private String shuffleGroup;

    private Boolean active = true;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Question() {}

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

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (active == null) active = true;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ================= GETTERS =================

    public Long getId() { return id; }
    public String getExamCode() { return examCode; }
    public QuestionType getQuestionType() { return questionType; }
    public String getDifficulty() { return difficulty; }

    // ENUM SAFE
    public DifficultyLevel getDifficultyLevel() {
        if (difficulty == null) return null;
        String normalized = difficulty.trim().toUpperCase();
        if ("HARD".equals(normalized)) {
            normalized = "DIFFICULT";
        }
        return DifficultyLevel.valueOf(normalized);
    }

    public String getTopic() { return topic; }
    public String getQuestionText() { return questionText; }
    public String getOptionA() { return optionA; }
    public String getOptionB() { return optionB; }
    public String getOptionC() { return optionC; }
    public String getOptionD() { return optionD; }
    public String getOptionE() { return optionE; }
    public String getOptionF() { return optionF; }
    public String getCorrectAnswer() { return correctAnswer; }
    public String getSampleInput() { return sampleInput; }
    public String getSampleOutput() { return sampleOutput; }
    public Integer getMarks() { return marks; }
    public Boolean getShuffleOptions() { return shuffleOptions; }
    public Boolean getFixedPosition() { return fixedPosition; }
    public Integer getDisplayOrder() { return displayOrder; }
    public String getShuffleGroup() { return shuffleGroup; }
    public Boolean getActive() { return active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    // ================= COMPATIBILITY =================

    public String getDifficultyLevelString() {
        return difficulty;
    }

    public void setDifficultyLevel(String difficulty) {
        this.difficulty = difficulty;
    }

    // ================= UTILITY =================

    public boolean isEasy() {
        return getDifficultyLevel() == DifficultyLevel.EASY;
    }

    public boolean isMedium() {
        return getDifficultyLevel() == DifficultyLevel.MEDIUM;
    }

    public boolean isHard() {
        return getDifficultyLevel() == DifficultyLevel.DIFFICULT;
    }

    public List<String> getAllOptions() {
        List<String> options = new ArrayList<>();
        if (optionA != null) options.add(optionA);
        if (optionB != null) options.add(optionB);
        if (optionC != null) options.add(optionC);
        if (optionD != null) options.add(optionD);
        if (optionE != null) options.add(optionE);
        if (optionF != null) options.add(optionF);
        return options;
    }

    // ================= SETTERS =================

    public void setId(Long id) { this.id = id; }
    public void setExamCode(String examCode) { this.examCode = examCode; }
    public void setQuestionType(QuestionType questionType) { this.questionType = questionType; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    // ENUM SAFE SETTER
    public void setDifficultyLevel(DifficultyLevel level) {
        if (level != null) {
            this.difficulty = level.name();
        }
    }

    public void setTopic(String topic) { this.topic = topic; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public void setOptionA(String optionA) { this.optionA = optionA; }
    public void setOptionB(String optionB) { this.optionB = optionB; }
    public void setOptionC(String optionC) { this.optionC = optionC; }
    public void setOptionD(String optionD) { this.optionD = optionD; }
    public void setOptionE(String optionE) { this.optionE = optionE; }
    public void setOptionF(String optionF) { this.optionF = optionF; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
    public void setSampleInput(String sampleInput) { this.sampleInput = sampleInput; }
    public void setSampleOutput(String sampleOutput) { this.sampleOutput = sampleOutput; }
    public void setMarks(Integer marks) { this.marks = marks; }
    public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }
    public void setFixedPosition(Boolean fixedPosition) { this.fixedPosition = fixedPosition; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public void setShuffleGroup(String shuffleGroup) { this.shuffleGroup = shuffleGroup; }
    public void setActive(Boolean active) { this.active = active; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
