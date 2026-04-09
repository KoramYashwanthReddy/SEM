package com.yashwanth.ai_exam_system.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamStatus;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.exception.BadRequestException;
import com.yashwanth.ai_exam_system.exception.ConflictException;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;

@Service
@Transactional
public class ExamService {

    private static final Logger logger =
            LoggerFactory.getLogger(ExamService.class);

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;
    private final CheatingDetectionService cheatingDetectionService;
    private final NotificationService notificationService;

    public ExamService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            QuestionRepository questionRepository,
            CheatingDetectionService cheatingDetectionService,
            NotificationService notificationService) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.questionRepository = questionRepository;
        this.cheatingDetectionService = cheatingDetectionService;
        this.notificationService = notificationService;
    }

    // ================= CREATE =================
    public Exam createExam(ExamRequest request, Authentication auth) {

        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Authenticated teacher/admin is required");
        }
        validateExamRequest(request);

        Exam exam = new Exam();
        exam.setExamCode(generateExamCode());
        mapRequestToExam(request, exam);

        exam.setCreatedBy(auth.getName());
        exam.setStatus(ExamStatus.DRAFT);
        exam.setQuestionsUploaded(false);
        exam.setActive(true);

        logger.info("Exam created by {}", auth.getName());

        Exam saved;
        try {
            saved = examRepository.saveAndFlush(exam);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Unable to create exam due to duplicate or invalid exam data");
        }

        safeNotifyTeacher(
                auth.getName(),
                "EXAM",
                "Exam Created",
                "Exam " + saved.getTitle() + " was created successfully",
                "Teacher Console",
                "info"
        );

        return saved;
    }

    // ================= GET =================
    public Exam getExamByCode(String examCode) {
        return examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
    }

    public Exam getExamByCodeForActor(String examCode, Authentication auth) {
        Exam exam = getExamByCode(examCode);
        ensureExamAccess(exam, auth);
        return exam;
    }

    public List<Exam> getTeacherExams(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Authenticated teacher/admin is required");
        }
        if (isAdmin(auth)) {
            return examRepository.findAllActiveOrderByCreatedAtDesc();
        }
        return examRepository.findByCreatedByAndActiveTrueOrderByCreatedAtDesc(auth.getName());
    }

    // ================= UPDATE =================
    public Exam updateExam(String examCode, ExamRequest request, Authentication auth) {

        validateExamRequest(request);
        Exam exam = getExamByCodeForActor(examCode, auth);

        if (exam.isPublished()) {
            throw new BadRequestException("Cannot update published exam");
        }

        mapRequestToExam(request, exam);

        safeNotifyTeacher(
                exam.getCreatedBy(),
                "EXAM",
                "Exam Updated",
                "Exam " + exam.getTitle() + " was updated",
                "Teacher Console",
                "info"
        );

        try {
            return examRepository.saveAndFlush(exam);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Unable to update exam due to duplicate or invalid exam data");
        }
    }

    // ================= DELETE =================
    public void deleteExamByTeacher(String examCode, Authentication auth) {
        Exam exam = getExamByCodeForActor(examCode, auth);
        exam.setActive(false);
        examRepository.save(exam);

        safeNotifyTeacher(
                exam.getCreatedBy(),
                "EXAM",
                "Exam Deleted",
                "Exam " + exam.getTitle() + " was deleted",
                "Teacher Console",
                "warning"
        );
    }

    // ================= PUBLISH =================
    public Exam publishExam(String examCode, Authentication auth) {

        Exam exam = getExamByCodeForActor(examCode, auth);

        if (!hasPublishedQuestions(examCode)) {
            throw new BadRequestException("Upload questions before publishing exam");
        }

        exam.setQuestionsUploaded(true);
        exam.setStatus(ExamStatus.PUBLISHED);
        exam.setRegistrationOpen(true); // Open registration when exam is published

        // Ensure registration times are calculated
        if (exam.getStartTime() != null) {
            exam.setRegistrationStartTime(exam.getStartTime().minusHours(25));
            exam.setPhase1EndTime(exam.getStartTime().minusMinutes(30));
            exam.setPhase2StartTime(exam.getStartTime().minusMinutes(30));
            exam.setPhase2VerificationRequired(true);
        }
        Exam saved;
        try {
            saved = examRepository.saveAndFlush(exam);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Unable to publish exam due to invalid persistence state");
        }

        safeNotifyTeacher(
                saved.getCreatedBy(),
                "EXAM",
                "Exam Published",
                "Exam " + saved.getTitle() + " is now published",
                "Teacher Console",
                "success"
        );

        return saved;
    }

    // ================= ATTEMPTS =================
    public List<ExamAttempt> getAttemptsByExamCode(String examCode, Authentication auth) {
        getExamByCodeForActor(examCode, auth);
        return attemptRepository.findByExamCode(examCode);
    }

    // ================= ANALYTICS =================
    public Map<String, Object> getExamAnalytics(String examCode, Authentication auth) {

        getExamByCodeForActor(examCode, auth);

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

        String teacherKey = attempt.getExam() != null ? attempt.getExam().getCreatedBy() : null;
        if (teacherKey != null && !teacherKey.isBlank()) {
            safeNotifyTeacher(
                    teacherKey,
                    "CHEATING",
                    "Attempt Cancelled",
                    "An attempt for exam " + attempt.getExamCode() + " was cancelled",
                    "Teacher Console",
                    "critical"
            );
        }
    }

    // ================= HELPERS =================

    private void validateExamRequest(ExamRequest request) {
        if (request == null) {
            throw new BadRequestException("Exam request is required");
        }
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Exam title is required");
        }
        if (request.getSubject() == null || request.getSubject().trim().isEmpty()) {
            throw new BadRequestException("Exam subject is required");
        }
        if (request.getDurationMinutes() == null || request.getDurationMinutes() <= 0) {
            throw new BadRequestException("Duration must be greater than 0");
        }
        if (request.getTotalMarks() == null || request.getTotalMarks() <= 0) {
            throw new BadRequestException("Total marks must be greater than 0");
        }
        if (request.getPassingMarks() != null && request.getPassingMarks() < 0) {
            throw new BadRequestException("Passing marks cannot be negative");
        }
        if (request.getPassingMarks() != null
                && request.getTotalMarks() != null
                && request.getPassingMarks() > request.getTotalMarks()) {
            throw new BadRequestException("Passing marks cannot be greater than total marks");
        }
        if (request.getMaxAttempts() == null || request.getMaxAttempts() <= 0) {
            throw new BadRequestException("Max attempts must be greater than 0");
        }
        if (request.getMarksPerQuestion() == null || request.getMarksPerQuestion() <= 0) {
            throw new BadRequestException("Marks per question must be greater than 0");
        }
        if (request.getNegativeMarks() == null || request.getNegativeMarks() < 0) {
            throw new BadRequestException("Negative marks cannot be negative");
        }
        if (request.getEasyQuestionCount() == null || request.getEasyQuestionCount() < 0
                || request.getMediumQuestionCount() == null || request.getMediumQuestionCount() < 0
                || request.getDifficultQuestionCount() == null || request.getDifficultQuestionCount() < 0) {
            throw new BadRequestException("Difficulty question counts must be zero or greater");
        }
        int totalDifficultyQuestions = request.getEasyQuestionCount()
                + request.getMediumQuestionCount()
                + request.getDifficultQuestionCount();
        if (totalDifficultyQuestions <= 0) {
            throw new BadRequestException("At least one question is required in difficulty distribution");
        }
        if (request.getStartTime() == null || request.getStartTime().trim().isEmpty()
                || request.getEndTime() == null || request.getEndTime().trim().isEmpty()) {
            throw new BadRequestException("Start time and end time are required");
        }

        LocalDateTime start = parseDateTime(request.getStartTime());
        LocalDateTime end = parseDateTime(request.getEndTime());
        if (end != null && start != null && end.isBefore(start)) {
            throw new BadRequestException("End time must be after start time");
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
        exam.setShuffleQuestions(Boolean.TRUE.equals(request.getShuffleQuestions()));
        exam.setShuffleOptions(Boolean.TRUE.equals(request.getShuffleOptions()));
        exam.setStartTime(parseDateTime(request.getStartTime()));
        exam.setEndTime(parseDateTime(request.getEndTime()));
        exam.setEasyQuestionCount(request.getEasyQuestionCount());
        exam.setMediumQuestionCount(request.getMediumQuestionCount());
        exam.setDifficultQuestionCount(request.getDifficultQuestionCount());
    }

    private LocalDateTime parseDateTime(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException ignored) {
        }

        try {
            return OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
        }

        throw new BadRequestException("Invalid date-time format. Use yyyy-MM-dd'T'HH:mm or ISO timestamp");
    }

    private String generateExamCode() {
        return "EXAM-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private ExamAttempt getAttempt(Long attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));
    }

    private boolean hasPublishedQuestions(String examCode) {
        return questionRepository.findByExamCode(examCode)
                .stream()
                .anyMatch(question -> !Boolean.FALSE.equals(question.getActive()));
    }

    private void safeNotifyTeacher(String recipientKey,
                                   String category,
                                   String title,
                                   String message,
                                   String source,
                                   String severity) {
        try {
            notificationService.notifyTeacher(
                    recipientKey,
                    category,
                    title,
                    message,
                    source,
                    severity
            );
        } catch (Exception notificationError) {
            logger.warn("Exam data saved, but teacher notification failed: {}", notificationError.getMessage());
        }
    }

    private void ensureExamAccess(Exam exam, Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Authenticated teacher/admin is required");
        }
        if (isAdmin(auth)) {
            return;
        }
        String actor = auth.getName().trim();
        String owner = exam.getCreatedBy() == null ? "" : exam.getCreatedBy().trim();
        if (!owner.equalsIgnoreCase(actor)) {
            throw new ForbiddenException("You cannot access exams created by another user");
        }
    }

    private boolean isAdmin(Authentication auth) {
        if (auth == null || auth.getAuthorities() == null) return false;
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String role = authority == null ? "" : String.valueOf(authority.getAuthority());
            if ("ROLE_ADMIN".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
                return true;
            }
        }
        return false;
    }
}
