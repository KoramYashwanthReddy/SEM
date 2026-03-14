package com.yashwanth.ai_exam_system.dto;

public class QuestionResponse {

    private Long id;
    private String questionText;

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    private String questionType;
    private Integer marks;

    public QuestionResponse() {
    }

    public QuestionResponse(Long id, String questionText, String optionA, String optionB,
                            String optionC, String optionD, String questionType, Integer marks) {
        this.id = id;
        this.questionText = questionText;
        this.optionA = optionA;
        this.optionB = optionB;
        this.optionC = optionC;
        this.optionD = optionD;
        this.questionType = questionType;
        this.marks = marks;
    }

    public Long getId() {
        return id;
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

    public String getQuestionType() {
        return questionType;
    }

    public Integer getMarks() {
        return marks;
    }

    public void setId(Long id) {
        this.id = id;
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

    public void setQuestionType(String questionType) {
        this.questionType = questionType;
    }

    public void setMarks(Integer marks) {
        this.marks = marks;
    }
}