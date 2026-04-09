package com.yashwanth.ai_exam_system.controller;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yashwanth.ai_exam_system.dto.QuestionResponse;
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

        if (!exam.isRegistrationOpen()) {
            throw new ForbiddenException("Registration is not open for this exam");
        }
        if (exam.requiresPhase2Verification()) {
            throw new ForbiddenException("Phase 2 is active. Complete additional verification to register.");
        }

        if (exam.getEndTime() != null && LocalDateTime.now().isAfter(exam.getEndTime())) {
            throw new ForbiddenException("Exam window is closed");
        }

        // Check if already registered
        boolean alreadyRegistered = examRegistrationRepository
                .findByStudentIdAndExamCode(studentId, examCode)
                .isPresent();

        if (alreadyRegistered) {
            throw new ForbiddenException("You are already registered for this exam");
        }

        ExamRegistration registration = new ExamRegistration();
        registration.setStudentId(studentId);
        registration.setExamId(exam.getId());
        registration.setExamCode(examCode);
        registration.setActive(true);
        registration.setSource("STUDENT_UI");
        registration.setRegistrationPhase("PHASE1");
        registration.setPhase2Verified(false);
        registration.setRegisteredAt(LocalDateTime.now());
        examRegistrationRepository.save(registration);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("registered", true);
        response.put("studentId", studentId);
        response.put("examCode", examCode);
        response.put("registrationId", registration.getId());
        response.put("registeredAt", registration.getRegisteredAt());
        response.put("registrationPhase", exam.getCurrentRegistrationPhase().name());

        if (exam.getStartTime() != null) {
            response.put("registrationStartTime", exam.getRegistrationStartTime());
            response.put("phase1EndTime", exam.getPhase1EndTime());
            response.put("phase2StartTime", exam.getPhase2StartTime());
            response.put("examStartsAt", exam.getStartTime());
            response.put("requiresPhase2Verification", exam.requiresPhase2Verification());
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/registration-status/{examCode}")
    public ResponseEntity<?> getRegistrationStatus(@PathVariable String examCode, Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        boolean isRegistered = examRegistrationRepository
                .findByStudentIdAndExamCode(studentId, examCode)
                .isPresent();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("examCode", examCode);
        response.put("studentId", studentId);
        response.put("isRegistered", isRegistered);
        response.put("examPublished", exam.isPublished());
        response.put("examActive", exam.isActive());
        response.put("registrationOpen", exam.isRegistrationOpen());
        response.put("currentPhase", exam.getCurrentRegistrationPhase().name());

        if (exam.getStartTime() != null) {
            response.put("examStartTime", exam.getStartTime());
            response.put("registrationStartTime", exam.getRegistrationStartTime());
            response.put("phase1EndTime", exam.getPhase1EndTime());
            response.put("phase2StartTime", exam.getPhase2StartTime());
            response.put("requiresPhase2Verification", exam.requiresPhase2Verification());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/register-phase2/{examCode}")
    public ResponseEntity<?> registerExamPhase2(@PathVariable String examCode,
                                               @RequestBody Map<String, Object> verificationData,
                                               Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!exam.isPublished() || !exam.isActive()) {
            throw new ForbiddenException("Only active published exams can be registered");
        }
        if (!exam.isRegistrationOpen() || !exam.isInPhase2()) {
            throw new ForbiddenException("Phase 2 registration is not available at this time");
        }
        if (!exam.requiresPhase2Verification()) {
            throw new ForbiddenException("Phase 2 verification is not enabled for this exam");
        }

        boolean alreadyRegistered = examRegistrationRepository
                .findByStudentIdAndExamCode(studentId, examCode)
                .isPresent();
        if (alreadyRegistered) {
            throw new ForbiddenException("You are already registered for this exam");
        }

        String verificationCode = String.valueOf(verificationData.getOrDefault("verificationCode", "")).trim();
        if (verificationCode.isBlank()) {
            throw new ForbiddenException("Verification code is required for Phase 2 registration");
        }
        if (verificationCode.length() < 6) {
            throw new ForbiddenException("Verification code must be at least 6 characters");
        }

        ExamRegistration registration = new ExamRegistration();
        registration.setStudentId(studentId);
        registration.setExamId(exam.getId());
        registration.setExamCode(examCode);
        registration.setActive(true);
        registration.setSource("STUDENT_UI_PHASE2");
        registration.setRegistrationPhase("PHASE2");
        registration.setPhase2Verified(true);
        registration.setPhase2VerificationMethod("CODE");
        registration.setPhase2VerificationCodeHash(hashVerificationCode(verificationCode));
        registration.setPhase2VerifiedAt(LocalDateTime.now());
        registration.setRegisteredAt(LocalDateTime.now());
        examRegistrationRepository.save(registration);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("registered", true);
        response.put("studentId", studentId);
        response.put("examCode", examCode);
        response.put("registrationId", registration.getId());
        response.put("registeredAt", registration.getRegisteredAt());
        response.put("registrationPhase", registration.getRegistrationPhase());
        response.put("phase2Verified", registration.getPhase2Verified());
        response.put("phase2VerifiedAt", registration.getPhase2VerifiedAt());
        if (exam.getStartTime() != null) {
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
        Long studentId = getAuthenticatedStudentId(auth);
        boolean isRegistered = examRegistrationRepository
                .findByStudentIdAndExamCode(studentId, examCode)
                .map(ExamRegistration::getActive)
                .orElse(false);
        if (!isRegistered) {
            throw new ForbiddenException("Please register for the exam before loading questions");
        }

        List<Question> questions = questionRepository.findByExamCodeAndActiveTrue(examCode);
        questions.sort(Comparator.comparing((Question question) -> Optional.ofNullable(question.getDisplayOrder()).orElse(Integer.MAX_VALUE))
                .thenComparing(Question::getId));
        List<QuestionResponse> response = questions.stream()
                .map(this::toStudentQuestionResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
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

    private QuestionResponse toStudentQuestionResponse(Question q) {
        QuestionResponse response = new QuestionResponse();
        response.setId(q.getId());
        response.setQuestionText(q.getQuestionText());
        response.setOptionA(q.getOptionA());
        response.setOptionB(q.getOptionB());
        response.setOptionC(q.getOptionC());
        response.setOptionD(q.getOptionD());
        response.setOptionE(q.getOptionE());
        response.setOptionF(q.getOptionF());
        response.setQuestionType(q.getQuestionType() != null ? q.getQuestionType().name() : null);
        response.setMarks(q.getMarks());
        response.setDifficulty(q.getDifficulty());
        response.setTopic(q.getTopic());
        response.setShuffleOptions(q.getShuffleOptions());
        response.setDisplayOrder(q.getDisplayOrder());
        response.setSampleInput(q.getSampleInput());
        response.setSampleOutput(q.getSampleOutput());
        return response;
    }

    private String hashVerificationCode(String verificationCode) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(verificationCode.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new ForbiddenException("Unable to process verification code at this time");
        }
    }

}
