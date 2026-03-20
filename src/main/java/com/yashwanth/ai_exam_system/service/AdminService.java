package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.repository.*;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ProctoringLogRepository proctoringLogRepository;

    public AdminService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            ProctoringLogRepository proctoringLogRepository) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.proctoringLogRepository = proctoringLogRepository;
    }

    // ✅ GET ALL EXAMS
    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }

    // ✅ DELETE EXAM (SOFT DELETE - BEST PRACTICE)
    public void deleteExam(String examCode) {

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        exam.setActive(false); // IMPORTANT
        examRepository.save(exam);
    }

    // ✅ GET ALL ATTEMPTS
    public List<ExamAttempt> getAllAttempts() {
        return attemptRepository.findAll();
    }

    // ✅ FILTER BY EXAM
    public List<ExamAttempt> getAttemptsByExam(String examCode) {
        return attemptRepository.findByExamCode(examCode);
    }

    // ✅ FILTER BY STUDENT
    public List<ExamAttempt> getAttemptsByStudent(Long studentId) {
        return attemptRepository.findByStudentId(studentId);
    }

    // ✅ CHEATING LOGS
    public List<ProctoringLog> getAllCheatingLogs() {
        return proctoringLogRepository.findAll();
    }
}