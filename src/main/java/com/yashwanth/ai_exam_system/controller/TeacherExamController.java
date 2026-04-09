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
@PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
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
            @PathVariable String examCode,
            Authentication auth) {

        Exam exam = examService.getExamByCodeForActor(examCode, auth);

        return success("Exam fetched successfully", exam);
    }

    // =========================================================
    // UPDATE EXAM
    // =========================================================
    @PutMapping("/{examCode}")
    public ResponseEntity<Map<String, Object>> updateExam(
            @PathVariable String examCode,
            @Valid @RequestBody ExamRequest request,
            Authentication auth) {

        logger.info("Updating exam {}", examCode);

        Exam updatedExam =
                examService.updateExam(examCode, request, auth);

        return success("Exam updated successfully", updatedExam);
    }

    // =========================================================
    // PUBLISH EXAM
    // =========================================================
    @PutMapping("/{examCode}/publish")
    public ResponseEntity<Map<String, Object>> publishExam(
            @PathVariable String examCode,
            Authentication auth) {

        Exam exam = examService.publishExam(examCode, auth);

        return success("Exam published successfully", exam);
    }

    @PostMapping("/{examCode}/publish")
    public ResponseEntity<Map<String, Object>> publishExamViaPost(
            @PathVariable String examCode,
            Authentication auth) {

        Exam exam = examService.publishExam(examCode, auth);

        return success("Exam published successfully", exam);
    }

    // =========================================================
    // QUESTIONS
    // =========================================================
    @GetMapping("/{examCode}/questions")
    public ResponseEntity<Map<String, Object>> getQuestions(
            @PathVariable String examCode,
            Authentication auth) {

        examService.getExamByCodeForActor(examCode, auth);

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
            @RequestBody Question question,
            Authentication auth) {

        Question saved = upsertQuestion(examCode, question, null, auth);
        return success("Question created successfully", toQuestionResponse(saved));
    }

    @PostMapping("/{examCode}/questions/bulk")
    @Transactional
    public ResponseEntity<Map<String, Object>> bulkUploadQuestions(
            @PathVariable String examCode,
            @RequestBody List<Map<String, Object>> questions,
            Authentication auth) {

        if (questions == null || questions.isEmpty()) {
            throw new IllegalArgumentException("No questions were provided for upload");
        }

        Exam exam = examService.getExamByCodeForActor(examCode, auth);
        if (exam.isPublished()) {
            throw new IllegalArgumentException("Published exams cannot be edited");
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
            @RequestBody Question question,
            Authentication auth) {

        Question saved = upsertQuestion(examCode, question, questionId, auth);
        return success("Question updated successfully", toQuestionResponse(saved));
    }

    @DeleteMapping("/{examCode}/questions/{questionId}")
    public ResponseEntity<Map<String, Object>> deleteQuestion(
            @PathVariable String examCode,
            @PathVariable Long questionId,
            Authentication auth) {

        examService.getExamByCodeForActor(examCode, auth);

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
        Exam exam = examService.getExamByCodeForActor(examCode, auth);
        exam.setQuestionsUploaded(hasActiveQuestions);
        examRepository.save(exam);

        return success("Question deleted successfully", null);
    }

    // =========================================================
    // DELETE (SOFT)
    // =========================================================
    @DeleteMapping("/{examCode}")
    public ResponseEntity<Map<String, Object>> deleteExam(
            @PathVariable String examCode,
            Authentication auth) {

        examService.deleteExamByTeacher(examCode, auth);

        return success("Exam deleted successfully", null);
    }

    // =========================================================
    // ATTEMPTS
    // =========================================================
    @GetMapping("/{examCode}/attempts")
    public ResponseEntity<Map<String, Object>> getExamAttempts(
            @PathVariable String examCode,
            Authentication auth) {

        List<ExamAttempt> attempts =
                examService.getAttemptsByExamCode(examCode, auth);

        return success("Exam attempts fetched", attempts);
    }

    // =========================================================
    // ANALYTICS
    // =========================================================
    @GetMapping("/{examCode}/analytics")
    public ResponseEntity<Map<String, Object>> getExamAnalytics(
            @PathVariable String examCode,
            Authentication auth) {

        Map<String, Object> analytics =
                examService.getExamAnalytics(examCode, auth);

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

    private Question upsertQuestion(String examCode, Question question, Long questionId, Authentication auth) {
        Exam exam = examService.getExamByCodeForActor(examCode, auth);

        Question target = questionId == null
                ? new Question()
                : questionRepository.findById(questionId)
                        .orElseThrow(() -> new RuntimeException("Question not found"));

        if (question.getQuestionType() == null) {
            throw new IllegalArgumentException("Question type is required");
        }
        if (question.getQuestionText() == null || question.getQuestionText().trim().isEmpty()) {
            throw new IllegalArgumentException("Question text is required");
        }
        if (question.getMarks() == null || question.getMarks() <= 0) {
            throw new IllegalArgumentException("Marks must be greater than zero");
        }

        target.setExamCode(exam.getExamCode());
        target.setQuestionType(question.getQuestionType());
        target.setDifficulty(normalizeDifficulty(question.getDifficulty()));
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
        validateQuestionIntegrity(target, "Question payload");

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
        r.setDifficulty(normalizeDifficultyLabel(q.getDifficulty()));
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

        String questionText = payloadText(payload, "questionText", "question", "Question", "Question Text", "question_text", "prompt");
        if (questionText.isBlank()) {
            throw new IllegalArgumentException("Row " + rowNumber + ": question text is required");
        }
        question.setQuestionText(questionText);

        String typeValue = payloadText(payload, "questionType", "question_type", "Question Type", "Type");
        if (typeValue.isBlank()) {
            throw new IllegalArgumentException("Row " + rowNumber + ": question type is required");
        }
        question.setQuestionType(parseQuestionType(typeValue, rowNumber));

        String topic = payloadText(payload, "topic", "Topic", "section", "Section", "subject", "Subject");
        question.setTopic(topic.isBlank() ? "general" : topic);

        String difficulty = payloadText(payload, "difficulty", "Difficulty", "level", "Level");
        question.setDifficulty(normalizeDifficulty(difficulty.isBlank() ? "Easy" : difficulty));

        Integer marks = integerValue(firstNonNull(
                payload.get("marks"),
                payload.get("Marks"),
                payload.get("score"),
                payload.get("Score"),
                payload.get("points"),
                payload.get("Points")
        ));
        if (marks == null || marks <= 0) {
            throw new IllegalArgumentException("Row " + rowNumber + ": marks must be greater than zero");
        }
        question.setMarks(marks);

        question.setOptionA(payloadText(payload, "optionA", "Option A", "OptionA", "Choice A", "ChoiceA", "A", "Option 1", "Option1", "opt_a"));
        question.setOptionB(payloadText(payload, "optionB", "Option B", "OptionB", "Choice B", "ChoiceB", "B", "Option 2", "Option2", "opt_b"));
        question.setOptionC(payloadText(payload, "optionC", "Option C", "OptionC", "Choice C", "ChoiceC", "C", "Option 3", "Option3", "opt_c"));
        question.setOptionD(payloadText(payload, "optionD", "Option D", "OptionD", "Choice D", "ChoiceD", "D", "Option 4", "Option4", "opt_d"));
        question.setOptionE(payloadText(payload, "optionE", "Option E", "OptionE", "Choice E", "ChoiceE", "E", "Option 5", "Option5", "opt_e"));
        question.setOptionF(payloadText(payload, "optionF", "Option F", "OptionF", "Choice F", "ChoiceF", "F", "Option 6", "Option6", "opt_f"));
        if (nonBlankCount(
                question.getOptionA(),
                question.getOptionB(),
                question.getOptionC(),
                question.getOptionD(),
                question.getOptionE(),
                question.getOptionF()) == 0) {
            List<String> options = optionsFromPayload(payload);
            if (!options.isEmpty()) {
                question.setOptionA(optionAt(options, 0));
                question.setOptionB(optionAt(options, 1));
                question.setOptionC(optionAt(options, 2));
                question.setOptionD(optionAt(options, 3));
                question.setOptionE(optionAt(options, 4));
                question.setOptionF(optionAt(options, 5));
            }
        }
        question.setCorrectAnswer(payloadText(payload, "correctAnswer", "Correct Answer", "CorrectAnswer", "answer", "Answer", "correct", "Correct"));
        question.setSampleInput(payloadText(payload, "sampleInput", "Sample Input", "SampleInput", "input", "Input"));
        question.setSampleOutput(payloadText(payload, "sampleOutput", "Sample Output", "SampleOutput", "output", "Output"));
        question.setShuffleOptions(booleanValue(payload.get("shuffleOptions"), false));
        question.setDisplayOrder(integerValue(payload.get("displayOrder")));
        question.setShuffleGroup(stringValue(payload.get("shuffleGroup")));
        validateQuestionIntegrity(question, "Row " + rowNumber);

        return question;
    }

    private QuestionType parseQuestionType(String value, int rowNumber) {
        String normalized = normalizeForMatch(value);
        if (normalized.equals("shortanswer") || normalized.equals("descriptive")) {
            return QuestionType.DESCRIPTIVE;
        }
        if (normalized.equals("coding")) {
            return QuestionType.CODING;
        }
        if (normalized.equals("mcq") || normalized.equals("multiplechoice")) {
            return QuestionType.MCQ;
        }
        throw new IllegalArgumentException("Row " + rowNumber + ": invalid question type '" + value + "'");
    }

    private String normalizeDifficulty(String value) {
        String raw = value == null ? "" : value.trim();
        if (raw.isBlank()) return "Easy";
        String normalized = raw.toUpperCase(Locale.ROOT);
        if (normalized.equals("EASY")) return "Easy";
        if (normalized.equals("MEDIUM")) return "Medium";
        if (normalized.equals("DIFFICULT") || normalized.equals("HARD")) return "Hard";
        throw new IllegalArgumentException("Invalid difficulty '" + value + "'. Allowed: Easy, Medium, Hard");
    }

    private String normalizeDifficultyLabel(String value) {
        try {
            return normalizeDifficulty(value);
        } catch (IllegalArgumentException ex) {
            return value;
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String payloadText(Map<String, Object> payload, String... keys) {
        Object[] values = new Object[keys.length];
        for (int i = 0; i < keys.length; i++) {
            values[i] = payload.get(keys[i]);
        }
        return stringValue(firstNonNull(values));
    }

    private Integer integerValue(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) {
            return number.intValue();
        }
        String text = String.valueOf(value).trim();
        if (text.isBlank()) return null;
        try {
            return Integer.valueOf(text);
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
        String normalizedSelected = normalizeForMatch(selected);
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
            String normalizedFileCode = normalizeForMatch(fileCode);
            seen.add(fileCode.trim());
            if (!normalizedFileCode.equals(normalizedSelected)) {
                throw new IllegalArgumentException("Exam code mismatch. Selected " + selected + ", but the file contains " + fileCode);
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

    private String normalizeForMatch(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private void validateQuestionIntegrity(Question question, String context) {
        if (question == null || question.getQuestionType() == null) {
            return;
        }
        if (question.getQuestionType() != QuestionType.MCQ) {
            return;
        }
        int mcqOptionCount = nonBlankCount(
                question.getOptionA(),
                question.getOptionB(),
                question.getOptionC(),
                question.getOptionD(),
                question.getOptionE(),
                question.getOptionF()
        );
        if (mcqOptionCount < 2) {
            throw new IllegalArgumentException(context + ": MCQ must have at least 2 options");
        }
        if (stringValue(question.getCorrectAnswer()).isBlank()) {
            throw new IllegalArgumentException(context + ": MCQ correct answer is required");
        }
    }

    private int nonBlankCount(String... values) {
        int count = 0;
        for (String value : values) {
            if (!stringValue(value).isBlank()) {
                count += 1;
            }
        }
        return count;
    }

    @SuppressWarnings("unchecked")
    private List<String> optionsFromPayload(Map<String, Object> payload) {
        Object raw = firstNonNull(payload.get("options"), payload.get("allOptions"));
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .map(this::stringValue)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());
    }

    private String optionAt(List<String> options, int index) {
        if (options == null || index < 0 || index >= options.size()) {
            return "";
        }
        return stringValue(options.get(index));
    }
}
