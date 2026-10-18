package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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

    @Captor
    private ArgumentCaptor<ProctoringEvent> eventCaptor;

    @Captor
    private ArgumentCaptor<ExamAttempt> attemptCaptor;

    private ExamAttempt attempt;

    @BeforeEach
    void setUp() {
        attempt = new ExamAttempt();
        attempt.setStudentId(101L);
        attempt.setExamId(1L);
    }

    @Test
    @DisplayName("warnAttempt should increment cheating score by 15, update lastAiCheckTime, and record MANUAL_WARN event")
    void warnAttempt_WhenAttemptExists_UpdatesCheatingScoreAndSavesEvent() {
        // Given
        Long attemptId = 1L;
        attempt.setCheatingScore(20);
        when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

        LocalDateTime beforeTime = LocalDateTime.now().minusSeconds(1);

        // When
        proctoringService.warnAttempt(attemptId);

        // Then
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        ProctoringEvent savedEvent = eventCaptor.getValue();
        assertThat(savedEvent.getAttemptId()).isEqualTo(attemptId);
        assertThat(savedEvent.getEventType()).isEqualTo("MANUAL_WARN");
        assertThat(savedEvent.getDetails()).isEqualTo("Teacher warning issued");
        assertThat(savedEvent.getScore()).isEqualTo(15);

        verify(attemptRepository, times(1)).save(attemptCaptor.capture());
        ExamAttempt savedAttempt = attemptCaptor.getValue();
        assertThat(savedAttempt.getCheatingScore()).isEqualTo(35); // 20 + 15
        assertThat(savedAttempt.getLastAiCheckTime()).isAfterOrEqualTo(beforeTime);
    }

    @Test
    @DisplayName("warnAttempt should treat null initial cheating score as 0 and increment to 15")
    void warnAttempt_WhenInitialScoreIsNull_InitializesAndIncrementsScore() {
        // Given
        Long attemptId = 2L;
        attempt.setCheatingScore(null);
        when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

        // When
        proctoringService.warnAttempt(attemptId);

        // Then
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        ProctoringEvent savedEvent = eventCaptor.getValue();
        assertThat(savedEvent.getScore()).isEqualTo(15);

        verify(attemptRepository, times(1)).save(attemptCaptor.capture());
        ExamAttempt savedAttempt = attemptCaptor.getValue();
        assertThat(savedAttempt.getCheatingScore()).isEqualTo(15);
    }

    @Test
    @DisplayName("warnAttempt should throw RuntimeException when exam attempt is not found")
    void warnAttempt_WhenAttemptNotFound_ThrowsException() {
        // Given
        Long attemptId = 999L;
        when(attemptRepository.findById(attemptId)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> proctoringService.warnAttempt(attemptId))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Exam attempt not found");

        verify(eventRepository, never()).save(any());
        verify(attemptRepository, never()).save(any());
    }
}
