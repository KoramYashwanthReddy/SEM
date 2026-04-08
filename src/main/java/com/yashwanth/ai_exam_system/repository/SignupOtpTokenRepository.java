package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.SignupOtpToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SignupOtpTokenRepository extends JpaRepository<SignupOtpToken, Long> {

    Optional<SignupOtpToken> findByEmailIgnoreCase(String email);

    void deleteByEmailIgnoreCase(String email);
}
