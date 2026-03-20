package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamStatus;
import com.yashwanth.ai_exam_system.repository.ExamRepository;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ExamService {

    private final ExamRepository examRepository;

    public ExamService(ExamRepository examRepository) {
        this.examRepository = examRepository;
    }

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
    
    public Exam updateExam(String examCode, ExamRequest request) {

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        // Update fields
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

    public List<Exam> getTeacherExams(Authentication auth) {
        return examRepository.findByCreatedBy(auth.getName());
    }

    public Exam publishExam(String examCode) {

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        if(!exam.getQuestionsUploaded()){
            throw new RuntimeException("Upload questions before publishing exam");
        }

        exam.setStatus(ExamStatus.PUBLISHED);

        return examRepository.save(exam);
    }
}