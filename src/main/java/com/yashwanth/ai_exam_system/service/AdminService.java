package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.CreateTeacherRequest;
import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.repository.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@Transactional
public class AdminService {
    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final int TEACHER_CREATE_LIVE_FOR_SECONDS = 600;
    private static final long MAX_PROFILE_IMAGE_SIZE_BYTES = 5L * 1024L * 1024L;

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ProctoringEventRepository proctoringEventRepository;
    private final CheatingEvidenceRepository evidenceRepository;
    private final CertificateRepository certificateRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final AdminNotificationService adminNotificationService;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            ProctoringEventRepository proctoringEventRepository,
            CheatingEvidenceRepository evidenceRepository,
            CertificateRepository certificateRepository,
            QuestionRepository questionRepository,
            UserRepository userRepository,
            AdminNotificationService adminNotificationService,
            PasswordEncoder passwordEncoder) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.proctoringEventRepository = proctoringEventRepository;
        this.evidenceRepository = evidenceRepository;
        this.certificateRepository = certificateRepository;
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.adminNotificationService = adminNotificationService;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= TEACHER =================

    public Map<String, Object> createTeacher(CreateTeacherRequest request, MultipartFile profileImageFile) {

        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String employeeId = request.getEmployeeId() == null ? "" : request.getEmployeeId().trim();
        String phone = request.getPhone() == null ? "" : request.getPhone().trim();

        if (email.isBlank()) {
            throw new RuntimeException("Email is required");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("Password is required");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RuntimeException("Email already exists");
        }

        if (!employeeId.isBlank() && userRepository.existsByEmployeeId(employeeId)) {
            throw new RuntimeException("Employee ID already exists");
        }
        if (!phone.isBlank() && userRepository.findByPhone(phone).isPresent()) {
            throw new RuntimeException("Mobile number already exists");
        }

        User teacher = new User();
        teacher.setName(request.getFullName());
        teacher.setEmail(email);
        teacher.setPassword(passwordEncoder.encode(request.getPassword()));
        teacher.setRole(Role.TEACHER);

        teacher.setPhone(phone.isBlank() ? null : phone);
        teacher.setProfileImage(resolveProfileImage(request.getProfileImage(), profileImageFile, null));
        teacher.setDepartment(request.getDepartment());
        teacher.setDesignation(request.getDesignation());
        teacher.setExperienceYears(request.getExperienceYears());
        teacher.setQualification(request.getQualification());
        teacher.setEmployeeId(employeeId.isBlank() ? null : employeeId);

        try {
            userRepository.saveAndFlush(teacher);
        } catch (DataIntegrityViolationException ex) {
            throw new RuntimeException("Unable to create teacher due to duplicate or invalid data");
        }

        try {
            adminNotificationService.createNotification(
                    "USER",
                    "Teacher Created",
                    "New teacher profile created for " + teacher.getName(),
                    "Admin Console",
                    "info",
                    null
            );
        } catch (Exception notificationError) {
            log.warn("Teacher created but admin notification failed: {}", notificationError.getMessage());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "Teacher created successfully");
        response.put("id", teacher.getId());
        response.put("email", teacher.getEmail());
        response.put("phone", teacher.getPhone());
        response.put("mobileNo", teacher.getPhone());
        response.put("liveFor", TEACHER_CREATE_LIVE_FOR_SECONDS);
        return response;
    }

    public Map<String, Object> updateTeacher(Long userId, CreateTeacherRequest request, MultipartFile profileImageFile) {
        User teacher = getUser(userId);
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String employeeId = request.getEmployeeId() == null ? "" : request.getEmployeeId().trim();
        String phone = request.getPhone() == null ? "" : request.getPhone().trim();

        if (teacher.getRole() != Role.TEACHER) {
            throw new RuntimeException("User is not a teacher");
        }

        teacher.setName(request.getFullName());
        teacher.setEmail(email);

        if (!email.isBlank()) {
            userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
                if (!existing.getId().equals(userId)) {
                    throw new RuntimeException("Email already exists");
                }
            });
        }
        if (!employeeId.isBlank()) {
            userRepository.findByEmployeeIdIgnoreCase(employeeId).ifPresent(existing -> {
                if (!existing.getId().equals(userId)) {
                    throw new RuntimeException("Employee ID already exists");
                }
            });
        }
        if (!phone.isBlank()) {
            userRepository.findByPhone(phone).ifPresent(existing -> {
                if (!existing.getId().equals(userId)) {
                    throw new RuntimeException("Mobile number already exists");
                }
            });
        }

        if (request.getPassword() != null &&
                !request.getPassword().isBlank() &&
                !"********".equals(request.getPassword())) {
            teacher.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        teacher.setPhone(phone.isBlank() ? null : phone);
        teacher.setProfileImage(resolveProfileImage(request.getProfileImage(), profileImageFile, teacher.getProfileImage()));
        teacher.setDepartment(request.getDepartment());
        teacher.setDesignation(request.getDesignation());
        teacher.setExperienceYears(request.getExperienceYears());
        teacher.setQualification(request.getQualification());
        teacher.setEmployeeId(employeeId.isBlank() ? null : employeeId);

        try {
            userRepository.saveAndFlush(teacher);
        } catch (DataIntegrityViolationException ex) {
            throw new RuntimeException("Unable to update teacher due to duplicate or invalid data");
        }

        try {
            adminNotificationService.createNotification(
                    "USER",
                    "Teacher Updated",
                    "Teacher profile updated for " + teacher.getName(),
                    "Admin Console",
                    "info",
                    null
            );
        } catch (Exception notificationError) {
            log.warn("Teacher updated but admin notification failed: {}", notificationError.getMessage());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "Teacher updated successfully");
        response.put("id", teacher.getId());
        response.put("email", teacher.getEmail());
        response.put("phone", teacher.getPhone());
        response.put("mobileNo", teacher.getPhone());
        response.put("liveFor", TEACHER_CREATE_LIVE_FOR_SECONDS);
        return response;
    }

    public Map<String, Object> checkTeacherUniqueness(String email, String employeeId, String phone, Long excludeUserId) {
        String normalizedEmail = email == null ? "" : email.trim();
        String normalizedEmployeeId = employeeId == null ? "" : employeeId.trim();
        String normalizedPhone = phone == null ? "" : phone.trim();

        boolean emailExists = false;
        if (!normalizedEmail.isBlank()) {
            emailExists = userRepository.findByEmailIgnoreCase(normalizedEmail)
                    .map(user -> excludeUserId == null || !user.getId().equals(excludeUserId))
                    .orElse(false);
        }

        boolean employeeIdExists = false;
        if (!normalizedEmployeeId.isBlank()) {
            employeeIdExists = userRepository.findByEmployeeIdIgnoreCase(normalizedEmployeeId)
                    .map(user -> excludeUserId == null || !user.getId().equals(excludeUserId))
                    .orElse(false);
        }

        boolean phoneExists = false;
        if (!normalizedPhone.isBlank()) {
            phoneExists = userRepository.findByPhone(normalizedPhone)
                    .map(user -> excludeUserId == null || !user.getId().equals(excludeUserId))
                    .orElse(false);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("emailExists", emailExists);
        response.put("employeeIdExists", employeeIdExists);
        response.put("phoneExists", phoneExists);
        response.put("mobileNoExists", phoneExists);
        response.put("email", normalizedEmail);
        response.put("employeeId", normalizedEmployeeId);
        response.put("phone", normalizedPhone);
        response.put("mobileNo", normalizedPhone);
        return response;
    }

    private String resolveProfileImage(String profileImageUrl, MultipartFile profileImageFile, String existingProfileImage) {
        if (profileImageFile != null && !profileImageFile.isEmpty()) {
            return encodeProfileImage(profileImageFile);
        }

        String requestedUrl = profileImageUrl == null ? "" : profileImageUrl.trim();
        if (!requestedUrl.isBlank()) {
            return requestedUrl;
        }

        return existingProfileImage;
    }

    private String encodeProfileImage(MultipartFile file) {
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.startsWith("image/")) {
            throw new RuntimeException("Profile image must be a valid image file");
        }

        if (file.getSize() > MAX_PROFILE_IMAGE_SIZE_BYTES) {
            throw new RuntimeException("Profile image size exceeds limit (5MB)");
        }

        try {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            return "data:" + contentType + ";base64," + base64;
        } catch (IOException ex) {
            throw new RuntimeException("Unable to process profile image upload");
        }
    }

    public Map<String, Object> getTeacherActivity(Long userId) {
        User teacher = getUser(userId);

        if (teacher.getRole() != Role.TEACHER) {
            throw new RuntimeException("User is not a teacher");
        }

        List<String> teacherKeys = buildTeacherMatchKeys(teacher);
        List<Exam> createdExams = examRepository.findAll().stream()
                .filter(exam -> matchesTeacher(exam.getCreatedBy(), teacherKeys))
                .sorted(Comparator.comparing(Exam::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .collect(Collectors.toList());

        Set<String> examCodes = createdExams.stream()
                .map(Exam::getExamCode)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<Question> questions = questionRepository.findAll().stream()
                .filter(q -> examCodes.contains(q.getExamCode()))
                .collect(Collectors.toList());

        List<ExamAttempt> attempts = attemptRepository.findAll().stream()
                .filter(a -> examCodes.contains(a.getExamCode()))
                .collect(Collectors.toList());

        List<Certificate> certificates = certificateRepository.findAll().stream()
                .filter(c -> examCodes.contains(c.getExamCode()))
                .collect(Collectors.toList());

        long completedAttempts = attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.COMPLETED || Boolean.TRUE.equals(a.getAutoSubmitted()))
                .count();

        double avgScore = attempts.stream()
                .filter(a -> a.getPercentage() != null)
                .mapToDouble(ExamAttempt::getPercentage)
                .average()
                .orElse(0.0);

        long passCount = attempts.stream()
                .filter(a -> a.getPercentage() != null && a.getPercentage() >= 60)
                .count();

        long suspiciousAttempts = attempts.stream()
                .filter(a -> (a.getCheatingScore() != null && a.getCheatingScore() >= 50) || Boolean.TRUE.equals(a.getCancelled()))
                .count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("teacher", toUserSummary(teacher));
        summary.put("analytics", Map.of(
                "exams", createdExams.size(),
                "students", attempts.stream().map(ExamAttempt::getStudentId).filter(Objects::nonNull).distinct().count(),
                "certs", certificates.size()
        ));
        summary.put("attemptsHandled", Map.of(
                "total", attempts.size(),
                "avgScore", Math.round(avgScore),
                "passRate", attempts.isEmpty() ? 0 : Math.round((passCount * 100.0) / attempts.size())
        ));
        summary.put("cheatingReports", Map.of(
                "suspicious", suspiciousAttempts,
                "flags", attempts.stream().filter(a -> Boolean.TRUE.equals(a.getCancelled())).count()
        ));
        summary.put("examsCreated", createdExams.stream().map(exam -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("title", exam.getTitle());
            map.put("code", exam.getExamCode());
            map.put("status", exam.getStatus() != null ? exam.getStatus().name() : "DRAFT");
            map.put("date", exam.getCreatedAt() != null ? exam.getCreatedAt() : exam.getUpdatedAt());
            map.put("questionsUploaded", Boolean.TRUE.equals(exam.getQuestionsUploaded()) || questions.stream().anyMatch(q -> exam.getExamCode().equals(q.getExamCode())));
            return map;
        }).collect(Collectors.toList()));
        summary.put("questionsUploaded", createdExams.stream().map(exam -> {
            Map<String, Object> map = new LinkedHashMap<>();
            long count = questions.stream().filter(q -> exam.getExamCode().equals(q.getExamCode())).count();
            map.put("exam", exam.getTitle());
            map.put("count", count);
            map.put("date", exam.getCreatedAt() != null ? exam.getCreatedAt() : exam.getUpdatedAt());
            return map;
        }).collect(Collectors.toList()));
        summary.put("alerts", attempts.stream()
                .filter(a -> (a.getCheatingScore() != null && a.getCheatingScore() >= 50) || Boolean.TRUE.equals(a.getCancelled()))
                .sorted(Comparator.comparing(ExamAttempt::getCheatingScore, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(10)
                .map(a -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("title", Boolean.TRUE.equals(a.getCancelled()) ? "Attempt Cancelled" : "Suspicious Activity Detected");
                    map.put("user", a.getStudentId() != null ? "STU_" + a.getStudentId() : "Unknown");
                    map.put("type", (a.getCheatingScore() != null && a.getCheatingScore() >= 80) ? "high" : "med");
                    map.put("score", a.getCheatingScore() != null ? a.getCheatingScore() : 0);
                    map.put("attemptId", a.getId());
                    return map;
                })
                .collect(Collectors.toList()));

        return summary;
    }

    // ================= EXAMS =================

    public List<Exam> getAllExams() {
        return examRepository.findAll().stream()
                .sorted(Comparator.comparing(Exam::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .collect(Collectors.toList());
    }

    public void deleteExam(String examCode) {
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        exam.setActive(false);
        examRepository.save(exam);

        adminNotificationService.createNotification(
                "EXAM",
                "Exam Deactivated",
                "Exam " + exam.getTitle() + " (" + examCode + ") was removed from active use",
                "Admin Console",
                "warning",
                null
        );
    }

    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    public List<Question> getQuestionsByExam(String examCode) {
        return questionRepository.findByExamCode(examCode);
    }

    public Map<String, Object> bulkUploadQuestions(String examCode, List<Map<String, Object>> questions) {
        if (questions == null || questions.isEmpty()) {
            throw new IllegalArgumentException("No questions were provided for upload");
        }

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        if (exam.isPublished()) {
            throw new IllegalArgumentException("Published exams cannot be edited");
        }

        validateQuestionExamCodes(examCode, questions);

        List<Question> existingQuestions = questionRepository.findByExamCode(examCode);
        existingQuestions.forEach(q -> q.setActive(false));
        if (!existingQuestions.isEmpty()) {
            questionRepository.saveAll(existingQuestions);
        }

        List<Question> savedQuestions = new ArrayList<>();
        int rowNumber = 0;
        for (Map<String, Object> item : questions) {
            rowNumber += 1;
            savedQuestions.add(buildQuestionFromPayload(examCode, item, rowNumber));
        }

        questionRepository.saveAll(savedQuestions);
        exam.setQuestionsUploaded(true);
        exam.setStatus(ExamStatus.QUESTIONS_UPLOADED);
        examRepository.save(exam);

        adminNotificationService.createNotification(
                "EXAM",
                "Questions Uploaded",
                savedQuestions.size() + " questions uploaded for " + exam.getTitle(),
                "Admin Console",
                "info",
                null
        );

        Map<String, Object> result = new HashMap<>();
        result.put("examCode", examCode);
        result.put("uploadedCount", savedQuestions.size());
        result.put("questions", savedQuestions);
        return result;
    }

    public List<Map<String, Object>> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserSummary)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getUsersByRole(Role role) {
        return userRepository.findByRole(role).stream()
                .map(this::toUserSummary)
                .collect(Collectors.toList());
    }

    public Map<String, Object> toggleUserEnabled(Long userId) {
        User user = getUser(userId);
        user.setEnabled(!user.isEnabled());
        userRepository.save(user);

        adminNotificationService.createNotification(
                "USER",
                user.isEnabled() ? "User Enabled" : "User Disabled",
                user.getRole() + " account " + (user.isEnabled() ? "enabled" : "disabled") + " for " + user.getName(),
                "Admin Console",
                "warning",
                null
        );

        return toUserSummary(user);
    }

    public Map<String, Object> toggleUserLocked(Long userId) {
        User user = getUser(userId);
        user.setAccountNonLocked(!user.isAccountNonLocked());
        userRepository.save(user);

        adminNotificationService.createNotification(
                "USER",
                user.isAccountNonLocked() ? "Account Unlocked" : "Account Locked",
                user.getRole() + " account " + (user.isAccountNonLocked() ? "unlocked" : "locked") + " for " + user.getName(),
                "Admin Console",
                "warning",
                null
        );

        return toUserSummary(user);
    }

    public void deleteUser(Long userId) {
        User user = getUser(userId);

        if (user.getRole() == Role.ADMIN) {
            throw new RuntimeException("Admin users cannot be deleted");
        }

        userRepository.delete(user);

        adminNotificationService.createNotification(
                "USER",
                "User Deleted",
                user.getRole() + " account deleted for " + user.getName(),
                "Admin Console",
                "critical",
                null
        );
    }

    // ================= ATTEMPTS =================

    public List<Map<String, Object>> getAllAttempts() {
        return attemptRepository.findAll().stream()
                .map(this::toAttemptSummary)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAttemptsByExam(String examCode) {
        return attemptRepository.findByExamCode(examCode).stream()
                .map(this::toAttemptSummary)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAttemptsByStudent(Long studentId) {
        return attemptRepository.findByStudentId(studentId).stream()
                .map(this::toAttemptSummary)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getSuspiciousAttempts() {

        Set<ExamAttempt> result = new HashSet<>();

        result.addAll(
                attemptRepository.findByStatus(AttemptStatus.INVALIDATED)
        );

        result.addAll(
                attemptRepository.findByCheatingScoreGreaterThan(50)
        );

        return result.stream()
                .map(this::toAttemptSummary)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getLiveHighRiskAttempts() {
        return attemptRepository.findLiveAttempts(AttemptStatus.STARTED)
                .stream()
                .filter(a -> a.getCheatingScore() != null && a.getCheatingScore() >= 50)
                .sorted(Comparator.comparing(ExamAttempt::getCheatingScore).reversed())
                .map(this::toAttemptSummary)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTopRiskAttempts() {
        return attemptRepository.findTop10ByOrderByCheatingScoreDesc().stream()
                .map(this::toAttemptSummary)
                .collect(Collectors.toList());
    }

    // ================= CHEATING EVENTS =================

    public List<ProctoringEvent> getAllCheatingLogs() {
        return proctoringEventRepository.findAll();
    }

    public List<ProctoringEvent> getEventsByAttempt(Long attemptId) {
        return proctoringEventRepository.findByAttemptId(attemptId);
    }

    public Integer getCheatingScore(Long attemptId) {

        Integer score = proctoringEventRepository.getTotalScore(attemptId);

        if (score != null && score > 0) {
            return score;
        }

        return attemptRepository.findById(attemptId)
                .map(ExamAttempt::getCheatingScore)
                .orElse(0);
    }

    // ================= EVIDENCE =================

    public List<CheatingEvidence> getAllEvidence() {
        return evidenceRepository.findAll();
    }

    public List<CheatingEvidence> getEvidenceByExam(Long examId) {
        return evidenceRepository.findByExamId(examId);
    }

    public List<CheatingEvidence> getEvidenceByStudent(Long studentId) {
        return evidenceRepository.findByStudentId(studentId);
    }

    // ================= ADMIN CONTROL =================

    public void cancelAttempt(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        if (Boolean.TRUE.equals(attempt.getCancelled())) {
            return;
        }

        attempt.markCancelled("Cancelled manually by admin");
        attemptRepository.save(attempt);

        adminNotificationService.createNotification(
                "CHEATING",
                "Attempt Cancelled",
                "Attempt " + attemptId + " was cancelled by admin",
                "Admin Console",
                "critical",
                null
        );
    }

    public void forceSubmitAttempt(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        if (Boolean.TRUE.equals(attempt.getCancelled())) {
            throw new RuntimeException("Cancelled attempts cannot be force submitted");
        }

        attempt.markAutoSubmitted();
        attempt.setRemarks("Force submitted by admin");
        attemptRepository.save(attempt);

        adminNotificationService.createNotification(
                "CHEATING",
                "Attempt Force Submitted",
                "Attempt " + attemptId + " was force submitted by admin",
                "Admin Console",
                "warning",
                null
        );
    }

    public void restoreAttempt(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        if (!Boolean.TRUE.equals(attempt.getCancelled())) {
            return;
        }

        attempt.setCancelled(false);
        attempt.setStatus(AttemptStatus.STARTED);
        attempt.setActive(true);
        attempt.setRemarks("Restored by admin");

        attemptRepository.save(attempt);

        adminNotificationService.createNotification(
                "CHEATING",
                "Attempt Restored",
                "Attempt " + attemptId + " was restored by admin",
                "Admin Console",
                "info",
                null
        );
    }

    // ================= DASHBOARD =================

    public Map<String, Object> getDashboardStats() {

        Map<String, Object> stats = new HashMap<>();

        stats.put("totalUsers", userRepository.count());
        stats.put("totalStudents", userRepository.countByRole(Role.STUDENT));
        stats.put("totalTeachers", userRepository.countByRole(Role.TEACHER));
        stats.put("totalExams", examRepository.count());
        stats.put("totalAttempts", attemptRepository.count());
        stats.put("suspiciousAttempts", getSuspiciousAttempts().size());
        stats.put("cancelledAttempts", attemptRepository.countByCancelledTrue());
        stats.put("totalCertificates", certificateRepository.count());
        stats.put("averageCheatingScore",
                Optional.ofNullable(attemptRepository.getAverageCheatingScore()).orElse(0.0)
        );

        stats.put("timestamp", LocalDateTime.now());

        return stats;
    }

    // ================= HELPER =================

    private ExamAttempt getAttempt(Long attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> toUserSummary(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole() != null ? user.getRole().name() : null);
        map.put("phone", user.getPhone());
        map.put("department", user.getDepartment());
        map.put("designation", user.getDesignation());
        map.put("experienceYears", user.getExperienceYears());
        map.put("qualification", user.getQualification());
        map.put("employeeId", user.getEmployeeId());
        map.put("profileImage", user.getProfileImage());
        map.put("enabled", user.isEnabled());
        map.put("accountNonLocked", user.isAccountNonLocked());
        map.put("createdAt", user.getCreatedAt());
        map.put("updatedAt", user.getUpdatedAt());
        return map;
    }

    private Map<String, Object> toAttemptSummary(ExamAttempt attempt) {
        Map<String, Object> map = new HashMap<>();
        User student = attempt.getStudent();
        Exam exam = attempt.getExam();

        map.put("id", attempt.getId());
        map.put("examId", attempt.getExamId());
        map.put("examCode", attempt.getExamCode());
        map.put("studentId", attempt.getStudentId());
        map.put("studentName", student != null ? student.getName() : null);
        map.put("studentEmail", student != null ? student.getEmail() : null);
        map.put("examTitle", exam != null ? exam.getTitle() : null);
        map.put("examSubject", exam != null ? exam.getSubject() : null);
        map.put("startTime", attempt.getStartTime());
        map.put("endTime", attempt.getEndTime());
        map.put("durationMinutes", attempt.getDurationMinutes());
        map.put("expiryTime", attempt.getExpiryTime());
        map.put("timeTakenSeconds", attempt.getTimeTakenSeconds());
        map.put("totalMarks", attempt.getTotalMarks());
        map.put("obtainedMarks", attempt.getObtainedMarks());
        map.put("score", attempt.getScore());
        map.put("percentage", attempt.getPercentage());
        map.put("negativeMarksApplied", attempt.getNegativeMarksApplied());
        map.put("status", attempt.getStatus());
        map.put("attemptNumber", attempt.getAttemptNumber());
        map.put("autoSubmitted", attempt.getAutoSubmitted());
        map.put("active", attempt.getActive());
        map.put("cancelled", attempt.getCancelled());
        map.put("cheatingScore", attempt.getCheatingScore());
        map.put("cheatingFlag", attempt.getCheatingFlag());
        map.put("tabSwitchCount", attempt.getTabSwitchCount());
        map.put("fullscreenViolationCount", attempt.getFullscreenViolationCount());
        map.put("lastAiCheckTime", attempt.getLastAiCheckTime());
        map.put("cancelledAt", attempt.getCancelledAt());
        map.put("remarks", attempt.getRemarks());
        map.put("ipAddress", attempt.getIpAddress());
        map.put("deviceInfo", attempt.getDeviceInfo());
        map.put("browserInfo", attempt.getBrowserInfo());
        map.put("createdAt", attempt.getCreatedAt());
        map.put("updatedAt", attempt.getUpdatedAt());
        return map;
    }

    private List<String> buildTeacherMatchKeys(User teacher) {
        return Stream.of(
                        teacher.getName(),
                        teacher.getEmail(),
                        teacher.getEmployeeId(),
                        teacher.getDepartment(),
                        teacher.getDesignation())
                .filter(Objects::nonNull)
                .map(this::normalizeForMatch)
                .filter(s -> !s.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    private boolean matchesTeacher(String createdBy, List<String> teacherKeys) {
        String normalized = normalizeForMatch(createdBy);
        if (normalized.isBlank()) {
            return false;
        }
        return teacherKeys.stream().anyMatch(key -> normalized.contains(key) || key.contains(normalized));
    }

    private String normalizeForMatch(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private Question buildQuestionFromPayload(String examCode, Map<String, Object> payload, int rowNumber) {
        Question question = new Question();
        question.setExamCode(examCode);
        question.setActive(true);

        String questionText = stringValue(payload.get("questionText"));
        if (questionText.isBlank()) {
            throw new IllegalArgumentException("Row " + rowNumber + ": question text is required");
        }
        question.setQuestionText(questionText);

        String typeValue = stringValue(payload.get("questionType"));
        if (typeValue.isBlank()) {
            throw new IllegalArgumentException("Row " + rowNumber + ": question type is required");
        }
        question.setQuestionType(parseQuestionType(typeValue, rowNumber));

        String topic = stringValue(payload.get("topic"));
        question.setTopic(topic.isBlank() ? "general" : topic);

        String difficulty = stringValue(payload.get("difficulty"));
        question.setDifficulty(normalizeDifficulty(difficulty.isBlank() ? "Easy" : difficulty));

        Integer marks = integerValue(payload.get("marks"));
        if (marks == null || marks <= 0) {
            throw new IllegalArgumentException("Row " + rowNumber + ": marks must be greater than zero");
        }
        question.setMarks(marks);

        question.setOptionA(stringValue(payload.get("optionA")));
        question.setOptionB(stringValue(payload.get("optionB")));
        question.setOptionC(stringValue(payload.get("optionC")));
        question.setOptionD(stringValue(payload.get("optionD")));
        question.setOptionE(stringValue(payload.get("optionE")));
        question.setOptionF(stringValue(payload.get("optionF")));
        question.setCorrectAnswer(stringValue(payload.get("correctAnswer")));
        question.setSampleInput(stringValue(payload.get("sampleInput")));
        question.setSampleOutput(stringValue(payload.get("sampleOutput")));
        question.setShuffleOptions(booleanValue(payload.get("shuffleOptions"), false));
        question.setDisplayOrder(integerValue(payload.get("displayOrder")));
        question.setShuffleGroup(stringValue(payload.get("shuffleGroup")));
        return question;
    }

    private QuestionType parseQuestionType(String value, int rowNumber) {
        String normalized = normalizeForMatch(value);
        if (normalized.equals("shortanswer") || normalized.equals("descriptive")) {
            return QuestionType.DESCRIPTIVE;
        }
        if (normalized.equals("coding")) {
            return QuestionType.CODING;
        }
        if (normalized.equals("mcq") || normalized.equals("multiplechoice")) {
            return QuestionType.MCQ;
        }
        throw new IllegalArgumentException("Row " + rowNumber + ": invalid question type '" + value + "'");
    }

    private String normalizeDifficulty(String value) {
        String raw = stringValue(value).toUpperCase(Locale.ROOT);
        if (raw.isBlank()) return "Easy";
        if (raw.equals("EASY")) return "Easy";
        if (raw.equals("MEDIUM")) return "Medium";
        if (raw.equals("DIFFICULT") || raw.equals("HARD")) return "Hard";
        throw new IllegalArgumentException("Invalid difficulty '" + value + "'. Allowed: Easy, Medium, Hard");
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private Integer integerValue(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) {
            return number.intValue();
        }
        String text = String.valueOf(value).trim();
        if (text.isBlank()) return null;
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean booleanValue(Object value, boolean defaultValue) {
        if (value == null) return defaultValue;
        if (value instanceof Boolean b) return b;
        String text = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
        if (text.isBlank()) return defaultValue;
        return text.equals("true") || text.equals("1") || text.equals("yes") || text.equals("on");
    }

    private void validateQuestionExamCodes(String examCode, List<Map<String, Object>> questions) {
        String selected = stringValue(examCode);
        Set<String> seen = new LinkedHashSet<>();
        for (Map<String, Object> question : questions) {
            String fileCode = stringValue(firstNonNull(
                    question.get("examCode"),
                    question.get("Exam Code"),
                    question.get("ExamCode"),
                    question.get("exam_code"),
                    question.get("code")
            ));
            if (fileCode.isBlank()) {
                continue;
            }
            seen.add(fileCode);
            if (!fileCode.equals(selected)) {
                throw new IllegalArgumentException("Exam code mismatch. Selected " + examCode + ", but the file contains " + fileCode);
            }
        }
        if (seen.size() > 1) {
            throw new IllegalArgumentException("Multiple exam codes found in the uploaded file");
        }
    }

    private Object firstNonNull(Object... values) {
        for (Object value : values) {
            if (value != null && !String.valueOf(value).trim().isBlank()) {
                return value;
            }
        }
        return null;
    }
}
