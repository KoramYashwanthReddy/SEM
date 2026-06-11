package com.yashwanth.ai_exam_system.monitoring;

import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamRegistration;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.ExamRegistrationRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.EmailDispatchGuardService;
import com.yashwanth.ai_exam_system.service.EmailNotificationOrchestrator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ExamReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExamReminderScheduler.class);

    private final ExamRepository examRepository;
    private final ExamRegistrationRepository examRegistrationRepository;
    private final UserRepository userRepository;
    private final EmailNotificationOrchestrator emailNotificationOrchestrator;
    private final EmailDispatchGuardService emailDispatchGuardService;

    @Value("${app.email.reminders.enabled:true}")
    private boolean remindersEnabled;

    public ExamReminderScheduler(ExamRepository examRepository,
                                 ExamRegistrationRepository examRegistrationRepository,
                                 UserRepository userRepository,
                                 EmailNotificationOrchestrator emailNotificationOrchestrator,
                                 EmailDispatchGuardService emailDispatchGuardService) {
        this.examRepository = examRepository;
        this.examRegistrationRepository = examRegistrationRepository;
        this.userRepository = userRepository;
        this.emailNotificationOrchestrator = emailNotificationOrchestrator;
        this.emailDispatchGuardService = emailDispatchGuardService;
    }

    @Scheduled(fixedDelayString = "${app.email.reminders.fixed-delay-ms:300000}")
    public void sendUpcomingExamReminders() {
        if (!remindersEnabled) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        List<Exam> candidates = examRepository.findAllActiveOrderByCreatedAtDesc().stream()
                .filter(Exam::isPublished)
                .filter(exam -> exam.getStartTime() != null)
                .filter(exam -> exam.getEndTime() == null || now.isBefore(exam.getEndTime().plusMinutes(5)))
                .toList();

        for (Exam exam : candidates) {
            long minutesUntilStart = Duration.between(now, exam.getStartTime()).toMinutes();

            maybeSendReminder(exam, minutesUntilStart, "REMINDER_24H", "Exam starts in 24 hours", 1440, 30);
            maybeSendReminder(exam, minutesUntilStart, "REMINDER_1H", "Exam starts in 1 hour", 60, 20);
            maybeSendReminder(exam, minutesUntilStart, "REMINDER_15M", "Exam starts in 15 minutes", 15, 10);
            maybeSendStartReminder(exam, minutesUntilStart);
        }
    }

    private void maybeSendReminder(Exam exam,
                                   long minutesUntilStart,
                                   String eventCode,
                                   String reminderLabel,
                                   long targetMinutes,
                                   long windowMinutes) {
        if (minutesUntilStart > targetMinutes || minutesUntilStart < (targetMinutes - windowMinutes)) {
            return;
        }
        dispatchReminder(exam, eventCode, reminderLabel);
    }

    private void maybeSendStartReminder(Exam exam, long minutesUntilStart) {
        if (minutesUntilStart < -5 || minutesUntilStart > 5) {
            return;
        }
        dispatchReminder(exam, "REMINDER_START", "Exam window is now open");
    }

    private void dispatchReminder(Exam exam, String eventCode, String reminderLabel) {
        List<ExamRegistration> registrations =
                examRegistrationRepository.findByExamCodeAndActiveTrue(exam.getExamCode());

        if (registrations.isEmpty()) {
            return;
        }

        Set<Long> studentIds = registrations.stream()
                .map(ExamRegistration::getStudentId)
                .collect(Collectors.toSet());

        Map<Long, User> studentsById = new HashMap<>();
        userRepository.findAllById(studentIds).forEach(user -> studentsById.put(user.getId(), user));

        String startRef = exam.getStartTime() == null ? "NA" : exam.getStartTime().toString();
        String examRef = exam.getExamCode() + "|" + startRef;
        String teacherEmail = emailNotificationOrchestrator.resolveTeacherEmailForNotification(exam.getCreatedBy());

        for (ExamRegistration registration : registrations) {
            User student = studentsById.get(registration.getStudentId());
            if (student == null || !canReceive(student)) {
                continue;
            }
            String studentRef = examRef + "|STUDENT|" + student.getId();
            if (emailDispatchGuardService.markDispatchedIfFirst(student.getEmail(), eventCode, studentRef)) {
                emailNotificationOrchestrator.notifyStudentExamReminder(student, exam, reminderLabel);
            }
        }

        if (teacherEmail != null && !teacherEmail.isBlank()) {
            String teacherRef = examRef + "|TEACHER|" + teacherEmail.toLowerCase();
            if (emailDispatchGuardService.markDispatchedIfFirst(teacherEmail, eventCode, teacherRef)) {
                emailNotificationOrchestrator.notifyTeacherExamReminder(teacherEmail, exam, reminderLabel);
            }
        }

        log.info("Processed {} reminders for exam {} ({})",
                eventCode, exam.getExamCode(), reminderLabel);
    }

    private boolean canReceive(User user) {
        return user.getEmail() != null
                && !user.getEmail().isBlank()
                && user.isEnabled()
                && user.isAccountNonLocked();
    }
}
