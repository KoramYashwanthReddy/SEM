package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.ExamAttemptService;
import com.yashwanth.ai_exam_system.service.ExamService;
import com.yashwanth.ai_exam_system.service.ExamNavigationService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    public ExamAttempt startExam(@RequestBody StartExamRequest request, Authentication auth) {
        Long authenticatedStudentId = resolveAuthenticatedStudentId(auth);
        if (request.getStudentId() == null || !authenticatedStudentId.equals(request.getStudentId())) {
            throw new ForbiddenException("You can only start your own exam attempt");
        }

        return examAttemptService.startExam(
                request.getStudentId(),
                request.getExamCode()
        );
    }

    // ✅ SAVE ANSWER
    @PostMapping("/submit-answer")
    @PreAuthorize("hasRole('STUDENT')")
    public String submitAnswer(@RequestBody SubmitAnswerRequest request, Authentication auth) {
        Long authenticatedStudentId = resolveAuthenticatedStudentId(auth);
        ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only submit answers for your own attempt");
        }

        examAttemptService.submitAnswer(
                request.getAttemptId(),
                request.getQuestionId(),
                request.getAnswer(),
                request.getMarkForReview()
        );

        return "Answer saved successfully";
    }

    // 🚀 FINAL SUBMIT
    @PostMapping("/submit/{attemptId}")
    @PreAuthorize("hasRole('STUDENT')")
    public String submitExam(@PathVariable Long attemptId, Authentication auth) {
        Long authenticatedStudentId = resolveAuthenticatedStudentId(auth);
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        if (!authenticatedStudentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only submit your own attempt");
        }
        return examService.submitExam(attemptId);
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
    public List<QuestionPaletteResponse> getPalette(@PathVariable Long attemptId) {
        return examAttemptService.getPalette(attemptId);
    }

    // ✅ EXAM TIMER
    @GetMapping("/timer/{attemptId}")
    public ExamTimerResponse getTimer(@PathVariable Long attemptId) {
        return examAttemptService.getTimer(attemptId);
    }

    // ================= NEW FEATURES =================

    // 🔥 NAVIGATION STATUS
    @GetMapping("/navigation/{attemptId}")
    public ExamNavigationStatusDTO getNavigation(@PathVariable Long attemptId) {
        return navigationService.getNavigationStatus(attemptId);
    }

    // 🔥 RESUME EXAM
    @GetMapping("/resume/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ExamAttempt resumeExam(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = examAttemptService.getAttempt(attemptId);
        ensureAttemptAccess(attempt, auth, true, true);
        return attempt;
    }

    // 🔥 FORCE SUBMIT (TIMER / ADMIN)
    @PostMapping("/force-submit/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public String forceSubmit(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, false, true);
        return examService.submitExam(attemptId);
    }

    // 🔥 CANCEL ATTEMPT
    @PostMapping("/cancel/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public String cancelAttempt(
            @PathVariable Long attemptId,
            @RequestParam(required = false, defaultValue = "Cancelled by teacher") String reason,
            Authentication auth) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, false, true);

        examAttemptService.cancelAttempt(attemptId, reason);
        return "Attempt cancelled";
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
                : examRepository.findByCreatedByAndActiveTrueOrderByCreatedAtDesc(auth.getName()))
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
    public String heartbeat(@PathVariable Long attemptId, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, true, false);

        examAttemptService.updateHeartbeat(attemptId);
        return "Heartbeat updated";
    }

    // 🔥 MARK REVIEW ONLY
    @PostMapping("/mark-review")
    @PreAuthorize("hasRole('STUDENT')")
    public String markReview(@RequestBody SubmitAnswerRequest request, Authentication auth) {
        ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        ensureAttemptAccess(attempt, auth, true, false);

        examAttemptService.markForReview(
                request.getAttemptId(),
                request.getQuestionId()
        );

        return "Marked for review";
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

        String studentName = userRepository.findById(attempt.getStudentId() == null ? -1L : attempt.getStudentId())
                .map(User::getName)
                .orElse("Student " + (attempt.getStudentId() != null ? attempt.getStudentId() : attempt.getId()));
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
        if (value >= 85) return "CRITICAL";
        if (value >= 65) return "HIGH";
        if (value >= 40) return "MEDIUM";
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
            String owner = examCode == null ? "" : examRepository.findByExamCode(examCode)
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

    private User resolveAuthenticatedUser(Authentication auth) {
        String identifier = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (identifier.isBlank()) {
            throw new ForbiddenException("Authentication required");
        }
        User user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
        if (user == null && identifier.matches("\\d+")) {
            user = userRepository.findById(Long.parseLong(identifier)).orElse(null);
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
            user = userRepository.findById(Long.parseLong(identifier)).orElse(null);
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
