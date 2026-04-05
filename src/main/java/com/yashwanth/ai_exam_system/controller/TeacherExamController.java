package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.dto.QuestionResponse;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.ExamStatus;
import com.yashwanth.ai_exam_system.entity.QuestionType;
import com.yashwanth.ai_exam_system.service.ExamService;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/teacher/exams")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherExamController {

    private static final Logger logger =
            LoggerFactory.getLogger(TeacherExamController.class);

    private final ExamService examService;
    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;

    public TeacherExamController(ExamService examService,
                                 ExamRepository examRepository,
                                 QuestionRepository questionRepository) {
        this.examService = examService;
        this.examRepository = examRepository;
        this.questionRepository = questionRepository;
    }

    // =========================================================
    // CREATE EXAM
    // =========================================================
    @PostMapping
    public ResponseEntity<Map<String, Object>> createExam(
            @Valid @RequestBody ExamRequest request,
            Authentication auth) {

        logger.info("Teacher creating exam");

        Exam exam = examService.createExam(request, auth);

        return success("Exam created successfully", exam);
    }

    // =========================================================
    // GET MY EXAMS
    // =========================================================
    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyExams(
            Authentication auth) {

        List<Exam> exams = examService.getTeacherExams(auth);

        return success("Exams fetched successfully", exams);
    }

    // =========================================================
    // GET SINGLE EXAM
    // =========================================================
    @GetMapping("/{examCode}")
    public ResponseEntity<Map<String, Object>> getExamByCode(
            @PathVariable String examCode) {

        Exam exam = examService.getExamByCode(examCode);

        return success("Exam fetched successfully", exam);
    }

    // =========================================================
    // UPDATE EXAM
    // =========================================================
    @PutMapping("/{examCode}")
    public ResponseEntity<Map<String, Object>> updateExam(
            @PathVariable String examCode,
            @Valid @RequestBody ExamRequest request) {

        logger.info("Updating exam {}", examCode);

        Exam updatedExam =
                examService.updateExam(examCode, request);

        return success("Exam updated successfully", updatedExam);
    }

    // =========================================================
    // PUBLISH EXAM
    // =========================================================
    @PutMapping("/{examCode}/publish")
    public ResponseEntity<Map<String, Object>> publishExam(
            @PathVariable String examCode) {

        Exam exam = examService.publishExam(examCode);

        return success("Exam published successfully", exam);
    }

    @PostMapping("/{examCode}/publish")
    public ResponseEntity<Map<String, Object>> publishExamViaPost(
            @PathVariable String examCode) {

        Exam exam = examService.publishExam(examCode);

        return success("Exam published successfully", exam);
    }

    // =========================================================
    // QUESTIONS
    // =========================================================
    @GetMapping("/{examCode}/questions")
    public ResponseEntity<Map<String, Object>> getQuestions(
            @PathVariable String examCode) {

        List<QuestionResponse> questions =
                questionRepository.findByExamCode(examCode)
                        .stream()
                        .filter(q -> !Boolean.FALSE.equals(q.getActive()))
                        .map(this::toQuestionResponse)
                        .collect(Collectors.toList());

        return success("Questions fetched successfully", questions);
    }

    @PostMapping("/{examCode}/questions")
    public ResponseEntity<Map<String, Object>> createQuestion(
            @PathVariable String examCode,
            @RequestBody Question question) {

        Question saved = upsertQuestion(examCode, question, null);
        return success("Question created successfully", toQuestionResponse(saved));
    }

    @PostMapping("/{examCode}/questions/bulk")
    @Transactional
    public ResponseEntity<Map<String, Object>> bulkUploadQuestions(
            @PathVariable String examCode,
            @RequestBody List<Map<String, Object>> questions) {

        if (questions == null || questions.isEmpty()) {
            throw new IllegalArgumentException("No questions were provided for upload");
        }

        Exam exam = examService.getExamByCode(examCode);
        if (exam.isPublished()) {
            throw new IllegalArgumentException("Published exams cannot be edited");
        }
        if (Boolean.TRUE.equals(exam.getQuestionsUploaded())) {
            throw new IllegalArgumentException("Questions already uploaded for this exam");
        }

        validateQuestionExamCodes(examCode, questions);

        List<Question> existingQuestions = questionRepository.findByExamCode(examCode);
        for (Question existing : existingQuestions) {
            existing.setActive(false);
        }
        if (!existingQuestions.isEmpty()) {
            questionRepository.saveAll(existingQuestions);
        }

        List<Question> savedQuestions = new ArrayList<>();
        int rowNumber = 0;
        for (Map<String, Object> item : questions) {
            rowNumber += 1;
            savedQuestions.add(buildQuestionFromPayload(examCode, item, rowNumber));
        }

        questionRepository.saveAll(savedQuestions);

        exam.setQuestionsUploaded(true);
        exam.setStatus(ExamStatus.QUESTIONS_UPLOADED);
        examRepository.save(exam);

        Map<String, Object> summary = new HashMap<>();
        summary.put("examCode", examCode);
        summary.put("uploadedCount", savedQuestions.size());
        summary.put("questions", savedQuestions.stream().map(this::toQuestionResponse).collect(Collectors.toList()));

        return success("Questions uploaded successfully", summary);
    }

    @PutMapping("/{examCode}/questions/{questionId}")
    public ResponseEntity<Map<String, Object>> updateQuestion(
            @PathVariable String examCode,
            @PathVariable Long questionId,
            @RequestBody Question question) {

        Question saved = upsertQuestion(examCode, question, questionId);
        return success("Question updated successfully", toQuestionResponse(saved));
    }

    @DeleteMapping("/{examCode}/questions/{questionId}")
    public ResponseEntity<Map<String, Object>> deleteQuestion(
            @PathVariable String examCode,
            @PathVariable Long questionId) {

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        if (!examCode.equals(question.getExamCode())) {
            throw new RuntimeException("Question does not belong to exam");
        }

        question.setActive(false);
        questionRepository.save(question);

        boolean hasActiveQuestions = questionRepository.findByExamCode(examCode)
                .stream()
                .anyMatch(q -> !Boolean.FALSE.equals(q.getActive()));
        Exam exam = examService.getExamByCode(examCode);
        exam.setQuestionsUploaded(hasActiveQuestions);
        examRepository.save(exam);

        return success("Question deleted successfully", null);
    }

    // =========================================================
    // DELETE (SOFT)
    // =========================================================
    @DeleteMapping("/{examCode}")
    public ResponseEntity<Map<String, Object>> deleteExam(
            @PathVariable String examCode) {

        examService.deleteExamByTeacher(examCode);

        return success("Exam deleted successfully", null);
    }

    // =========================================================
    // ATTEMPTS
    // =========================================================
    @GetMapping("/{examCode}/attempts")
    public ResponseEntity<Map<String, Object>> getExamAttempts(
            @PathVariable String examCode) {

        List<ExamAttempt> attempts =
                examService.getAttemptsByExamCode(examCode);

        return success("Exam attempts fetched", attempts);
    }

    // =========================================================
    // ANALYTICS
    // =========================================================
    @GetMapping("/{examCode}/analytics")
    public ResponseEntity<Map<String, Object>> getExamAnalytics(
            @PathVariable String examCode) {

        Map<String, Object> analytics =
                examService.getExamAnalytics(examCode);

        return success("Exam analytics fetched", analytics);
    }

    // =========================================================
    // SUCCESS RESPONSE
    // =========================================================
    private ResponseEntity<Map<String, Object>> success(
            String message,
            Object data) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", message);
        response.put("data", data);

        return ResponseEntity.ok(response);
    }

    private Question upsertQuestion(String examCode, Question question, Long questionId) {
        Exam exam = examService.getExamByCode(examCode);

        Question target = questionId == null
                ? new Question()
                : questionRepository.findById(questionId)
                        .orElseThrow(() -> new RuntimeException("Question not found"));

        target.setExamCode(exam.getExamCode());
        target.setQuestionType(question.getQuestionType());
        target.setDifficulty(question.getDifficulty());
        target.setTopic(question.getTopic());
        target.setQuestionText(question.getQuestionText());
        target.setOptionA(question.getOptionA());
        target.setOptionB(question.getOptionB());
        target.setOptionC(question.getOptionC());
        target.setOptionD(question.getOptionD());
        target.setOptionE(question.getOptionE());
        target.setOptionF(question.getOptionF());
        target.setCorrectAnswer(question.getCorrectAnswer());
        target.setSampleInput(question.getSampleInput());
        target.setSampleOutput(question.getSampleOutput());
        target.setMarks(question.getMarks());
        target.setShuffleOptions(question.getShuffleOptions());
        target.setDisplayOrder(question.getDisplayOrder());
        target.setShuffleGroup(question.getShuffleGroup());
        if (question.getActive() != null) {
            target.setActive(question.getActive());
        } else if (questionId == null) {
            target.setActive(true);
        }

        Question saved = questionRepository.save(target);
        exam.setQuestionsUploaded(true);
        examRepository.save(exam);
        return saved;
    }

    private QuestionResponse toQuestionResponse(Question q) {
        QuestionResponse r = new QuestionResponse();
        r.setId(q.getId());
        r.setQuestionText(q.getQuestionText());
        r.setOptionA(q.getOptionA());
        r.setOptionB(q.getOptionB());
        r.setOptionC(q.getOptionC());
        r.setOptionD(q.getOptionD());
        r.setOptionE(q.getOptionE());
        r.setOptionF(q.getOptionF());
        r.setQuestionType(q.getQuestionType() != null ? q.getQuestionType().name() : null);
        r.setMarks(q.getMarks());
        r.setDifficulty(q.getDifficulty());
        r.setTopic(q.getTopic());
        r.setShuffleOptions(q.getShuffleOptions());
        r.setDisplayOrder(q.getDisplayOrder());
        r.setSampleInput(q.getSampleInput());
        r.setSampleOutput(q.getSampleOutput());
        return r;
    }

    private Question buildQuestionFromPayload(String examCode, Map<String, Object> payload, int rowNumber) {
        Question question = new Question();
        question.setExamCode(examCode);
        question.setActive(true);

        String questionText = stringValue(payload.get("questionText"));
        if (questionText.isBlank()) {
            throw new IllegalArgumentException("Row " + rowNumber + ": question text is required");
        }
        question.setQuestionText(questionText);

        String typeValue = stringValue(payload.get("questionType"));
        if (typeValue.isBlank()) {
            throw new IllegalArgumentException("Row " + rowNumber + ": question type is required");
        }
        question.setQuestionType(parseQuestionType(typeValue, rowNumber));

        String topic = stringValue(payload.get("topic"));
        question.setTopic(topic.isBlank() ? "general" : topic);

        String difficulty = stringValue(payload.get("difficulty"));
        question.setDifficulty(difficulty.isBlank() ? "Easy" : difficulty);

        Integer marks = integerValue(payload.get("marks"));
        if (marks == null || marks <= 0) {
            throw new IllegalArgumentException("Row " + rowNumber + ": marks must be greater than zero");
        }
        question.setMarks(marks);

        question.setOptionA(stringValue(payload.get("optionA")));
        question.setOptionB(stringValue(payload.get("optionB")));
        question.setOptionC(stringValue(payload.get("optionC")));
        question.setOptionD(stringValue(payload.get("optionD")));
        question.setOptionE(stringValue(payload.get("optionE")));
        question.setOptionF(stringValue(payload.get("optionF")));
        question.setCorrectAnswer(stringValue(payload.get("correctAnswer")));
        question.setSampleInput(stringValue(payload.get("sampleInput")));
        question.setSampleOutput(stringValue(payload.get("sampleOutput")));
        question.setShuffleOptions(booleanValue(payload.get("shuffleOptions"), false));
        question.setDisplayOrder(integerValue(payload.get("displayOrder")));
        question.setShuffleGroup(stringValue(payload.get("shuffleGroup")));

        return question;
    }

    private QuestionType parseQuestionType(String value, int rowNumber) {
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (normalized.equals("SHORT ANSWER") || normalized.equals("SHORT_ANSWER") || normalized.equals("DESCRIPTIVE")) {
            normalized = "DESCRIPTIVE";
        }
        if (normalized.equals("CODING") || normalized.equals("MCQ") || normalized.equals("DESCRIPTIVE")) {
            return QuestionType.valueOf(normalized);
        }
        throw new IllegalArgumentException("Row " + rowNumber + ": invalid question type '" + value + "'");
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private Integer integerValue(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) {
            return number.intValue();
        }
        String text = String.valueOf(value).trim();
        if (text.isBlank()) return null;
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean booleanValue(Object value, boolean defaultValue) {
        if (value == null) return defaultValue;
        if (value instanceof Boolean b) return b;
        String text = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
        if (text.isBlank()) return defaultValue;
        return text.equals("true") || text.equals("1") || text.equals("yes") || text.equals("on");
    }

    private void validateQuestionExamCodes(String examCode, List<Map<String, Object>> questions) {
        String selected = stringValue(examCode);
        Set<String> seen = new LinkedHashSet<>();
        for (Map<String, Object> question : questions) {
            String fileCode = stringValue(firstNonNull(
                    question.get("examCode"),
                    question.get("Exam Code"),
                    question.get("ExamCode"),
                    question.get("exam_code"),
                    question.get("code")
            ));
            if (fileCode.isBlank()) {
                continue;
            }
            seen.add(fileCode);
            if (!fileCode.equals(selected)) {
                throw new IllegalArgumentException("Exam code mismatch. Selected " + examCode + ", but the file contains " + fileCode);
            }
        }
        if (seen.size() > 1) {
            throw new IllegalArgumentException("Multiple exam codes found in the uploaded file");
        }
    }

    private Object firstNonNull(Object... values) {
        for (Object value : values) {
            if (value != null && !String.valueOf(value).trim().isBlank()) {
                return value;
            }
        }
        return null;
    }
}
