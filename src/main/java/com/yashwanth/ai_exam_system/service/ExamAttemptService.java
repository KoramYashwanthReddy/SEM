package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class ExamAttemptService {

    private final ExamAttemptRepository attemptRepository;
    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final ExamEvaluationService evaluationService;
    private final ExamRepository examRepository;

    public ExamAttemptService(
            ExamAttemptRepository attemptRepository,
            StudentAnswerRepository answerRepository,
            QuestionRepository questionRepository,
            ExamEvaluationService evaluationService,
            ExamRepository examRepository) {

        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
        this.evaluationService = evaluationService;
        this.examRepository = examRepository;
    }

    // ================= START EXAM =================
    public ExamAttempt startExam(Long studentId, String examCode) {

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        Optional<ExamAttempt> active =
                attemptRepository.findActiveAttempt(
                        studentId,
                        examCode,
                        AttemptStatus.STARTED
                );

        if (active.isPresent()) {
            return active.get();
        }

        LocalDateTime now = LocalDateTime.now();

        ExamAttempt attempt = new ExamAttempt();
        attempt.setStudentId(studentId);
        attempt.setExamCode(examCode);
        attempt.setExamId(exam.getId());

        attempt.setStartTime(now);
        attempt.setDurationMinutes(exam.getDurationMinutes());
        attempt.setExpiryTime(now.plusMinutes(exam.getDurationMinutes()));

        attempt.setStatus(AttemptStatus.STARTED);

        return attemptRepository.save(attempt);
    }

    // ================= SAVE ANSWER =================
    public void submitAnswer(Long attemptId, Long questionId,
                             String answer, Boolean markForReview) {

        ExamAttempt attempt = getAttempt(attemptId);

        if (!attempt.isActive()) {
            throw new RuntimeException("Exam not active");
        }

        StudentAnswer studentAnswer =
                answerRepository.findByAttemptIdAndQuestionId(attemptId, questionId)
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
        } else {
            studentAnswer.setStatus("ANSWERED");
        }

        studentAnswer.setLastUpdated(LocalDateTime.now());
        answerRepository.save(studentAnswer);
    }

    // ================= GENERATE RESULT =================
    public ExamResultResponse generateResult(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        ExamResult result = evaluationService.evaluateExam(
                attemptId,
                attempt.getStudentId(),
                attempt.getExamCode()
        );

        List<Question> questions =
                questionRepository.findByExamCode(attempt.getExamCode());

        int totalMarks = questions.stream()
                .mapToInt(q -> q.getMarks() == null ? 0 : q.getMarks())
                .sum();

        int obtainedMarks = (int) result.getScore();

        long timeTaken = Duration.between(
                attempt.getStartTime(),
                LocalDateTime.now()
        ).getSeconds();

        attempt.setTimeTakenSeconds(timeTaken);
        attempt.setObtainedMarks(obtainedMarks);
        attempt.setTotalMarks(totalMarks);
        attempt.setEndTime(LocalDateTime.now());
        attempt.setStatus(AttemptStatus.EVALUATED);

        attemptRepository.save(attempt);

        ExamResultResponse response = new ExamResultResponse();
        response.setTotalMarks(totalMarks);
        response.setObtainedMarks(obtainedMarks);
        response.setPercentage(result.getPercentage());
        response.setResult(result.getResultStatus());
        response.setTimeTakenSeconds(timeTaken);
        response.setPassed(result.getPassed());

        return response;
    }

    // ================= QUESTION PALETTE =================
    public List<QuestionPaletteResponse> getPalette(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        List<Question> questions =
                questionRepository.findByExamCode(attempt.getExamCode());

        List<StudentAnswer> answers =
                answerRepository.findByAttemptId(attemptId);

        Map<Long, String> statusMap = new HashMap<>();

        for (StudentAnswer a : answers) {
            statusMap.put(a.getQuestionId(), a.getStatus());
        }

        List<QuestionPaletteResponse> palette = new ArrayList<>();

        for (Question q : questions) {
            String status = statusMap.getOrDefault(
                    q.getId(),
                    "NOT_VISITED"
            );
            palette.add(new QuestionPaletteResponse(q.getId(), status));
        }

        return palette;
    }

    // ================= TIMER =================
    public ExamTimerResponse getTimer(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        long totalSeconds = attempt.getDurationMinutes() * 60;

        long remainingSeconds =
                Duration.between(LocalDateTime.now(), attempt.getExpiryTime())
                        .getSeconds();

        if (remainingSeconds < 0) remainingSeconds = 0;

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