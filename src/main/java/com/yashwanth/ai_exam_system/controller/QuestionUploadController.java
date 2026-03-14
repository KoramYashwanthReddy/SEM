package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.service.ExcelQuestionUploadService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/questions")
public class QuestionUploadController {

    private final ExcelQuestionUploadService uploadService;

    public QuestionUploadController(ExcelQuestionUploadService uploadService) {
        this.uploadService = uploadService;
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('TEACHER')")
    public String uploadQuestions(@RequestParam("file") MultipartFile file) {

        try {

            uploadService.uploadQuestions(file);

            return "Questions uploaded successfully";

        } catch (Exception e) {

            return "Upload failed: " + e.getMessage();
        }
    }
}