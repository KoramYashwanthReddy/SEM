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
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.exception.BadRequestException;
import com.yashwanth.ai_exam_system.exception.ConflictException;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;

@Service
@Transactional
public class ExamService {

    private static final Logger logger =
            LoggerFactory.getLogger(ExamService.class);

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final CheatingDetectionService cheatingDetectionService;
    private final NotificationService notificationService;
    private final EmailNotificationOrchestrator emailNotificationOrchestrator;
    private final ExamEvaluationService evaluationService;

    public ExamService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            QuestionRepository questionRepository,
            UserRepository userRepository,
            CheatingDetectionService cheatingDetectionService,
            NotificationService notificationService,
            EmailNotificationOrchestrator emailNotificationOrchestrator,
            ExamEvaluationService evaluationService) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.cheatingDetectionService = cheatingDetectionService;
        this.notificationService = notificationService;
        this.emailNotificationOrchestrator = emailNotificationOrchestrator;
        this.evaluationService = evaluationService;
    }

    // ================= CREATE =================
    public Exam createExam(ExamRequest request, Authentication auth) {

        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Authenticated teacher/admin is required");
        }
        validateExamRequest(request, true);

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
            throw createExamPersistenceException("create", ex);
        }

        safeNotifyTeacher(
                auth.getName(),
                "EXAM",
                "Exam Created",
                "Exam " + saved.getTitle() + " was created successfully",
                "Teacher Console",
                "info"
        );
        safeNotifyEmail(() -> emailNotificationOrchestrator.notifyExamCreated(saved),
                "exam created");

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
        List<Exam> activeExams = examRepository.findAllActiveOrderByCreatedAtDesc();
        return activeExams.stream()
                .filter(exam -> isOwnerMatch(auth, exam.getCreatedBy()))
                .toList();
    }

    // ================= UPDATE =================
    public Exam updateExam(String examCode, ExamRequest request, Authentication auth) {

        validateExamRequest(request, true);
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
        safeNotifyEmail(() -> emailNotificationOrchestrator.notifyExamUpdated(exam),
                "exam updated");

        try {
            return examRepository.saveAndFlush(exam);
        } catch (DataIntegrityViolationException ex) {
            throw createExamPersistenceException("update", ex);
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
        safeNotifyEmail(() -> emailNotificationOrchestrator.notifyExamDeleted(exam),
                "exam deleted");
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

        // Ensure registration phase times are (re)calculated on publish.
        // Fixed markers relative to startTime — the helper methods handle
        // late-publish scenarios at query time automatically:
        //   • Published < 24 h before start → Phase 1 opens immediately
        //   • Published <  1 h before start → Phase 2 is immediately active
        if (exam.getStartTime() != null) {
            exam.setRegistrationStartTime(exam.getStartTime().minusHours(24)); // T-24h
            exam.setPhase1EndTime(exam.getStartTime().minusHours(1));          // T-1h
            exam.setPhase2StartTime(exam.getStartTime().minusHours(1));        // T-1h
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
        safeNotifyEmail(() -> emailNotificationOrchestrator.notifyExamPublished(saved),
                "exam published");

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

        // ── Evaluate immediately so results are visible straight away ────
        try {
            evaluationService.evaluateExam(
                    attemptId,
                    attempt.getStudentId(),
                    attempt.getExamCode());
            attempt.setStatus(AttemptStatus.EVALUATED);
            attemptRepository.save(attempt);
            logger.info("Exam evaluated | attemptId={} studentId={}",
                    attemptId, attempt.getStudentId());
        } catch (Exception ex) {
            // Evaluation failure must NOT block the submission confirmation
            logger.error("Evaluation failed for attemptId={} — will retry on result view: {}",
                    attemptId, ex.getMessage());
        }

        emailNotificationOrchestrator.notifyAttemptAction(attempt, "ATTEMPT_SUBMITTED");

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
        emailNotificationOrchestrator.notifyAttemptAction(attempt, "ATTEMPT_CANCELLED");

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
        validateExamRequest(request, false);
    }

    private void validateExamRequest(ExamRequest request, boolean allowEmptyDifficultyDistribution) {
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
        if (!allowEmptyDifficultyDistribution && totalDifficultyQuestions <= 0) {
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
        for (int attempt = 0; attempt < 10; attempt++) {
            String code = "EXAM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
            if (examRepository.findByExamCode(code).isEmpty()) {
                return code;
            }
        }
        throw new ConflictException("Unable to generate a unique exam code");
    }

    private void safeNotifyEmail(Runnable action, String label) {
        try {
            action.run();
        } catch (Exception ex) {
            logger.warn("Exam was saved, but email notification for {} failed: {}", label, ex.getMessage());
        }
    }

    private ConflictException createExamPersistenceException(String operation, DataIntegrityViolationException ex) {
        String rootMessage = ex.getMostSpecificCause() != null
                ? String.valueOf(ex.getMostSpecificCause().getMessage())
                : String.valueOf(ex.getMessage());
        String message = rootMessage == null ? "" : rootMessage.toLowerCase();

        if (message.contains("examcode") || message.contains("exam_code")) {
            return new ConflictException("Exam code already exists. Please try again.");
        }
        if (message.contains("duplicate")) {
            return new ConflictException("Duplicate exam data was rejected by the database.");
        }

        logger.error("Exam {} failed due to data integrity violation: {}", operation, rootMessage, ex);
        return new ConflictException("Unable to " + operation + " exam due to invalid exam data");
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
        String owner = exam.getCreatedBy() == null ? "" : exam.getCreatedBy().trim();
        if (!isOwnerMatch(auth, owner)) {
            throw new ForbiddenException("You cannot access exams created by another user");
        }
    }

    private boolean isOwnerMatch(Authentication auth, String createdByRaw) {
        String owner = createdByRaw == null ? "" : createdByRaw.trim();
        if (owner.isBlank()) {
            return false;
        }

        String actor = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (!actor.isBlank() && owner.equalsIgnoreCase(actor)) {
            return true;
        }

        User actorUser = resolveUserByIdentifier(actor);
        if (actorUser == null) {
            return false;
        }

        return matchesTeacher(owner, actorUser);
    }

    private User resolveUserByIdentifier(String identifier) {
        String value = identifier == null ? "" : identifier.trim();
        if (value.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(value)
                .or(() -> userRepository.findByEmployeeIdIgnoreCase(value))
                .orElse(null);
    }

    private boolean matchesTeacher(String createdBy, User actorUser) {
        String owner = normalizeForMatch(createdBy);
        if (owner.isBlank() || actorUser == null) {
            return false;
        }

        return normalizeForMatch(actorUser.getEmail()).equals(owner)
                || normalizeForMatch(actorUser.getName()).equals(owner)
                || normalizeForMatch(actorUser.getEmployeeId()).equals(owner)
                || normalizeForMatch(actorUser.getDepartment()).equals(owner)
                || normalizeForMatch(actorUser.getDesignation()).equals(owner);
    }

    private String normalizeForMatch(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase().replaceAll("\\s+", " ");
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
