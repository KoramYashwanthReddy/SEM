package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.service.Phase2VerificationService;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/public/phase2")
public class Phase2VerificationController {

    private final Phase2VerificationService phase2VerificationService;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;

    public Phase2VerificationController(
            Phase2VerificationService phase2VerificationService,
            ExamRepository examRepository,
            UserRepository userRepository
    ) {
        this.phase2VerificationService = phase2VerificationService;
        this.examRepository = examRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/confirm")
    public ResponseEntity<?> confirmPhase2Registration(
            @RequestParam("token") String token,
            @RequestParam("examCode") String examCode
    ) {
        Map<String, Object> response = phase2VerificationService.completeRegistrationWithToken(examCode, token);
        Long studentId = response.get("studentId") instanceof Number
                ? ((Number) response.get("studentId")).longValue()
                : null;
        URI redirect = UriComponentsBuilder.fromPath("/pages/student-ui.html")
                .queryParam("phase2Verified", "1")
                .queryParam("examCode", examCode)
                .queryParam("phase2Method", response.getOrDefault("phase2VerificationMethod", "LINK"))
                .build()
                .toUri();
        return ResponseEntity.status(HttpStatus.FOUND).location(redirect).build();
    }
}
