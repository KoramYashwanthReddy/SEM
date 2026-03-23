package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ProctoringEventRequest;
import com.yashwanth.ai_exam_system.dto.ProctoringSummary;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
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

    // ================= AI THRESHOLDS =================
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

    // =========================================================
    // 🔥 CORE AI ENGINE
    // =========================================================
    @Transactional
    public void recordEvent(ProctoringEventRequest request) {

        ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        // ignore if already cancelled
        if (Boolean.TRUE.equals(attempt.getIsCancelled())) {
            return;
        }

        // create event
        ProctoringEvent event = new ProctoringEvent();
        event.setAttemptId(request.getAttemptId());
        event.setEventType(request.getEventType());
        event.setDetails(request.getDetails());
        event.setEvidenceUrl(request.getEvidenceUrl());
        event.setMetadata(request.getMetadata());
        event.setTimestamp(LocalDateTime.now());

        // save event
        eventRepository.save(event);

        int eventScore = event.getScore();

        // update score
        int newScore = attempt.getCheatingScore() + eventScore;
        attempt.setCheatingScore(newScore);
        attempt.setLastAiCheckTime(LocalDateTime.now());

        // apply AI logic
        handleThresholds(attempt, newScore);

        attemptRepository.save(attempt);

        logger.info("AI Proctoring Event | Attempt={} | Type={} | Score={}",
                attempt.getId(), request.getEventType(), newScore);
    }

    // =========================================================
    // 🚨 AI THRESHOLD ENGINE
    // =========================================================
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
            }
        }

        // ADMIN ALERT
        if (score >= ALERT_THRESHOLD && score < CANCEL_THRESHOLD) {

            notificationService.notifyAdmin(
                    "High cheating risk detected | Attempt: "
                            + attempt.getId()
                            + " | Score: " + score
            );
        }

        // CANCEL EXAM
        if (score >= CANCEL_THRESHOLD) {

            if (!Boolean.TRUE.equals(attempt.getIsCancelled())) {

                attempt.markCancelled();

                notificationService.notifyExamCancelled(
                        studentId,
                        "Exam cancelled due to cheating detection"
                );

                logger.warn("Exam auto-cancelled | Attempt={}", attempt.getId());
            }
        }
    }

    // =========================================================
    // 📊 GET EVENTS
    // =========================================================
    public List<ProctoringEvent> getEvents(Long attemptId) {
        return eventRepository.findByAttemptId(attemptId);
    }

    // =========================================================
    // 🚨 SUSPICIOUS CHECK
    // =========================================================
    public boolean isSuspicious(Long attemptId) {

        long tabSwitches =
                eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH");

        long multiFace =
                eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE");

        long noFace =
                eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE");

        long copyPaste =
                eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE");

        return tabSwitches > 3 || copyPaste > 5 || multiFace > 2 || noFace > 3;
    }

    // =========================================================
    // 🔥 GET CHEATING SCORE
    // =========================================================
    public int getCheatingScore(Long attemptId) {

        return attemptRepository.findById(attemptId)
                .map(ExamAttempt::getCheatingScore)
                .orElse(0);
    }

    // =========================================================
    // 🚩 AUTO FLAG CHECK
    // =========================================================
    public boolean shouldAutoFlag(Long attemptId) {

        return getCheatingScore(attemptId) >= WARNING_THRESHOLD;
    }

    // =========================================================
    // ❌ AUTO CANCEL CHECK
    // =========================================================
    public boolean shouldAutoCancel(Long attemptId) {

        return getCheatingScore(attemptId) >= CANCEL_THRESHOLD;
    }

    // =========================================================
    // 📈 FULL SUMMARY
    // =========================================================
    public ProctoringSummary getSummary(Long attemptId) {

        int score = getCheatingScore(attemptId);

        ProctoringSummary summary = new ProctoringSummary();
        summary.setAttemptId(attemptId);
        summary.setCheatingScore(score);
        summary.setSuspicious(isSuspicious(attemptId));
        summary.setFlagged(shouldAutoFlag(attemptId));
        summary.setCancelled(shouldAutoCancel(attemptId));

        return summary;
    }
}