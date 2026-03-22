package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.QuestionResponse;
import com.yashwanth.ai_exam_system.service.QuestionService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    // =========================================================
    // BASIC LOAD
    // =========================================================

    @GetMapping("/{examCode}")
    public List<QuestionResponse> getQuestions(@PathVariable String examCode) {
        return questionService.getQuestionsByExam(examCode);
    }

    // =========================================================
    // DIFFICULTY BASED LOAD
    // =========================================================

    @GetMapping("/difficulty/{examCode}")
    public List<QuestionResponse> getQuestionsByDifficulty(
            @PathVariable String examCode,
            @RequestParam(defaultValue = "0") int easy,
            @RequestParam(defaultValue = "0") int medium,
            @RequestParam(defaultValue = "0") int hard) {

        return questionService.getQuestionsByDifficulty(
                examCode,
                easy,
                medium,
                hard
        );
    }

    // =========================================================
    // LIMIT QUESTIONS
    // =========================================================

    @GetMapping("/limit/{examCode}")
    public List<QuestionResponse> getLimitedQuestions(
            @PathVariable String examCode,
            @RequestParam int limit) {

        List<QuestionResponse> questions =
                questionService.getQuestionsByExam(examCode);

        return questions.stream().limit(limit).toList();
    }

    // =========================================================
    // RANDOM REFRESH (RESHUFFLE OPTIONS)
    // =========================================================

    @GetMapping("/refresh/{examCode}")
    public List<QuestionResponse> refreshQuestions(
            @PathVariable String examCode) {

        return questionService.getQuestionsByExam(examCode);
    }

}