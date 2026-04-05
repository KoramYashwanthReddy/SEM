package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class HomeSummaryService {

    private static final DateTimeFormatter MONTH_LABEL =
            DateTimeFormatter.ofPattern("MMM yyyy");
    private static final DateTimeFormatter DAY_LABEL =
            DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final CertificateRepository certificateRepository;
    private final ExamResultRepository resultRepository;

    public HomeSummaryService(
            UserRepository userRepository,
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            CertificateRepository certificateRepository,
            ExamResultRepository resultRepository) {

        this.userRepository = userRepository;
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.certificateRepository = certificateRepository;
        this.resultRepository = resultRepository;
    }

    public Map<String, Object> getSummary() {
        List<ExamResult> results = resultRepository.findAll();
        List<ExamAttempt> attempts = attemptRepository.findAll();
        List<Exam> exams = examRepository.findAll();
        List<Certificate> certificates = certificateRepository.findAll();
        List<com.yashwanth.ai_exam_system.entity.User> users = userRepository.findAll();

        LocalDateTime now = LocalDateTime.now();
        YearMonth currentMonth = YearMonth.from(now);

        long totalUsers = users.size();
        long totalStudents = users.stream().filter(u -> u.getRole() == Role.STUDENT).count();
        long activeStudents = users.stream().filter(u -> u.getRole() == Role.STUDENT && u.isEnabled()).count();
        long totalTeachers = users.stream().filter(u -> u.getRole() == Role.TEACHER).count();
        long enabledTeachers = users.stream().filter(u -> u.getRole() == Role.TEACHER && u.isEnabled()).count();

        long totalExams = exams.size();
        long examsThisMonth = exams.stream()
                .filter(e -> e.getCreatedAt() != null && YearMonth.from(e.getCreatedAt()).equals(currentMonth))
                .count();
        long activeExams = exams.stream().filter(Exam::isActive).count();

        long totalAttempts = attempts.size();
        long liveSessions = attempts.stream()
                .filter(a -> a.getActive() != null && a.getActive())
                .filter(a -> a.getStatus() == AttemptStatus.STARTED)
                .filter(a -> a.getCancelled() == null || !a.getCancelled())
                .count();

        long totalCertificates = certificates.size();
        long activeCertificates = certificates.stream().filter(c -> !c.isRevoked()).count();

        long completedResults = results.stream().filter(r -> Boolean.TRUE.equals(r.getPassed())).count();
        double passRate = results.isEmpty() ? 0 : (completedResults * 100.0) / results.size();
        double completionRate = attempts.isEmpty() ? 0 : (results.size() * 100.0) / attempts.size();
        long riskyAttempts = attempts.stream()
                .filter(a -> a.getCheatingScore() != null && a.getCheatingScore() > 0)
                .count();
        double violationRate = attempts.isEmpty() ? 0 : (riskyAttempts * 100.0) / attempts.size();
        double avgScore = results.stream().mapToDouble(ExamResult::getScore).average().orElse(0);

        Map<String, Object> hero = new LinkedHashMap<>();
        hero.put("examsConducted", totalAttempts);
        hero.put("passRate", round(passRate));
        hero.put("certificatesIssued", activeCertificates);

        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("examsThisMonth", examsThisMonth);
        analytics.put("activeStudents", activeStudents);
        analytics.put("completionRate", round(completionRate));
        analytics.put("violationRate", round(violationRate));
        analytics.put("averageScore", round(avgScore));
        analytics.put("totalTeachers", totalTeachers);
        analytics.put("enabledTeachers", enabledTeachers);

        Map<String, Object> scoreDistribution = new LinkedHashMap<>();
        scoreDistribution.put("labels", List.of("0-20", "21-40", "41-60", "61-80", "81-100"));
        scoreDistribution.put("data", bucketScores(results));

        Map<String, Object> violationTypes = new LinkedHashMap<>();
        violationTypes.put("labels", List.of("Tab Switch", "Fullscreen", "High Risk", "Auto Submitted", "Cancelled"));
        violationTypes.put("data", List.of(
                attempts.stream().mapToInt(a -> safeInt(a.getTabSwitchCount())).sum(),
                attempts.stream().mapToInt(a -> safeInt(a.getFullscreenViolationCount())).sum(),
                (int) attempts.stream().filter(a -> safeInt(a.getCheatingScore()) >= 80).count(),
                (int) attempts.stream().filter(a -> Boolean.TRUE.equals(a.getAutoSubmitted())).count(),
                (int) attempts.stream().filter(a -> Boolean.TRUE.equals(a.getCancelled())).count()
        ));

        Map<String, Object> trend = buildTrend(results);

        Map<String, Object> latestCertificate = certificates.stream()
                .filter(c -> !c.isRevoked())
                .max(Comparator.comparing(c -> safeTime(c.getIssuedAt() != null ? c.getIssuedAt() : c.getCreatedAt())))
                .map(this::toCertificateSummary)
                .orElseGet(() -> Map.of(
                        "studentName", "No certificates yet",
                        "examTitle", "-",
                        "score", 0,
                        "certificateId", "-",
                        "issuedAt", "-"
                ));

        Map<String, Object> latestTeacher = users.stream()
                .filter(u -> u.getRole() == Role.TEACHER)
                .max(Comparator.comparing(u -> safeTime(u.getUpdatedAt() != null ? u.getUpdatedAt() : u.getCreatedAt())))
                .map(this::toUserSummary)
                .orElseGet(() -> Map.of(
                        "name", "No teachers yet",
                        "department", "-",
                        "designation", "-",
                        "employeeId", "-"
                ));

        Map<String, Object> latestExam = exams.stream()
                .max(Comparator.comparing(e -> safeTime(e.getUpdatedAt() != null ? e.getUpdatedAt() : e.getCreatedAt())))
                .map(this::toExamSummary)
                .orElseGet(() -> Map.of(
                        "title", "No exams yet",
                        "subject", "-",
                        "status", "DRAFT",
                        "studentCount", 0,
                        "averageScore", 0
                ));

        List<Map<String, Object>> adminExamRows = exams.stream()
                .sorted(Comparator.comparing((Exam e) -> safeTime(e.getCreatedAt())).reversed())
                .limit(4)
                .map(this::toExamSummary)
                .toList();

        Map<String, Object> adminPreview = new LinkedHashMap<>();
        adminPreview.put("activeExams", activeExams);
        adminPreview.put("totalStudents", totalStudents);
        adminPreview.put("liveSessions", liveSessions);
        adminPreview.put("exams", adminExamRows);

        Map<String, Object> certificatePreview = new LinkedHashMap<>();
        certificatePreview.put("studentName", latestCertificate.get("studentName"));
        certificatePreview.put("examTitle", latestCertificate.get("examTitle"));
        certificatePreview.put("score", latestCertificate.get("score"));
        certificatePreview.put("certificateId", latestCertificate.get("certificateId"));
        certificatePreview.put("issuedAt", latestCertificate.get("issuedAt"));
        certificatePreview.put("authority", "SEM Platform - Examinations");

        Map<String, Object> heroTeacher = latestTeacher;

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("hero", hero);
        summary.put("analytics", analytics);
        summary.put("scoreDistribution", scoreDistribution);
        summary.put("violationTypes", violationTypes);
        summary.put("trend", trend);
        summary.put("certificatePreview", certificatePreview);
        summary.put("adminPreview", adminPreview);
        summary.put("latestExam", latestExam);
        summary.put("latestTeacher", heroTeacher);
        summary.put("meta", Map.of(
                "totalUsers", totalUsers,
                "totalStudents", totalStudents,
                "totalTeachers", totalTeachers,
                "totalExams", totalExams,
                "totalAttempts", totalAttempts,
                "totalCertificates", totalCertificates,
                "averageScore", round(avgScore)
        ));

        return summary;
    }

    private Map<String, Object> toCertificateSummary(Certificate certificate) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("studentName", certificate.getStudentName() != null ? certificate.getStudentName() : "Unknown Student");
        map.put("examTitle", certificate.getExamTitle() != null ? certificate.getExamTitle() : "Exam");
        map.put("score", round(certificate.getScore()));
        map.put("certificateId", certificate.getCertificateId());
        map.put("issuedAt", certificate.getIssuedAt() != null ? certificate.getIssuedAt().format(DAY_LABEL) : "-");
        map.put("collegeName", certificate.getCollegeName());
        map.put("department", certificate.getDepartment());
        return map;
    }

    private Map<String, Object> toUserSummary(com.yashwanth.ai_exam_system.entity.User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", user.getName());
        map.put("department", user.getDepartment() != null ? user.getDepartment() : "-");
        map.put("designation", user.getDesignation() != null ? user.getDesignation() : "-");
        map.put("employeeId", user.getEmployeeId() != null ? user.getEmployeeId() : "-");
        map.put("email", user.getEmail());
        map.put("role", user.getRole() != null ? user.getRole().name() : "-");
        map.put("updatedAt", user.getUpdatedAt());
        map.put("createdAt", user.getCreatedAt());
        return map;
    }

    private Map<String, Object> toExamSummary(Exam exam) {
        long studentCount = resultRepository.countByExamCode(exam.getExamCode());
        double averageScore = resultRepository.findAverageScoreByExamCode(exam.getExamCode());

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("title", exam.getTitle());
        map.put("subject", exam.getSubject() != null ? exam.getSubject() : "General");
        map.put("studentCount", studentCount);
        map.put("status", exam.getStatus() != null ? exam.getStatus().name() : "DRAFT");
        map.put("averageScore", round(averageScore));
        map.put("createdAt", exam.getCreatedAt());
        map.put("updatedAt", exam.getUpdatedAt());
        map.put("examCode", exam.getExamCode());
        return map;
    }

    private LocalDateTime safeTime(LocalDateTime value) {
        return value != null ? value : LocalDateTime.MIN;
    }

    private Map<String, Object> buildTrend(List<ExamResult> results) {
        List<String> labels = new ArrayList<>();
        List<Integer> completion = new ArrayList<>();
        List<Integer> passRate = new ArrayList<>();

        YearMonth cursor = YearMonth.now().minusMonths(11);
        for (int i = 0; i < 12; i++) {
            YearMonth month = cursor.plusMonths(i);
            labels.add(month.format(MONTH_LABEL));

            List<ExamResult> monthResults = results.stream()
                    .filter(r -> r.getSubmittedAt() != null && YearMonth.from(r.getSubmittedAt()).equals(month))
                    .toList();

            completion.add(monthResults.size());

            long passed = monthResults.stream().filter(r -> Boolean.TRUE.equals(r.getPassed())).count();
            int rate = monthResults.isEmpty() ? 0 : (int) Math.round((passed * 100.0) / monthResults.size());
            passRate.add(rate);
        }

        Map<String, Object> trend = new LinkedHashMap<>();
        trend.put("labels", labels);
        trend.put("completion", completion);
        trend.put("passRate", passRate);
        return trend;
    }

    private List<Integer> bucketScores(List<ExamResult> results) {
        int[] buckets = new int[5];
        for (ExamResult result : results) {
            double score = result.getScore();
            if (score <= 20) buckets[0]++;
            else if (score <= 40) buckets[1]++;
            else if (score <= 60) buckets[2]++;
            else if (score <= 80) buckets[3]++;
            else buckets[4]++;
        }
        return List.of(buckets[0], buckets[1], buckets[2], buckets[3], buckets[4]);
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
