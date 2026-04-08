package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ExamSuggestionResponse;
import com.yashwanth.ai_exam_system.dto.LeaderboardDTO;
import com.yashwanth.ai_exam_system.dto.StudentDashboardResponse;
import com.yashwanth.ai_exam_system.dto.StudentExamAnalyticsResponse;
import com.yashwanth.ai_exam_system.dto.StudentExamSummary;
import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamRegistration;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.ExamRegistrationRepository;
import com.yashwanth.ai_exam_system.repository.StudentProfileRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StudentDashboardService {

    private final ExamAttemptRepository attemptRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final ExamRegistrationRepository examRegistrationRepository;
    private final CertificateRepository certificateRepository;
    private final LeaderboardService leaderboardService;

    public StudentDashboardService(ExamAttemptRepository attemptRepository,
                                   ExamRepository examRepository,
                                   UserRepository userRepository,
                                   StudentProfileRepository studentProfileRepository,
                                   ExamRegistrationRepository examRegistrationRepository,
                                   CertificateRepository certificateRepository,
                                   LeaderboardService leaderboardService) {
        this.attemptRepository = attemptRepository;
        this.examRepository = examRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.examRegistrationRepository = examRegistrationRepository;
        this.certificateRepository = certificateRepository;
        this.leaderboardService = leaderboardService;
    }

    public StudentDashboardResponse getDashboardForIdentifier(String identifier) {
        User student = getVerifiedStudentByIdentifier(identifier);
        return getDashboard(student.getId());
    }

    public StudentDashboardResponse getDashboard(Long studentId) {

        List<ExamAttempt> attempts = attemptRepository.findByStudentId(studentId);
        List<Exam> activeExams = examRepository.findAllActiveOrderByCreatedAtDesc()
                .stream()
                .filter(Exam::isPublished)
                .toList();

        attempts.sort(Comparator.comparing(
                (ExamAttempt attempt) ->
                        attempt.getEndTime() != null
                                ? attempt.getEndTime()
                                : attempt.getStartTime() != null
                                ? attempt.getStartTime()
                                : attempt.getCreatedAt(),
                Comparator.nullsLast(Comparator.naturalOrder())
        ).reversed());

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

            double percentage = 0;

            if (total > 0) {
                percentage = (obtained * 100.0) / total;
            }

            if (attempt.getExamCode() != null) {
                attemptedCodes.add(attempt.getExamCode());
            }

            scores.add(percentage);
            trend.add(percentage);

            if (Boolean.TRUE.equals(attempt.getCheatingFlag())) {
                cheatingAlerts++;
            }

            if (percentage >= 80) {
                certificates++;
            }

            LocalDateTime attemptTime =
                    attempt.getEndTime() != null ? attempt.getEndTime() : attempt.getStartTime();
            if (lastAttempt == null ||
                    (attemptTime != null && attemptTime.isAfter(lastAttempt))) {
                lastAttempt = attemptTime;
            }

            StudentExamSummary summary = new StudentExamSummary(
                    attempt.getExamCode(),
                    obtained,
                    total,
                    percentage,
                    calculateBadge(percentage)
            );
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
        response.setCertificatesEarned(certificates);

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
        StudentDashboardResponse dashboard = getDashboard(student.getId());
        StudentProfile profile = studentProfileRepository.findByUserId(student.getId()).orElse(null);

        List<ExamAttempt> attempts = attemptRepository.findByStudentId(student.getId());
        attempts.sort(Comparator.comparing(
                (ExamAttempt attempt) ->
                        attempt.getEndTime() != null
                                ? attempt.getEndTime()
                                : attempt.getStartTime() != null
                                ? attempt.getStartTime()
                                : attempt.getCreatedAt(),
                Comparator.nullsLast(Comparator.naturalOrder())
        ).reversed());

        Map<String, ExamAttempt> activeAttemptByExamCode = attempts.stream()
                .filter(attempt -> attempt.getExamCode() != null)
                .filter(attempt -> attempt.getStatus() == AttemptStatus.STARTED)
                .filter(attempt -> !Boolean.TRUE.equals(attempt.getCancelled()))
                .collect(Collectors.toMap(
                        ExamAttempt::getExamCode,
                        attempt -> attempt,
                        (left, right) -> {
                            LocalDateTime leftTime = left.getUpdatedAt() != null ? left.getUpdatedAt() : left.getCreatedAt();
                            LocalDateTime rightTime = right.getUpdatedAt() != null ? right.getUpdatedAt() : right.getCreatedAt();
                            if (leftTime == null) return right;
                            if (rightTime == null) return left;
                            return rightTime.isAfter(leftTime) ? right : left;
                        }
                ));

        List<Map<String, Object>> examCards = examRepository.findAllActiveOrderByCreatedAtDesc()
                .stream()
                .filter(Exam::isPublished)
                .map(exam -> toExamCard(exam, activeAttemptByExamCode.get(exam.getExamCode())))
                .toList();

        List<ExamRegistration> registrations =
                examRegistrationRepository.findByStudentIdAndActiveTrue(student.getId());
        List<String> registeredExamCodes = registrations.stream()
                .map(ExamRegistration::getExamCode)
                .filter(code -> code != null && !code.isBlank())
                .toList();

        List<Map<String, Object>> attemptRows = attempts.stream()
                .map(this::toAttemptRow)
                .toList();

        List<Certificate> certificates = certificateRepository.findByStudentId(student.getId());
        List<LeaderboardDTO> leaderboardGlobal = leaderboardService.getGlobalLeaderboard();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("studentId", student.getId());
        response.put("user", toUserMap(student));
        response.put("profile", toProfileMap(student, profile));
        response.put("dashboard", dashboard);
        response.put("exams", examCards);
        response.put("attempts", attemptRows);
        response.put("certificates", certificates);
        response.put("leaderboardGlobal", leaderboardGlobal);
        response.put("registeredExamCodes", registeredExamCodes);
        return response;
    }

    private String calculateBadge(double percentage) {

        if (percentage >= 90) return "PLATINUM";
        if (percentage >= 80) return "GOLD";
        if (percentage >= 70) return "SILVER";
        if (percentage >= 60) return "BRONZE";

        return "PARTICIPANT";
    }

    private List<ExamSuggestionResponse> generateSuggestions(
            StudentExamAnalyticsResponse analytics) {

        List<ExamSuggestionResponse> suggestions = new ArrayList<>();

        Double avg = analytics.getAverageScore();

        if (avg == null) return suggestions;

        if (avg < 50) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Revise basics and attempt beginner exams"
                    )
            );
        }

        if (avg >= 50 && avg < 70) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Practice medium difficulty exams"
                    )
            );
        }

        if (avg >= 70 && avg < 85) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Attempt advanced level exams"
                    )
            );
        }

        if (avg >= 85) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "You are doing great! Try competitive exams"
                    )
            );
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

        User user = userRepository.findByEmailIgnoreCase(value).orElse(null);
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
        map.put("department", profile != null && profile.getDepartment() != null ? profile.getDepartment() : user.getDepartment());
        map.put("year", profile != null ? profile.getYear() : null);
        map.put("rollNumber", profile != null ? profile.getRollNumber() : null);
        map.put("section", profile != null ? profile.getSection() : null);
        map.put("gender", profile != null ? profile.getGender() : null);
        map.put("dateOfBirth", profile != null ? profile.getDateOfBirth() : null);
        map.put("profilePhoto", profile != null && profile.getProfilePhoto() != null ? profile.getProfilePhoto() : user.getProfileImage());
        map.put("profileCompleted", profile != null && profile.isProfileCompleted());
        return map;
    }

    private Map<String, Object> toExamCard(Exam exam, ExamAttempt resumeAttempt) {
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
}
