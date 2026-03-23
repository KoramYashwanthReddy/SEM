package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamResultRepository
        extends JpaRepository<ExamResult, Long> {

    // ================= CORE =================

    Optional<ExamResult> findByAttemptId(Long attemptId);

    // ================= LEADERBOARD =================

    List<ExamResult> findByExamCodeOrderByScoreDesc(String examCode);

    List<ExamResult> findByExamIdOrderByScoreDesc(Long examId);

    List<ExamResult> findAllByOrderByScoreDesc();

    List<ExamResult> findByExamCodeOrderByPercentageDesc(String examCode);

    List<ExamResult> findByExamCodeOrderByTimeTakenSecondsAsc(String examCode);

    // ================= ANALYTICS =================

    List<ExamResult> findByStudentIdOrderBySubmittedAtAsc(Long studentId);

    List<ExamResult> findByStudentIdAndExamCode(Long studentId, String examCode);

    List<ExamResult> findByExamCode(String examCode);

    List<ExamResult> findByExamId(Long examId);

    List<ExamResult> findTop5ByStudentIdOrderBySubmittedAtDesc(Long studentId);

    // ================= COUNT =================

    long countByExamCode(String examCode);

    long countByExamId(Long examId);

    long countByStudentId(Long studentId);

    // ================= PASS / FAIL =================

    long countByExamIdAndScoreGreaterThanEqual(Long examId, double passMarks);

    long countByExamIdAndScoreLessThan(Long examId, double passMarks);

    long countByExamIdAndPassedTrue(Long examId);

    long countByExamIdAndPassedFalse(Long examId);

    // ================= PERFORMANCE =================

    List<ExamResult> findTop10ByExamIdOrderByScoreDesc(Long examId);

    List<ExamResult> findTop10ByOrderByScoreDesc();

    List<ExamResult> findTop10ByExamCodeOrderByPercentageDesc(String examCode);

    // ================= CHEATING =================

    List<ExamResult> findByFlaggedForCheatingTrue();

    List<ExamResult> findByExamCodeAndFlaggedForCheatingTrue(String examCode);

    // ================= AVERAGE =================

    @Query("""
        SELECT COALESCE(AVG(e.score),0)
        FROM ExamResult e
        WHERE e.examCode = :examCode
    """)
    Double findAverageScoreByExamCode(String examCode);

    @Query("""
        SELECT COALESCE(AVG(e.percentage),0)
        FROM ExamResult e
        WHERE e.examCode = :examCode
    """)
    Double findAveragePercentageByExamCode(String examCode);

    // ================= RANK =================

    @Query("""
        SELECT COUNT(e) + 1
        FROM ExamResult e
        WHERE e.examCode = :examCode
        AND e.score > :score
    """)
    Long findRankByScore(String examCode, double score);
}