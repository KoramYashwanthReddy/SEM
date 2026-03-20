package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamStatus;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ExamService {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final CheatingDetectionService cheatingDetectionService;

    public ExamService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            CheatingDetectionService cheatingDetectionService) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.cheatingDetectionService = cheatingDetectionService;
    }

    // ✅ CREATE EXAM
    public Exam createExam(ExamRequest request, Authentication auth) {

        Exam exam = new Exam();

        exam.setExamCode("EXAM-" + UUID.randomUUID().toString().substring(0,8));

        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setSubject(request.getSubject());
        exam.setDurationMinutes(request.getDurationMinutes());
        exam.setTotalMarks(request.getTotalMarks());
        exam.setPassingMarks(request.getPassingMarks());
        exam.setMaxAttempts(request.getMaxAttempts());

        exam.setMarksPerQuestion(request.getMarksPerQuestion());
        exam.setNegativeMarks(request.getNegativeMarks());

        exam.setShuffleQuestions(request.getShuffleQuestions());
        exam.setShuffleOptions(request.getShuffleOptions());

        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());

        exam.setCreatedBy(auth.getName());
        exam.setCreatedAt(LocalDateTime.now());
        exam.setUpdatedAt(LocalDateTime.now());

        exam.setStatus(ExamStatus.DRAFT);
        exam.setQuestionsUploaded(false);

        exam.setMcqCount(0);
        exam.setCodingCount(0);
        exam.setDescriptiveCount(0);

        exam.setActive(true);

        return examRepository.save(exam);
    }

    // ✅ UPDATE EXAM
    public Exam updateExam(String examCode, ExamRequest request) {

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setSubject(request.getSubject());
        exam.setDurationMinutes(request.getDurationMinutes());
        exam.setTotalMarks(request.getTotalMarks());
        exam.setPassingMarks(request.getPassingMarks());

        exam.setMarksPerQuestion(request.getMarksPerQuestion());
        exam.setNegativeMarks(request.getNegativeMarks());

        exam.setShuffleQuestions(request.getShuffleQuestions());
        exam.setShuffleOptions(request.getShuffleOptions());

        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());

        exam.setUpdatedAt(LocalDateTime.now());

        return examRepository.save(exam);
    }

    // ✅ GET TEACHER EXAMS
    public List<Exam> getTeacherExams(Authentication auth) {
        return examRepository.findByCreatedBy(auth.getName());
    }

    // ✅ PUBLISH EXAM
    public Exam publishExam(String examCode) {

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        if (!exam.getQuestionsUploaded()) {
            throw new RuntimeException("Upload questions before publishing exam");
        }

        exam.setStatus(ExamStatus.PUBLISHED);

        return examRepository.save(exam);
    }

    // 🚀🔥 NEW: SUBMIT EXAM + AI DETECTION
    public String submitExam(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        // Prevent duplicate submission
        if ("SUBMITTED".equals(attempt.getStatus()) ||
            "INVALIDATED".equals(attempt.getStatus())) {
            return "Exam already submitted";
        }

        // Mark as submitted
        attempt.setStatus("SUBMITTED");
        attempt.setEndTime(LocalDateTime.now());

        attemptRepository.save(attempt);

        // 🔥 AI CHEATING DETECTION TRIGGER
        cheatingDetectionService.analyzeAttempt(attemptId);

        return "Exam submitted successfully";
    }
}