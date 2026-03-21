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

    // =========================================================
    // 🔥 NEW THRESHOLDS (ALIGNED WITH PROCTORING SYSTEM)
    // =========================================================
    private static final int WARNING_THRESHOLD = 50;
    private static final int ALERT_THRESHOLD = 80;
    private static final int CANCEL_THRESHOLD = 100;

    // =========================================================
    // 🔥 STATUS CONSTANTS
    // =========================================================
    private static final String STATUS_FLAGGED = "FLAGGED";
    private static final String STATUS_INVALIDATED = "INVALIDATED";

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

    // =========================================================
    // 🔥 MAIN AI ANALYSIS
    // =========================================================
    @Transactional
    public void analyzeAttempt(Long attemptId) {

        // ✅ Step 1: Get TOTAL SCORE (not severity ❗)
        Integer score = eventRepository.getTotalScore(attemptId);
        if (score == null) score = 0;

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        attempt.setCheatingScore(score);
        attempt.setLastAiCheckTime(LocalDateTime.now());

        String message = "Normal behavior";
        String severity = "LOW";
        String eventType = "SAFE";

        boolean sendAlert = false;

        // =====================================================
        // 🚨 DECISION ENGINE
        // =====================================================

        // ❌ CANCEL EXAM
        if (score >= CANCEL_THRESHOLD) {

            attempt.markCancelled();

            message = "🚨 Exam Cancelled - Cheating Detected";
            severity = "CRITICAL";
            eventType = "INVALIDATED";

            sendAlert = true;

            notificationService.notifyExamCancelled(
                    attempt.getStudentId(),
                    "Exam cancelled due to cheating. Score: " + score
            );

        }
        // 🚨 HIGH RISK
        else if (score >= ALERT_THRESHOLD) {

            attempt.setStatus(STATUS_FLAGGED);
            attempt.setCheatingFlag(true);
            attempt.setRemarks("High cheating risk. Score: " + score);

            message = "🚨 High Risk Student";
            severity = "HIGH";
            eventType = "HIGH_RISK";

            sendAlert = true;

            notificationService.notifyAdmin(
                    "High risk detected → Attempt ID: " + attemptId +
                            " | Score: " + score
            );
        }
        // ⚠️ WARNING
        else if (score >= WARNING_THRESHOLD) {

            attempt.setCheatingFlag(true);
            attempt.setRemarks("Warning level suspicious activity. Score: " + score);

            message = "⚠️ Suspicious Behavior";
            severity = "MEDIUM";
            eventType = "WARNING";

            sendAlert = true;

            notificationService.notifyStudent(
                    attempt.getStudentId(),
                    "Warning: Suspicious activity detected!"
            );
        }

        // =====================================================
        // ✅ SAVE
        // =====================================================
        attemptRepository.save(attempt);

        // =====================================================
        // 🔥 REAL-TIME ALERT
        // =====================================================
        if (sendAlert) {
            sendRealTimeAlert(attempt, score, message, eventType, severity);
        }
    }

    // =========================================================
    // 🔥 WEBSOCKET ALERT
    // =========================================================
    private void sendRealTimeAlert(ExamAttempt attempt,
                                  int score,
                                  String message,
                                  String eventType,
                                  String severity) {

        CheatingAlertDTO alert = new CheatingAlertDTO(
                attempt.getStudentId(),
                attempt.getExamId(),
                attempt.getId(),
                message + " | Score: " + score,
                score,
                eventType,
                severity,
                LocalDateTime.now(),
                attempt.getStudent() != null ? attempt.getStudent().getName() : "Unknown",
                attempt.getExam() != null ? attempt.getExam().getTitle() : "Unknown Exam"
        );

        webSocketAlertService.sendCheatingAlert(alert);
    }
}