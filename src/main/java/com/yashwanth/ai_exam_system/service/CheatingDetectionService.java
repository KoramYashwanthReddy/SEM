package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.CheatingAlertDTO;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class CheatingDetectionService {

    private final ProctoringEventRepository eventRepository;
    private final ExamAttemptRepository attemptRepository;
    private final NotificationService notificationService;
    private final WebSocketAlertService webSocketAlertService;

    // 🔥 THRESHOLDS
    private static final int FLAG_THRESHOLD = 30;
    private static final int INVALIDATE_THRESHOLD = 50;

    // 🔥 STATUS CONSTANTS
    private static final String STATUS_FLAGGED = "FLAGGED";
    private static final String STATUS_INVALIDATED = "INVALIDATED";
    private static final String STATUS_COMPLETED = "COMPLETED";

    public CheatingDetectionService(
            ProctoringEventRepository eventRepository,
            ExamAttemptRepository attemptRepository,
            NotificationService notificationService,
            WebSocketAlertService webSocketAlertService) {

        this.eventRepository = eventRepository;
        this.attemptRepository = attemptRepository;
        this.notificationService = notificationService;
        this.webSocketAlertService = webSocketAlertService;
    }

    @Transactional
    public void analyzeAttempt(Long attemptId) {

        // ✅ Step 1: Fetch score
        Integer score = eventRepository.getTotalSeverityScore(attemptId);
        if (score == null) score = 0;

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        // 🔒 Null safety
        if (attempt.getStudent() == null || attempt.getExam() == null) {
            throw new RuntimeException("Invalid attempt: missing student or exam");
        }

        attempt.setCheatingScore(score);
        attempt.setLastAiCheckTime(LocalDateTime.now());

        String message = "✅ Normal Behavior";
        String severity = "LOW";
        String eventType = "SAFE";

        boolean shouldSendAlert = false;

        // ✅ Step 2: AI Decision Logic
        if (score >= INVALIDATE_THRESHOLD) {

            attempt.setStatus(STATUS_INVALIDATED);
            attempt.setCheatingFlag(true);
            attempt.setRemarks("Auto invalidated due to high cheating score: " + score);

            message = "🚨 HIGH CHEATING DETECTED";
            severity = "CRITICAL";
            eventType = "INVALIDATED";

            shouldSendAlert = true;

            notificationService.notifyAdmin(
                    "🚨 HIGH CHEATING DETECTED → Attempt ID: " + attemptId +
                            " | Score: " + score
            );

        } else if (score >= FLAG_THRESHOLD) {

            attempt.setStatus(STATUS_FLAGGED);
            attempt.setCheatingFlag(true);
            attempt.setRemarks("Flagged due to suspicious behavior. Score: " + score);

            message = "⚠️ Suspicious Exam";
            severity = "HIGH";
            eventType = "FLAGGED";

            shouldSendAlert = true;

            notificationService.notifyAdmin(
                    "⚠️ Suspicious Exam → Attempt ID: " + attemptId +
                            " | Score: " + score
            );

        } else {

            if (!STATUS_INVALIDATED.equals(attempt.getStatus())) {
                attempt.setStatus(STATUS_COMPLETED);
                attempt.setCheatingFlag(false);
            }
        }

        // ✅ Step 3: Save
        attemptRepository.save(attempt);

        // 🔥 Step 4: Real-time alert
        if (shouldSendAlert) {
            sendRealTimeAlert(attempt, score, message, eventType, severity);
        }
    }

    // 🔥 HELPER METHOD (UPDATED - NO LOMBOK)
    private void sendRealTimeAlert(ExamAttempt attempt,
                                  int score,
                                  String message,
                                  String eventType,
                                  String severity) {

        CheatingAlertDTO alert = new CheatingAlertDTO(
                attempt.getStudent().getId(),
                attempt.getExam().getId(),
                attempt.getId(),
                message + " | Score: " + score,
                score,
                eventType,
                severity,
                LocalDateTime.now(),
                attempt.getStudent().getName(),
                attempt.getExam().getTitle()
        );

        webSocketAlertService.sendCheatingAlert(alert);
    }
}