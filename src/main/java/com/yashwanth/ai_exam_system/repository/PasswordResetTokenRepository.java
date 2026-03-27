package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository
        extends JpaRepository<PasswordResetToken, Long> {

    /*
     * Find by token
     */
    Optional<PasswordResetToken> findByToken(String token);

    /*
     * Find by email
     */
    Optional<PasswordResetToken> findByEmail(String email);

    /*
     * Delete existing token for email
     */
    void deleteByEmail(String email);

    /*
     * Check token exists
     */
    boolean existsByToken(String token);

    /*
     * Delete expired tokens
     */
    void deleteByExpiryTimeBefore(LocalDateTime now);

    /*
     * Find valid token (not expired)
     */
    Optional<PasswordResetToken>
    findByTokenAndExpiryTimeAfter(String token, LocalDateTime now);
}