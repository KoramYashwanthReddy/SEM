package com.yashwanth.ai_exam_system.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yashwanth.ai_exam_system.dto.ExamNavigationStatusDTO;
import com.yashwanth.ai_exam_system.dto.ExamResultResponse;
import com.yashwanth.ai_exam_system.dto.ExamTimerResponse;
import com.yashwanth.ai_exam_system.dto.QuestionPaletteResponse;
import com.yashwanth.ai_exam_system.dto.StartExamRequest;
import com.yashwanth.ai_exam_system.dto.StudentAnswerResponse;
import com.yashwanth.ai_exam_system.dto.SubmitAnswerRequest;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.ExamAttemptService;
import com.yashwanth.ai_exam_system.service.ExamNavigationService;
import com.yashwanth.ai_exam_system.service.ExamService;

@RestController
@RequestMapping("/api/exam")
public class ExamAttemptController {

    private final ExamAttemptService examAttemptService;
    private final ExamService examService;
    private final ExamNavigationService navigationService; // 🔥 NEW
    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final UserRepository userRepository;

    public ExamAttemptController(
            ExamAttemptService examAttemptService,
            ExamService examService,
            ExamNavigationService navigationService,
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            UserRepository userRepository) {

        this.examAttemptService = examAttemptService;
        this.examService = examService;
        this.navigationService = navigationService;
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
    }

    // ✅ START EXAM
    @PostMapping("/start")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> startExam(@Valid @RequestBody StartExamRequest request, Authentication auth) {
        Long authenticatedStudentId = resolveAuthenticatedStudentId(auth);
        if (request.getStudentId() != null && !authenticatedStudentId.equals(request.getStudentId())) {
            throw new ForbiddenException("You can only start your own exam attempt");
        }

        ExamAttempt attempt = examAttemptService.startExam(
                authenticatedStudentId,
                request.getExamCode());

        return ResponseEntity.ok(toAttemptResponse(attempt));
    }

    // ✅ SAVE ANSWER
    @PostMapping("/submit-answer")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> submitAnswer(@Valid @RequestBody SubmitAnswerRequest request, Authentication auth) {
        Long authenticatedStudentId = resolveAuthenticatedStudentId(auth);
        ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only submit answers for your own attempt");
        }

        examAttemptService.submitAnswer(request);

