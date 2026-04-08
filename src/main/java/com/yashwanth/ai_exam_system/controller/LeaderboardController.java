package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.LeaderboardDTO;
import com.yashwanth.ai_exam_system.service.LeaderboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping("/exam/{examCode}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public List<LeaderboardDTO> getExamLeaderboard(@PathVariable String examCode) {
        return leaderboardService.getExamLeaderboard(examCode);
    }

    @GetMapping("/global")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public List<LeaderboardDTO> getGlobalLeaderboard() {
        return leaderboardService.getGlobalLeaderboard();
    }
}
