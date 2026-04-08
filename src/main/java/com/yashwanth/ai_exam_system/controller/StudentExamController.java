package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.SaveAnswerRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamRegistration;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRegistrationRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import com.yashwanth.ai_exam_system.repository.StudentAnswerRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.ExamAttemptService;
import com.yashwanth.ai_exam_system.service.ExamEvaluationService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student/exam")
@PreAuthorize("hasRole('STUDENT')")
public class StudentExamController {

    private final ExamAttemptRepository examAttemptRepository;
    private final QuestionRepository questionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final ExamAttemptService examAttemptService;
    private final ExamEvaluationService examEvaluationService;
    private final ExamRepository examRepository;
    private final ExamRegistrationRepository examRegistrationRepository;
    private final UserRepository userRepository;

    public StudentExamController(
            ExamAttemptRepository examAttemptRepository,
            QuestionRepository questionRepository,
            StudentAnswerRepository studentAnswerRepository,
            ExamAttemptService examAttemptService,
            ExamEvaluationService examEvaluationService,
            ExamRepository examRepository,
            ExamRegistrationRepository examRegistrationRepository,
            UserRepository userRepository) {

        this.examAttemptRepository = examAttemptRepository;
        this.questionRepository = questionRepository;
        this.studentAnswerRepository = studentAnswerRepository;
        this.examAttemptService = examAttemptService;
        this.examEvaluationService = examEvaluationService;
        this.examRepository = examRepository;
        this.examRegistrationRepository = examRegistrationRepository;
        this.userRepository = userRepository;
    }

    // ================= START EXAM =================

    @PostMapping("/start/{examCode}/{studentId}")
    public ResponseEntity<?> startExam(
            @PathVariable String examCode,
            @PathVariable Long studentId,
            Authentication auth) {

        Long authenticatedStudentId = getAuthenticatedStudentId(auth);
        if (!authenticatedStudentId.equals(studentId)) {
            throw new ForbiddenException("You can only start your own exam attempt");
        }
        return ResponseEntity.ok(examAttemptService.startExam(studentId, examCode));
    }

    @PostMapping("/register/{examCode}")
    public ResponseEntity<?> registerExam(@PathVariable String examCode, Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        if (!exam.isPublished() || !exam.isActive()) {
            throw new ForbiddenException("Only active published exams can be registered");
        }
        LocalDateTime now = LocalDateTime.now();
        if (exam.getStartTime() != null) {
            LocalDateTime registrationDeadline = exam.getStartTime().minusMinutes(30);
            if (!now.isBefore(registrationDeadline)) {
                throw new ForbiddenException("Registration closes 30 minutes before exam start time");
            }
        }
        if (exam.getEndTime() != null && LocalDateTime.now().isAfter(exam.getEndTime())) {
            throw new ForbiddenException("Exam window is closed");
        }

        ExamRegistration registration = examRegistrationRepository
                .findByStudentIdAndExamCode(studentId, examCode)
                .orElseGet(ExamRegistration::new);

        registration.setStudentId(studentId);
        registration.setExamId(exam.getId());
        registration.setExamCode(examCode);
        registration.setActive(true);
        registration.setSource("STUDENT_UI");
        registration.setRegisteredAt(LocalDateTime.now());
        examRegistrationRepository.save(registration);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("registered", true);
        response.put("studentId", studentId);
        response.put("examCode", examCode);
        response.put("registrationId", registration.getId());
        response.put("registeredAt", registration.getRegisteredAt());
        if (exam.getStartTime() != null) {
            response.put("registrationDeadline", exam.getStartTime().minusMinutes(30));
            response.put("verificationStartsAt", exam.getStartTime().minusMinutes(10));
            response.put("examStartsAt", exam.getStartTime());
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/registrations")
    public ResponseEntity<?> getMyRegistrations(Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        List<ExamRegistration> rows = examRegistrationRepository.findByStudentIdAndActiveTrue(studentId);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("studentId", studentId);
        response.put("registrations", rows);
        response.put("examCodes", rows.stream().map(ExamRegistration::getExamCode).collect(Collectors.toList()));
        return ResponseEntity.ok(response);
    }

    // ================= LOAD QUESTIONS =================

    @GetMapping("/{examCode}/questions")
    public ResponseEntity<?> loadQuestions(@PathVariable String examCode, Authentication auth) {
        getAuthenticatedStudentId(auth);

        List<Question> questions = questionRepository.findByExamCode(examCode);
        return ResponseEntity.ok(questions);
    }

    // ================= SAVE ANSWER =================

    @PostMapping("/save-answer")
    public ResponseEntity<?> saveAnswer(@RequestBody SaveAnswerRequest request, Authentication auth) {

        Long authenticatedStudentId = getAuthenticatedStudentId(auth);
        ExamAttempt attempt = examAttemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new RuntimeException("Exam attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only save answers for your own attempt");
        }

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
    public ResponseEntity<?> submitExam(@PathVariable Long attemptId, Authentication auth) {

        Long authenticatedStudentId = getAuthenticatedStudentId(auth);
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only submit your own attempt");
        }

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

    private Long getAuthenticatedStudentId(Authentication auth) {
        String identifier = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (identifier.isBlank()) {
            throw new ForbiddenException("Student authentication is required");
        }
        User user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
        if (user == null && identifier.matches("\\d+")) {
            user = userRepository.findById(Long.parseLong(identifier)).orElse(null);
        }
        if (user == null) {
            throw new ResourceNotFoundException("Authenticated student not found");
        }
        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only students can access student exam endpoints");
        }
        if (!user.isEnabled() || !user.isAccountNonLocked()) {
            throw new ForbiddenException("Please verify your account before accessing student exam");
        }
        return user.getId();
    }
}
