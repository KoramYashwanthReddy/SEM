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

    @GetMapping("/{examCode}")
    public List<QuestionResponse> getQuestions(@PathVariable String examCode) {

        return questionService.getQuestionsByExam(examCode);

    }
}