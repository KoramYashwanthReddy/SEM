package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {

    // ✅ Find result by attempt
    Optional<ExamResult> findByAttemptId(Long attemptId);

    // ================= LEADERBOARD =================

    // 🥇 Exam-wise leaderboard (highest score first)
    List<ExamResult> findByExamCodeOrderByScoreDesc(String examCode);

    // 🌍 Global leaderboard
    List<ExamResult> findAllByOrderByScoreDesc();

    // ================= ANALYTICS =================

    // 📊 Student performance over time
    List<ExamResult> findByStudentIdOrderBySubmittedAtAsc(Long studentId);

    // 📊 Student results for a specific exam
    List<ExamResult> findByStudentIdAndExamCode(Long studentId, String examCode);

    // ================= ADMIN / FILTER =================

    // 🔍 All results of an exam
    List<ExamResult> findByExamCode(String examCode);

    // 🔍 All results of a student
    List<ExamResult> findByStudentId(Long studentId);
}