package com.yashwanth.ai_exam_system.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

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
import com.yashwanth.ai_exam_system.service.EmailNotificationOrchestrator;
import com.yashwanth.ai_exam_system.service.ExamQuestionSelectionService;
import com.yashwanth.ai_exam_system.service.Phase2VerificationService;
import com.yashwanth.ai_exam_system.service.CertificateService;

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
    private final EmailNotificationOrchestrator emailNotificationOrchestrator;
    private final Phase2VerificationService phase2VerificationService;
    private final CertificateService certificateService;
    private final ExamQuestionSelectionService questionSelectionService;

    public StudentExamController(
            ExamAttemptRepository examAttemptRepository,
            QuestionRepository questionRepository,
            StudentAnswerRepository studentAnswerRepository,
            ExamAttemptService examAttemptService,
            ExamEvaluationService examEvaluationService,
            ExamRepository examRepository,
            ExamRegistrationRepository examRegistrationRepository,
            UserRepository userRepository,
            EmailNotificationOrchestrator emailNotificationOrchestrator,
            Phase2VerificationService phase2VerificationService,
            CertificateService certificateService,
            ExamQuestionSelectionService questionSelectionService) {

        this.examAttemptRepository = examAttemptRepository;
        this.questionRepository = questionRepository;
        this.studentAnswerRepository = studentAnswerRepository;
        this.examAttemptService = examAttemptService;
        this.examEvaluationService = examEvaluationService;
        this.examRepository = examRepository;
        this.examRegistrationRepository = examRegistrationRepository;
        this.userRepository = userRepository;
        this.emailNotificationOrchestrator = emailNotificationOrchestrator;
        this.phase2VerificationService = phase2VerificationService;
        this.certificateService = certificateService;
        this.questionSelectionService = questionSelectionService;
    }

    // ================= START EXAM =================

    @PostMapping("/start/{examCode}/{studentId}")
    public ResponseEntity<Map<String, Object>> startExam(
            @PathVariable String examCode,
            @PathVariable Long studentId,
            Authentication auth) {

        Long authenticatedStudentId = getAuthenticatedStudentId(auth);
        if (!authenticatedStudentId.equals(studentId)) {
            throw new ForbiddenException("You can only start your own exam attempt");
        }
        boolean resumed = examAttemptRepository
                .findActiveAttempt(studentId, examCode, AttemptStatus.STARTED)
                .map(ExamAttempt::isActive)
                .orElse(false);
        ExamAttempt attempt = examAttemptService.startExam(studentId, examCode);
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        if (!resumed) {
            emailNotificationOrchestrator.notifyStudentExamStarted(student, exam, attempt);
        }
        return ResponseEntity.ok(toAttemptResponse(attempt, exam, resumed));
    }

    @PostMapping("/start/{examCode}")
    public ResponseEntity<Map<String, Object>> startExamForAuthenticatedStudent(
            @PathVariable String examCode,
            Authentication auth) {

        Long studentId = getAuthenticatedStudentId(auth);
        boolean resumed = examAttemptRepository
                .findActiveAttempt(studentId, examCode, AttemptStatus.STARTED)
                .map(ExamAttempt::isActive)
                .orElse(false);
        ExamAttempt attempt = examAttemptService.startExam(studentId, examCode);
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        return ResponseEntity.ok(toAttemptResponse(attempt, exam, resumed));
    }

    @PostMapping("/register/{examCode}")
    public ResponseEntity<?> registerExam(@PathVariable String examCode, Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!exam.isPublished() || !exam.isActive()) {
            throw new ForbiddenException("Only active published exams can be registered");
        }

        Optional<ExamRegistration> existing = examRegistrationRepository
                .findByStudentIdAndExamCodeAndActiveTrue(studentId, examCode);

        if (existing.isPresent()) {
            return ResponseEntity.ok(toRegistrationResponse(existing.get(), exam, true));
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
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        emailNotificationOrchestrator.notifyStudentRegistered(student, exam, "PHASE1");

        return ResponseEntity.ok(toRegistrationResponse(registration, exam, false));
    }

    @GetMapping("/registration-status/{examCode}")
    public ResponseEntity<?> getRegistrationStatus(@PathVariable String examCode, Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        Optional<ExamRegistration> registration = examRegistrationRepository
                .findByStudentIdAndExamCodeAndActiveTrue(studentId, examCode);
        boolean isRegistered = registration.isPresent();
        boolean hasLiveAttempt = examAttemptRepository
                .findActiveAttempt(studentId, examCode, AttemptStatus.STARTED)
                .map(ExamAttempt::isActive)
                .orElse(false);
        boolean canEnter = isRegistered && exam.canAttempt();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("examCode", examCode);
        response.put("studentId", studentId);
        response.put("isRegistered", isRegistered);
        response.put("registered", isRegistered);
        response.put("examPublished", exam.isPublished());
        response.put("examActive", exam.isActive());
        response.put("registrationOpen", exam.isRegistrationOpen());
        response.put("currentPhase", exam.getCurrentRegistrationPhase().name());
        response.put("requiresPhase2Verification", exam.requiresPhase2Verification());
        response.put("phase2Verified", registration.map(ExamRegistration::getPhase2Verified).orElse(false));
        response.put("canRegister", !isRegistered && exam.isRegistrationOpen());
        response.put("canEnter", canEnter);
        response.put("hasLiveAttempt", hasLiveAttempt);
        registration.ifPresent(value -> response.put("registration", toRegistrationMap(value)));

        if (exam.getStartTime() != null) {
            response.put("examStartTime", exam.getStartTime());
            response.put("examEndTime", exam.getEndTime());
            response.put("registrationStartTime", exam.getRegistrationStartTime());
            response.put("phase1EndTime", exam.getPhase1EndTime());
            response.put("phase2StartTime", exam.getPhase2StartTime());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/register-phase2/{examCode}")
    public ResponseEntity<?> registerExamPhase2(@PathVariable String examCode,
                                               @RequestBody Map<String, Object> verificationData,
                                               Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        String verificationCode = String.valueOf(verificationData.getOrDefault("verificationCode", "")).trim();
        String verificationToken = String.valueOf(verificationData.getOrDefault("verificationToken", "")).trim();

        Map<String, Object> response = verificationToken.isBlank()
                ? phase2VerificationService.completeRegistrationWithOtp(studentId, examCode, verificationCode)
                : phase2VerificationService.completeRegistrationWithToken(examCode, verificationToken);

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        Long registeredStudentId = response.get("studentId") instanceof Number
                ? ((Number) response.get("studentId")).longValue()
                : studentId;
        User student = userRepository.findById(registeredStudentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        emailNotificationOrchestrator.notifyStudentRegistered(student, exam, "PHASE2");

        if (exam.getStartTime() != null) {
            response.put("examStartsAt", exam.getStartTime());
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/phase2/send/{examCode}")
    public ResponseEntity<?> sendPhase2VerificationEmail(@PathVariable String examCode,
                                                         Authentication auth,
                                                         jakarta.servlet.http.HttpServletRequest request) {
        Long studentId = getAuthenticatedStudentId(auth);
        String requestBaseUrl = ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath(request.getContextPath())
                .replaceQuery(null)
                .build()
                .toUriString();
        Map<String, Object> response = phase2VerificationService.sendVerificationEmail(studentId, examCode, requestBaseUrl);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/registrations")
    public ResponseEntity<Map<String, Object>> getMyRegistrations(Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        List<ExamRegistration> rows = examRegistrationRepository.findByStudentIdAndActiveTrue(studentId);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("studentId", studentId);
        response.put("registrations", rows.stream().map(this::toRegistrationMap).collect(Collectors.toList()));
        response.put("examCodes", rows.stream().map(ExamRegistration::getExamCode).collect(Collectors.toList()));
        return ResponseEntity.ok(response);
    }

    // ================= LOAD QUESTIONS =================

    @GetMapping("/{examCode}/questions")
    public ResponseEntity<?> loadQuestions(@PathVariable String examCode, Authentication auth) {
        Long studentId = getAuthenticatedStudentId(auth);
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        boolean isRegistered = examRegistrationRepository
                .findByStudentIdAndExamCode(studentId, examCode)
                .map(ExamRegistration::getActive)
                .orElse(false);
        boolean hasActiveAttempt = examAttemptRepository
                .findActiveAttempt(studentId, examCode, AttemptStatus.STARTED)
                .isPresent();

        if (!isRegistered && !hasActiveAttempt) {
            throw new ForbiddenException("Please register for the exam or start an active session before loading questions");
        }

        Long attemptSeed = examAttemptRepository.findActiveAttempt(studentId, examCode, AttemptStatus.STARTED)
                .map(ExamAttempt::getId)
                .orElse(null);
        List<Question> questions = questionSelectionService.selectQuestionsForExam(exam, studentId, attemptSeed);
        List<QuestionResponse> response = questions.stream()
                .map(question -> toStudentQuestionResponse(question, exam, studentId, attemptSeed))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // ================= SAVE ANSWER =================

    @PostMapping("/save-answer")
    public ResponseEntity<Map<String, Object>> saveAnswer(@Valid @RequestBody SaveAnswerRequest request, Authentication auth) {

        Long authenticatedStudentId = getAuthenticatedStudentId(auth);
        ExamAttempt attempt = examAttemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only save answers for your own attempt");
        }

        if (attempt.getStatus() != AttemptStatus.STARTED) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("saved", false);
            response.put("message", "Exam already submitted");
            return ResponseEntity.badRequest().body(response);
        }

        if (attempt.getExpiryTime() != null &&
                LocalDateTime.now().isAfter(attempt.getExpiryTime())) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("saved", false);
            response.put("message", "Exam time expired");
            return ResponseEntity.badRequest().body(response);
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

        StudentAnswer saved = studentAnswerRepository.save(answer);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("saved", true);
        response.put("attemptId", saved.getAttemptId());
        response.put("questionId", saved.getQuestionId());
        response.put("status", saved.getStatus());
        response.put("reviewMarked", saved.getReviewMarked());
        response.put("lastUpdated", saved.getLastUpdated());
        return ResponseEntity.ok(response);
    }

    // ================= SUBMIT EXAM =================

    @PostMapping("/submit/{attemptId}")
    public ResponseEntity<Map<String, Object>> submitExam(@PathVariable Long attemptId, Authentication auth) {

        Long authenticatedStudentId = getAuthenticatedStudentId(auth);
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only submit your own attempt");
        }

        if (attempt.getStatus() != AttemptStatus.STARTED) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("submitted", false);
            response.put("attemptId", attemptId);
            response.put("message", "Exam already submitted");
            return ResponseEntity.badRequest().body(response);
        }

        ExamResult result = examEvaluationService.evaluateExam(
                attemptId,
                attempt.getStudentId(),
                attempt.getExamCode()
        );

        Exam exam = examRepository.findByExamCode(attempt.getExamCode())
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        int totalMarks = questionSelectionService.selectQuestionsForExam(exam, authenticatedStudentId, attempt.getId())
                .stream()
                .mapToInt(question -> question.getMarks() == null ? 0 : question.getMarks())
                .sum();

        Long timeTakenSeconds = attempt.getStartTime() != null
                ? java.time.Duration.between(attempt.getStartTime(), LocalDateTime.now()).getSeconds()
                : result.getTimeTakenSeconds();

        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setEndTime(LocalDateTime.now());
        attempt.setObtainedMarks((int) result.getScore());
        attempt.setTotalMarks(totalMarks);
        attempt.setScore(result.getScore());
        attempt.setPercentage(result.getPercentage());
        attempt.setTimeTakenSeconds(timeTakenSeconds);
        attempt.setGrade(result.getGrade());

        examAttemptRepository.save(attempt);
        User student = userRepository.findById(authenticatedStudentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        if (Boolean.TRUE.equals(result.getPassed())) {
            double certificateScore = result.getPercentage();
            if (certificateScore <= 0) {
                certificateScore = result.getScore();
            }
            try {
                certificateService.ensureCertificateIssued(
                        authenticatedStudentId,
                        attempt.getExamCode(),
                        exam.getTitle(),
                        certificateScore,
                        "");
            } catch (Exception certError) {
                System.err.println("Certificate generation failed for attemptId="
                        + attemptId + ", studentId=" + authenticatedStudentId
                        + ": " + certError.getMessage());
            }
        }
        emailNotificationOrchestrator.notifyExamSubmitted(student, exam, attempt, result);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", result.getId());
        response.put("attemptId", result.getAttemptId());
        response.put("studentId", result.getStudentId());
        response.put("examCode", result.getExamCode());
        response.put("totalQuestions", result.getTotalQuestions());
        response.put("correctAnswers", result.getCorrectAnswers());
        response.put("wrongAnswers", result.getWrongAnswers());
        response.put("unansweredQuestions", result.getUnansweredQuestions());
        response.put("score", result.getScore());
        response.put("percentage", result.getPercentage());
        response.put("resultStatus", result.getResultStatus());
        response.put("passed", result.getPassed());
        response.put("timeTakenSeconds", timeTakenSeconds);
        response.put("submittedAt", result.getSubmittedAt());
        response.put("evaluatedAt", result.getEvaluatedAt());
        return ResponseEntity.ok(response);
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

    private QuestionResponse toStudentQuestionResponse(Question q, Exam exam, Long studentId, Long attemptId) {
        QuestionResponse response = new QuestionResponse();
        response.setId(q.getId());
        response.setQuestionText(q.getQuestionText());
        List<String> options = orderedOptionsForStudent(q, exam, studentId, attemptId);
        response.setOptionA(optionAt(options, 0));
        response.setOptionB(optionAt(options, 1));
        response.setOptionC(optionAt(options, 2));
        response.setOptionD(optionAt(options, 3));
        response.setOptionE(optionAt(options, 4));
        response.setOptionF(optionAt(options, 5));
        response.setQuestionType(q.getQuestionType() != null ? q.getQuestionType().name() : null);
        response.setMarks(q.getMarks());
        response.setDifficulty(q.getDifficulty());
        response.setTopic(q.getTopic());
        response.setShuffleOptions(false);
        response.setDisplayOrder(q.getDisplayOrder());
        response.setSampleInput(q.getSampleInput());
        response.setSampleOutput(q.getSampleOutput());
        return response;
    }

    private List<String> orderedOptionsForStudent(Question question, Exam exam, Long studentId, Long attemptId) {
        List<String> options = new ArrayList<>();
        addOption(options, question.getOptionA());
        addOption(options, question.getOptionB());
        addOption(options, question.getOptionC());
        addOption(options, question.getOptionD());
        addOption(options, question.getOptionE());
        addOption(options, question.getOptionF());
        if (options.size() <= 1) {
            return options;
        }
        boolean shouldShuffle = Boolean.TRUE.equals(exam.getShuffleOptions())
                && !Boolean.FALSE.equals(question.getShuffleOptions());
        if (shouldShuffle) {
            Collections.shuffle(options, new Random(seedFor(exam.getExamCode(), studentId, attemptId, question.getId(), "OPTIONS")));
        }
        return options;
    }

    private void addOption(List<String> options, String value) {
        if (value != null && !value.trim().isEmpty()) {
            options.add(value.trim());
        }
    }

    private String optionAt(List<String> options, int index) {
        return options != null && index >= 0 && index < options.size() ? options.get(index) : null;
    }

    private long seedFor(Object... parts) {
        String raw = java.util.Arrays.stream(parts)
                .map(String::valueOf)
                .collect(Collectors.joining(":"));
        return raw.hashCode() & 0xffffffffL;
    }

    private Map<String, Object> toRegistrationMap(ExamRegistration registration) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", registration.getId());
        map.put("studentId", registration.getStudentId());
        map.put("examId", registration.getExamId());
        map.put("examCode", registration.getExamCode());
        map.put("active", registration.getActive());
        map.put("source", registration.getSource());
        map.put("registrationPhase", registration.getRegistrationPhase());
        map.put("phase2Verified", registration.getPhase2Verified());
        map.put("phase2VerifiedAt", registration.getPhase2VerifiedAt());
        map.put("registeredAt", registration.getRegisteredAt());
        map.put("createdAt", registration.getCreatedAt());
        map.put("updatedAt", registration.getUpdatedAt());
        return map;
    }

    private Map<String, Object> toRegistrationResponse(ExamRegistration registration, Exam exam, boolean alreadyRegistered) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("registered", true);
        response.put("alreadyRegistered", alreadyRegistered);
        response.put("studentId", registration.getStudentId());
        response.put("examCode", registration.getExamCode());
        response.put("registrationId", registration.getId());
        response.put("registeredAt", registration.getRegisteredAt());
        response.put("registrationPhase", registration.getRegistrationPhase());
        response.put("currentPhase", exam.getCurrentRegistrationPhase().name());
        response.put("phase2Verified", Boolean.TRUE.equals(registration.getPhase2Verified()));
        response.put("requiresPhase2Verification", exam.requiresPhase2Verification());
        response.put("registrationStartTime", exam.getRegistrationStartTime());
        response.put("phase1EndTime", exam.getPhase1EndTime());
        response.put("phase2StartTime", exam.getPhase2StartTime());
        response.put("examStartsAt", exam.getStartTime());
        response.put("examEndsAt", exam.getEndTime());
        response.put("canEnter", exam.canAttempt());
        response.put("registration", toRegistrationMap(registration));
        return response;
    }

    private Map<String, Object> toAttemptResponse(ExamAttempt attempt, Exam exam, boolean resumed) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", attempt.getId());
        response.put("attemptId", attempt.getId());
        response.put("examId", attempt.getExamId());
        response.put("examCode", attempt.getExamCode());
        response.put("examTitle", exam.getTitle());
        response.put("studentId", attempt.getStudentId());
        response.put("status", attempt.getStatus() != null ? attempt.getStatus().name() : "STARTED");
        response.put("attemptNumber", attempt.getAttemptNumber());
        response.put("maxAttempts", exam.getMaxAttempts());
        response.put("startTime", attempt.getStartTime());
        response.put("endTime", attempt.getEndTime());
        response.put("expiryTime", attempt.getExpiryTime());
        response.put("durationMinutes", attempt.getDurationMinutes());
        response.put("active", attempt.getActive());
        response.put("resumed", resumed);
        response.put("canEnter", attempt.isActive());
        response.put("examUrl", "exam/exam.html?code=" + attempt.getExamCode() + "&attemptId=" + attempt.getId());
        return response;
    }

}
