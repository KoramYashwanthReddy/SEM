package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.entity.ExamStatus;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class ExamService {

    private static final Logger logger =
            LoggerFactory.getLogger(ExamService.class);

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

        validateExamRequest(request);

        Exam exam = new Exam();
        exam.setExamCode(generateExamCode());
        mapRequestToExam(request, exam);

        exam.setCreatedBy(auth.getName());
        exam.setStatus(ExamStatus.DRAFT);
        exam.setQuestionsUploaded(false);
        exam.setActive(true);

        logger.info("Exam created by {}", auth.getName());

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

        if (exam.isPublished()) {
            throw new RuntimeException("Cannot update published exam");
        }

        mapRequestToExam(request, exam);

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

        if (!Boolean.TRUE.equals(exam.getQuestionsUploaded())) {
            throw new RuntimeException("Upload questions before publishing exam");
        }

        exam.setStatus(ExamStatus.PUBLISHED);
        return examRepository.save(exam);
    }

    // ================= ATTEMPTS =================
    public List<ExamAttempt> getAttemptsByExamCode(String examCode) {
        return attemptRepository.findByExamCode(examCode);
    }

    // ================= ANALYTICS =================
    public Map<String, Object> getExamAnalytics(String examCode) {

        List<ExamAttempt> attempts =
                attemptRepository.findByExamCode(examCode);

        Map<String, Object> map = new HashMap<>();

        map.put("totalAttempts", attempts.size());

        map.put("submitted",
                attempts.stream()
                        .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED)
                        .count());

        map.put("cancelled",
                attempts.stream()
                        .filter(a -> a.getStatus() == AttemptStatus.INVALIDATED)
                        .count());

        map.put("flagged",
                attempts.stream()
                        .filter(a -> Boolean.TRUE.equals(a.getCheatingFlag()))
                        .count());

        map.put("averageScore",
                attempts.stream()
                        .filter(a -> a.getScore() != null)
                        .mapToDouble(ExamAttempt::getScore)
                        .average().orElse(0));

        map.put("averagePercentage",
                attempts.stream()
                        .filter(a -> a.getPercentage() != null)
                        .mapToDouble(ExamAttempt::getPercentage)
                        .average().orElse(0));

        map.put("averageTimeSeconds",
                attempts.stream()
                        .filter(a -> a.getTimeTakenSeconds() != null)
                        .mapToLong(ExamAttempt::getTimeTakenSeconds)
                        .average().orElse(0));

        return map;
    }

    // ================= SUBMIT =================
    public String submitExam(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        if (attempt.getStatus() != AttemptStatus.STARTED) {
            return "Already submitted";
        }

        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setEndTime(LocalDateTime.now());

        if (attempt.getStartTime() != null) {
            long timeTaken = Duration.between(
                    attempt.getStartTime(),
                    attempt.getEndTime()
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

        attempt.setStatus(AttemptStatus.INVALIDATED);
        attempt.setRemarks(reason);
        attempt.setEndTime(LocalDateTime.now());

        attemptRepository.save(attempt);
    }

    // ================= HELPERS =================

    private void validateExamRequest(ExamRequest request) {

        if (request.getEndTime() != null &&
                request.getStartTime() != null &&
                request.getEndTime().isBefore(request.getStartTime())) {

            throw new RuntimeException("Invalid time range");
        }
    }

    private void mapRequestToExam(ExamRequest request, Exam exam) {

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
    }

    private String generateExamCode() {
        return "EXAM-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private ExamAttempt getAttempt(Long attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));
    }
}