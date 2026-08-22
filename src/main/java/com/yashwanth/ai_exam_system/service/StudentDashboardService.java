package com.yashwanth.ai_exam_system.service;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.yashwanth.ai_exam_system.dto.ExamSuggestionResponse;
import com.yashwanth.ai_exam_system.dto.LeaderboardDTO;
import com.yashwanth.ai_exam_system.dto.StudentDashboardResponse;
import com.yashwanth.ai_exam_system.dto.StudentExamAnalyticsResponse;
import com.yashwanth.ai_exam_system.dto.StudentExamSummary;
import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamRegistration;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRegistrationRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.repository.StudentProfileRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;

@Service
public class StudentDashboardService {

    private static final Logger logger = LoggerFactory.getLogger(StudentDashboardService.class);

    private final ExamAttemptRepository attemptRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final ExamRegistrationRepository examRegistrationRepository;
    private final CertificateRepository certificateRepository;
    private final ExamResultRepository examResultRepository;
    private final LeaderboardService leaderboardService;
    private final CertificateService certificateService;

    public StudentDashboardService(ExamAttemptRepository attemptRepository,
            ExamRepository examRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            ExamRegistrationRepository examRegistrationRepository,
            CertificateRepository certificateRepository,
            ExamResultRepository examResultRepository,
            LeaderboardService leaderboardService,
            CertificateService certificateService) {
        this.attemptRepository = attemptRepository;
        this.examRepository = examRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.examRegistrationRepository = examRegistrationRepository;
        this.certificateRepository = certificateRepository;
        this.examResultRepository = examResultRepository;
        this.leaderboardService = leaderboardService;
        this.certificateService = certificateService;
    }

    public StudentDashboardResponse getDashboardForIdentifier(String identifier) {
        User student = getVerifiedStudentByIdentifier(identifier);
        return getDashboard(student.getId());
    }

    public Long resolveStudentId(String identifier) {
        return getVerifiedStudentByIdentifier(identifier).getId();
    }

    public Map<String, Object> getStudentCertificatesPayload(Long studentId) {
        if (studentId == null) {
            return Map.of(
                    "certificates", List.of(),
                    "certificateCount", 0,
                    "results", List.of());
        }

        List<Certificate> certificates = repairAndListCertificates(studentId);
        List<Map<String, Object>> resultRows = examResultRepository.findByStudentIdOrderBySubmittedAtAsc(studentId)
                .stream()
                .map(this::toResultRow)
                .toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("certificates", certificates.stream().map(this::toCertificateRow).toList());
        data.put("certificateCount", certificates.size());
        data.put("results", resultRows);
        return data;
    }

    public Map<String, Object> getStudentQuickStats(Long studentId) {
        List<ExamAttempt> attempts = loadStudentAttempts(studentId);
        double averageScore = calculateAverageScore(attempts);
        int attemptedCount = attempts.size();
        int certificatesEarned = studentId == null ? 0 : (int) certificateRepository.countByStudentIdAndRevokedFalse(studentId);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("averageScore", averageScore);
        stats.put("attempted", attemptedCount);
        stats.put("rank", 0);
        stats.put("certificates", certificatesEarned);
        return stats;
    }

    public Map<String, Object> getStudentAlerts(Long studentId) {
        List<ExamAttempt> attempts = loadStudentAttempts(studentId);
        long cheatingAlerts = attempts.stream()
                .filter(attempt -> Boolean.TRUE.equals(attempt.getCheatingFlag()))
                .count();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("cheatingAlerts", cheatingAlerts);
        return data;
    }

    public Map<String, Object> getStudentPerformance(Long studentId) {
        List<ExamAttempt> attempts = loadStudentAttempts(studentId);
        List<Double> trend = attempts.stream()
                .map(this::resolveAttemptPercentage)
                .toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("trend", trend);
        return data;
    }

    public Map<String, Object> getStudentWeakTopics(Long studentId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("weakTopics", detectWeakTopics(studentId));
        return data;
    }

