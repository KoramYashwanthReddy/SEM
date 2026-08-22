package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ApiResponse;
import com.yashwanth.ai_exam_system.service.ExcelQuestionUploadService;

import org.springframework.http.ResponseEntity;
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
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<String>> uploadQuestions(@RequestParam("file") MultipartFile file) throws Exception {
        uploadService.uploadQuestions(file);
        return ResponseEntity.ok(ApiResponse.success("Questions uploaded successfully", "Questions uploaded successfully"));
    }
}