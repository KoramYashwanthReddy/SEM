package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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

    @InjectMocks
    private ProctoringService proctoringService;

    @Test
    @DisplayName("isSuspicious returns false when all event counts are 0")
    void isSuspicious_WhenAllCountsZero_ReturnsFalse() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(0L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("isSuspicious returns false when TAB_SWITCH is exactly at threshold (3)")
    void isSuspicious_TabSwitchAtThreshold_ReturnsFalse() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(0L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("isSuspicious returns true when TAB_SWITCH exceeds threshold (4)")
    void isSuspicious_TabSwitchExceedsThreshold_ReturnsTrue() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(4L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(0L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("isSuspicious returns false when COPY_PASTE is exactly at threshold (5)")
    void isSuspicious_CopyPasteAtThreshold_ReturnsFalse() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(5L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("isSuspicious returns true when COPY_PASTE exceeds threshold (6)")
    void isSuspicious_CopyPasteExceedsThreshold_ReturnsTrue() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(6L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("isSuspicious returns false when MULTIPLE_FACE is exactly at threshold (2)")
    void isSuspicious_MultipleFaceAtThreshold_ReturnsFalse() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(2L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(0L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("isSuspicious returns true when MULTIPLE_FACE exceeds threshold (3)")
    void isSuspicious_MultipleFaceExceedsThreshold_ReturnsTrue() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(0L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("isSuspicious returns false when NO_FACE is exactly at threshold (3)")
    void isSuspicious_NoFaceAtThreshold_ReturnsFalse() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(0L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("isSuspicious returns true when NO_FACE exceeds threshold (4)")
    void isSuspicious_NoFaceExceedsThreshold_ReturnsTrue() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(0L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(4L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(0L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("isSuspicious returns false when all event types are simultaneously at their maximum threshold boundaries")
    void isSuspicious_AllEventsAtThresholdBoundary_ReturnsFalse() {
        Long attemptId = 100L;
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "TAB_SWITCH")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "MULTIPLE_FACE")).thenReturn(2L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "NO_FACE")).thenReturn(3L);
        when(eventRepository.countByAttemptIdAndEventType(attemptId, "COPY_PASTE")).thenReturn(5L);

        boolean result = proctoringService.isSuspicious(attemptId);

        assertThat(result).isFalse();
    }
}
