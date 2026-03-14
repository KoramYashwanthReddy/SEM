package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ProctoringEventRequest;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProctoringService {

    private final ProctoringEventRepository eventRepository;

    public ProctoringService(ProctoringEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public void recordEvent(ProctoringEventRequest request) {

        ProctoringEvent event = new ProctoringEvent();

        event.setAttemptId(request.getAttemptId());
        event.setEventType(request.getEventType());
        event.setDetails(request.getDetails());
        event.setTimestamp(LocalDateTime.now());

        eventRepository.save(event);
    }

    public List<ProctoringEvent> getEvents(Long attemptId) {

        return eventRepository.findByAttemptId(attemptId);
    }

    public boolean isSuspicious(Long attemptId) {

        long tabSwitches =
                eventRepository.countByAttemptIdAndEventType(
                        attemptId, "TAB_SWITCH");

        long copyPaste =
                eventRepository.countByAttemptIdAndEventType(
                        attemptId, "COPY_PASTE");

        if (tabSwitches > 3 || copyPaste > 5) {
            return true;
        }

        return false;
    }
}