        Map<String, Object> response = new HashMap<>();
        response.put("saved", true);
        response.put("attemptId", request.getAttemptId());
        response.put("questionId", request.getQuestionId());
        response.put("markForReview", Boolean.TRUE.equals(request.getMarkForReview()));
        return ResponseEntity.ok(response);
    }

    // 🚀 FINAL SUBMIT
    @PostMapping("/submit/{attemptId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> submitExam(@PathVariable Long attemptId, Authentication auth) {
        Long authenticatedStudentId = resolveAuthenticatedStudentId(auth);
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only submit your own attempt");
        }
        String message = examService.submitExam(attemptId);
        Map<String, Object> response = new HashMap<>();
        response.put("submitted", true);
        response.put("attemptId", attemptId);
        response.put("message", message);
        return ResponseEntity.ok(response);
    }

    // ✅ GET RESULT
    @GetMapping("/result/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ExamResultResponse getResult(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, true, true);
        return examAttemptService.generateResult(attemptId);
    }

    // ✅ QUESTION PALETTE
    @GetMapping("/palette/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public List<QuestionPaletteResponse> getPalette(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, true, true);
        return examAttemptService.getPalette(attemptId);
    }

    // ✅ EXAM TIMER
    @GetMapping("/timer/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ExamTimerResponse getTimer(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, true, true);
        return examAttemptService.getTimer(attemptId);
    }

    // ================= NEW FEATURES =================

    // 🔥 NAVIGATION STATUS
    @GetMapping("/navigation/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ExamNavigationStatusDTO getNavigation(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, true, true);
        return navigationService.getNavigationStatus(attemptId);
    }

    // 🔥 RESUME EXAM
    @GetMapping("/resume/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> resumeExam(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = examAttemptService.getAttempt(attemptId);
        ensureAttemptAccess(attempt, auth, true, true);
        return ResponseEntity.ok(toAttemptResponse(attempt));
    }

    // 🔥 FORCE SUBMIT (TIMER / ADMIN)
    @PostMapping("/force-submit/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> forceSubmit(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, false, true);
        String message = examService.submitExam(attemptId);
        Map<String, Object> response = new HashMap<>();
        response.put("submitted", true);
        response.put("attemptId", attemptId);
        response.put("message", message);
        return ResponseEntity.ok(response);
    }

    // 🔥 CANCEL ATTEMPT
    @PostMapping("/cancel/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> cancelAttempt(
            @PathVariable Long attemptId,
            @RequestParam(required = false, defaultValue = "Cancelled by teacher") String reason,
            Authentication auth) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, false, true);

        examAttemptService.cancelAttempt(attemptId, reason);
        Map<String, Object> response = new HashMap<>();
        response.put("cancelled", true);
        response.put("attemptId", attemptId);
        response.put("reason", reason);
        return ResponseEntity.ok(response);
    }

    // =========================================================
    // TEACHER ATTEMPTS OVERVIEW
    // =========================================================
    @GetMapping("/attempts")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public List<Map<String, Object>> getTeacherAttempts(Authentication auth) {
        boolean admin = auth != null && auth.getAuthorities() != null && auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> "ROLE_ADMIN".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role));

        List<String> examCodes = (admin
                ? examRepository.findAllActiveOrderByCreatedAtDesc()
                : examRepository
                        .findByCreatedByAndActiveTrueOrderByCreatedAtDesc(auth.getName() != null ? auth.getName() : ""))
                .stream()
                .map(com.yashwanth.ai_exam_system.entity.Exam::getExamCode)
                .collect(Collectors.toList());

        if (examCodes.isEmpty()) {
            return List.of();
        }

        return attemptRepository.findByExamCodeIn(examCodes)
                .stream()
                .map(this::toAttemptMap)
                .collect(Collectors.toList());
    }

    // 🔥 HEARTBEAT (ANTI CHEATING KEEP ALIVE)
    @PostMapping("/heartbeat/{attemptId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> heartbeat(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, true, false);

        examAttemptService.updateHeartbeat(attemptId);
        Map<String, Object> response = new HashMap<>();
        response.put("updated", true);
        response.put("attemptId", attemptId);
        response.put("message", "Heartbeat updated");
        return ResponseEntity.ok(response);
    }

    // ✅ LOAD SAVED ANSWERS
    @GetMapping("/answers/{attemptId}")
    @PreAuthorize("hasRole('STUDENT')")
    public List<StudentAnswerResponse> getAnswers(@PathVariable Long attemptId, Authentication auth) {
        Long authenticatedStudentId = resolveAuthenticatedStudentId(auth);
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only view answers for your own attempt");
        }
        return examAttemptService.getAnswers(attemptId);
    }

    // 🔥 MARK REVIEW ONLY
    @PostMapping("/mark-review")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> markReview(@Valid @RequestBody SubmitAnswerRequest request, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, true, false);

        examAttemptService.markForReview(
                request.getAttemptId(),
                request.getQuestionId());

        Map<String, Object> response = new HashMap<>();
        response.put("marked", true);
        response.put("attemptId", request.getAttemptId());
        response.put("questionId", request.getQuestionId());
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> toAttemptMap(ExamAttempt attempt) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", attempt.getId());
        map.put("attemptId", attempt.getId());
        map.put("examId", attempt.getExamId());
        map.put("examCode", attempt.getExamCode());
        String examTitle = attempt.getExamCode() != null
                ? examRepository.findByExamCode(attempt.getExamCode())
                        .map(com.yashwanth.ai_exam_system.entity.Exam::getTitle)
                        .orElse(attempt.getExamCode())
                : "-";
        map.put("examTitle", examTitle);
        map.put("studentId", attempt.getStudentId());

        String studentName = Optional.ofNullable(attempt.getStudentId())
                .flatMap(userRepository::findById)
                .map(User::getName)
                .orElse("Student " + Optional.ofNullable(attempt.getStudentId())
                        .map(String::valueOf)
                        .orElse(String.valueOf(attempt.getId())));
        map.put("studentName", studentName);
        map.put("score", attempt.getScore());
        map.put("percentage", attempt.getPercentage());
        map.put("timeTakenSeconds", attempt.getTimeTakenSeconds());
        map.put("timeTaken", attempt.getTimeTakenSeconds() != null
                ? Math.max(1, Math.round(attempt.getTimeTakenSeconds() / 60.0)) + " min"
                : "0 min");
        map.put("status", attempt.getStatus() != null ? attempt.getStatus().name() : "STARTED");
        map.put("cheatingScore", attempt.getCheatingScore());
        map.put("cheatingFlag", attempt.getCheatingFlag());
        map.put("riskLevel", riskLevel(attempt.getCheatingScore()));
        map.put("createdAt", attempt.getCreatedAt());
        map.put("startTime", attempt.getStartTime());
        map.put("endTime", attempt.getEndTime());
        map.put("remarks", attempt.getRemarks());
        return map;
    }

    private String riskLevel(Integer score) {
        int value = score != null ? score : 0;
        if (value >= 85)
            return "CRITICAL";
        if (value >= 65)
            return "HIGH";
        if (value >= 40)
            return "MEDIUM";
        return "LOW";
    }

    private void ensureAttemptAccess(ExamAttempt attempt,
            Authentication auth,
            boolean allowStudent,
            boolean allowTeacherAdmin) {
        User user = resolveAuthenticatedUser(auth);
        if (user.getRole() == Role.ADMIN) {
            return;
        }

        if (allowStudent && user.getRole() == Role.STUDENT) {
            if (attempt.getStudentId() != null && attempt.getStudentId().equals(user.getId())) {
                return;
            }
            throw new ForbiddenException("You can only access your own attempt");
        }

        if (allowTeacherAdmin && user.getRole() == Role.TEACHER) {
            String examCode = attempt.getExamCode();
            String owner = examCode == null ? ""
                    : examRepository.findByExamCode(examCode)
                            .map(com.yashwanth.ai_exam_system.entity.Exam::getCreatedBy)
                            .orElse("");
            String actor = auth == null || auth.getName() == null ? "" : auth.getName().trim();
            if (!owner.isBlank() && owner.equalsIgnoreCase(actor)) {
                return;
            }
            throw new ForbiddenException("You can only access attempts for your own exams");
        }

        throw new ForbiddenException("Insufficient permission for this attempt action");
    }

    private Map<String, Object> toAttemptResponse(ExamAttempt attempt) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", attempt.getId());
        response.put("attemptId", attempt.getId());
        response.put("examId", attempt.getExamId());
        response.put("examCode", attempt.getExamCode());
        response.put("studentId", attempt.getStudentId());
        response.put("status", attempt.getStatus() != null ? attempt.getStatus().name() : "STARTED");
        response.put("attemptNumber", attempt.getAttemptNumber());
        response.put("startTime", attempt.getStartTime());
        response.put("endTime", attempt.getEndTime());
        response.put("expiryTime", attempt.getExpiryTime());
        response.put("durationMinutes", attempt.getDurationMinutes());
        response.put("active", attempt.getActive());
        response.put("score", attempt.getScore());
        response.put("percentage", attempt.getPercentage());
        response.put("timeTakenSeconds", attempt.getTimeTakenSeconds());
        return response;
    }

    private User resolveAuthenticatedUser(Authentication auth) {
        String identifier = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (identifier.isBlank()) {
            throw new ForbiddenException("Authentication required");
        }
        User user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
        if (user == null && identifier.matches("\\d+")) {
            user = userRepository.findById(Long.valueOf(identifier)).orElse(null);
        }
        if (user == null) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }
        return user;
    }

    private Long resolveAuthenticatedStudentId(Authentication auth) {
        String identifier = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (identifier.isBlank()) {
            throw new ForbiddenException("Student authentication is required");
        }
        User user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
        if (user == null && identifier.matches("\\d+")) {
            user = userRepository.findById(Long.valueOf(identifier)).orElse(null);
        }
        if (user == null) {
            throw new ResourceNotFoundException("Authenticated student not found");
        }
        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only students can access student attempt endpoints");
        }
        if (!user.isEnabled() || !user.isAccountNonLocked()) {
            throw new ForbiddenException("Please verify your account before starting an exam");
        }
        return user.getId();
    }
}


