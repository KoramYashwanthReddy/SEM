package com.yashwanth.ai_exam_system.config;

import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);
    private static final int MIN_BOOTSTRAP_PASSWORD_LENGTH = 12;
    private static final String DEMO_ADMIN_EMAIL = "admin@ai-exam.local";
    private static final String DEMO_TEACHER_EMAIL = "teacher@ai-exam.local";
    private static final String DEMO_STUDENT_EMAIL = "student@ai-exam.local";
    private static final String DEMO_TEACHER_EMPLOYEE_ID = "TCH-1001";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean bootstrapDemoEnabled;
    private final boolean bootstrapAdminEnabled;
    private final String bootstrapAdminEmail;
    private final String bootstrapAdminPassword;
    private final String bootstrapAdminName;

    public DataInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.demo.enabled:true}") boolean bootstrapDemoEnabled,
            @Value("${app.bootstrap.admin.enabled:false}") boolean bootstrapAdminEnabled,
            @Value("${app.bootstrap.admin.email:}") String bootstrapAdminEmail,
            @Value("${app.bootstrap.admin.password:}") String bootstrapAdminPassword,
            @Value("${app.bootstrap.admin.name:Platform Admin}") String bootstrapAdminName) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.bootstrapDemoEnabled = bootstrapDemoEnabled;
        this.bootstrapAdminEnabled = bootstrapAdminEnabled;
        this.bootstrapAdminEmail = bootstrapAdminEmail;
        this.bootstrapAdminPassword = bootstrapAdminPassword;
        this.bootstrapAdminName = bootstrapAdminName;
    }

    @Override
    @Transactional
    public void run(String... args) {
        bootstrapPrimaryDemoUsers();
        bootstrapAdmin();
    }

    private void bootstrapPrimaryDemoUsers() {
        if (!bootstrapDemoEnabled) {
            logger.info("Primary demo user bootstrap is disabled.");
            return;
        }

        upsertUser(
                DEMO_ADMIN_EMAIL,
                "Platform Admin",
                Role.ADMIN,
                "Admin@123456",
                null);

        upsertUser(
                DEMO_TEACHER_EMAIL,
                "Teacher Account",
                Role.TEACHER,
                "Teacher@123456",
                DEMO_TEACHER_EMPLOYEE_ID);

        upsertUser(
                DEMO_STUDENT_EMAIL,
                "Student Account",
                Role.STUDENT,
                "Student@123456",
                null);
    }

    private void bootstrapAdmin() {
        if (!bootstrapAdminEnabled) {
            logger.info("Default admin bootstrap is disabled.");
            return;
        }

        if (bootstrapAdminEmail == null || bootstrapAdminEmail.isBlank()) {
            throw new IllegalStateException("app.bootstrap.admin.email is required when default admin bootstrap is enabled");
        }
        if (bootstrapAdminPassword == null || bootstrapAdminPassword.length() < MIN_BOOTSTRAP_PASSWORD_LENGTH) {
            throw new IllegalStateException(
                    "app.bootstrap.admin.password must be at least 12 characters when default admin bootstrap is enabled");
        }

        if (!userRepository.existsByEmailIgnoreCase(bootstrapAdminEmail)) {
            upsertUser(
                    bootstrapAdminEmail.trim(),
                    bootstrapAdminName,
                    Role.ADMIN,
                    bootstrapAdminPassword,
                    null);
            logger.info("Default admin account bootstrapped for {}", bootstrapAdminEmail);
        }
    }

    private void upsertUser(String email, String name, Role role, String password, String employeeId) {
        Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
        User user = existing.orElseGet(User::new);

        user.setEmail(email);
        user.setName(name);
        user.setRole(role);
        user.setEnabled(true);
        user.setAccountNonLocked(true);

        if (employeeId != null && !employeeId.isBlank()) {
            user.setEmployeeId(employeeId.trim());
        } else if (role != Role.TEACHER) {
            user.setEmployeeId(null);
        }

        if (password != null && !password.isBlank()) {
            user.setPassword(passwordEncoder.encode(password));
        }

        userRepository.save(user);
        logger.info("User {} bootstrapped/updated with role {}", email, role);
    }
}
