package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.service.ExamAttemptService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exam")
public class ExamAttemptController {

    private final ExamAttemptService examAttemptService;

    public ExamAttemptController(ExamAttemptService examAttemptService) {
        this.examAttemptService = examAttemptService;
    }

    // START EXAM
    @PostMapping("/start")
    public ExamAttempt startExam(@RequestBody StartExamRequest request) {

        return examAttemptService.startExam(
                request.getStudentId(),
                request.getExamCode()
        );
    }

    // SAVE ANSWER
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

    // GET RESULT
    @GetMapping("/result/{attemptId}")
    public ExamResultResponse getResult(@PathVariable Long attemptId) {

        return examAttemptService.generateResult(attemptId);
    }

    // QUESTION PALETTE
    @GetMapping("/palette/{attemptId}")
    public List<QuestionPaletteResponse> getPalette(@PathVariable Long attemptId) {

        return examAttemptService.getPalette(attemptId);
    }

    // EXAM TIMER
    @GetMapping("/timer/{attemptId}")
    public ExamTimerResponse getTimer(@PathVariable Long attemptId) {

        return examAttemptService.getTimer(attemptId);
    }
}