package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ProctoringSummary;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProctoringServiceTest {

    @Mock
    private ProctoringEventRepository eventRepository;

    @Mock
    private ExamAttemptRepository attemptRepository;

    @Mock
    private NotificationService notificationService;

    private ProctoringService proctoringService;

    private static final Long ATTEMPT_ID = 100L;

    @BeforeEach
    void setUp() {
        proctoringService = new ProctoringService(eventRepository, attemptRepository, notificationService);
    }

    @Test
    @DisplayName("isSuspicious returns false when all event counts are zero")
    void isSuspicious_ReturnsFalse_WhenAllCountsAreZero() {
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "COPY_PASTE")).thenReturn(0L);

        boolean suspicious = proctoringService.isSuspicious(ATTEMPT_ID);

        assertThat(suspicious).isFalse();
    }

    @Test
    @DisplayName("isSuspicious returns false when event counts are exactly at threshold boundaries")
    void isSuspicious_ReturnsFalse_WhenCountsAreAtThresholdBoundaries() {
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "TAB_SWITCH")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "MULTIPLE_FACE")).thenReturn(2L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "NO_FACE")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "COPY_PASTE")).thenReturn(5L);

        boolean suspicious = proctoringService.isSuspicious(ATTEMPT_ID);

        assertThat(suspicious).isFalse();
    }

    @Test
    @DisplayName("isSuspicious returns true when TAB_SWITCH exceeds threshold (> 3)")
    void isSuspicious_ReturnsTrue_WhenTabSwitchExceedsThreshold() {
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "TAB_SWITCH")).thenReturn(4L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "COPY_PASTE")).thenReturn(0L);

        boolean suspicious = proctoringService.isSuspicious(ATTEMPT_ID);

        assertThat(suspicious).isTrue();
    }

    @Test
    @DisplayName("isSuspicious returns true when COPY_PASTE exceeds threshold (> 5)")
    void isSuspicious_ReturnsTrue_WhenCopyPasteExceedsThreshold() {
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "COPY_PASTE")).thenReturn(6L);

        boolean suspicious = proctoringService.isSuspicious(ATTEMPT_ID);

        assertThat(suspicious).isTrue();
    }

    @Test
    @DisplayName("isSuspicious returns true when MULTIPLE_FACE exceeds threshold (> 2)")
    void isSuspicious_ReturnsTrue_WhenMultipleFaceExceedsThreshold() {
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "MULTIPLE_FACE")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "COPY_PASTE")).thenReturn(0L);

        boolean suspicious = proctoringService.isSuspicious(ATTEMPT_ID);

        assertThat(suspicious).isTrue();
    }

    @Test
    @DisplayName("isSuspicious returns true when NO_FACE exceeds threshold (> 3)")
    void isSuspicious_ReturnsTrue_WhenNoFaceExceedsThreshold() {
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "NO_FACE")).thenReturn(4L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "COPY_PASTE")).thenReturn(0L);

        boolean suspicious = proctoringService.isSuspicious(ATTEMPT_ID);

        assertThat(suspicious).isTrue();
    }

    @Test
    @DisplayName("isSuspicious returns true when multiple event counts exceed threshold")
    void isSuspicious_ReturnsTrue_WhenMultipleEventsExceedThreshold() {
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "TAB_SWITCH")).thenReturn(5L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "MULTIPLE_FACE")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "NO_FACE")).thenReturn(4L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "COPY_PASTE")).thenReturn(10L);

        boolean suspicious = proctoringService.isSuspicious(ATTEMPT_ID);

        assertThat(suspicious).isTrue();
    }

    @Test
    @DisplayName("getSummary incorporates isSuspicious result correctly")
    void getSummary_IncludesSuspiciousStatus() {
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "TAB_SWITCH")).thenReturn(4L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(ATTEMPT_ID, "COPY_PASTE")).thenReturn(0L);

        ProctoringSummary summary = proctoringService.getSummary(ATTEMPT_ID);

        assertThat(summary.getAttemptId()).isEqualTo(ATTEMPT_ID);
        assertThat(summary.isSuspicious()).isTrue();
    }
}
