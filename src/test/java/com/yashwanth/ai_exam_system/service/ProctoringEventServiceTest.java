package com.yashwanth.ai_exam_system.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProctoringEventServiceTest {

    @Mock
    private ProctoringEventRepository eventRepository;

    @Mock
    private CheatingDetectionService cheatingDetectionService;

    @InjectMocks
    private ProctoringEventService proctoringEventService;

    @Test
    void logEvent_NullEvent_ThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> proctoringEventService.logEvent(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Proctoring event cannot be null");

        verifyNoInteractions(eventRepository, cheatingDetectionService);
    }

    @Test
    void logEvent_NullAttemptId_ThrowsIllegalArgumentException() {
        ProctoringEvent event = new ProctoringEvent();
        event.setAttemptId(null);

        assertThatThrownBy(() -> proctoringEventService.logEvent(event))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Attempt ID is required");

        verifyNoInteractions(eventRepository, cheatingDetectionService);
    }

    @Test
    void logEvent_ValidEvent_SavesAndTriggersAnalysis() {
        ProctoringEvent event = new ProctoringEvent();
        event.setAttemptId(100L);
        event.setEventType("TAB_SWITCH");

        when(eventRepository.save(any(ProctoringEvent.class))).thenReturn(event);

        ProctoringEvent result = proctoringEventService.logEvent(event);

        assertThat(result).isNotNull();
        assertThat(result.getAttemptId()).isEqualTo(100L);
        verify(eventRepository).save(event);
        verify(cheatingDetectionService).analyzeAttempt(100L);
    }
}
