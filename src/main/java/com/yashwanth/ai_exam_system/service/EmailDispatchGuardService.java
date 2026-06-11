package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.EmailDispatchLog;
import com.yashwanth.ai_exam_system.repository.EmailDispatchLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailDispatchGuardService {

    private static final Logger log = LoggerFactory.getLogger(EmailDispatchGuardService.class);

    private final EmailDispatchLogRepository emailDispatchLogRepository;

    public EmailDispatchGuardService(EmailDispatchLogRepository emailDispatchLogRepository) {
        this.emailDispatchLogRepository = emailDispatchLogRepository;
    }

    @Transactional
    public boolean markDispatchedIfFirst(String recipientEmail, String eventType, String referenceKey) {
        if (!hasText(recipientEmail) || !hasText(eventType) || !hasText(referenceKey)) {
            return false;
        }

        boolean alreadySent = emailDispatchLogRepository
                .existsByRecipientEmailIgnoreCaseAndEventTypeAndReferenceKey(
                        recipientEmail.trim(),
                        eventType.trim(),
                        referenceKey.trim()
                );
        if (alreadySent) {
            return false;
        }

        try {
            EmailDispatchLog logRow = new EmailDispatchLog();
            logRow.setRecipientEmail(recipientEmail.trim());
            logRow.setEventType(eventType.trim());
            logRow.setReferenceKey(referenceKey.trim());
            emailDispatchLogRepository.saveAndFlush(logRow);
            return true;
        } catch (DataIntegrityViolationException duplicate) {
            log.debug("Duplicate email dispatch prevented for {} / {} / {}",
                    recipientEmail, eventType, referenceKey);
            return false;
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
