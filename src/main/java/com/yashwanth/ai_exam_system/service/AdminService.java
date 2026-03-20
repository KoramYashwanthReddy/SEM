package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.repository.*;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ProctoringEventRepository proctoringEventRepository;

    public AdminService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            ProctoringEventRepository proctoringEventRepository) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.proctoringEventRepository = proctoringEventRepository;
    }

    // ✅ GET ALL EXAMS
    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }

    // ✅ DELETE EXAM (SOFT DELETE)
    public void deleteExam(String examCode) {
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        exam.setActive(false);
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

    // 🔥 UPDATED: GET ALL CHEATING EVENTS
    public List<ProctoringEvent> getAllCheatingLogs() {
        return proctoringEventRepository.findAll();
    }

    // 🔥 NEW: Get events by attempt (VERY USEFUL)
    public List<ProctoringEvent> getEventsByAttempt(Long attemptId) {
        return proctoringEventRepository.findByAttemptId(attemptId);
    }

    // 🔥 NEW: Get cheating score for attempt
    public Integer getCheatingScore(Long attemptId) {
        return proctoringEventRepository.getTotalSeverityScore(attemptId);
    }
}