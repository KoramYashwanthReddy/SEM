package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, Long> {

    List<ProctoringEvent> findByAttemptId(Long attemptId);

    long countByAttemptIdAndEventType(Long attemptId, String eventType);

}