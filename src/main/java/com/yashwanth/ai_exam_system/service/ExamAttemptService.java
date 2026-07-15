package com.yashwanth.ai_exam_system.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yashwanth.ai_exam_system.dto.ExamResultResponse;
import com.yashwanth.ai_exam_system.dto.ExamTimerResponse;
import com.yashwanth.ai_exam_system.dto.QuestionPaletteResponse;
import com.yashwanth.ai_exam_system.dto.StudentAnswerResponse;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamRegistration;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.exception.BadRequestException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRegistrationRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import com.yashwanth.ai_exam_system.repository.StudentAnswerRepository;

@Service
@Transactional
public class ExamAttemptService {

    private final ExamAttemptRepository attemptRepository;
    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final ExamEvaluationService evaluationService;
    private final ExamRepository examRepository;
    private final ExamRegistrationRepository examRegistrationRepository;
    private final ExamResultRepository resultRepository;
    private final ExamQuestionSelectionService questionSelectionService;
    private final CertificateService certificateService;

    public ExamAttemptService(
            ExamAttemptRepository attemptRepository,
            StudentAnswerRepository answerRepository,
            QuestionRepository questionRepository,
            @Lazy ExamEvaluationService evaluationService,
            ExamRepository examRepository,
            ExamRegistrationRepository examRegistrationRepository,
            ExamResultRepository resultRepository,
            ExamQuestionSelectionService questionSelectionService,
            @Lazy CertificateService certificateService) {

        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
        this.evaluationService = evaluationService;
        this.examRepository = examRepository;
        this.examRegistrationRepository = examRegistrationRepository;
        this.resultRepository = resultRepository;
        this.questionSelectionService = questionSelectionService;
        this.certificateService = certificateService;
    }

    // ================= START EXAM =================
    public ExamAttempt startExam(Long studentId, String examCode) {

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
        if (!exam.isPublished() || !exam.isActive()) {
            throw new BadRequestException("Exam is not available for attempts");
        }
        boolean registered = examRegistrationRepository.findByStudentIdAndExamCodeAndActiveTrue(studentId, examCode)
                .isPresent();
        if (!registered) {
            throw new BadRequestException("Please register for the exam first");
        }
        List<Question> selectedQuestions = questionSelectionService.selectQuestionsForExam(exam, studentId, null);
        if (selectedQuestions.isEmpty()) {
            throw new BadRequestException("No active questions found for this exam");
        }

        LocalDateTime now = LocalDateTime.now();
        if (exam.getStartTime() != null) {
            if (now.isBefore(exam.getStartTime())) {
                throw new BadRequestException("Exam can be started only at the scheduled start time");
            }
        }
        if (exam.getEndTime() != null && now.isAfter(exam.getEndTime())) {
            throw new BadRequestException("Exam window is closed");
        }

        Optional<ExamAttempt> active = attemptRepository.findActiveAttempt(
                studentId,
                examCode,
                AttemptStatus.STARTED);

        if (active.isPresent()) {
            ExamAttempt activeAttempt = active.get();
            if (activeAttempt.isActive()) {
                return activeAttempt;
            }
            activeAttempt.setStatus(AttemptStatus.EXPIRED);
            activeAttempt.setActive(false);
            activeAttempt.setEndTime(activeAttempt.getExpiryTime() != null ? activeAttempt.getExpiryTime() : now);
            activeAttempt.setTimeTakenSeconds(activeAttempt.getStartTime() != null && activeAttempt.getEndTime() != null
                    ? Duration.between(activeAttempt.getStartTime(), activeAttempt.getEndTime()).getSeconds()
                    : activeAttempt.getTimeTakenSeconds());
            attemptRepository.save(activeAttempt);
        }

        long previousAttempts = attemptRepository.countByStudentIdAndExamCode(studentId, examCode);
        int maxAttempts = exam.getMaxAttempts() == null || exam.getMaxAttempts() <= 0 ? 1 : exam.getMaxAttempts();
        if (previousAttempts >= maxAttempts) {
            throw new BadRequestException("Maximum exam attempts reached");
        }

        ExamAttempt attempt = new ExamAttempt();
        attempt.setStudentId(studentId);
        attempt.setExamCode(examCode);
        attempt.setExamId(exam.getId());
        attempt.setActive(true);
        attempt.setCancelled(false);

        attempt.setStartTime(now);
        int durationMinutes = exam.getDurationMinutes() == null || exam.getDurationMinutes() <= 0
                ? 60
                : exam.getDurationMinutes();
        LocalDateTime expiryTime = now.plusMinutes(durationMinutes);
        if (exam.getEndTime() != null && exam.getEndTime().isBefore(expiryTime)) {
            expiryTime = exam.getEndTime();
        }

        attempt.setDurationMinutes(durationMinutes);
        attempt.setExpiryTime(expiryTime);
        attempt.setAttemptNumber((int) previousAttempts + 1);
        attempt.setLastAiCheckTime(now);

        attempt.setStatus(AttemptStatus.STARTED);

        return attemptRepository.save(attempt);
    }

