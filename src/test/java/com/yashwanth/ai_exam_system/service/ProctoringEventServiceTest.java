package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProctoringEventServiceTest {

    @Mock
    private ProctoringEventRepository eventRepository;

    @Mock
    private CheatingDetectionService cheatingDetectionService;

    @InjectMocks
    private ProctoringEventService proctoringEventService;

    private ProctoringEvent sampleEvent;

    @BeforeEach
    void setUp() {
        sampleEvent = new ProctoringEvent();
        sampleEvent.setAttemptId(100L);
        sampleEvent.setEventType("TAB_SWITCH");
    }

    @Test
    @DisplayName("logEvent successfully saves event and triggers AI detection")
    void logEvent_Success() {
        when(eventRepository.save(any(ProctoringEvent.class))).thenReturn(sampleEvent);

        ProctoringEvent result = proctoringEventService.logEvent(sampleEvent);

        assertThat(result).isNotNull();
        assertThat(result.getAttemptId()).isEqualTo(100L);

        verify(eventRepository).save(sampleEvent);
        verify(cheatingDetectionService).analyzeAttempt(100L);
    }

    @Test
    @DisplayName("logEvent throws IllegalArgumentException when event is null")
    void logEvent_NullEvent_ThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> proctoringEventService.logEvent(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Proctoring event cannot be null");

        verifyNoInteractions(eventRepository, cheatingDetectionService);
    }

    @Test
    @DisplayName("logEvent throws IllegalArgumentException when attempt ID is null")
    void logEvent_NullAttemptId_ThrowsIllegalArgumentException() {
        sampleEvent.setAttemptId(null);

        assertThatThrownBy(() -> proctoringEventService.logEvent(sampleEvent))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Attempt ID is required");

        verifyNoInteractions(eventRepository, cheatingDetectionService);
    }

    @Test
    @DisplayName("logEvent throws RuntimeException when repository save fails (error path test)")
    void logEvent_RepositoryThrowsException_ThrowsRuntimeException() {
        RuntimeException repositoryException = new RuntimeException("Database error");
        when(eventRepository.save(any(ProctoringEvent.class))).thenThrow(repositoryException);

        assertThatThrownBy(() -> proctoringEventService.logEvent(sampleEvent))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to log proctoring event")
                .hasCause(repositoryException);

        verify(eventRepository).save(sampleEvent);
        verifyNoInteractions(cheatingDetectionService);
    }

    @Test
    @DisplayName("logEvent throws RuntimeException when cheating detection service fails (error path test)")
    void logEvent_CheatingDetectionThrowsException_ThrowsRuntimeException() {
        when(eventRepository.save(any(ProctoringEvent.class))).thenReturn(sampleEvent);
        RuntimeException aiException = new RuntimeException("AI service unavailable");
        doThrow(aiException).when(cheatingDetectionService).analyzeAttempt(100L);

        assertThatThrownBy(() -> proctoringEventService.logEvent(sampleEvent))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to log proctoring event")
                .hasCause(aiException);

        verify(eventRepository).save(sampleEvent);
        verify(cheatingDetectionService).analyzeAttempt(100L);
    }

    @Test
    @DisplayName("logEventWithoutAnalysis saves event when valid")
    void logEventWithoutAnalysis_Success() {
        proctoringEventService.logEventWithoutAnalysis(sampleEvent);

        verify(eventRepository).save(sampleEvent);
        verifyNoInteractions(cheatingDetectionService);
    }

    @Test
    @DisplayName("logEventWithoutAnalysis ignores null event or null attemptId")
    void logEventWithoutAnalysis_NullOrInvalid_DoesNothing() {
        proctoringEventService.logEventWithoutAnalysis(null);

        ProctoringEvent eventWithoutAttemptId = new ProctoringEvent();
        proctoringEventService.logEventWithoutAnalysis(eventWithoutAttemptId);

        verifyNoInteractions(eventRepository, cheatingDetectionService);
    }

    @Test
    @DisplayName("triggerAnalysis triggers analysis for valid attempt ID")
    void triggerAnalysis_Success() {
        proctoringEventService.triggerAnalysis(100L);

        verify(cheatingDetectionService).analyzeAttempt(100L);
    }

    @Test
    @DisplayName("triggerAnalysis throws IllegalArgumentException when attempt ID is null")
    void triggerAnalysis_NullAttemptId_ThrowsException() {
        assertThatThrownBy(() -> proctoringEventService.triggerAnalysis(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Attempt ID cannot be null");

        verifyNoInteractions(cheatingDetectionService);
    }

    @Test
    @DisplayName("countEvents returns total count from repository")
    void countEvents_Success() {
        when(eventRepository.countByAttemptId(100L)).thenReturn(5L);

        long count = proctoringEventService.countEvents(100L);

        assertThat(count).isEqualTo(5L);
        verify(eventRepository).countByAttemptId(100L);
    }

    @Test
    @DisplayName("countByType returns count by event type from repository")
    void countByType_Success() {
        when(eventRepository.countByAttemptIdAndEventType(100L, "TAB_SWITCH")).thenReturn(3L);

        long count = proctoringEventService.countByType(100L, "TAB_SWITCH");

        assertThat(count).isEqualTo(3L);
        verify(eventRepository).countByAttemptIdAndEventType(100L, "TAB_SWITCH");
    }
}
