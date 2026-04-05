package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.ExamAttemptService;
import com.yashwanth.ai_exam_system.service.ExamService;
import com.yashwanth.ai_exam_system.service.ExamNavigationService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exam")
public class ExamAttemptController {

    private final ExamAttemptService examAttemptService;
    private final ExamService examService;
    private final ExamNavigationService navigationService; // 🔥 NEW
    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final UserRepository userRepository;

    public ExamAttemptController(
            ExamAttemptService examAttemptService,
            ExamService examService,
            ExamNavigationService navigationService,
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            UserRepository userRepository) {

        this.examAttemptService = examAttemptService;
        this.examService = examService;
        this.navigationService = navigationService;
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
    }

    // ✅ START EXAM
    @PostMapping("/start")
    public ExamAttempt startExam(@RequestBody StartExamRequest request) {

        return examAttemptService.startExam(
                request.getStudentId(),
                request.getExamCode()
        );
    }

    // ✅ SAVE ANSWER
    @PostMapping("/submit-answer")
    public String submitAnswer(@RequestBody SubmitAnswerRequest request) {

        examAttemptService.submitAnswer(
                request.getAttemptId(),
                request.getQuestionId(),
                request.getAnswer(),
                request.getMarkForReview()
        );

        return "Answer saved successfully";
    }

    // 🚀 FINAL SUBMIT
    @PostMapping("/submit/{attemptId}")
    public String submitExam(@PathVariable Long attemptId) {
        return examService.submitExam(attemptId);
    }

    // ✅ GET RESULT
    @GetMapping("/result/{attemptId}")
    public ExamResultResponse getResult(@PathVariable Long attemptId) {
        return examAttemptService.generateResult(attemptId);
    }

    // ✅ QUESTION PALETTE
    @GetMapping("/palette/{attemptId}")
    public List<QuestionPaletteResponse> getPalette(@PathVariable Long attemptId) {
        return examAttemptService.getPalette(attemptId);
    }

    // ✅ EXAM TIMER
    @GetMapping("/timer/{attemptId}")
    public ExamTimerResponse getTimer(@PathVariable Long attemptId) {
        return examAttemptService.getTimer(attemptId);
    }

    // ================= NEW FEATURES =================

    // 🔥 NAVIGATION STATUS
    @GetMapping("/navigation/{attemptId}")
    public ExamNavigationStatusDTO getNavigation(@PathVariable Long attemptId) {
        return navigationService.getNavigationStatus(attemptId);
    }

    // 🔥 RESUME EXAM
    @GetMapping("/resume/{attemptId}")
    public ExamAttempt resumeExam(@PathVariable Long attemptId) {
        return examAttemptService.getAttempt(attemptId);
    }

    // 🔥 FORCE SUBMIT (TIMER / ADMIN)
    @PostMapping("/force-submit/{attemptId}")
    public String forceSubmit(@PathVariable Long attemptId) {
        return examService.submitExam(attemptId);
    }

    // 🔥 CANCEL ATTEMPT
    @PostMapping("/cancel/{attemptId}")
    public String cancelAttempt(
            @PathVariable Long attemptId,
            @RequestParam(required = false, defaultValue = "Cancelled by teacher") String reason) {

        examAttemptService.cancelAttempt(attemptId, reason);
        return "Attempt cancelled";
    }

    // =========================================================
    // TEACHER ATTEMPTS OVERVIEW
    // =========================================================
    @GetMapping("/attempts")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public List<Map<String, Object>> getTeacherAttempts(Authentication auth) {
        List<String> examCodes = examRepository.findByCreatedBy(auth.getName())
                .stream()
                .map(com.yashwanth.ai_exam_system.entity.Exam::getExamCode)
                .collect(Collectors.toList());

        if (examCodes.isEmpty()) {
            return List.of();
        }

        return attemptRepository.findByExamCodeIn(examCodes)
                .stream()
                .map(this::toAttemptMap)
                .collect(Collectors.toList());
    }

    // 🔥 HEARTBEAT (ANTI CHEATING KEEP ALIVE)
    @PostMapping("/heartbeat/{attemptId}")
    public String heartbeat(@PathVariable Long attemptId) {

        examAttemptService.updateHeartbeat(attemptId);
        return "Heartbeat updated";
    }

    // 🔥 MARK REVIEW ONLY
    @PostMapping("/mark-review")
    public String markReview(@RequestBody SubmitAnswerRequest request) {

        examAttemptService.markForReview(
                request.getAttemptId(),
                request.getQuestionId()
        );

        return "Marked for review";
    }

    private Map<String, Object> toAttemptMap(ExamAttempt attempt) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", attempt.getId());
        map.put("attemptId", attempt.getId());
        map.put("examId", attempt.getExamId());
        map.put("examCode", attempt.getExamCode());
        String examTitle = attempt.getExamCode() != null
                ? examRepository.findByExamCode(attempt.getExamCode())
                    .map(com.yashwanth.ai_exam_system.entity.Exam::getTitle)
                    .orElse(attempt.getExamCode())
                : "-";
        map.put("examTitle", examTitle);
        map.put("studentId", attempt.getStudentId());

        String studentName = userRepository.findById(attempt.getStudentId() == null ? -1L : attempt.getStudentId())
                .map(User::getName)
                .orElse("Student " + (attempt.getStudentId() != null ? attempt.getStudentId() : attempt.getId()));
        map.put("studentName", studentName);
        map.put("score", attempt.getScore());
        map.put("percentage", attempt.getPercentage());
        map.put("timeTakenSeconds", attempt.getTimeTakenSeconds());
        map.put("timeTaken", attempt.getTimeTakenSeconds() != null
                ? Math.max(1, Math.round(attempt.getTimeTakenSeconds() / 60.0)) + " min"
                : "0 min");
        map.put("status", attempt.getStatus() != null ? attempt.getStatus().name() : "STARTED");
        map.put("cheatingScore", attempt.getCheatingScore());
        map.put("cheatingFlag", attempt.getCheatingFlag());
        map.put("riskLevel", riskLevel(attempt.getCheatingScore()));
        map.put("createdAt", attempt.getCreatedAt());
        map.put("startTime", attempt.getStartTime());
        map.put("endTime", attempt.getEndTime());
        map.put("remarks", attempt.getRemarks());
        return map;
    }

    private String riskLevel(Integer score) {
        int value = score != null ? score : 0;
        if (value >= 85) return "CRITICAL";
        if (value >= 65) return "HIGH";
        if (value >= 40) return "MEDIUM";
        return "LOW";
    }
}
