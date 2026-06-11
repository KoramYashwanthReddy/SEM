package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class EmailNotificationOrchestrator {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final EmailService emailService;
    private final UserRepository userRepository;

    @Value("${app.frontend.base-url:http://localhost:8080}")
    private String frontendBaseUrl;

    @Value("${app.email.support:support@ai-exam-system.local}")
    private String supportEmail;

    public EmailNotificationOrchestrator(EmailService emailService,
                                         UserRepository userRepository) {
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    public void notifyExamCreated(Exam exam) {
        String teacherEmail = resolveTeacherEmail(exam.getCreatedBy());
        sendExamLifecycleMail(
                teacherEmail,
                "Exam Created Successfully",
                "Your exam has been created and saved as draft.",
                exam,
                "Open Teacher Dashboard",
                buildAbsoluteUrl("/pages/teacher-dashboard.html")
        );
        notifyAdmins(
                "New Exam Created",
                "A new exam has been created by " + safe(exam.getCreatedBy()),
                exam,
                buildAbsoluteUrl("/pages/admin-dashboard.html")
        );
    }

    public void notifyExamUpdated(Exam exam) {
        sendExamLifecycleMail(
                resolveTeacherEmail(exam.getCreatedBy()),
                "Exam Updated",
                "An exam under your ownership has been updated.",
                exam,
                "Review Updated Exam",
                buildAbsoluteUrl("/pages/teacher-dashboard.html")
        );
    }

    public void notifyExamPublished(Exam exam) {
        sendExamLifecycleMail(
                resolveTeacherEmail(exam.getCreatedBy()),
                "Exam Published",
                "Your exam is live and registration is now open.",
                exam,
                "Open Teacher Dashboard",
                buildAbsoluteUrl("/pages/teacher-dashboard.html")
        );

        notifyAdmins(
                "Exam Published",
                "Exam has been published and is now available for registration.",
                exam,
                buildAbsoluteUrl("/pages/admin-dashboard.html")
        );

        List<User> activeStudents = userRepository.findByRoleAndEnabled(Role.STUDENT, true)
                .stream()
                .filter(User::isAccountNonLocked)
                .toList();

        for (User student : activeStudents) {
            if (!hasText(student.getEmail())) {
                continue;
            }
            Map<String, String> details = new LinkedHashMap<>();
            details.put("Exam", safe(exam.getTitle()));
            details.put("Code", safe(exam.getExamCode()));
            details.put("Subject", safe(exam.getSubject()));
            details.put("Starts At", formatDateTime(exam.getStartTime()));
            details.put("Ends At", formatDateTime(exam.getEndTime()));
            details.put("Duration", safe(exam.getDurationMinutes()) + " minutes");

            emailService.sendEmail(
                    student.getEmail(),
                    "[Student] New Exam Available: " + safe(exam.getTitle()),
                    buildTemplate(
                            "New Exam Available",
                            "Hello " + safe(student.getName()) + ",",
                            "A new exam has been published and is open for registration.",
                            details,
                            "Go To Student Dashboard",
                            buildAbsoluteUrl("/pages/student-ui.html")
                    )
            );
        }
    }

    public void notifyExamDeleted(Exam exam) {
        sendExamLifecycleMail(
                resolveTeacherEmail(exam.getCreatedBy()),
                "Exam Removed",
                "The exam has been removed from active usage.",
                exam,
                "Open Teacher Dashboard",
                buildAbsoluteUrl("/pages/teacher-dashboard.html")
        );
        notifyAdmins(
                "Exam Deactivated",
                "An exam was deactivated and is no longer active.",
                exam,
                buildAbsoluteUrl("/pages/admin-dashboard.html")
        );
    }

    public void notifyTeacherCreated(User teacher) {
        if (!hasText(teacher.getEmail())) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Name", safe(teacher.getName()));
        details.put("Email", safe(teacher.getEmail()));
        details.put("Department", safe(teacher.getDepartment()));
        details.put("Designation", safe(teacher.getDesignation()));
        details.put("Employee ID", safe(teacher.getEmployeeId()));
        details.put("Created At", formatDateTime(LocalDateTime.now()));

        emailService.sendEmail(
                teacher.getEmail(),
                "[Teacher] Welcome to AI Exam System",
                buildTemplate(
                        "Teacher Account Created",
                        "Hello " + safe(teacher.getName()) + ",",
                        "Your teacher account has been provisioned by the admin team.",
                        details,
                        "Open Teacher Login",
                        buildAbsoluteUrl("/pages/teacher-login.html")
                )
        );
    }

    public void notifyTeacherUpdated(User teacher) {
        if (!hasText(teacher.getEmail())) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Name", safe(teacher.getName()));
        details.put("Email", safe(teacher.getEmail()));
        details.put("Department", safe(teacher.getDepartment()));
        details.put("Designation", safe(teacher.getDesignation()));
        details.put("Updated At", formatDateTime(LocalDateTime.now()));

        emailService.sendEmail(
                teacher.getEmail(),
                "[Teacher] Profile Updated",
                buildTemplate(
                        "Teacher Profile Updated",
                        "Hello " + safe(teacher.getName()) + ",",
                        "Your teacher profile details were updated by an administrator.",
                        details,
                        "Review Profile",
                        buildAbsoluteUrl("/pages/teacher-dashboard.html")
                )
        );
    }

    public void notifyUserAccessChanged(User user, String actionLabel) {
        if (!hasText(user.getEmail())) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("User", safe(user.getName()));
        details.put("Email", safe(user.getEmail()));
        details.put("Role", user.getRole() == null ? "N/A" : user.getRole().name());
        details.put("Action", safe(actionLabel));
        details.put("Timestamp", formatDateTime(LocalDateTime.now()));

        emailService.sendEmail(
                user.getEmail(),
                "[" + safeRole(user) + "] Account Access Update",
                buildTemplate(
                        "Account Access Updated",
                        "Hello " + safe(user.getName()) + ",",
                        "Your account access status has changed.",
                        details,
                        "Open Portal",
                        buildPortalLink(user.getRole())
                )
        );
    }

    public void notifyStudentRegistered(User student, Exam exam, String phase) {
        if (student == null || !hasText(student.getEmail()) || exam == null) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Exam", safe(exam.getTitle()));
        details.put("Code", safe(exam.getExamCode()));
        details.put("Registration Phase", safe(phase));
        details.put("Exam Starts At", formatDateTime(exam.getStartTime()));
        details.put("Duration", safe(exam.getDurationMinutes()) + " minutes");

        emailService.sendEmail(
                student.getEmail(),
                "[Student] Registration Confirmed: " + safe(exam.getTitle()),
                buildTemplate(
                        "Exam Registration Confirmed",
                        "Hello " + safe(student.getName()) + ",",
                        "You have successfully registered for an exam.",
                        details,
                        "Open Student Dashboard",
                        buildAbsoluteUrl("/pages/student-ui.html")
                )
        );
    }

    public void notifyStudentExamReminder(User student, Exam exam, String reminderLabel) {
        if (student == null || !hasText(student.getEmail()) || exam == null) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Reminder", safe(reminderLabel));
        details.put("Exam", safe(exam.getTitle()));
        details.put("Code", safe(exam.getExamCode()));
        details.put("Subject", safe(exam.getSubject()));
        details.put("Starts At", formatDateTime(exam.getStartTime()));
        details.put("Duration", safe(exam.getDurationMinutes()) + " minutes");

        emailService.sendEmail(
                student.getEmail(),
                "[Student Reminder] " + safe(reminderLabel) + " - " + safe(exam.getTitle()),
                buildTemplate(
                        "Upcoming Exam Reminder",
                        "Hello " + safe(student.getName()) + ",",
                        "This is a reminder for your registered exam.",
                        details,
                        "Open Student Dashboard",
                        buildAbsoluteUrl("/pages/student-ui.html")
                )
        );
    }

    public void notifyTeacherExamReminder(String teacherEmail, Exam exam, String reminderLabel) {
        if (!hasText(teacherEmail) || exam == null) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Reminder", safe(reminderLabel));
        details.put("Exam", safe(exam.getTitle()));
        details.put("Code", safe(exam.getExamCode()));
        details.put("Starts At", formatDateTime(exam.getStartTime()));
        details.put("Ends At", formatDateTime(exam.getEndTime()));

        emailService.sendEmail(
                teacherEmail,
                "[Teacher Reminder] " + safe(reminderLabel) + " - " + safe(exam.getTitle()),
                buildTemplate(
                        "Exam Schedule Reminder",
                        "Hello,",
                        "A reminder for your exam schedule.",
                        details,
                        "Open Teacher Dashboard",
                        buildAbsoluteUrl("/pages/teacher-dashboard.html")
                )
        );
    }

    public void notifyStudentExamStarted(User student, Exam exam, ExamAttempt attempt) {
        if (student == null || !hasText(student.getEmail()) || exam == null || attempt == null) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Exam", safe(exam.getTitle()));
        details.put("Code", safe(exam.getExamCode()));
        details.put("Attempt ID", safe(attempt.getId()));
        details.put("Started At", formatDateTime(attempt.getStartTime()));
        details.put("Expiry Time", formatDateTime(attempt.getExpiryTime()));

        emailService.sendEmail(
                student.getEmail(),
                "[Student] Exam Attempt Started",
                buildTemplate(
                        "Exam Attempt Started",
                        "Hello " + safe(student.getName()) + ",",
                        "Your exam session has started.",
                        details,
                        "Return To Exam Portal",
                        buildAbsoluteUrl("/pages/exam/exam.html")
                )
        );
    }

    public void notifyExamSubmitted(User student, Exam exam, ExamAttempt attempt, ExamResult result) {
        if (student == null || !hasText(student.getEmail()) || exam == null || attempt == null) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Exam", safe(exam.getTitle()));
        details.put("Code", safe(exam.getExamCode()));
        details.put("Attempt ID", safe(attempt.getId()));
        details.put("Submitted At", formatDateTime(attempt.getEndTime()));
        details.put("Result", result == null ? "Pending" : safe(result.getResultStatus()));
        details.put("Score", result == null ? "Pending" : String.valueOf(result.getScore()));
        details.put("Percentage", result == null ? "Pending" : roundTo2(result.getPercentage()) + "%");

        emailService.sendEmail(
                student.getEmail(),
                "[Student] Exam Submitted: " + safe(exam.getTitle()),
                buildTemplate(
                        "Exam Submission Received",
                        "Hello " + safe(student.getName()) + ",",
                        "Your exam submission has been recorded successfully.",
                        details,
                        "Open Student Dashboard",
                        buildAbsoluteUrl("/pages/student-ui.html")
                )
        );

        String teacherEmail = resolveTeacherEmail(exam.getCreatedBy());
        if (hasText(teacherEmail)) {
            emailService.sendEmail(
                    teacherEmail,
                    "[Teacher] Student Submitted: " + safe(exam.getTitle()),
                    buildTemplate(
                            "Student Submission Alert",
                            "Hello,",
                            "A student has submitted an attempt for your exam.",
                            details,
                            "Open Teacher Dashboard",
                            buildAbsoluteUrl("/pages/teacher-dashboard.html")
                    )
            );
        }
    }

    public void notifyAttemptAction(ExamAttempt attempt, String actionLabel) {
        if (attempt == null) {
            return;
        }
        User student = attempt.getStudent();
        Exam exam = attempt.getExam();

        if (student != null && hasText(student.getEmail())) {
            Map<String, String> details = buildAttemptDetails(attempt, exam, actionLabel);
            emailService.sendEmail(
                    student.getEmail(),
                    "[Student] Attempt Update: " + safe(actionLabel),
                    buildTemplate(
                            "Exam Attempt Updated",
                            "Hello " + safe(student.getName()) + ",",
                            "Your exam attempt status has changed.",
                            details,
                            "Open Student Dashboard",
                            buildAbsoluteUrl("/pages/student-ui.html")
                    )
            );
        }

        String teacherEmail = resolveTeacherEmail(exam == null ? null : exam.getCreatedBy());
        if (hasText(teacherEmail)) {
            Map<String, String> details = buildAttemptDetails(attempt, exam, actionLabel);
            emailService.sendEmail(
                    teacherEmail,
                    "[Teacher] Attempt Status Changed",
                    buildTemplate(
                            "Attempt Status Changed",
                            "Hello,",
                            "An attempt associated with your exam has changed status.",
                            details,
                            "Open Teacher Dashboard",
                            buildAbsoluteUrl("/pages/teacher-dashboard.html")
                    )
            );
        }
    }

    public void notifySignupVerified(User user) {
        if (user == null || !hasText(user.getEmail())) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Name", safe(user.getName()));
        details.put("Email", safe(user.getEmail()));
        details.put("Role", user.getRole() == null ? "STUDENT" : user.getRole().name());
        details.put("Verified At", formatDateTime(LocalDateTime.now()));

        emailService.sendEmail(
                user.getEmail(),
                "[Student] Account Verified Successfully",
                buildTemplate(
                        "Welcome to AI Exam System",
                        "Hello " + safe(user.getName()) + ",",
                        "Your account has been verified and is now active.",
                        details,
                        "Open Student Dashboard",
                        buildAbsoluteUrl("/pages/student-ui.html")
                )
        );
    }

    public void notifyPasswordResetSuccess(User user) {
        if (user == null || !hasText(user.getEmail())) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Account", safe(user.getEmail()));
        details.put("Role", user.getRole() == null ? "N/A" : user.getRole().name());
        details.put("Reset At", formatDateTime(LocalDateTime.now()));

        emailService.sendEmail(
                user.getEmail(),
                "[Security] Password Changed Successfully",
                buildTemplate(
                        "Password Updated",
                        "Hello " + safe(user.getName()) + ",",
                        "Your account password was successfully changed.",
                        details,
                        "Open Login",
                        buildLoginLink(user.getRole())
                )
        );
    }

    private void sendExamLifecycleMail(String toEmail,
                                       String headline,
                                       String intro,
                                       Exam exam,
                                       String ctaLabel,
                                       String ctaLink) {
        if (!hasText(toEmail) || exam == null) {
            return;
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Exam", safe(exam.getTitle()));
        details.put("Code", safe(exam.getExamCode()));
        details.put("Subject", safe(exam.getSubject()));
        details.put("Start Time", formatDateTime(exam.getStartTime()));
        details.put("End Time", formatDateTime(exam.getEndTime()));
        details.put("Status", exam.getStatus() == null ? "N/A" : exam.getStatus().name());

        emailService.sendEmail(
                toEmail,
                "[Teacher] " + headline + ": " + safe(exam.getTitle()),
                buildTemplate(
                        headline,
                        "Hello,",
                        intro,
                        details,
                        ctaLabel,
                        ctaLink
                )
        );
    }

    private void notifyAdmins(String headline, String intro, Exam exam, String ctaLink) {
        List<User> admins = userRepository.findByRoleAndEnabled(Role.ADMIN, true)
                .stream()
                .filter(User::isAccountNonLocked)
                .toList();
        for (User admin : admins) {
            if (!hasText(admin.getEmail())) {
                continue;
            }
            Map<String, String> details = new LinkedHashMap<>();
            details.put("Exam", safe(exam.getTitle()));
            details.put("Code", safe(exam.getExamCode()));
            details.put("Owner", safe(exam.getCreatedBy()));
            details.put("Status", exam.getStatus() == null ? "N/A" : exam.getStatus().name());
            details.put("Timestamp", formatDateTime(LocalDateTime.now()));

            emailService.sendEmail(
                    admin.getEmail(),
                    "[Admin] " + headline + ": " + safe(exam.getTitle()),
                    buildTemplate(
                            headline,
                            "Hello " + safe(admin.getName()) + ",",
                            intro,
                            details,
                            "Open Admin Dashboard",
                            ctaLink
                    )
            );
        }
    }

    private Map<String, String> buildAttemptDetails(ExamAttempt attempt, Exam exam, String actionLabel) {
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Action", safe(actionLabel));
        details.put("Attempt ID", safe(attempt.getId()));
        details.put("Exam Code", exam == null ? safe(attempt.getExamCode()) : safe(exam.getExamCode()));
        details.put("Exam", exam == null ? "N/A" : safe(exam.getTitle()));
        details.put("Status", attempt.getStatus() == null ? "N/A" : attempt.getStatus().name());
        details.put("Remarks", safe(attempt.getRemarks()));
        details.put("Timestamp", formatDateTime(LocalDateTime.now()));
        return details;
    }

    private String buildTemplate(String title,
                                 String greeting,
                                 String intro,
                                 Map<String, String> details,
                                 String ctaLabel,
                                 String ctaLink) {
        StringBuilder rows = new StringBuilder();
        for (Map.Entry<String, String> entry : details.entrySet()) {
            rows.append("<tr>")
                    .append("<td style='padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;'>")
                    .append(escape(entry.getKey()))
                    .append("</td>")
                    .append("<td style='padding:8px 10px;border:1px solid #e5e7eb;'>")
                    .append(escape(entry.getValue()))
                    .append("</td>")
                    .append("</tr>");
        }

        return "<div style='margin:0;padding:24px;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;'>"
                + "<div style='max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;'>"
                + "<div style='padding:18px 22px;background:#0b1f3f;color:#ffffff;font-size:18px;font-weight:700;'>AI Exam System</div>"
                + "<div style='padding:22px;'>"
                + "<h2 style='margin:0 0 12px 0;color:#0f172a;'>" + escape(title) + "</h2>"
                + "<p style='margin:0 0 12px 0;'>" + escape(greeting) + "</p>"
                + "<p style='margin:0 0 16px 0;line-height:1.55;'>" + escape(intro) + "</p>"
                + "<table style='width:100%;border-collapse:collapse;margin:10px 0 20px 0;font-size:14px;'>"
                + rows
                + "</table>"
                + "<a href='" + escapeUrl(ctaLink) + "' "
                + "style='display:inline-block;padding:11px 16px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;'>"
                + escape(ctaLabel)
                + "</a>"
                + "<p style='margin:16px 0 0 0;font-size:12px;color:#475569;'>For support: " + escape(supportEmail) + "</p>"
                + "</div>"
                + "</div>"
                + "</div>";
    }

    private String resolveTeacherEmail(String teacherKey) {
        if (!hasText(teacherKey)) {
            return null;
        }
        String key = teacherKey.trim();
        if (key.contains("@")) {
            return key;
        }
        return userRepository.findByEmployeeIdIgnoreCase(key).map(User::getEmail).orElse(null);
    }

    public String resolveTeacherEmailForNotification(String teacherKey) {
        return resolveTeacherEmail(teacherKey);
    }

    private String buildAbsoluteUrl(String path) {
        if (!hasText(path)) {
            return frontendBaseUrl;
        }
        String base = hasText(frontendBaseUrl) ? frontendBaseUrl.trim() : "http://localhost:8080";
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (path.startsWith("/")) {
            return base + path;
        }
        return base + "/" + path;
    }

    private String buildLoginLink(Role role) {
        if (role == Role.ADMIN) {
            return buildAbsoluteUrl("/pages/admin-login.html");
        }
        if (role == Role.TEACHER) {
            return buildAbsoluteUrl("/pages/teacher-login.html");
        }
        return buildAbsoluteUrl("/pages/login.html");
    }

    private String buildPortalLink(Role role) {
        if (role == Role.ADMIN) {
            return buildAbsoluteUrl("/pages/admin-dashboard.html");
        }
        if (role == Role.TEACHER) {
            return buildAbsoluteUrl("/pages/teacher-dashboard.html");
        }
        return buildAbsoluteUrl("/pages/student-ui.html");
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return "N/A";
        }
        return value.format(DATE_TIME_FORMATTER);
    }

    private String roundTo2(Double value) {
        if (value == null) {
            return "0.00";
        }
        return String.format(Locale.ROOT, "%.2f", value);
    }

    private String safe(Object value) {
        return value == null ? "N/A" : String.valueOf(value);
    }

    private String safeRole(User user) {
        if (user == null || user.getRole() == null) {
            return "USER";
        }
        return user.getRole().name();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String escapeUrl(String value) {
        return escape(value == null ? "" : value);
    }
}
