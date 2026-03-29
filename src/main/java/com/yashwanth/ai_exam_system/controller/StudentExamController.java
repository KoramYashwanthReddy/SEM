package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.SaveAnswerRequest;
import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.repository.*;
import com.yashwanth.ai_exam_system.service.ExamEvaluationService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/student/exam")
public class StudentExamController {

    private final ExamAttemptRepository examAttemptRepository;
    private final QuestionRepository questionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final ExamEvaluationService examEvaluationService;
    private final ExamRepository examRepository;

    public StudentExamController(
            ExamAttemptRepository examAttemptRepository,
            QuestionRepository questionRepository,
            StudentAnswerRepository studentAnswerRepository,
            ExamEvaluationService examEvaluationService,
            ExamRepository examRepository) {

        this.examAttemptRepository = examAttemptRepository;
        this.questionRepository = questionRepository;
        this.studentAnswerRepository = studentAnswerRepository;
        this.examEvaluationService = examEvaluationService;
        this.examRepository = examRepository;
    }

    // ================= START EXAM =================

    @PostMapping("/start/{examCode}/{studentId}")
    public ResponseEntity<?> startExam(
            @PathVariable String examCode,
            @PathVariable Long studentId) {

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        // prevent duplicate active attempt
        var active = examAttemptRepository.findActiveAttempt(
                studentId,
                examCode,
                AttemptStatus.STARTED
        );

        if (active.isPresent()) {
            return ResponseEntity.ok(active.get());
        }

        LocalDateTime now = LocalDateTime.now();

        ExamAttempt attempt = new ExamAttempt();
        attempt.setExamId(exam.getId());
        attempt.setExamCode(examCode);
        attempt.setStudentId(studentId);
        attempt.setStatus(AttemptStatus.STARTED);
        attempt.setStartTime(now);
        attempt.setDurationMinutes(exam.getDurationMinutes());
        attempt.setExpiryTime(now.plusMinutes(exam.getDurationMinutes()));

        examAttemptRepository.save(attempt);

        return ResponseEntity.ok(attempt);
    }

    // ================= LOAD QUESTIONS =================

    @GetMapping("/{examCode}/questions")
    public ResponseEntity<?> loadQuestions(@PathVariable String examCode) {

        List<Question> questions = questionRepository.findByExamCode(examCode);
        return ResponseEntity.ok(questions);
    }

    // ================= SAVE ANSWER =================

    @PostMapping("/save-answer")
    public ResponseEntity<?> saveAnswer(@RequestBody SaveAnswerRequest request) {

        ExamAttempt attempt = examAttemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));

        if (attempt.getStatus() != AttemptStatus.STARTED) {
            return ResponseEntity.badRequest().body("Exam already submitted");
        }

        if (attempt.getExpiryTime() != null &&
                LocalDateTime.now().isAfter(attempt.getExpiryTime())) {
            return ResponseEntity.badRequest().body("Exam time expired");
        }

        StudentAnswer answer =
                studentAnswerRepository
                        .findByAttemptIdAndQuestionId(
                                request.getAttemptId(),
                                request.getQuestionId()
                        )
                        .orElse(new StudentAnswer());

        answer.setAttemptId(request.getAttemptId());
        answer.setQuestionId(request.getQuestionId());
        answer.setAnswer(request.getAnswer());

        boolean reviewMarked = Boolean.TRUE.equals(request.getReviewMarked());
        answer.setReviewMarked(reviewMarked);

        if (reviewMarked) {
            answer.setStatus("MARKED_FOR_REVIEW");
        } else if (request.getAnswer() != null && !request.getAnswer().isEmpty()) {
            answer.setStatus("ANSWERED");
        } else {
            answer.setStatus("NOT_ANSWERED");
        }

        answer.setLastUpdated(LocalDateTime.now());

        studentAnswerRepository.save(answer);

        return ResponseEntity.ok(answer);
    }

    // ================= SUBMIT EXAM =================

    @PostMapping("/submit/{attemptId}")
    public ResponseEntity<?> submitExam(@PathVariable Long attemptId) {

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if (attempt.getStatus() != AttemptStatus.STARTED) {
            return ResponseEntity.badRequest().body("Exam already submitted");
        }

        ExamResult result = examEvaluationService.evaluateExam(
                attemptId,
                attempt.getStudentId(),
                attempt.getExamCode()
        );

        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setEndTime(LocalDateTime.now());
        attempt.setObtainedMarks((int) result.getScore());
        attempt.setTotalMarks(result.getTotalQuestions());

        examAttemptRepository.save(attempt);

        return ResponseEntity.ok(result);
    }
}