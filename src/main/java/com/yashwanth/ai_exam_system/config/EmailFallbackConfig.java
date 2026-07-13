package com.yashwanth.ai_exam_system.config;

import jakarta.mail.Authenticator;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import java.io.InputStream;
import java.util.Properties;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;

@Configuration
public class EmailFallbackConfig {

    @Bean
    @ConditionalOnProperty(name = "app.email.enabled", havingValue = "false")
    @ConditionalOnMissingBean(JavaMailSender.class)
    public JavaMailSender noOpJavaMailSender() {
        return new JavaMailSender() {
            private final Session session = Session.getInstance(new Properties(), (Authenticator) null);

            @Override
            public MimeMessage createMimeMessage() {
                return new MimeMessage(session);
            }

            @Override
            public MimeMessage createMimeMessage(InputStream contentStream) {
                try {
                    return new MimeMessage(session, contentStream);
                } catch (Exception e) {
                    throw new IllegalStateException("Unable to create mock MimeMessage", e);
                }
            }

            @Override
            public void send(MimeMessage mimeMessage) {
                // no-op for tests and disabled email environments
            }

            @Override
            public void send(MimeMessage... mimeMessages) {
                // no-op for tests and disabled email environments
            }

            @Override
            public void send(SimpleMailMessage... simpleMessages) {
                // no-op for tests and disabled email environments
            }

            @Override
            public void send(MimeMessagePreparator... mimeMessagePreparators) {
                // no-op for tests and disabled email environments
            }
        };
    }
}
