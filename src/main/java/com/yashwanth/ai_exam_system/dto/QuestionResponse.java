package com.yashwanth.ai_exam_system.dto;

public class QuestionResponse {

    private Long id;
    private String questionText;

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    // 🔥 NEW OPTIONS (for shuffle)
    private String optionE;
    private String optionF;

    private String questionType;
    private Integer marks;

    // ================= NEW PRODUCTION FIELDS =================

    private String difficulty;
    private String topic;

    private Boolean shuffleOptions;
    private Integer displayOrder;

    private String sampleInput;
    private String sampleOutput;

    private String explanation;

    private Boolean markedForReview;
    private Boolean visited;

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

    // ================= GETTERS =================

    public Long getId() { return id; }
    public String getQuestionText() { return questionText; }
    public String getOptionA() { return optionA; }
    public String getOptionB() { return optionB; }
    public String getOptionC() { return optionC; }
    public String getOptionD() { return optionD; }
    public String getOptionE() { return optionE; }
    public String getOptionF() { return optionF; }
    public String getQuestionType() { return questionType; }
    public Integer getMarks() { return marks; }
    public String getDifficulty() { return difficulty; }
    public String getTopic() { return topic; }
    public Boolean getShuffleOptions() { return shuffleOptions; }
    public Integer getDisplayOrder() { return displayOrder; }
    public String getSampleInput() { return sampleInput; }
    public String getSampleOutput() { return sampleOutput; }
    public String getExplanation() { return explanation; }
    public Boolean getMarkedForReview() { return markedForReview; }
    public Boolean getVisited() { return visited; }

    // ================= SETTERS =================

    public void setId(Long id) { this.id = id; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public void setOptionA(String optionA) { this.optionA = optionA; }
    public void setOptionB(String optionB) { this.optionB = optionB; }
    public void setOptionC(String optionC) { this.optionC = optionC; }
    public void setOptionD(String optionD) { this.optionD = optionD; }
    public void setOptionE(String optionE) { this.optionE = optionE; }
    public void setOptionF(String optionF) { this.optionF = optionF; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }
    public void setMarks(Integer marks) { this.marks = marks; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public void setTopic(String topic) { this.topic = topic; }
    public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public void setSampleInput(String sampleInput) { this.sampleInput = sampleInput; }
    public void setSampleOutput(String sampleOutput) { this.sampleOutput = sampleOutput; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
    public void setMarkedForReview(Boolean markedForReview) { this.markedForReview = markedForReview; }
    public void setVisited(Boolean visited) { this.visited = visited; }
}