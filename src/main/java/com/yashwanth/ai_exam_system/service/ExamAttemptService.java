package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.repository.*;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ExamAttemptService {

    private final ExamAttemptRepository attemptRepository;
    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final ExamEvaluationService evaluationService;

    public ExamAttemptService(
            ExamAttemptRepository attemptRepository,
            StudentAnswerRepository answerRepository,
            QuestionRepository questionRepository,
            ExamEvaluationService evaluationService) {

        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
        this.evaluationService = evaluationService;
    }

    // START EXAM
    public ExamAttempt startExam(Long studentId, String examCode) {

        ExamAttempt attempt = new ExamAttempt();

        attempt.setStudentId(studentId);
        attempt.setExamCode(examCode);
        attempt.setStartTime(LocalDateTime.now());

        int duration = 60;
        attempt.setDurationMinutes(duration);
        attempt.setExpiryTime(LocalDateTime.now().plusMinutes(duration));
        attempt.setStatus("STARTED");

        return attemptRepository.save(attempt);
    }

    // SAVE / UPDATE ANSWER
    public void submitAnswer(Long attemptId, Long questionId, String answer, Boolean markForReview) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if (!"STARTED".equals(attempt.getStatus())) {
            throw new RuntimeException("Exam already finished");
        }

        if (LocalDateTime.now().isAfter(attempt.getExpiryTime())) {
            throw new RuntimeException("Exam time is over");
        }

        questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        Optional<StudentAnswer> optionalAnswer =
                answerRepository.findByAttemptIdAndQuestionId(attemptId, questionId);

        StudentAnswer studentAnswer = optionalAnswer.orElseGet(() -> {
            StudentAnswer sa = new StudentAnswer();
            sa.setAttemptId(attemptId);
            sa.setQuestionId(questionId);
            return sa;
        });

        studentAnswer.setAnswer(answer);

        if (Boolean.TRUE.equals(markForReview)) {
            studentAnswer.setStatus("MARKED_FOR_REVIEW");
            studentAnswer.setReviewMarked(true);
        } else {
            studentAnswer.setStatus("ANSWERED");
            studentAnswer.setReviewMarked(false);
        }

        studentAnswer.setLastUpdated(LocalDateTime.now());

        answerRepository.save(studentAnswer);
    }

    // GENERATE RESULT
    public ExamResultResponse generateResult(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        // evaluate answers
        ExamResult result = evaluationService.evaluateExam(
                attemptId,
                attempt.getStudentId(),
                attempt.getExamCode()
        );

        // calculate total marks from questions
        List<Question> questions =
                questionRepository.findByExamCode(attempt.getExamCode());

        int totalMarks = questions.stream()
                .mapToInt(q -> q.getMarks() == null ? 0 : q.getMarks())
                .sum();

        int obtainedMarks = (int) result.getScore();

        ExamResultResponse response = new ExamResultResponse();
        response.setTotalMarks(totalMarks);
        response.setObtainedMarks(obtainedMarks);
        response.setPercentage(result.getPercentage());
        response.setResult(result.getResultStatus());

        attempt.setObtainedMarks(obtainedMarks);
        attempt.setTotalMarks(totalMarks);
        attempt.setEndTime(LocalDateTime.now());
        attempt.setStatus("EVALUATED");

        attemptRepository.save(attempt);

        return response;
    }

    // QUESTION PALETTE
    public List<QuestionPaletteResponse> getPalette(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

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

            palette.add(
                    new QuestionPaletteResponse(q.getId(), status)
            );
        }

        return palette;
    }

    // TIMER
    public ExamTimerResponse getTimer(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        long remainingSeconds =
                Duration.between(LocalDateTime.now(), attempt.getExpiryTime())
                        .getSeconds();

        if (remainingSeconds < 0) remainingSeconds = 0;

        return new ExamTimerResponse(remainingSeconds);
    }
}