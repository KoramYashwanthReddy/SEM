package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.LeaderboardDTO;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaderboardServiceTest {

    @Mock
    private ExamResultRepository resultRepository;

    @Mock
    private UserRepository userRepository;

    private LeaderboardService leaderboardService;

    @BeforeEach
    void setUp() {
        leaderboardService = new LeaderboardService(resultRepository, userRepository);
    }

    @Test
    void testGetExamLeaderboard_SuccessAndMapping() {
        String examCode = "EXAM101";

        ExamResult r1 = createExamResult(101L, 1L, examCode, 95.0, 95.0);
        ExamResult r2 = createExamResult(102L, 2L, examCode, 85.0, 85.0);

        when(resultRepository.findByExamCodeOrderByScoreDesc(examCode)).thenReturn(List.of(r1, r2));

        User u1 = new User();
        u1.setId(1L);
        u1.setName("Alice");
        User u2 = new User();
        u2.setId(2L);
        u2.setName("Bob");

        when(userRepository.findAllById(any())).thenReturn(List.of(u1, u2));

        List<LeaderboardDTO> leaderboard = leaderboardService.getExamLeaderboard(examCode);

        assertThat(leaderboard).hasSize(2);
        assertThat(leaderboard.get(0).getRank()).isEqualTo(1);
        assertThat(leaderboard.get(0).getStudentId()).isEqualTo(1L);
        assertThat(leaderboard.get(0).getStudentName()).isEqualTo("Alice");
        assertThat(leaderboard.get(0).getPercentage()).isEqualTo(95.0);

        assertThat(leaderboard.get(1).getRank()).isEqualTo(2);
        assertThat(leaderboard.get(1).getStudentId()).isEqualTo(2L);
        assertThat(leaderboard.get(1).getStudentName()).isEqualTo("Bob");
        assertThat(leaderboard.get(1).getPercentage()).isEqualTo(85.0);

        verify(userRepository, times(1)).findAllById(any());
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void testGetLeaderboard_PicksBestResultPerStudent() {
        String examCode = "EXAM101";

        ExamResult r1 = createExamResult(101L, 1L, examCode, 70.0, 70.0);
        ExamResult r2 = createExamResult(102L, 1L, examCode, 90.0, 90.0); // Better attempt

        when(resultRepository.findByExamCodeOrderByScoreDesc(examCode)).thenReturn(List.of(r1, r2));

        User u1 = new User();
        u1.setId(1L);
        u1.setName("Alice");

        when(userRepository.findAllById(any())).thenReturn(List.of(u1));

        List<LeaderboardDTO> leaderboard = leaderboardService.getExamLeaderboard(examCode);

        assertThat(leaderboard).hasSize(1);
        assertThat(leaderboard.get(0).getStudentId()).isEqualTo(1L);
        assertThat(leaderboard.get(0).getPercentage()).isEqualTo(90.0);

        verify(userRepository, times(1)).findAllById(any());
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void benchmarkRepositoryCallsAndPerformance() {
        int studentCount = 1000;
        List<ExamResult> results = new ArrayList<>();
        List<User> users = new ArrayList<>();

        for (long i = 1; i <= studentCount; i++) {
            results.add(createExamResult(i, i, "EXAM_PERF", 50.0 + (i % 50), 50.0 + (i % 50)));
            User u = new User();
            u.setId(i);
            u.setName("Student " + i);
            users.add(u);
        }

        when(resultRepository.findByExamCodeOrderByScoreDesc("EXAM_PERF")).thenReturn(results);
        when(userRepository.findAllById(any())).thenReturn(users);

        long startTime = System.nanoTime();
        List<LeaderboardDTO> leaderboard = leaderboardService.getExamLeaderboard("EXAM_PERF");
        long durationMs = (System.nanoTime() - startTime) / 1_000_000;

        assertThat(leaderboard).hasSize(studentCount);
        verify(userRepository, times(1)).findAllById(any());
        verify(userRepository, never()).findById(anyLong());
        System.out.println("Optimized execution time for " + studentCount + " students: " + durationMs + " ms");
    }

    private ExamResult createExamResult(Long id, Long studentId, String examCode, double score, double percentage) {
        ExamResult result = new ExamResult();
        result.setAttemptId(id * 10);
        result.setStudentId(studentId);
        result.setExamCode(examCode);
        result.setScore(score);
        result.setPercentage(percentage);
        result.setSubmittedAt(LocalDateTime.now());
        return result;
    }
}
