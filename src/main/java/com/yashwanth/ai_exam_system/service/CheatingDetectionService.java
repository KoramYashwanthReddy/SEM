package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.CheatingAlertDTO;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
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

    private static final int WARNING_THRESHOLD = 50;
    private static final int ALERT_THRESHOLD = 80;
    private static final int CANCEL_THRESHOLD = 100;

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

    // ================= MAIN AI ANALYSIS =================
    @Transactional
    public void analyzeAttempt(Long attemptId) {

        Integer score = eventRepository.getTotalScore(attemptId);
        if (score == null) score = 0;

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        // ignore if already finished
        if (!attempt.isActive()) {
            return;
        }

        attempt.setCheatingScore(score);
        attempt.setLastAiCheckTime(LocalDateTime.now());

        String message = "Normal behavior";
        String severity = "LOW";
        String eventType = "SAFE";

        boolean sendAlert = false;

        // ================= CANCEL =================
        if (score >= CANCEL_THRESHOLD) {

            if (!Boolean.TRUE.equals(attempt.getCancelled())) {

                attempt.markCancelled("AI cheating detection");
                attempt.setStatus(AttemptStatus.INVALIDATED);

                message = "🚨 Exam Cancelled - Cheating Detected";
                severity = "CRITICAL";
                eventType = "INVALIDATED";

                sendAlert = true;

                notificationService.notifyExamCancelled(
                        attempt.getStudentId(),
                        "Exam cancelled due to cheating. Score: " + score
                );

                notifyTeacher(attempt, "CHEATING", "Attempt Cancelled", "Attempt " + attemptId + " was cancelled due to cheating");
            }
        }
        // ================= HIGH RISK =================
        else if (score >= ALERT_THRESHOLD) {

            attempt.setCheatingFlag(true);
            attempt.setRemarks("High cheating risk. Score: " + score);

            message = "🚨 High Risk Student";
            severity = "HIGH";
            eventType = "HIGH_RISK";

            sendAlert = true;

            notificationService.notifyAdmin(
                    "CHEATING",
                    "High Risk Detected",
                    "High risk detected -> Attempt ID: "
                            + attemptId + " | Score: " + score,
                    "AI Proctoring",
                    "high"
            );

            notifyTeacher(attempt, "CHEATING", "High Risk Detected", "High risk detected for attempt " + attemptId + " | Score: " + score);
        }
        // ================= WARNING =================
        else if (score >= WARNING_THRESHOLD) {

            attempt.setCheatingFlag(true);
            attempt.setRemarks("Warning suspicious activity. Score: " + score);

            message = "⚠️ Suspicious Behavior";
            severity = "MEDIUM";
            eventType = "WARNING";

            sendAlert = true;

            notificationService.notifyStudent(
                    attempt.getStudentId(),
                    "Warning: Suspicious activity detected!"
            );

            notifyTeacher(attempt, "WARNING", "Suspicious Behavior", "Warning issued for attempt " + attemptId);
        }

        attemptRepository.save(attempt);

        if (sendAlert) {
            sendRealTimeAlert(attempt, score, message, eventType, severity);
        }
    }

    // ================= WEBSOCKET ALERT =================
    private void sendRealTimeAlert(
            ExamAttempt attempt,
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
                attempt.getStudent() != null
                        ? attempt.getStudent().getName()
                        : "Unknown",
                attempt.getExam() != null
                        ? attempt.getExam().getTitle()
                        : "Unknown Exam"
        );

        webSocketAlertService.sendCheatingAlert(alert);
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
                "AI Proctoring",
                "high"
        );
    }
}
