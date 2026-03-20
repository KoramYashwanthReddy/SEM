package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.LeaderboardDTO;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class LeaderboardService {

    private final ExamResultRepository resultRepository;

    public LeaderboardService(ExamResultRepository resultRepository) {
        this.resultRepository = resultRepository;
    }

    // 🥇 EXAM LEADERBOARD
    public List<LeaderboardDTO> getExamLeaderboard(String examCode) {

        List<ExamResult> results =
                resultRepository.findByExamCodeOrderByScoreDesc(examCode);

        return buildLeaderboard(results);
    }

    // 🌍 GLOBAL LEADERBOARD
    public List<LeaderboardDTO> getGlobalLeaderboard() {

        List<ExamResult> results =
                resultRepository.findAllByOrderByScoreDesc();

        return buildLeaderboard(results);
    }

    // 🔥 COMMON LOGIC
    private List<LeaderboardDTO> buildLeaderboard(List<ExamResult> results) {

        List<LeaderboardDTO> leaderboard = new ArrayList<>();

        int rank = 1;

        for (ExamResult r : results) {

            LeaderboardDTO dto = new LeaderboardDTO();

            dto.setStudentId(r.getStudentId());
            dto.setScore((int) r.getScore());
            dto.setPercentage(r.getPercentage());
            dto.setRank(rank++);

            // Optional: fetch student name later
            dto.setStudentName("Student-" + r.getStudentId());

            leaderboard.add(dto);
        }

        return leaderboard;
    }
}