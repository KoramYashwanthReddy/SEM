package com.yashwanth.ai_exam_system.config;

import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.UserRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ✅ Constructor injection (fixes your error)
    public DataInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        String adminEmail = "admin@ai-exam.com";

        if (!userRepository.existsByEmail(adminEmail)) {

            User admin = new User();
            admin.setName("Super Admin");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode("Admin@123"));
            admin.setRole(Role.ADMIN);
            admin.setEnabled(true);
            admin.setAccountNonLocked(true);

            userRepository.save(admin);

            System.out.println("=================================");
            System.out.println("✅ Default Admin Created");
            System.out.println("📧 Email: " + adminEmail);
            System.out.println("🔑 Password: Admin@123");
            System.out.println("=================================");
        }
    }
}