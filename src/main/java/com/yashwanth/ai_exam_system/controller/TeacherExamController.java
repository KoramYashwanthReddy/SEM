package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.service.ExamService;

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

    @PostMapping("/create")
    @PreAuthorize("hasRole('TEACHER')")
    public Exam createExam(@RequestBody ExamRequest request,
                           Authentication auth) {

        return examService.createExam(request, auth);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('TEACHER')")
    public List<Exam> myExams(Authentication auth) {

        return examService.getTeacherExams(auth);
    }

    @PutMapping("/{examCode}/publish")
    @PreAuthorize("hasRole('TEACHER')")
    public Exam publishExam(@PathVariable String examCode) {

        return examService.publishExam(examCode);
    }
}