    // ================= SAVE ANSWER =================
    public void submitAnswer(com.yashwanth.ai_exam_system.dto.SubmitAnswerRequest request) {
        Long attemptId = request.getAttemptId();
        Long questionId = request.getQuestionId();
        String answer = request.getAnswer();
        Boolean markForReview = request.getMarkForReview();

        ExamAttempt attempt = getAttempt(attemptId);

        if (attempt.getStatus() != AttemptStatus.STARTED
                || Boolean.TRUE.equals(attempt.getCancelled())) {
            throw new RuntimeException("Exam not active");
        }
        if (attempt.getExpiryTime() != null && attempt.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Exam time expired");
        }

        StudentAnswer studentAnswer = answerRepository.findByAttemptIdAndQuestionId(attemptId, questionId)
                .orElseGet(() -> {
                    StudentAnswer sa = new StudentAnswer();
                    sa.setAttemptId(attemptId);
                    sa.setQuestionId(questionId);
                    return sa;
                });

        studentAnswer.setAnswer(answer);

        if (Boolean.TRUE.equals(markForReview)) {
            studentAnswer.setStatus("MARKED_FOR_REVIEW");
            studentAnswer.setReviewMarked(true);
        } else if (answer == null || answer.isEmpty()) {
            studentAnswer.setStatus("NOT_ANSWERED");
            studentAnswer.setReviewMarked(false);
        } else {
            studentAnswer.setStatus("ANSWERED");
            studentAnswer.setReviewMarked(false);
        }

        // Save additional production metadata
        if (request.getVisited() != null) {
            studentAnswer.setVisited(request.getVisited());
        }
        if (request.getAutoSaved() != null) {
            studentAnswer.setAutoSaved(request.getAutoSaved());
        }
        if (request.getTimeSpentSeconds() != null) {
            studentAnswer.setTimeSpentSeconds(request.getTimeSpentSeconds());
        }
        if (request.getAnswerChanged() != null) {
            studentAnswer.setAnswerChanged(request.getAnswerChanged());
        }
        if (request.getTabSwitchCount() != null) {
            studentAnswer.setTabSwitchCount(request.getTabSwitchCount());
        }
        if (request.getFullscreenExitCount() != null) {
            studentAnswer.setFullscreenExitCount(request.getFullscreenExitCount());
        }
        if (request.getCodingLanguage() != null) {
            studentAnswer.setCodingLanguage(request.getCodingLanguage());
        }
        if (request.getCodeAnswer() != null) {
            studentAnswer.setCodeAnswer(request.getCodeAnswer());
        }

        // Set difficulty and topic from question details if possible
        questionRepository.findById(questionId).ifPresent(q -> {
            if (q.getDifficultyLevel() != null) {
                studentAnswer.setDifficulty(q.getDifficultyLevel().toString());
            }
            studentAnswer.setTopic(q.getTopic());
        });

        studentAnswer.setLastUpdated(LocalDateTime.now());
        answerRepository.save(studentAnswer);
    }

