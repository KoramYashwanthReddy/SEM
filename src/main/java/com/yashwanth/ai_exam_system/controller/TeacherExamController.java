package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.service.ExamService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/exams")
public class TeacherExamController {

    private final ExamService examService;

    public TeacherExamController(ExamService examService) {
        this.examService = examService;
    }

    // ✅ CREATE EXAM
    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<Exam> createExam(
            @Valid @RequestBody ExamRequest request,
            Authentication auth) {

        Exam exam = examService.createExam(request, auth);
        return ResponseEntity.ok(exam);
    }

    // ✅ GET ALL EXAMS CREATED BY TEACHER
    @GetMapping
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<List<Exam>> getMyExams(Authentication auth) {

        List<Exam> exams = examService.getTeacherExams(auth);
        return ResponseEntity.ok(exams);
    }

    // ✅ PUBLISH EXAM
    @PutMapping("/{examCode}/publish")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<Exam> publishExam(@PathVariable String examCode) {

        Exam exam = examService.publishExam(examCode);
        return ResponseEntity.ok(exam);
    }

    // ✅ UPDATE EXAM (IMPORTANT FEATURE)
    @PutMapping("/{examCode}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<Exam> updateExam(
            @PathVariable String examCode,
            @Valid @RequestBody ExamRequest request) {

        Exam updatedExam = examService.updateExam(examCode, request);
        return ResponseEntity.ok(updatedExam);
    }
}