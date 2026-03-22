package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.service.ExamAttemptService;
import com.yashwanth.ai_exam_system.service.ExamService;
import com.yashwanth.ai_exam_system.service.ExamNavigationService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exam")
public class ExamAttemptController {

    private final ExamAttemptService examAttemptService;
    private final ExamService examService;
    private final ExamNavigationService navigationService; // 🔥 NEW

    public ExamAttemptController(
            ExamAttemptService examAttemptService,
            ExamService examService,
            ExamNavigationService navigationService) {

        this.examAttemptService = examAttemptService;
        this.examService = examService;
        this.navigationService = navigationService;
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
            @RequestParam String reason) {

        examAttemptService.cancelAttempt(attemptId, reason);
        return "Attempt cancelled";
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
}