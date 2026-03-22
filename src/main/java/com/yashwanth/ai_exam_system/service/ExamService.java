package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamStatus;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ExamService {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final CheatingDetectionService cheatingDetectionService;

    public ExamService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            CheatingDetectionService cheatingDetectionService) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.cheatingDetectionService = cheatingDetectionService;
    }

    // ================= CREATE =================

    public Exam createExam(ExamRequest request, Authentication auth) {

        if (request.getStartTime() != null && request.getEndTime() != null &&
                request.getEndTime().isBefore(request.getStartTime())) {
            throw new RuntimeException("End time must be after start time");
        }

        int totalDifficultyQuestions =
                Optional.ofNullable(request.getEasyQuestionCount()).orElse(0) +
                Optional.ofNullable(request.getMediumQuestionCount()).orElse(0) +
                Optional.ofNullable(request.getDifficultQuestionCount()).orElse(0);

        if (totalDifficultyQuestions <= 0) {
            throw new RuntimeException("At least one question required");
        }

        Exam exam = new Exam();

        exam.setExamCode("EXAM-" + UUID.randomUUID().toString().substring(0, 8));
        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setSubject(request.getSubject());
        exam.setDurationMinutes(request.getDurationMinutes());
        exam.setTotalMarks(request.getTotalMarks());
        exam.setPassingMarks(request.getPassingMarks());
        exam.setMaxAttempts(request.getMaxAttempts());

        exam.setMarksPerQuestion(request.getMarksPerQuestion());
        exam.setNegativeMarks(request.getNegativeMarks());

        exam.setShuffleQuestions(request.getShuffleQuestions());
        exam.setShuffleOptions(request.getShuffleOptions());

        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());

        exam.setEasyQuestionCount(request.getEasyQuestionCount());
        exam.setMediumQuestionCount(request.getMediumQuestionCount());
        exam.setDifficultQuestionCount(request.getDifficultQuestionCount());

        exam.setCreatedBy(auth.getName());
        exam.setCreatedAt(LocalDateTime.now());
        exam.setUpdatedAt(LocalDateTime.now());

        exam.setStatus(ExamStatus.DRAFT);
        exam.setQuestionsUploaded(false);

        exam.setMcqCount(0);
        exam.setCodingCount(0);
        exam.setDescriptiveCount(0);

        exam.setActive(true);

        return examRepository.save(exam);
    }

    // ================= GET =================

    public Exam getExamByCode(String examCode) {
        return examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
    }

    public List<Exam> getTeacherExams(Authentication auth) {
        return examRepository.findByCreatedBy(auth.getName());
    }

    // ================= UPDATE =================

    public Exam updateExam(String examCode, ExamRequest request) {

        Exam exam = getExamByCode(examCode);

        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setSubject(request.getSubject());
        exam.setDurationMinutes(request.getDurationMinutes());
        exam.setTotalMarks(request.getTotalMarks());
        exam.setPassingMarks(request.getPassingMarks());

        exam.setMarksPerQuestion(request.getMarksPerQuestion());
        exam.setNegativeMarks(request.getNegativeMarks());

        exam.setShuffleQuestions(request.getShuffleQuestions());
        exam.setShuffleOptions(request.getShuffleOptions());

        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());

        exam.setEasyQuestionCount(request.getEasyQuestionCount());
        exam.setMediumQuestionCount(request.getMediumQuestionCount());
        exam.setDifficultQuestionCount(request.getDifficultQuestionCount());

        exam.setUpdatedAt(LocalDateTime.now());

        return examRepository.save(exam);
    }

    // ================= DELETE =================

    public void deleteExamByTeacher(String examCode) {

        Exam exam = getExamByCode(examCode);
        exam.setActive(false);
        examRepository.save(exam);
    }

    // ================= PUBLISH =================

    public Exam publishExam(String examCode) {

        Exam exam = getExamByCode(examCode);

        if (!exam.getQuestionsUploaded()) {
            throw new RuntimeException("Upload questions before publishing exam");
        }

        exam.setStatus(ExamStatus.PUBLISHED);
        exam.setUpdatedAt(LocalDateTime.now());

        return examRepository.save(exam);
    }

    // ================= ATTEMPTS =================

    public List<ExamAttempt> getAttemptsByExamCode(String examCode) {
        return attemptRepository.findByExamCode(examCode);
    }

    // ================= ANALYTICS =================

    public Map<String, Object> getExamAnalytics(String examCode) {

        List<ExamAttempt> attempts = attemptRepository.findByExamCode(examCode);

        long total = attempts.size();

        long completed = attempts.stream()
                .filter(a -> "SUBMITTED".equals(a.getStatus()))
                .count();

        long cancelled = attempts.stream()
                .filter(a -> "INVALIDATED".equals(a.getStatus()))
                .count();

        long flagged = attempts.stream()
                .filter(a -> "FLAGGED".equals(a.getStatus()))
                .count();

        long passed = attempts.stream()
                .filter(a -> a.getPercentage() != null && a.getPercentage() >= 40)
                .count();

        double avgScore = attempts.stream()
                .filter(a -> a.getScore() != null)
                .mapToDouble(ExamAttempt::getScore)
                .average()
                .orElse(0.0);

        double avgPercentage = attempts.stream()
                .filter(a -> a.getPercentage() != null)
                .mapToDouble(ExamAttempt::getPercentage)
                .average()
                .orElse(0.0);

        double avgTime = attempts.stream()
                .filter(a -> a.getTimeTakenSeconds() != null)
                .mapToLong(ExamAttempt::getTimeTakenSeconds)
                .average()
                .orElse(0.0);

        Map<String, Object> map = new HashMap<>();
        map.put("totalAttempts", total);
        map.put("completed", completed);
        map.put("cancelled", cancelled);
        map.put("flagged", flagged);
        map.put("passed", passed);
        map.put("averageScore", avgScore);
        map.put("averagePercentage", avgPercentage);
        map.put("averageTimeSeconds", avgTime);

        return map;
    }

    // ================= SUBMIT =================

    public String submitExam(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if ("SUBMITTED".equals(attempt.getStatus()) ||
                "INVALIDATED".equals(attempt.getStatus())) {
            return "Exam already completed";
        }

        attempt.setStatus("SUBMITTED");
        attempt.setEndTime(LocalDateTime.now());

        if (attempt.getStartTime() != null) {
            long timeTaken = Duration.between(
                    attempt.getStartTime(),
                    LocalDateTime.now()
            ).getSeconds();

            attempt.setTimeTakenSeconds(timeTaken);
        }

        attemptRepository.save(attempt);

        cheatingDetectionService.analyzeAttempt(attemptId);

        return "Exam submitted successfully";
    }

    // ================= CANCEL =================

    public void cancelExam(Long examId, Long studentId, String reason) {

        ExamAttempt attempt = attemptRepository
                .findByExamIdAndStudentId(examId, studentId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if ("INVALIDATED".equals(attempt.getStatus())) {
            return;
        }

        attempt.setStatus("INVALIDATED");
        attempt.setEndTime(LocalDateTime.now());
        attempt.setRemarks("Cancelled due to cheating: " + reason);

        attemptRepository.save(attempt);
    }

    // ================= NEW FEATURES =================

    public ExamAttempt getAttempt(Long attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));
    }

    public void cancelAttempt(Long attemptId, String reason) {
        ExamAttempt attempt = getAttempt(attemptId);
        attempt.setStatus("INVALIDATED");
        attempt.setRemarks(reason);
        attempt.setEndTime(LocalDateTime.now());
        attemptRepository.save(attempt);
    }

    public void updateHeartbeat(Long attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);
        attempt.setLastAiCheckTime(LocalDateTime.now());
        attemptRepository.save(attempt);
    }

    public void markForReview(Long attemptId, Long questionId) {
        ExamAttempt attempt = getAttempt(attemptId);
        attempt.setLastAiCheckTime(LocalDateTime.now());
        attemptRepository.save(attempt);
    }
}