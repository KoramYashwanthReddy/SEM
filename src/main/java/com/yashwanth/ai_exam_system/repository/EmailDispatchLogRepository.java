package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.EmailDispatchLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailDispatchLogRepository extends JpaRepository<EmailDispatchLog, Long> {

    boolean existsByRecipientEmailIgnoreCaseAndEventTypeAndReferenceKey(
            String recipientEmail,
            String eventType,
            String referenceKey
    );
}
