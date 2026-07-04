package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.Phase2VerificationChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface Phase2VerificationChallengeRepository extends JpaRepository<Phase2VerificationChallenge, Long> {

    Optional<Phase2VerificationChallenge> findTopByStudentIdAndExamCodeAndConsumedAtIsNullOrderByCreatedAtDesc(Long studentId, String examCode);

    Optional<Phase2VerificationChallenge> findTopByVerificationTokenHashAndConsumedAtIsNullOrderByCreatedAtDesc(String verificationTokenHash);

    void deleteByStudentIdAndExamCodeAndConsumedAtIsNull(Long studentId, String examCode);
}