    public StudentDashboardResponse getDashboard(Long studentId) {
        List<Certificate> repairedCertificates = repairAndListCertificates(studentId);

        List<ExamAttempt> attempts = loadStudentAttempts(studentId);
        List<Exam> activeExams = examRepository.findAllActiveOrderByCreatedAtDesc()
                .stream()
                .filter(Exam::isPublished)
                .toList();

        attempts.sort(Comparator.comparing(
                (ExamAttempt attempt) -> attempt.getEndTime() != null
                        ? attempt.getEndTime()
                        : attempt.getStartTime() != null
                                ? attempt.getStartTime()
                                : attempt.getCreatedAt(),
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        List<StudentExamSummary> attempted = new ArrayList<>();
        List<Double> scores = new ArrayList<>();
        List<Double> trend = new ArrayList<>();
        Set<String> attemptedCodes = new HashSet<>();

        int cheatingAlerts = 0;
        int certificates = 0;

        LocalDateTime lastAttempt = null;

        for (ExamAttempt attempt : attempts) {

            int obtained = attempt.getObtainedMarks() == null ? 0 : attempt.getObtainedMarks();
            int total = attempt.getTotalMarks() == null ? 0 : attempt.getTotalMarks();
            double percentage = resolvePercentage(attempt, obtained, total);

            if (attempt.getExamCode() != null) {
                attemptedCodes.add(attempt.getExamCode());
            }

            scores.add(percentage);
            trend.add(percentage);

            if (Boolean.TRUE.equals(attempt.getCheatingFlag())) {
                cheatingAlerts++;
            }

            if (percentage >= 40) {
                certificates++;
            }

            LocalDateTime attemptTime = attempt.getEndTime() != null ? attempt.getEndTime() : attempt.getStartTime();
            if (lastAttempt == null ||
                    (attemptTime != null && attemptTime.isAfter(lastAttempt))) {
                lastAttempt = attemptTime;
            }

            StudentExamSummary summary = new StudentExamSummary(
                    attempt.getExamCode(),
                    obtained,
                    total,
                    percentage,
                    calculateBadge(percentage));
            summary.setAttemptId(attempt.getId());
            attempted.add(summary);
        }

        StudentExamAnalyticsResponse analytics = new StudentExamAnalyticsResponse();
        analytics.setAttemptedExams(attempted.size());

        double avg = scores.stream().mapToDouble(Double::doubleValue).average().orElse(0);

        analytics.setAverageScore(avg);
        analytics.setHighestScore(scores.stream().mapToDouble(Double::doubleValue).max().orElse(0));
        analytics.setLowestScore(scores.stream().mapToDouble(Double::doubleValue).min().orElse(0));

        long passCount = scores.stream().filter(s -> s >= 40).count();
        analytics.setPassRate(scores.isEmpty() ? 0 : (passCount * 100.0) / scores.size());

        List<ExamSuggestionResponse> suggestions = generateSuggestions(analytics);

        List<String> weakTopics = detectWeakTopics(studentId);
        List<String> notAttempted = activeExams.stream()
                .map(Exam::getExamCode)
                .filter(code -> code != null && !attemptedCodes.contains(code))
                .toList();

        StudentDashboardResponse response = new StudentDashboardResponse();

        response.setAttempted(attempted);
        response.setNotAttempted(new ArrayList<>(notAttempted));
        response.setAnalytics(analytics);
        response.setSuggestions(suggestions);

        response.setTotalExams(activeExams.size());
        response.setAttemptedCount(attempted.size());
        response.setNotAttemptedCount(notAttempted.size());

        response.setAverageScore(avg);
        response.setCertificatesEarned(repairedCertificates.size());

        response.setLeaderboardRank(0);

        response.setCheatingAlerts(cheatingAlerts);
        response.setWeakTopics(weakTopics);
        response.setPerformanceTrend(trend);
        response.setLastAttemptTime(lastAttempt);
        response.setLatestAttemptId(attempts.isEmpty() ? null : attempts.get(0).getId());

        return response;
    }

    public Map<String, Object> getStudentUiBootstrap(String identifier) {
        User student = getVerifiedStudentByIdentifier(identifier);
        List<Certificate> repairedCertificates = repairAndListCertificates(student.getId());
        List<ExamAttempt> attempts = loadStudentAttempts(student.getId());
        List<Exam> activeExams = examRepository.findAllActiveOrderByCreatedAtDesc()
                .stream()
                .filter(Exam::isPublished)
                .toList();
        StudentProfile profile = studentProfileRepository.findByUserId(student.getId()).orElse(null);
        StudentDashboardResponse dashboard = buildDashboard(student.getId(), attempts, activeExams, repairedCertificates);

        Map<String, ExamAttempt> activeAttemptByExamCode = attempts.stream()
                .filter(attempt -> attempt.getExamCode() != null)
                .filter(attempt -> attempt.getStatus() == AttemptStatus.STARTED)
                .filter(attempt -> !Boolean.TRUE.equals(attempt.getCancelled()))
                .collect(Collectors.toMap(
                        ExamAttempt::getExamCode,
                        attempt -> attempt,
                        (left, right) -> {
                            LocalDateTime leftTime = left.getUpdatedAt() != null ? left.getUpdatedAt()
                                    : left.getCreatedAt();
                            LocalDateTime rightTime = right.getUpdatedAt() != null ? right.getUpdatedAt()
                                    : right.getCreatedAt();
                            if (leftTime == null)
                                return right;
                            if (rightTime == null)
                                return left;
                            return rightTime.isAfter(leftTime) ? right : left;
                        }));

        List<ExamRegistration> registrations = examRegistrationRepository.findByStudentIdAndActiveTrue(student.getId());
        Set<String> registeredExamCodeSet = registrations.stream()
                .map(ExamRegistration::getExamCode)
                .filter(code -> code != null && !code.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<Map<String, Object>> examCards = activeExams.stream()
                .map(exam -> toExamCard(
                        exam,
                        activeAttemptByExamCode.get(exam.getExamCode()),
                        registeredExamCodeSet.contains(exam.getExamCode())))
                .toList();

        List<String> registeredExamCodes = registrations.stream()
                .map(ExamRegistration::getExamCode)
                .filter(code -> code != null && !code.isBlank())
                .toList();

        List<Map<String, Object>> attemptRows = attempts.stream()
                .map(this::toAttemptRow)
                .toList();

        List<Map<String, Object>> resultRows = examResultRepository.findByStudentIdOrderBySubmittedAtAsc(student.getId())
                .stream()
                .map(this::toResultRow)
                .toList();

        List<Map<String, Object>> certificates = repairedCertificates
                .stream()
                .map(this::toCertificateRow)
                .toList();
        List<LeaderboardDTO> leaderboardGlobal;
        try {
            leaderboardGlobal = leaderboardService.getGlobalLeaderboard();
        } catch (Exception ex) {
            logger.warn("Global leaderboard skipped during student bootstrap for studentId={}: {}",
                    student.getId(), ex.getMessage());
            leaderboardGlobal = List.of();
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("studentId", student.getId());
        response.put("user", toUserMap(student));
        response.put("profile", toProfileMap(student, profile));
        response.put("dashboard", dashboard);
        response.put("exams", examCards);
        response.put("attempts", attemptRows);
        response.put("results", resultRows);
        response.put("certificates", certificates);
        response.put("certificateCount", certificates.size());
        response.put("leaderboardGlobal", leaderboardGlobal);
        response.put("registeredExamCodes", registeredExamCodes);
        return response;
    }

    private void ensurePassedResultCertificates(Long studentId) {
        repairAndListCertificates(studentId);
    }

    private StudentDashboardResponse buildDashboard(
            Long studentId,
            List<ExamAttempt> attempts,
            List<Exam> activeExams,
            List<Certificate> repairedCertificates) {
        List<ExamAttempt> sortedAttempts = new ArrayList<>(attempts == null ? List.of() : attempts);
        sortedAttempts.sort(Comparator.comparing(
                (ExamAttempt attempt) -> attempt.getEndTime() != null
                        ? attempt.getEndTime()
                        : attempt.getStartTime() != null
                                ? attempt.getStartTime()
                                : attempt.getCreatedAt(),
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        List<StudentExamSummary> attempted = new ArrayList<>();
        List<Double> scores = new ArrayList<>();
        List<Double> trend = new ArrayList<>();
        Set<String> attemptedCodes = new HashSet<>();

        int cheatingAlerts = 0;
        LocalDateTime lastAttempt = null;

        for (ExamAttempt attempt : sortedAttempts) {
            int obtained = attempt.getObtainedMarks() == null ? 0 : attempt.getObtainedMarks();
            int total = attempt.getTotalMarks() == null ? 0 : attempt.getTotalMarks();
            double percentage = resolveAttemptPercentage(attempt);

            if (attempt.getExamCode() != null) {
                attemptedCodes.add(attempt.getExamCode());
            }

            scores.add(percentage);
            trend.add(percentage);

            if (Boolean.TRUE.equals(attempt.getCheatingFlag())) {
                cheatingAlerts++;
            }

            LocalDateTime attemptTime = attempt.getEndTime() != null ? attempt.getEndTime() : attempt.getStartTime();
            if (lastAttempt == null ||
                    (attemptTime != null && attemptTime.isAfter(lastAttempt))) {
                lastAttempt = attemptTime;
            }

            StudentExamSummary summary = new StudentExamSummary(
                    attempt.getExamCode(),
                    obtained,
                    total,
                    percentage,
                    calculateBadge(percentage));
            summary.setAttemptId(attempt.getId());
            attempted.add(summary);
        }

        List<Exam> visibleExams = activeExams == null ? List.of() : activeExams;
        List<String> notAttempted = visibleExams.stream()
                .map(Exam::getExamCode)
                .filter(code -> code != null && !attemptedCodes.contains(code))
                .toList();

        StudentDashboardResponse response = new StudentDashboardResponse();
        response.setAttempted(attempted);
        response.setNotAttempted(new ArrayList<>(notAttempted));
        response.setAnalytics(buildAnalytics(scores));
        response.setSuggestions(generateSuggestions(response.getAnalytics()));
        response.setTotalExams(visibleExams.size());
        response.setAttemptedCount(attempted.size());
        response.setNotAttemptedCount(notAttempted.size());
        response.setAverageScore(calculateAverageScore(sortedAttempts));
        response.setCertificatesEarned(repairedCertificates == null ? 0 : repairedCertificates.size());
        response.setLeaderboardRank(0);
        response.setCheatingAlerts(cheatingAlerts);
        response.setWeakTopics(detectWeakTopics(studentId));
        response.setPerformanceTrend(trend);
        response.setLastAttemptTime(lastAttempt);
        response.setLatestAttemptId(sortedAttempts.isEmpty() ? null : sortedAttempts.get(0).getId());
        return response;
    }

    private StudentExamAnalyticsResponse buildAnalytics(List<Double> scores) {
        StudentExamAnalyticsResponse analytics = new StudentExamAnalyticsResponse();
        analytics.setAttemptedExams(scores.size());
        analytics.setAverageScore(scores.stream().mapToDouble(Double::doubleValue).average().orElse(0));
        analytics.setHighestScore(scores.stream().mapToDouble(Double::doubleValue).max().orElse(0));
        analytics.setLowestScore(scores.stream().mapToDouble(Double::doubleValue).min().orElse(0));
        long passCount = scores.stream().filter(score -> score >= 40).count();
        analytics.setPassRate(scores.isEmpty() ? 0 : (passCount * 100.0) / scores.size());
        return analytics;
    }

    private double calculateAverageScore(List<ExamAttempt> attempts) {
        if (attempts == null || attempts.isEmpty()) {
            return 0;
        }
        return attempts.stream()
                .mapToDouble(this::resolveAttemptPercentage)
                .average()
                .orElse(0);
    }

    private List<ExamAttempt> loadStudentAttempts(Long studentId) {
        if (studentId == null) {
            return List.of();
        }
        List<ExamAttempt> attempts = new ArrayList<>(attemptRepository.findByStudentId(studentId));
        attempts.sort(Comparator.comparing(
                (ExamAttempt attempt) -> attempt.getEndTime() != null
                        ? attempt.getEndTime()
                        : attempt.getStartTime() != null
                                ? attempt.getStartTime()
                                : attempt.getCreatedAt(),
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return attempts;
    }

    private double resolveAttemptPercentage(ExamAttempt attempt) {
        if (attempt == null) {
            return 0;
        }
        if (attempt.getPercentage() != null && attempt.getPercentage() > 0) {
            return attempt.getPercentage();
        }
        int obtained = attempt.getObtainedMarks() == null ? 0 : attempt.getObtainedMarks();
        int total = attempt.getTotalMarks() == null ? 0 : attempt.getTotalMarks();
        if (total > 0) {
            return (obtained * 100.0) / total;
        }
        if (obtained > 0) {
            return Math.min(100.0, obtained);
        }
        return 0;
    }

    private List<Certificate> repairAndListCertificates(Long studentId) {
        if (studentId == null) {
            return List.of();
        }
        try {
            List<Certificate> certificates = certificateService.repairAndListStudentCertificates(studentId);
            logger.info("Student certificate repair/list completed for studentId={} count={}",
                    studentId, certificates.size());
            return certificates;
        } catch (Exception ex) {
            logger.warn("Certificate backfill skipped during student dashboard load for studentId={}: {}",
                    studentId, ex.getMessage());
            return certificateRepository.findByStudentIdAndRevokedFalse(studentId);
        }
    }

    private String calculateBadge(double percentage) {

        if (percentage >= 90)
            return "PLATINUM";
        if (percentage >= 80)
            return "GOLD";
        if (percentage >= 70)
            return "SILVER";
        if (percentage >= 60)
            return "BRONZE";

        return "PARTICIPANT";
    }

    private double resolvePercentage(ExamAttempt attempt, int obtained, int total) {
        if (attempt != null && attempt.getPercentage() != null && attempt.getPercentage() > 0) {
            return attempt.getPercentage();
        }
        if (total > 0) {
            return (obtained * 100.0) / total;
        }
        if (obtained > 0) {
            return Math.min(100.0, obtained);
        }
        return 0;
    }

    private List<ExamSuggestionResponse> generateSuggestions(
            StudentExamAnalyticsResponse analytics) {

        List<ExamSuggestionResponse> suggestions = new ArrayList<>();

        Double avg = analytics.getAverageScore();

        if (avg == null)
            return suggestions;

        if (avg < 50) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Revise basics and attempt beginner exams"));
        }

        if (avg >= 50 && avg < 70) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Practice medium difficulty exams"));
        }

        if (avg >= 70 && avg < 85) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Attempt advanced level exams"));
        }

        if (avg >= 85) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "You are doing great! Try competitive exams"));
        }

        return suggestions;
    }

    private List<String> detectWeakTopics(Long studentId) {
        return new ArrayList<>();
    }

    private User getVerifiedStudentByIdentifier(String identifier) {
        String value = identifier == null ? "" : identifier.trim();
        if (value.isBlank()) {
            throw new ResourceNotFoundException("Verified student not found");
        }

        User user = findUserByIdentifier(value);
        if (user == null && value.matches("\\d+")) {
            user = userRepository.findById(Long.parseLong(value)).orElse(null);
        }
        if (user == null) {
            throw new ResourceNotFoundException("Verified student not found");
        }
        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only student accounts can access student dashboard");
        }
        if (!user.isEnabled() || !user.isAccountNonLocked()) {
            throw new ForbiddenException("Please verify your account before accessing student dashboard");
        }
        return user;
    }

    private User findUserByIdentifier(String identifier) {
        String value = identifier == null ? "" : identifier.trim();
        if (value.isBlank()) {
            return null;
        }

        User byEmail = userRepository.findByEmailIgnoreCase(value).orElse(null);
        if (byEmail != null) {
            return byEmail;
        }

        String normalized = value.toLowerCase(Locale.ROOT);
        return userRepository.findAll().stream()
                .filter((user) -> matchesIdentifier(user, normalized))
                .findFirst()
                .orElse(null);
    }

    private boolean matchesIdentifier(User user, String normalizedNeedle) {
        if (user == null || normalizedNeedle == null || normalizedNeedle.isBlank()) {
            return false;
        }

        String[] candidateMethods = {
                "getUsername",
                "getUserName",
                "getEmail",
                "getPhone",
                "getPhoneNumber",
                "getMobile",
                "getMobileNumber",
                "getRollNumber",
                "getStudentCode",
                "getLoginId",
                "getName",
                "getFullName"
        };

        for (String methodName : candidateMethods) {
            String candidate = readStringProperty(user, methodName);
            if (candidate != null && candidate.trim().toLowerCase(Locale.ROOT).equals(normalizedNeedle)) {
                return true;
            }
        }

        return false;
    }

    private String readStringProperty(User user, String methodName) {
        try {
            Method method = user.getClass().getMethod(methodName);
            Object value = method.invoke(user);
            return value == null ? null : String.valueOf(value);
        } catch (ReflectiveOperationException ex) {
            return null;
        }
    }

    private Map<String, Object> toUserMap(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getName());
        map.put("email", user.getEmail());
        map.put("phone", user.getPhone());
        map.put("department", user.getDepartment());
        map.put("profileImage", user.getProfileImage());
        return map;
    }

