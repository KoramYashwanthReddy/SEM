package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ProctoringEventRequest;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProctoringService {

    private final ProctoringEventRepository eventRepository;
    private final ExamAttemptRepository attemptRepository;
    private final NotificationService notificationService;

    // 🔥 CONFIG (can move to config class later)
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
    // 🔥 CORE METHOD (AI ENGINE)
    // =========================================================
    @Transactional
    public void recordEvent(ProctoringEventRequest request) {

        // 1️⃣ Fetch attempt
        ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        // ❌ Ignore if already cancelled
        if (Boolean.TRUE.equals(attempt.getIsCancelled())) {
            return;
        }

        // 2️⃣ Create event
        ProctoringEvent event = new ProctoringEvent();
        event.setAttemptId(request.getAttemptId());
        event.setEventType(request.getEventType());
        event.setDetails(request.getDetails());
        event.setEvidenceUrl(request.getEvidenceUrl());
        event.setMetadata(request.getMetadata());
        event.setTimestamp(LocalDateTime.now());

        // 3️⃣ Save event (score auto-calculated in entity)
        eventRepository.save(event);

        int eventScore = event.getScore();

        // 4️⃣ Update cheating score
        int newScore = attempt.getCheatingScore() + eventScore;
        attempt.setCheatingScore(newScore);
        attempt.setLastAiCheckTime(LocalDateTime.now());

        // 5️⃣ Apply logic
        handleThresholds(attempt, request, newScore);

        // 6️⃣ Save attempt
        attemptRepository.save(attempt);
    }

    // =========================================================
    // 🚨 THRESHOLD LOGIC
    // =========================================================
    private void handleThresholds(ExamAttempt attempt,
                                 ProctoringEventRequest request,
                                 int score) {

        Long studentId = attempt.getStudentId();

        // ⚠️ WARNING
        if (score >= WARNING_THRESHOLD && score < ALERT_THRESHOLD) {

            attempt.setCheatingFlag(true);

            notificationService.notifyStudent(
                    studentId,
                    "Warning: Suspicious activity detected!"
            );
        }

        // 🚨 ADMIN ALERT
        if (score >= ALERT_THRESHOLD && score < CANCEL_THRESHOLD) {

            notificationService.notifyAdmin(
                    "High risk student detected. Attempt ID: " + attempt.getId()
                            + " | Score: " + score
            );
        }

        // ❌ CANCEL EXAM
        if (score >= CANCEL_THRESHOLD) {

            attempt.markCancelled();

            notificationService.notifyExamCancelled(
                    studentId,
                    "Exam cancelled due to cheating detection."
            );
        }
    }

    // =========================================================
    // 📊 GET EVENTS
    // =========================================================
    public List<ProctoringEvent> getEvents(Long attemptId) {
        return eventRepository.findByAttemptId(attemptId);
    }

    // =========================================================
    // 🚨 SIMPLE SUSPICIOUS CHECK (LEGACY)
    // =========================================================
    public boolean isSuspicious(Long attemptId) {

        long tabSwitches =
                eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH");

        long copyPaste =
                eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE");

        return tabSwitches > 3 || copyPaste > 5;
    }

    // =========================================================
    // 🔥 GET CHEATING SCORE (NEW)
    // =========================================================
    public int getCheatingScore(Long attemptId) {

        return attemptRepository.findById(attemptId)
                .map(ExamAttempt::getCheatingScore)
                .orElse(0);
    }
}