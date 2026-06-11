package com.yashwanth.ai_exam_system.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;

@Component
public class StartupSecurityValidator {

    private static final Logger logger = LoggerFactory.getLogger(StartupSecurityValidator.class);
    private static final String DEFAULT_JWT_SECRET = "change-this-secret-to-64-characters-minimum-for-production";

    private final Environment environment;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.bootstrap.admin.enabled:false}")
    private boolean bootstrapAdminEnabled;

    @Value("${app.bootstrap.admin.password:}")
    private String bootstrapAdminPassword;



    public StartupSecurityValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        boolean productionLikeProfile = Arrays.stream(environment.getActiveProfiles())
                .map(String::toLowerCase)
                .anyMatch(profile -> profile.equals("prod") || profile.equals("production"));

        boolean insecureJwt = jwtSecret == null
                || jwtSecret.isBlank()
                || DEFAULT_JWT_SECRET.equals(jwtSecret)
                || jwtSecret.length() < 64;

        if (productionLikeProfile) {
            if (insecureJwt) {
                throw new IllegalStateException(
                        "Production profile requires app.jwt.secret to be non-default and at least 64 characters");
            }
            if (bootstrapAdminEnabled) {
                throw new IllegalStateException(
                        "Production profile must not use app.bootstrap.admin.enabled=true. Provision admins through secure onboarding.");
            }

        } else {
            if (insecureJwt) {
                logger.warn("Using weak/default JWT secret outside production. Set APP_JWT_SECRET before deployment.");
            }
            if (bootstrapAdminEnabled && (bootstrapAdminPassword == null || bootstrapAdminPassword.length() < 12)) {
                throw new IllegalStateException(
                        "app.bootstrap.admin.password must be at least 12 characters when bootstrap admin is enabled");
            }
        }
    }
}