    private Map<String, Object> toProfileMap(User user, StudentProfile profile) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("fullName", profile != null && profile.getFullName() != null ? profile.getFullName() : user.getName());
        map.put("email", profile != null && profile.getEmail() != null ? profile.getEmail() : user.getEmail());
        map.put("phone", profile != null ? profile.getPhone() : user.getPhone());
        map.put("collegeName", profile != null ? profile.getCollegeName() : null);
        map.put("department",
                profile != null && profile.getDepartment() != null ? profile.getDepartment() : user.getDepartment());
        map.put("year", profile != null ? profile.getYear() : null);
        map.put("rollNumber", profile != null ? profile.getRollNumber() : null);
        map.put("section", profile != null ? profile.getSection() : null);
        map.put("gender", profile != null ? profile.getGender() : null);
        map.put("dateOfBirth", profile != null ? profile.getDateOfBirth() : null);
        map.put("profilePhoto", profile != null && profile.getProfilePhoto() != null ? profile.getProfilePhoto()
                : user.getProfileImage());
        map.put("profileCompleted", profile != null && profile.isProfileCompleted());
        return map;
    }

    private Map<String, Object> toExamCard(Exam exam, ExamAttempt resumeAttempt, boolean registered) {
        Map<String, Object> map = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();

        String studentStatus = "closed";
        if (resumeAttempt != null) {
            studentStatus = "resume";
        } else if (exam.getStartTime() != null && now.isBefore(exam.getStartTime())) {
            studentStatus = "upcoming";
        } else if (exam.getEndTime() != null && now.isAfter(exam.getEndTime())) {
            studentStatus = "closed";
        } else if (exam.getStartTime() == null || exam.getEndTime() == null
                || (now.isAfter(exam.getStartTime()) && now.isBefore(exam.getEndTime()))) {
            studentStatus = "available";
        }

        map.put("id", exam.getId());
        map.put("examCode", exam.getExamCode());
        map.put("title", exam.getTitle());
        map.put("description", exam.getDescription());
        map.put("subject", exam.getSubject());
        map.put("durationMinutes", exam.getDurationMinutes());
        map.put("totalMarks", exam.getTotalMarks());
        map.put("passingMarks", exam.getPassingMarks());
        map.put("maxAttempts", exam.getMaxAttempts());
        map.put("negativeMarks", exam.getNegativeMarks());
        map.put("easyQuestionCount", exam.getEasyQuestionCount());
        map.put("mediumQuestionCount", exam.getMediumQuestionCount());
        map.put("difficultQuestionCount", exam.getDifficultQuestionCount());
        map.put("questionsUploaded", exam.getQuestionsUploaded());
        map.put("startTime", exam.getStartTime());
        map.put("endTime", exam.getEndTime());
        map.put("status", studentStatus);
        map.put("resumeAttemptId", resumeAttempt != null ? resumeAttempt.getId() : null);
        map.put("published", exam.isPublished());
        map.put("active", exam.isActive());

        // Add registration phase information
        map.put("registrationOpen", exam.isRegistrationOpen());
        map.put("currentRegistrationPhase", exam.getCurrentRegistrationPhase().name());
        map.put("registrationStartTime", exam.getRegistrationStartTime());
        map.put("phase1EndTime", exam.getPhase1EndTime());
        map.put("phase2StartTime", exam.getPhase2StartTime());
        map.put("requiresPhase2Verification", exam.requiresPhase2Verification());
        map.put("registered", registered);

        return map;
    }

    private Map<String, Object> toAttemptRow(ExamAttempt attempt) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", attempt.getId());
        map.put("examId", attempt.getExamId());
        map.put("examCode", attempt.getExamCode());
        map.put("studentId", attempt.getStudentId());
        map.put("score", attempt.getScore());
        map.put("obtainedMarks", attempt.getObtainedMarks());
        map.put("totalMarks", attempt.getTotalMarks());
        map.put("percentage", attempt.getPercentage());
        map.put("status", attempt.getStatus() != null ? attempt.getStatus().name() : null);
        map.put("attemptNumber", attempt.getAttemptNumber());
        map.put("autoSubmitted", attempt.getAutoSubmitted());
        map.put("cancelled", attempt.getCancelled());
        map.put("cheatingScore", attempt.getCheatingScore());
        map.put("cheatingFlag", attempt.getCheatingFlag());
        map.put("tabSwitchCount", attempt.getTabSwitchCount());
        map.put("fullscreenViolationCount", attempt.getFullscreenViolationCount());
        map.put("startTime", attempt.getStartTime());
        map.put("endTime", attempt.getEndTime());
        map.put("expiryTime", attempt.getExpiryTime());
        map.put("timeTakenSeconds", attempt.getTimeTakenSeconds());
        map.put("durationMinutes", attempt.getDurationMinutes());
        map.put("remarks", attempt.getRemarks());
        map.put("createdAt", attempt.getCreatedAt());
        map.put("updatedAt", attempt.getUpdatedAt());
        return map;
    }

    private Map<String, Object> toResultRow(com.yashwanth.ai_exam_system.entity.ExamResult result) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", result.getId());
        map.put("attemptId", result.getAttemptId());
        map.put("studentId", result.getStudentId());
        map.put("examCode", result.getExamCode());
        map.put("totalQuestions", result.getTotalQuestions());
        map.put("correctAnswers", result.getCorrectAnswers());
        map.put("wrongAnswers", result.getWrongAnswers());
        map.put("unansweredQuestions", result.getUnansweredQuestions());
        map.put("score", result.getScore());
        map.put("percentage", result.getPercentage());
        map.put("resultStatus", result.getResultStatus());
        map.put("passed", result.getPassed());
        map.put("certificateId", result.getCertificateId());
        map.put("easyCorrect", result.getEasyCorrect());
        map.put("mediumCorrect", result.getMediumCorrect());
        map.put("difficultCorrect", result.getDifficultCorrect());
        map.put("easyWrong", result.getEasyWrong());
        map.put("mediumWrong", result.getMediumWrong());
        map.put("difficultWrong", result.getDifficultWrong());
        map.put("timeTakenSeconds", resolveResultTimeTakenSeconds(result));
        map.put("submittedAt", result.getSubmittedAt());
        map.put("evaluatedAt", result.getEvaluatedAt());
        map.put("grade", result.getGrade());
        return map;
    }

    private Map<String, Object> toCertificateRow(Certificate certificate) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", certificate.getId());
        map.put("certificateId", certificate.getCertificateId());
        map.put("studentId", certificate.getStudentId());
        map.put("studentName", certificate.getStudentName());
        map.put("collegeName", certificate.getCollegeName());
        map.put("department", certificate.getDepartment());
        map.put("rollNumber", certificate.getRollNumber());
        map.put("section", certificate.getSection());
        map.put("profilePhoto", certificate.getProfilePhoto());
        map.put("examCode", certificate.getExamCode());
        map.put("examTitle", certificate.getExamTitle());
        map.put("score", certificate.getScore());
        map.put("grade", certificate.getGrade());
        map.put("qrCodeData", certificate.getQrCodeData());
        map.put("issuedAt", certificate.getIssuedAt());
        map.put("certificateUrl", certificate.getCertificateUrl());
        map.put("revoked", certificate.isRevoked());
        map.put("createdAt", certificate.getCreatedAt());
        map.put("updatedAt", certificate.getUpdatedAt());
        return map;
    }

    private long resolveResultTimeTakenSeconds(com.yashwanth.ai_exam_system.entity.ExamResult result) {
        if (result == null) {
            return 0L;
        }
        Long stored = result.getTimeTakenSeconds();
        if (stored != null && stored > 0) {
            return stored;
        }

        if (result.getAttemptId() != null) {
            ExamAttempt attempt = attemptRepository.findById(result.getAttemptId()).orElse(null);
            if (attempt != null) {
                if (attempt.getTimeTakenSeconds() != null && attempt.getTimeTakenSeconds() > 0) {
                    return attempt.getTimeTakenSeconds();
                }
                if (attempt.getStartTime() != null && attempt.getEndTime() != null
                        && attempt.getEndTime().isAfter(attempt.getStartTime())) {
                    return java.time.Duration.between(attempt.getStartTime(), attempt.getEndTime()).getSeconds();
                }
                if (attempt.getDurationMinutes() != null && attempt.getDurationMinutes() > 0) {
                    return attempt.getDurationMinutes() * 60L;
                }
            }
        }
        return 0L;
    }
}
