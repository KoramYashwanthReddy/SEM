package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.LeaderboardDTO;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LeaderboardService {

    private final ExamResultRepository resultRepository;
    private final UserRepository userRepository;

    public LeaderboardService(ExamResultRepository resultRepository, UserRepository userRepository) {
        this.resultRepository = resultRepository;
        this.userRepository = userRepository;
    }

    public List<LeaderboardDTO> getExamLeaderboard(String examCode) {
        List<ExamResult> results = resultRepository.findByExamCodeOrderByScoreDesc(examCode);
        return buildLeaderboard(results);
    }

    public List<LeaderboardDTO> getGlobalLeaderboard() {
        List<ExamResult> results = resultRepository.findAllByOrderByScoreDesc();
        return buildLeaderboard(results);
    }

    private List<LeaderboardDTO> buildLeaderboard(List<ExamResult> results) {
        Map<Long, ExamResult> bestByStudent = new LinkedHashMap<>();
        for (ExamResult result : results) {
            if (result == null || result.getStudentId() == null) {
                continue;
            }
            bestByStudent.merge(result.getStudentId(), result, this::pickBetterResult);
        }

        List<ExamResult> uniqueResults = new ArrayList<>(bestByStudent.values());
        uniqueResults.sort(resultComparator());

        Set<Long> studentIds = uniqueResults.stream()
                .map(ExamResult::getStudentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, String> studentNameMap = new HashMap<>();
        if (!studentIds.isEmpty()) {
            List<User> users = userRepository.findAllById(studentIds);
            for (User user : users) {
                if (user != null && user.getId() != null) {
                    studentNameMap.put(user.getId(), resolveStudentName(user));
                }
            }
        }

        List<LeaderboardDTO> leaderboard = new ArrayList<>(uniqueResults.size());
        int rank = 1;
        for (ExamResult result : uniqueResults) {
            LeaderboardDTO dto = new LeaderboardDTO();
            dto.setStudentId(result.getStudentId());
            dto.setScore((int) result.getScore());
            dto.setPercentage(roundToOneDecimal(result.getPercentage()));
            dto.setRank(rank++);

            String studentName = studentNameMap.get(result.getStudentId());
            if (studentName == null) {
                studentName = formatFallbackStudentName(result.getStudentId());
            }
            dto.setStudentName(studentName);
            leaderboard.add(dto);
        }

        return leaderboard;
    }

    private ExamResult pickBetterResult(ExamResult first, ExamResult second) {
        return resultComparator().compare(first, second) <= 0 ? first : second;
    }

    private Comparator<ExamResult> resultComparator() {
        return Comparator
                .comparingDouble(ExamResult::getPercentage).reversed()
                .thenComparing(Comparator.comparingDouble(ExamResult::getScore).reversed())
                .thenComparing(ExamResult::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ExamResult::getAttemptId, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ExamResult::getId, Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private double roundToOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String resolveStudentName(User user) {
        if (user != null && user.getName() != null && !user.getName().isBlank()) {
            return user.getName();
        }
        return formatFallbackStudentName(user != null ? user.getId() : null);
    }

    private String formatFallbackStudentName(Long studentId) {
        if (studentId == null) {
            return "Student";
        }
        return "Student " + studentId;
    }
}
