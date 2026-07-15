package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ProctoringEventRequest;
import com.yashwanth.ai_exam_system.dto.ProctoringSummary;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProctoringService {

    private static final Logger logger =
            LoggerFactory.getLogger(ProctoringService.class);

    private final ProctoringEventRepository eventRepository;
    private final ExamAttemptRepository attemptRepository;
    private final NotificationService notificationService;

    private static final int WARNING_THRESHOLD = 50;
    private static final int ALERT_THRESHOLD = 80;
    private static final int CANCEL_THRESHOLD = 100;

    public ProctoringService(ProctoringEventRepository eventRepository,
                             ExamAttemptRepository attemptRepository,
                             NotificationService notificationService) {
        this.eventRepository = eventRepository;
        this.attemptRepository = attemptRepository;
        this.notificationService = notificationService;
    }

    // ================= CORE AI ENGINE =================
    @Transactional
    public void recordEvent(ProctoringEventRequest request) {

        ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        // ignore if not active
        if (!attempt.isActive()) {
            return;
        }

        String normalizedType = normalizeEventType(request.getEventType());
        if (isSubmissionLifecycleEvent(normalizedType)) {
            return;
        }

        ProctoringEvent event = new ProctoringEvent();
        event.setAttemptId(request.getAttemptId());
        event.setEventType(normalizedType);
        event.setDetails(request.getDetails());
        event.setEvidenceUrl(request.getEvidenceUrl());
        event.setMetadata(request.getMetadata());
        event.setSeverity(resolveSeverity(normalizedType));
        event.setScore(resolveScore(normalizedType));
        event.setTimestamp(LocalDateTime.now());

        eventRepository.save(event);

        int eventScore = event.getScore() != null ? event.getScore() : 0;

        int currentScore =
                attempt.getCheatingScore() != null ? attempt.getCheatingScore() : 0;

        int newScore = currentScore + eventScore;

        attempt.setCheatingScore(newScore);
        attempt.setLastAiCheckTime(LocalDateTime.now());

        handleThresholds(attempt, newScore, request, normalizedType, eventScore);

        attemptRepository.save(attempt);

        logger.info(
                "AI Event | attempt={} | type={} | score={}",
                attempt.getId(),
                normalizedType,
                newScore
        );
    }

    // ================= PHOTO SNAPSHOT =================
    /**
     * Saves a periodic photo snapshot as a PHOTO_CAPTURE proctoring event.
     * Score contribution is 0 — purely an evidence/audit record.
     */
    @Transactional
    public void recordPhotoSnapshot(Long attemptId, String imageData, String capturedAt) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        if (!attempt.isActive()) {
            return;
        }

        // Truncate to avoid DB column overflow (keep first 200 KB)
        String safeImage = (imageData != null && imageData.length() > 200_000)
                ? imageData.substring(0, 200_000) : imageData;

        String metadata = String.format(
                "{\"type\":\"PHOTO_CAPTURE\",\"capturedAt\":\"%s\",\"size\":%d}",
                capturedAt, safeImage != null ? safeImage.length() : 0);

        ProctoringEvent event = new ProctoringEvent();
        event.setAttemptId(attemptId);
        event.setEventType("PHOTO_CAPTURE");
        event.setDetails("Periodic photo snapshot at " + capturedAt);
        event.setEvidenceUrl(safeImage);   // base64 JPEG
        event.setMetadata(metadata);
        event.setSeverity(1);
        event.setScore(0);                  // no cheating score impact
        event.setTimestamp(LocalDateTime.now());

        eventRepository.save(event);
        logger.info("Photo snapshot saved | attempt={} | capturedAt={}", attemptId, capturedAt);
    }

    // ================= THRESHOLD ENGINE =================
    private void handleThresholds(ExamAttempt attempt,
                                  int score,
                                  ProctoringEventRequest request,
                                  String normalizedType,
                                  int eventScore) {

        Long studentId = attempt.getStudentId();
        String violationSummary = buildViolationSummary(request, normalizedType);
        boolean finalViolation = isFinalViolation(request);

        // WARNING
        if (score >= WARNING_THRESHOLD && score < ALERT_THRESHOLD) {

            if (!Boolean.TRUE.equals(attempt.getCheatingFlag())) {

                attempt.setCheatingFlag(true);

                notificationService.notifyStudent(
                        studentId,
                        "Warning: " + violationSummary
                );

                notifyTeacher(
                        attempt,
                        "WARNING",
                        "Student warning issued",
                        "Suspicious activity detected for attempt " + attempt.getId()
                                + " | " + violationSummary
                                + " | score=" + score
                                + " | eventScore=" + eventScore
                );
            }
        }

        // ADMIN ALERT
        if (score >= ALERT_THRESHOLD && score < CANCEL_THRESHOLD) {

            notificationService.notifyAdmin(
                    "CHEATING",
                    "High Risk Attempt",
                    "High cheating risk | attempt="
                            + attempt.getId()
                            + " | " + violationSummary
                            + " | score=" + score,
                    "Proctoring Engine",
                    "high"
            );

            notifyTeacher(
                    attempt,
                    "CHEATING",
                    "High Risk Attempt",
                    "High cheating risk detected for attempt "
                            + attempt.getId()
                            + " | "
                            + violationSummary
                            + " | score="
                            + score
            );
        }

        // CANCEL
        if (score >= CANCEL_THRESHOLD) {

            if (!Boolean.TRUE.equals(attempt.getCancelled())) {

                attempt.markCancelled("AI cheating detection: " + violationSummary);

                attempt.setStatus(AttemptStatus.INVALIDATED);

                notificationService.notifyExamCancelled(
                        studentId,
                        "Exam cancelled due to cheating detection: "
                                + violationSummary
                                + (finalViolation ? " [final proctoring limit reached]" : "")
                );

                notifyTeacher(
                        attempt,
                        "CHEATING",
                        "Attempt Cancelled",
                        "Attempt "
                                + attempt.getId()
                                + " was cancelled for cheating | "
                                + violationSummary
                                + " | finalScore="
                                + score
                );

                logger.warn("Exam auto cancelled | attempt={}", attempt.getId());
            }
        }
    }

    // ================= GET EVENTS =================
    public List<ProctoringEvent> getEvents(Long attemptId) {
        return eventRepository.findByAttemptId(attemptId);
    }

    // ================= TEACHER ACTIONS =================
    @Transactional
    public void warnAttempt(Long attemptId) {
        recordManualEvent(attemptId, "MANUAL_WARN", "Teacher warning issued", 15);
    }

    @Transactional
    public void markAttemptSafe(Long attemptId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        attempt.setCheatingFlag(false);
        attempt.setLastAiCheckTime(LocalDateTime.now());
        attemptRepository.save(attempt);

        recordManualEvent(attemptId, "MANUAL_SAFE", "Teacher marked attempt safe", 0);
    }

    @Transactional
    public void cancelAttempt(Long attemptId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        attempt.markCancelled("Cancelled manually by teacher");
        attemptRepository.save(attempt);

        recordManualEvent(attemptId, "MANUAL_CANCEL", "Teacher cancelled attempt", 0);
    }

    private void recordManualEvent(Long attemptId, String type, String details, int score) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        ProctoringEvent event = new ProctoringEvent();
        event.setAttemptId(attemptId);
        event.setEventType(type);
        event.setDetails(details);
        event.setScore(score);
        eventRepository.save(event);

        int currentScore = attempt.getCheatingScore() != null ? attempt.getCheatingScore() : 0;
        attempt.setCheatingScore(Math.max(0, currentScore + score));
        attempt.setLastAiCheckTime(LocalDateTime.now());
        attemptRepository.save(attempt);
    }

    // ================= SUSPICIOUS CHECK =================
    public boolean isSuspicious(Long attemptId) {

        long tabSwitch =
                eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH");

        long multiFace =
                eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE");

        long noFace =
                eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE");

        long copyPaste =
                eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE");

        return tabSwitch > 3 || copyPaste > 5 || multiFace > 2 || noFace > 3;
    }

    // ================= SCORE =================
    public int getCheatingScore(Long attemptId) {

        return attemptRepository.findById(attemptId)
                .map(a -> a.getCheatingScore() != null ? a.getCheatingScore() : 0)
                .orElse(0);
    }

    public boolean shouldAutoFlag(Long attemptId) {
        return getCheatingScore(attemptId) >= WARNING_THRESHOLD;
    }

    public boolean shouldAutoCancel(Long attemptId) {
        return getCheatingScore(attemptId) >= CANCEL_THRESHOLD;
    }

    // ================= SUMMARY =================
    public ProctoringSummary getSummary(Long attemptId) {

        int score = getCheatingScore(attemptId);

        ProctoringSummary summary = new ProctoringSummary();
        summary.setAttemptId(attemptId);
        summary.setCheatingScore(score);
        summary.setSuspicious(isSuspicious(attemptId));
        summary.setFlagged(score >= WARNING_THRESHOLD);
        summary.setCancelled(score >= CANCEL_THRESHOLD);

        return summary;
    }

    private void notifyTeacher(ExamAttempt attempt, String category, String title, String message) {
        String teacherKey = attempt.getExam() != null ? attempt.getExam().getCreatedBy() : null;
        if (teacherKey == null || teacherKey.isBlank()) {
            return;
        }
        notificationService.notifyTeacher(
                teacherKey,
                category,
                title,
                message,
                "Proctoring Engine",
                "high"
        );
    }

    private String normalizeEventType(String eventType) {
        String normalized = eventType == null ? "" : eventType.trim().toUpperCase();
        return normalized.isBlank() ? "ACTION_UNKNOWN" : normalized;
    }

    private boolean isSubmissionLifecycleEvent(String eventType) {
        return "EXAM_SUBMITTED".equals(eventType) || "EXAM_AUTO_SUBMITTED".equals(eventType);
    }

    private String buildViolationSummary(ProctoringEventRequest request, String normalizedType) {
        String details = safeTrim(request != null ? request.getDetails() : null);
        if (hasText(details)) {
            return details;
        }
        return switch (normalizedType) {
            case "TAB_SWITCH" -> "Tab switch detected";
            case "WINDOW_BLUR" -> "Window focus lost";
            case "EXIT_FULLSCREEN" -> "Fullscreen mode exited";
            case "COPY_PASTE" -> "Copy or paste action detected";
            case "FORBIDDEN_SHORTCUT" -> "Restricted keyboard shortcut detected";
            case "NO_FACE" -> "No face detected";
            case "MIC_LOST" -> "Microphone lost";
            case "MULTIPLE_FACES" -> "Multiple faces detected";
            case "MULTIPLE_VOICES" -> "Multiple voices detected";
            case "CAMERA_LOST" -> "Camera feed lost";
            default -> "Suspicious activity detected";
        };
    }

    private boolean isFinalViolation(ProctoringEventRequest request) {
        String details = safeLower(request != null ? request.getDetails() : null);
        String metadata = safeLower(request != null ? request.getMetadata() : null);
        return details.contains("limit reached")
                || details.contains("final chance")
                || details.contains("auto submitted due to proctoring limit")
                || metadata.contains("\"final\":true")
                || metadata.contains("\"finalized\":true");
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeLower(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private int resolveSeverity(String eventType) {
        return switch (eventType) {
            case "TAB_SWITCH", "WINDOW_BLUR" -> 5;
            case "EXIT_FULLSCREEN", "COPY_PASTE", "FORBIDDEN_SHORTCUT" -> 7;
            case "NO_FACE", "MIC_LOST" -> 8;
            case "MULTIPLE_FACES", "MULTIPLE_VOICES", "CAMERA_LOST" -> 9;
            case "PROCTORING_LIMIT_REACHED" -> 10;
            default -> 1;
        };
    }

    private int resolveScore(String eventType) {
        return switch (eventType) {
            case "TAB_SWITCH", "WINDOW_BLUR" -> 20;
            case "EXIT_FULLSCREEN", "COPY_PASTE", "FORBIDDEN_SHORTCUT" -> 25;
            case "NO_FACE", "MIC_LOST" -> 30;
            case "MULTIPLE_FACES", "MULTIPLE_VOICES", "CAMERA_LOST" -> 40;
            case "PROCTORING_LIMIT_REACHED" -> 100;
            default -> 0;
        };
    }
}