    // ================= GENERATE RESULT =================
    public ExamResultResponse generateResult(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        // Try to fetch existing result first to avoid redundant evaluation
        Optional<ExamResult> existingResult = resultRepository.findByAttemptId(attemptId);

        ExamResult result;
        if (existingResult.isPresent()) {
            result = existingResult.get();
        } else {
            result = evaluationService.evaluateExam(
                    attemptId,
                    attempt.getStudentId(),
                    attempt.getExamCode());
        }

        Exam exam = examRepository.findByExamCode(attempt.getExamCode())
                .orElseThrow(() -> new RuntimeException("Exam not found"));
        List<Question> questions = questionSelectionService.selectQuestionsForExam(exam, attempt.getStudentId(), attempt.getId());

        int totalMarks = questions.stream()
                .mapToInt(q -> q.getMarks() == null ? 0 : q.getMarks())
                .sum();

        int obtainedMarks = (int) result.getScore();

        long timeTaken = attempt.getTimeTakenSeconds() != null && attempt.getTimeTakenSeconds() > 0
                ? attempt.getTimeTakenSeconds()
                : Duration.between(attempt.getStartTime(), LocalDateTime.now()).getSeconds();

        attempt.setTimeTakenSeconds(timeTaken);
        attempt.setObtainedMarks(obtainedMarks);
        attempt.setTotalMarks(totalMarks);
        if (attempt.getEndTime() == null) {
            attempt.setEndTime(LocalDateTime.now());
        }
        attempt.setStatus(AttemptStatus.EVALUATED);

        attemptRepository.save(attempt);

        if (Boolean.TRUE.equals(result.getPassed())) {
            double certificateScore = result.getPercentage();
            if (certificateScore <= 0) {
                certificateScore = result.getScore();
            }
            try {
                certificateService.ensureCertificateIssued(
                        attempt.getStudentId(),
                        attempt.getExamCode(),
                        exam.getTitle(),
                        certificateScore,
                        "");
            } catch (Exception ignored) {
                // Certificate issuance is best-effort here; the UI will still load the result.
            }
        }

        ExamResultResponse response = new ExamResultResponse();
        response.setAttemptId(attempt.getId());
        response.setStudentId(attempt.getStudentId());
        response.setExamCode(attempt.getExamCode());
        response.setTotalMarks(totalMarks);
        response.setObtainedMarks(obtainedMarks);
        response.setPercentage(result.getPercentage());
        response.setResult(result.getResultStatus());
        response.setResultStatus(result.getResultStatus());
        response.setTotalQuestions(result.getTotalQuestions());
        response.setCorrectAnswers(result.getCorrectAnswers());
        response.setWrongAnswers(result.getWrongAnswers());
        response.setUnansweredQuestions(result.getUnansweredQuestions());
        response.setEasyCorrect(result.getEasyCorrect());
        response.setMediumCorrect(result.getMediumCorrect());
        response.setDifficultCorrect(result.getDifficultCorrect());
        response.setEasyWrong(result.getEasyWrong());
        response.setMediumWrong(result.getMediumWrong());
        response.setDifficultWrong(result.getDifficultWrong());
        response.setGrade(result.getGrade());
        response.setTimeTakenSeconds(timeTaken);
        response.setPassed(result.getPassed());
        response.setStartedAt(attempt.getStartTime());
        response.setSubmittedAt(result.getSubmittedAt());
        response.setEvaluatedAt(result.getEvaluatedAt());
        response.setCreatedAt(attempt.getCreatedAt());

        return response;
    }

    // ================= QUESTION PALETTE =================
    public List<QuestionPaletteResponse> getPalette(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        Exam exam = examRepository.findByExamCode(attempt.getExamCode())
                .orElseThrow(() -> new RuntimeException("Exam not found"));
        List<Question> questions = questionSelectionService.selectQuestionsForExam(exam, attempt.getStudentId(), attempt.getId());

        List<StudentAnswer> answers = answerRepository.findByAttemptId(attemptId);

        Map<Long, String> statusMap = new HashMap<>();

        for (StudentAnswer a : answers) {
            statusMap.put(a.getQuestionId(), a.getStatus());
        }

        List<QuestionPaletteResponse> palette = new ArrayList<>();

        for (Question q : questions) {
            String status = statusMap.getOrDefault(
                    q.getId(),
                    "NOT_VISITED");
            palette.add(new QuestionPaletteResponse(q.getId(), status));
        }

        return palette;
    }

    public List<StudentAnswerResponse> getAnswers(Long attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);

