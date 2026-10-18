package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
        sampleEvent.setDetails("User switched tabs");
    }

    @Nested
    @DisplayName("logEvent tests")
    class LogEventTests {

        @Test
        @DisplayName("Should throw IllegalArgumentException when event is null")
        void logEvent_NullEvent_ThrowsException() {
            assertThatThrownBy(() -> proctoringEventService.logEvent(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Proctoring event cannot be null");

            verifyNoInteractions(eventRepository, cheatingDetectionService);
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when attemptId is null")
        void logEvent_NullAttemptId_ThrowsException() {
            sampleEvent.setAttemptId(null);

            assertThatThrownBy(() -> proctoringEventService.logEvent(sampleEvent))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Attempt ID is required");

            verifyNoInteractions(eventRepository, cheatingDetectionService);
        }

        @Test
        @DisplayName("Should save event and trigger AI detection when valid event provided")
        void logEvent_ValidEvent_SavesAndTriggersAnalysis() {
            ProctoringEvent savedEvent = new ProctoringEvent();
            savedEvent.setId(1L);
            savedEvent.setAttemptId(100L);
            savedEvent.setEventType("TAB_SWITCH");

            when(eventRepository.save(sampleEvent)).thenReturn(savedEvent);

            ProctoringEvent result = proctoringEventService.logEvent(sampleEvent);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getAttemptId()).isEqualTo(100L);

            verify(eventRepository, times(1)).save(sampleEvent);
            verify(cheatingDetectionService, times(1)).analyzeAttempt(100L);
        }

        @Test
        @DisplayName("Should wrap exception in RuntimeException when repository save throws")
        void logEvent_RepositoryThrowsException_WrapsInRuntimeException() {
            when(eventRepository.save(any(ProctoringEvent.class)))
                    .thenThrow(new RuntimeException("Database error"));

            assertThatThrownBy(() -> proctoringEventService.logEvent(sampleEvent))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Failed to log proctoring event")
                    .hasCauseInstanceOf(RuntimeException.class);

            verify(eventRepository, times(1)).save(sampleEvent);
            verifyNoInteractions(cheatingDetectionService);
        }

        @Test
        @DisplayName("Should wrap exception in RuntimeException when cheatingDetectionService throws")
        void logEvent_CheatingServiceThrowsException_WrapsInRuntimeException() {
            when(eventRepository.save(sampleEvent)).thenReturn(sampleEvent);
            doThrow(new RuntimeException("AI service failed"))
                    .when(cheatingDetectionService).analyzeAttempt(100L);

            assertThatThrownBy(() -> proctoringEventService.logEvent(sampleEvent))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Failed to log proctoring event")
                    .hasCauseInstanceOf(RuntimeException.class);

            verify(eventRepository, times(1)).save(sampleEvent);
            verify(cheatingDetectionService, times(1)).analyzeAttempt(100L);
        }
    }

    @Nested
    @DisplayName("logEventWithoutAnalysis tests")
    class LogEventWithoutAnalysisTests {

        @Test
        @DisplayName("Should do nothing when event is null")
        void logEventWithoutAnalysis_NullEvent_DoesNothing() {
            proctoringEventService.logEventWithoutAnalysis(null);

            verifyNoInteractions(eventRepository, cheatingDetectionService);
        }

        @Test
        @DisplayName("Should do nothing when attemptId is null")
        void logEventWithoutAnalysis_NullAttemptId_DoesNothing() {
            sampleEvent.setAttemptId(null);

            proctoringEventService.logEventWithoutAnalysis(sampleEvent);

            verifyNoInteractions(eventRepository, cheatingDetectionService);
        }

        @Test
        @DisplayName("Should save event without triggering analysis")
        void logEventWithoutAnalysis_ValidEvent_SavesEventOnly() {
            proctoringEventService.logEventWithoutAnalysis(sampleEvent);

            verify(eventRepository, times(1)).save(sampleEvent);
            verifyNoInteractions(cheatingDetectionService);
        }
    }

    @Nested
    @DisplayName("triggerAnalysis tests")
    class TriggerAnalysisTests {

        @Test
        @DisplayName("Should throw IllegalArgumentException when attemptId is null")
        void triggerAnalysis_NullAttemptId_ThrowsException() {
            assertThatThrownBy(() -> proctoringEventService.triggerAnalysis(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Attempt ID cannot be null");

            verifyNoInteractions(cheatingDetectionService);
        }

        @Test
        @DisplayName("Should trigger cheating detection analysis for valid attemptId")
        void triggerAnalysis_ValidAttemptId_CallsService() {
            proctoringEventService.triggerAnalysis(100L);

            verify(cheatingDetectionService, times(1)).analyzeAttempt(100L);
        }
    }

    @Nested
    @DisplayName("Count tests")
    class CountTests {

        @Test
        @DisplayName("Should return event count for attemptId")
        void countEvents_ReturnsCount() {
            when(eventRepository.countByAttemptId(100L)).thenReturn(5L);

            long count = proctoringEventService.countEvents(100L);

            assertThat(count).isEqualTo(5L);
            verify(eventRepository, times(1)).countByAttemptId(100L);
        }

        @Test
        @DisplayName("Should return event count by type for attemptId")
        void countByType_ReturnsCount() {
            when(eventRepository.countByAttemptIdAndEventType(100L, "TAB_SWITCH")).thenReturn(3L);

            long count = proctoringEventService.countByType(100L, "TAB_SWITCH");

            assertThat(count).isEqualTo(3L);
            verify(eventRepository, times(1)).countByAttemptIdAndEventType(100L, "TAB_SWITCH");
        }
    }
}
