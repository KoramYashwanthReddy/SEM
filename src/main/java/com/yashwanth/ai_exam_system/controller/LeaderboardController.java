package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.LeaderboardDTO;
import com.yashwanth.ai_exam_system.service.LeaderboardService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    // 🥇 Exam Leaderboard
    @GetMapping("/exam/{examCode}")
    public List<LeaderboardDTO> getExamLeaderboard(@PathVariable String examCode) {
        return leaderboardService.getExamLeaderboard(examCode);
    }

    // 🌍 Global Leaderboard
    @GetMapping("/global")
    public List<LeaderboardDTO> getGlobalLeaderboard() {
        return leaderboardService.getGlobalLeaderboard();
    }
}