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

        handleThresholds(attempt, newScore);

        attemptRepository.save(attempt);

        logger.info(
                "AI Event | attempt={} | type={} | score={}",
                attempt.getId(),
                normalizedType,
                newScore
        );
    }

    // ================= THRESHOLD ENGINE =================
    private void handleThresholds(ExamAttempt attempt, int score) {

        Long studentId = attempt.getStudentId();

        // WARNING
        if (score >= WARNING_THRESHOLD && score < ALERT_THRESHOLD) {

            if (!Boolean.TRUE.equals(attempt.getCheatingFlag())) {

                attempt.setCheatingFlag(true);

                notificationService.notifyStudent(
                        studentId,
                        "Warning: Suspicious activity detected"
                );

                notifyTeacher(attempt, "WARNING", "Student warning issued", "A suspicious activity warning was sent");
            }
        }

        // ADMIN ALERT
        if (score >= ALERT_THRESHOLD && score < CANCEL_THRESHOLD) {

            notificationService.notifyAdmin(
                    "CHEATING",
                    "High Risk Attempt",
                    "High cheating risk | attempt="
                            + attempt.getId()
                            + " score=" + score,
                    "Proctoring Engine",
                    "high"
            );

            notifyTeacher(attempt, "CHEATING", "High Risk Attempt", "High cheating risk detected for attempt " + attempt.getId());
        }

        // CANCEL
        if (score >= CANCEL_THRESHOLD) {

            if (!Boolean.TRUE.equals(attempt.getCancelled())) {

                attempt.markCancelled("AI cheating detection");

                attempt.setStatus(AttemptStatus.INVALIDATED);

                notificationService.notifyExamCancelled(
                        studentId,
                        "Exam cancelled due to cheating detection"
                );

                notifyTeacher(attempt, "CHEATING", "Attempt Cancelled", "Attempt " + attempt.getId() + " was cancelled for cheating");

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

    private int resolveSeverity(String eventType) {
        return switch (eventType) {
            case "TAB_SWITCH", "WINDOW_BLUR" -> 5;
            case "EXIT_FULLSCREEN", "COPY_PASTE", "FORBIDDEN_SHORTCUT" -> 7;
            case "NO_FACE", "MIC_LOST" -> 8;
            case "MULTIPLE_FACES", "MULTIPLE_VOICES", "CAMERA_LOST" -> 9;
            default -> 1;
        };
    }

    private int resolveScore(String eventType) {
        return switch (eventType) {
            case "TAB_SWITCH", "WINDOW_BLUR" -> 20;
            case "EXIT_FULLSCREEN", "COPY_PASTE", "FORBIDDEN_SHORTCUT" -> 25;
            case "NO_FACE", "MIC_LOST" -> 30;
            case "MULTIPLE_FACES", "MULTIPLE_VOICES", "CAMERA_LOST" -> 40;
            default -> 0;
        };
    }
}