        return answerRepository.findByAttemptId(attemptId).stream()
                .map(answer -> new StudentAnswerResponse(
                        answer.getQuestionId(),
                        answer.getAnswer(),
                        answer.getStatus(),
                        answer.getReviewMarked()))
                .toList();
    }

    public List<Map<String, Object>> getReviewData(Long attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);
        Exam exam = examRepository.findByExamCode(attempt.getExamCode())
                .orElseThrow(() -> new RuntimeException("Exam not found"));
        List<Question> questions = questionSelectionService.selectQuestionsForExam(exam, attempt.getStudentId(), attempt.getId());
        List<StudentAnswer> answers = answerRepository.findByAttemptId(attemptId);

        Map<Long, StudentAnswer> answerMap = new HashMap<>();
        for (StudentAnswer a : answers) {
            answerMap.put(a.getQuestionId(), a);
        }

        List<Map<String, Object>> list = new ArrayList<>();
        for (Question q : questions) {
            StudentAnswer sa = answerMap.get(q.getId());
            Map<String, Object> map = new HashMap<>();
            map.put("id", q.getId());
            map.put("questionText", q.getQuestionText());
            map.put("optionA", q.getOptionA());
            map.put("optionB", q.getOptionB());
            map.put("optionC", q.getOptionC());
            map.put("optionD", q.getOptionD());
            map.put("optionE", q.getOptionE());
            map.put("optionF", q.getOptionF());
            map.put("questionType", q.getQuestionType() != null ? q.getQuestionType().name() : "MCQ");
            map.put("difficulty", q.getDifficulty());
            map.put("marks", q.getMarks());
            map.put("topic", q.getTopic());
            map.put("explanation", q.getExplanation());
            map.put("correctAnswer", q.getCorrectAnswer());
            map.put("studentAnswer", sa != null ? sa.getAnswer() : null);
            map.put("reviewMarked", sa != null && Boolean.TRUE.equals(sa.getReviewMarked()));
            map.put("timeSpentSeconds", sa != null && sa.getTimeSpentSeconds() != null
                    ? sa.getTimeSpentSeconds()
                    : Long.valueOf(0L));

            String status = "SKIPPED";
            if (sa != null && sa.getAnswer() != null && !sa.getAnswer().trim().isEmpty()) {
                boolean isCorrect = q.getCorrectAnswer() != null && sa.getAnswer().trim().equalsIgnoreCase(q.getCorrectAnswer().trim());
                status = isCorrect ? "CORRECT" : "WRONG";
            }
            map.put("status", status);
            list.add(map);
        }
        return list;
    }

    // ================= TIMER =================
    public ExamTimerResponse getTimer(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        long totalSeconds = attempt.getDurationMinutes() * 60;

        long remainingSeconds = Duration.between(LocalDateTime.now(), attempt.getExpiryTime())
                .getSeconds();

        if (remainingSeconds < 0)
            remainingSeconds = 0;

        long elapsed = totalSeconds - remainingSeconds;

        ExamTimerResponse response = new ExamTimerResponse();
        response.setRemainingSeconds(remainingSeconds);
        response.setTotalSeconds(totalSeconds);
        response.setElapsedSeconds(elapsed);
        response.setStatus(remainingSeconds == 0 ? "EXPIRED" : "RUNNING");
        response.setAutoSubmit(remainingSeconds == 0);

        return response;
    }

    // ================= HELPERS =================
    public ExamAttempt getAttempt(Long attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));
    }

    public void cancelAttempt(Long attemptId, String reason) {
        ExamAttempt attempt = getAttempt(attemptId);
        attempt.markCancelled(reason);
        attemptRepository.save(attempt);
    }

    public void updateHeartbeat(Long attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);
        attempt.setLastAiCheckTime(LocalDateTime.now());
        attemptRepository.save(attempt);
    }

    public void markForReview(Long attemptId, Long questionId) {

        answerRepository.findByAttemptIdAndQuestionId(attemptId, questionId)
                .ifPresent(answer -> {
                    answer.setReviewMarked(true);
                    answer.setStatus("MARKED_FOR_REVIEW");
                    answerRepository.save(answer);
                });
    }
}
